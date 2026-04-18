import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import {
    Building2, Users, ShoppingBag, IndianRupee,
    TrendingUp, LogOut, RefreshCw, ChevronRight,
    CheckCircle2, XCircle, Activity
} from 'lucide-react';

/* ── Stat Card ──────────────────────────────────────────────────────────── */
const StatCard = ({ title, value, icon: Icon, color, sub }) => {
    const colors = {
        orange:  'bg-orange-500/10  text-orange-500',
        blue:    'bg-blue-500/10    text-blue-500',
        emerald: 'bg-emerald-500/10 text-emerald-500',
        purple:  'bg-purple-500/10  text-purple-500',
    };
    return (
        <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] || colors.blue}`}>
                <Icon size={20} />
            </div>
            <div className="min-w-0">
                <p className="text-xs text-[var(--theme-text-muted)] font-medium uppercase tracking-wide leading-tight">{title}</p>
                <p className="text-xl sm:text-2xl font-bold text-[var(--theme-text-main)] mt-0.5">{value}</p>
                {sub && <p className="text-xs text-[var(--theme-text-muted)] mt-1">{sub}</p>}
            </div>
        </div>
    );
};

/* ── Restaurant Card (mobile) ───────────────────────────────────────────── */
const RestaurantCard = ({ r, onClick }) => (
    <div onClick={onClick} className="bg-[var(--theme-bg-card)] rounded-xl border border-[var(--theme-border)] p-4 flex items-center gap-3 cursor-pointer hover:bg-[var(--theme-bg-hover)] active:scale-[0.99] transition-all">
        <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-sm flex-shrink-0">
            {r.name.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
            <p className="font-medium text-[var(--theme-text-main)] truncate">{r.name}</p>
            <p className="text-xs text-[var(--theme-text-muted)] font-mono truncate">{r.slug}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                r.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
                {r.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                {r.isActive ? 'Active' : 'Off'}
            </span>
            <ChevronRight size={15} className="text-[var(--theme-text-subtle)]" />
        </div>
    </div>
);

/* ── Restaurant Row (desktop table) ─────────────────────────────────────── */
const RestaurantRow = ({ r, onClick }) => (
    <tr onClick={onClick} className="border-b border-[var(--theme-border)] hover:bg-[var(--theme-bg-hover)] cursor-pointer transition-colors">
        <td className="px-4 py-3 font-medium text-[var(--theme-text-main)]">{r.name}</td>
        <td className="px-4 py-3 text-[var(--theme-text-muted)] text-sm font-mono hidden md:table-cell">{r.slug}</td>
        <td className="px-4 py-3">
            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                r.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
            }`}>
                {r.isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                {r.isActive ? 'Active' : 'Inactive'}
            </span>
        </td>
        <td className="px-4 py-3 text-[var(--theme-text-muted)] text-sm capitalize hidden sm:table-cell">{r.plan}</td>
        <td className="px-4 py-3 text-[var(--theme-text-muted)] text-sm text-right hidden sm:table-cell">{r.orderCount}</td>
        <td className="px-4 py-3 text-[var(--theme-text-muted)] text-sm text-right hidden sm:table-cell">{r.userCount}</td>
        <td className="px-4 py-3 text-right">
            <ChevronRight size={16} className="text-[var(--theme-text-subtle)] ml-auto" />
        </td>
    </tr>
);

