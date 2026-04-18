import axios from "axios";

// ─── Dynamic API Configuration for Multi-Device Dev ────────────────
const getBaseURL = () => {
    // 1. Explicit environment override always wins (set via .env.production or CI)
    if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;

    const hostname = window.location.hostname;

    // 2. Any live domain — use relative /api so Nginx proxies to the backend.
    //    This is the single-domain architecture: https://pos.kagzso.com/api
    if (hostname === 'pos.kagzso.com' || hostname === 'food.kagzso.com') {
        return "/api";
    }

    // 3. Production build running on an unknown host — still prefer relative /api
    //    so the same build artifact works on any domain without CORS issues.
    if (import.meta.env.MODE !== 'development') {
        return "/api";
    }

    // 4. Dev: LAN IP (mobile/tablet testing on the same network)
    const isIP = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/.test(hostname);
    if (isIP) {
        return `http://${hostname}:5005/api`;
    }

    // 5. Dev: localhost
    return "http://localhost:5005/api";
};

const baseURL = getBaseURL().replace(/\/+$/, "");

// Create axios instance
const api = axios.create({
    baseURL,
    withCredentials: true,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request interceptor (Token + Tenant)
api.interceptors.request.use(
    (config) => {
        // Fix duplicate /api/api in URL paths globally
        if (config.url && config.url.startsWith('/api/')) {
            config.url = config.url.replace(/^\/api\//, '/');
        }

        try {
            const user = JSON.parse(sessionStorage.getItem("user"));

            // Add JWT token
            if (user?.token) {
                config.headers.Authorization = `Bearer ${user.token}`;
            }

            // Stamp tenant header so both protected AND public routes (including
            // the login endpoint itself) can resolve the correct restaurant.
            // Priority: logged-in user's tenantId → VITE_TENANT_ID env variable.
            // In production each tenant gets their own frontend build with their
            // own VITE_TENANT_ID, so this never leaks across tenants.
            const tenantId = user?.tenantId ?? import.meta.env.VITE_TENANT_ID;
            if (tenantId) {
                config.headers['X-Tenant-Id'] = tenantId;
            }
        } catch (error) {
            console.error("LocalStorage error:", error);
        }

        return config;
    },
    (error) => Promise.reject(error)
);

export default api;
export { baseURL };