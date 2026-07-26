/**
 * useTenantTheme
 *
 * Stores and retrieves a theme preference per-tenant in localStorage.
 * Key format:  `kagzso_tenant_theme_${tenantId}`
 *
 * This is completely independent from the global ThemeContext — it does NOT
 * read/write the global `kagzso_theme` key and does NOT touch <html>.
 * The caller is responsible for applying the returned theme value as
 * a `data-theme` attribute on the page/layout root element.
 */
import { useState, useCallback } from 'react';

const VALID_THEMES = ['default', 'dark', 'light'];
const FALLBACK     = 'default';

function storageKey(tenantId) {
    return `kagzso_tenant_theme_${tenantId}`;
}

function readSaved(tenantId) {
    try {
        const v = localStorage.getItem(storageKey(tenantId));
        return VALID_THEMES.includes(v) ? v : FALLBACK;
    } catch {
        return FALLBACK;
    }
}

export function useTenantTheme(tenantId) {
    const [theme, setThemeState] = useState(() =>
        tenantId ? readSaved(tenantId) : FALLBACK
    );

    const setTheme = useCallback((id) => {
        if (!VALID_THEMES.includes(id)) return;
        setThemeState(id);
        if (tenantId) {
            try { localStorage.setItem(storageKey(tenantId), id); } catch { /* ignore */ }
        }
    }, [tenantId]);

    return { theme, setTheme, themes: VALID_THEMES };
}