export default function SuperAdminDashboard() {
    const { user, logout } = useContext(AuthContext);
    const navigate = useNavigate();
    const [stats, setStats] = useState(null);
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [statsRes, restRes] = await Promise.all([
                api.get('/superadmin/stats'),
                api.get('/superadmin/restaurants'),
            ]);
            setStats(statsRes.data);
            setRestaurants(restRes.data);
        } catch {
            // handled below
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleLogout = () => { logout(); navigate('/login', { replace: true }); };

    const fmt = (n) => new Intl.NumberFormat('en-IN').format(n || 0);
    const fmtCur = (n) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0)}`;

    return (
        <div className="h-screen overflow-y-auto bg-[var(--theme-bg-deep)] text-[var(--theme-text-main)]">
            {/* ── Top bar ── */}
            <header className="sticky top-0 z-50 bg-[var(--theme-topbar-bg)] backdrop-blur border-b border-[var(--theme-border)] px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                        <Activity size={16} className="text-purple-400" />
                    </div>
                    <div className="min-w-0">
                        <span className="font-semibold text-[var(--theme-text-main)]">Super Admin</span>
                        <span className="text-xs text-[var(--theme-text-muted)] ml-1.5 hidden sm:inline">System Dashboard</span>
                    </div>
                </div>
                <div className="flex items-center gap-1 sm:gap-3 flex-shrink-0">
                    <button
                        onClick={load}
                        className="p-2 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)] transition-colors"
                        title="Refresh"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <span className="text-sm text-[var(--theme-text-muted)] hidden sm:block">{user?.username}</span>
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 px-2 sm:px-3 py-2 rounded-lg hover:bg-red-500/10 transition-colors"
                    >
                        <LogOut size={15} />
                        <span className="hidden sm:block">Logout</span>
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
                {/* ── System Stats ── */}
                <section>
                    <h2 className="text-xs sm:text-sm font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-3 sm:mb-4">
                        System Overview
                    </h2>
                    {loading ? (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] p-4 sm:p-5 h-20 sm:h-24 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <StatCard title="Restaurants" value={fmt(stats?.restaurants?.total)} sub={`${fmt(stats?.restaurants?.active)} active`} icon={Building2} color="purple" />
                            <StatCard title="Total Staff"  value={fmt(stats?.staff)}    icon={Users}        color="blue" />
                            <StatCard title="Orders"       value={fmt(stats?.orders)}   icon={ShoppingBag}  color="orange" />
                            <StatCard title="Revenue"      value={fmtCur(stats?.revenue)} icon={IndianRupee} color="emerald" />
                        </div>
                    )}
                </section>

                {/* ── Restaurants List ── */}
                <section>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h2 className="text-xs sm:text-sm font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">
                            All Restaurants
                        </h2>
                        <button
                            onClick={() => navigate('/superadmin/restaurants')}
                            className="text-sm text-[var(--primary)] hover:text-orange-400 flex items-center gap-1 transition-colors"
                        >
                            Manage <ChevronRight size={14} />
                        </button>
                    </div>

                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, i) => (
                                <div key={i} className="bg-[var(--theme-bg-card)] rounded-xl border border-[var(--theme-border)] h-16 animate-pulse" />
                            ))}
                        </div>
                    ) : (
                        <>
                            {/* Mobile / Tablet cards (< lg) */}
                            <div className="lg:hidden space-y-2">
                                {restaurants.length === 0 ? (
                                    <p className="text-center text-sm text-[var(--theme-text-muted)] py-8">No restaurants found</p>
                                ) : restaurants.map((r) => (
                                    <RestaurantCard key={r._id} r={r} onClick={() => navigate(`/superadmin/restaurants/${r._id}`)} />
                                ))}
                            </div>

                            {/* Desktop table (>= lg) */}
                            <div className="hidden lg:block bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-[var(--theme-border)] text-xs text-[var(--theme-text-muted)] uppercase tracking-wide">
                                                <th className="px-4 py-3 text-left font-medium">Name</th>
                                                <th className="px-4 py-3 text-left font-medium hidden md:table-cell">Slug</th>
                                                <th className="px-4 py-3 text-left font-medium">Status</th>
                                                <th className="px-4 py-3 text-left font-medium hidden sm:table-cell">Plan</th>
                                                <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Orders</th>
                                                <th className="px-4 py-3 text-right font-medium hidden sm:table-cell">Staff</th>
                                                <th className="px-4 py-3" />
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {restaurants.length === 0 ? (
                                                <tr>
                                                    <td colSpan={7} className="px-4 py-8 text-center text-[var(--theme-text-muted)]">
                                                        No restaurants found
                                                    </td>
                                                </tr>
                                            ) : restaurants.map((r) => (
                                                <RestaurantRow key={r._id} r={r} onClick={() => navigate(`/superadmin/restaurants/${r._id}`)} />
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </section>
            </main>
        </div>
    );
}
