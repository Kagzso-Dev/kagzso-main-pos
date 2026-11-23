import { useContext } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { AuthContext } from './context/AuthContext';
import { ChefHat } from 'lucide-react';

// ── Loading spinner while auth state is being restored ───────────────────────
const AuthLoading = () => (
    <div className="flex items-center justify-center min-h-screen bg-[#0F172A]">
        <div className="flex flex-col items-center space-y-4">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-gray-400 text-sm font-medium">Restoring session...</p>
        </div>
    </div>
);

// ── Maps a role to its home dashboard path ────────────────────────────────────
const getDashboardPath = (role) => {
    switch (role) {
        case 'superadmin': return '/superadmin';
        case 'admin': return '/admin';
        case 'kitchen': return '/kitchen';
        case 'cashier': return '/cashier';
        case 'waiter': return '/waiter';
        default: return '/login';
    }
};

// ── Helper: role-based route guard ───────────────────────────────────────────
const RoleRoute = ({ allowedRoles }) => {
    const { user, loading } = useContext(AuthContext);

    // Wait until auth state is restored from localStorage
    if (loading) return <AuthLoading />;

    // No user = not logged in → redirect to login
    if (!user) return <Navigate to="/login" replace />;

    // Role is allowed → render the page
    if (allowedRoles.includes(user.role)) {
        return <Outlet />;
    }

    // Role mismatch → silently redirect to the user's own dashboard
    // (avoids showing an "Access Denied" screen for routine navigation)
    return <Navigate to={getDashboardPath(user.role)} replace />;
};

// ── Individual route guards ──────────────────────────────────────────────────


const AdminRoute = () => (
    <RoleRoute allowedRoles={['admin']} />
);

const KitchenDisabledNotice = () => {
    const { logout } = useContext(AuthContext);
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--theme-bg-main,#0F172A)] text-[var(--theme-text-main,#fff)] p-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-orange-500/10 flex items-center justify-center text-orange-500 mb-4 border border-orange-500/20">
                <ChefHat size={32} />
            </div>
            <h1 className="text-2xl font-black mb-2">Kitchen is disabled</h1>
            <p className="text-sm text-[var(--theme-text-muted,#94a3b8)] max-w-md mb-6">
                The kitchen module has been disabled for this restaurant by the administrator. Orders are handled directly by service staff.
            </p>
            <button
                onClick={logout}
                className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-bold text-xs uppercase tracking-wider transition-all"
            >
                Sign Out
            </button>
        </div>
    );
};

const KitchenRoute = () => {
    const { user, settings, loading } = useContext(AuthContext);
    if (loading) return <AuthLoading />;
    if (!user) return <Navigate to="/login" replace />;

    const kitchenEnabled = settings?.kitchenEnabled !== false;
    if (!kitchenEnabled) {
        if (user.role === 'kitchen') {
            return <KitchenDisabledNotice />;
        }
        return <Navigate to={getDashboardPath(user.role)} replace />;
    }

    return <RoleRoute allowedRoles={['kitchen', 'admin', 'waiter', 'cashier']} />;
};

const CashierKitchenRoute = () => {
    const { user, settings, loading } = useContext(AuthContext);
    if (loading) return <AuthLoading />;
    if (!user) return <Navigate to="/login" replace />;

    const kitchenEnabled = settings?.kitchenEnabled !== false;
    if (!kitchenEnabled) {
        return <Navigate to="/cashier" replace />;
    }

    return <RoleRoute allowedRoles={['cashier', 'admin']} />;
};

const CashierRoute = () => (
    <RoleRoute allowedRoles={['cashier', 'admin']} />
);

const WaiterRoute = () => (
    <RoleRoute allowedRoles={['waiter', 'cashier', 'admin']} />
);

const SuperAdminRoute = () => (
    <RoleRoute allowedRoles={['superadmin']} />
);

export { AdminRoute, KitchenRoute, CashierKitchenRoute, CashierRoute, WaiterRoute, SuperAdminRoute };
