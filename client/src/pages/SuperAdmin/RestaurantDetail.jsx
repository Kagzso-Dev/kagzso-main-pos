import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../api';
import {
    ArrowLeft, RefreshCw, Users, ShoppingBag, IndianRupee,
    CheckCircle2, XCircle, Plus, Trash2, Eye, EyeOff, X,
    Settings, ToggleLeft, ToggleRight, UserPlus
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
        <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] p-5 flex items-start gap-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${colors[color] || colors.blue}`}>
                <Icon size={20} />
            </div>
            <div>
                <p className="text-xs text-[var(--theme-text-muted)] font-medium uppercase tracking-wide">{title}</p>
                <p className="text-2xl font-bold text-[var(--theme-text-main)] mt-0.5">{value}</p>
                {sub && <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">{sub}</p>}
            </div>
        </div>
    );
};

/* ── Add Staff Modal ────────────────────────────────────────────────────── */
const AddStaffModal = ({ tenantId, onClose, onAdded }) => {
    const [form, setForm] = useState({ username: '', password: '', role: 'waiter', name: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.username || !form.password) { setError('Username and password required'); return; }
        setLoading(true);
        try {
            const { data } = await api.post(`/superadmin/restaurants/${tenantId}/staff`, form);
            onAdded(data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to add staff');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-[var(--theme-border)]">
                    <h3 className="font-semibold text-[var(--theme-text-main)]">Add Staff Member</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)]"><X size={16} /></button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Username</label>
                            <input
                                type="text"
                                value={form.username}
                                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                                className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--theme-text-main)] focus:outline-none focus:border-[var(--primary)]"
                                placeholder="waiter1"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Display Name</label>
                            <input
                                type="text"
                                value={form.name}
                                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                                className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--theme-text-main)] focus:outline-none focus:border-[var(--primary)]"
                                placeholder="Ravi Kumar"
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                                    className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 pr-10 text-sm text-[var(--theme-text-main)] focus:outline-none focus:border-[var(--primary)]"
                                    placeholder="••••••••"
                                />
                                <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]">
                                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                        <div>
                            <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Role</label>
                            <select
                                value={form.role}
                                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                                className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--theme-text-main)] focus:outline-none focus:border-[var(--primary)]"
                            >
                                <option value="admin">Admin</option>
                                <option value="waiter">Waiter</option>
                                <option value="kitchen">Kitchen</option>
                                <option value="cashier">Cashier</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--theme-border)] text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)] transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-dark)] disabled:opacity-60 transition-colors">
                            {loading ? 'Adding…' : 'Add Staff'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Setup Modal ─────────────────────────────────────────────────────────── */
const SetupModal = ({ tenantId, onClose, onDone }) => {
    const [form, setForm] = useState({ adminUsername: '', adminPassword: '' });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.adminUsername || !form.adminPassword) { setError('Both fields are required'); return; }
        setLoading(true);
        try {
            await api.post(`/superadmin/setup/${tenantId}`, form);
            onDone();
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Setup failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-[var(--theme-border)]">
                    <h3 className="font-semibold text-[var(--theme-text-main)]">Quick Setup</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)]"><X size={16} /></button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    <p className="text-sm text-[var(--theme-text-muted)]">Creates an admin account, settings, and starter categories for this restaurant.</p>
                    {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
                    <div>
                        <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Admin Username</label>
                        <input
                            type="text"
                            value={form.adminUsername}
                            onChange={(e) => setForm((f) => ({ ...f, adminUsername: e.target.value }))}
                            className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--theme-text-main)] focus:outline-none focus:border-[var(--primary)]"
                            placeholder="admin"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Admin Password</label>
                        <div className="relative">
                            <input
                                type={showPw ? 'text' : 'password'}
                                value={form.adminPassword}
                                onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                                className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 pr-10 text-sm text-[var(--theme-text-main)] focus:outline-none focus:border-[var(--primary)]"
                                placeholder="••••••••"
                            />
                            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]">
                                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--theme-border)] text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)] transition-colors">Cancel</button>
                        <button type="submit" disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-dark)] disabled:opacity-60 transition-colors">
                            {loading ? 'Setting up…' : 'Run Setup'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Role Badge ─────────────────────────────────────────────────────────── */
const RoleBadge = ({ role }) => {
    const map = {
        admin:   'bg-purple-500/10 text-purple-400',
        waiter:  'bg-blue-500/10   text-blue-400',
        kitchen: 'bg-orange-500/10 text-orange-400',
        cashier: 'bg-emerald-500/10 text-emerald-400',
    };
    return (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize ${map[role] || 'bg-gray-500/10 text-gray-400'}`}>
            {role}
        </span>
    );
};

/* ── Confirm Modal ──────────────────────────────────────────────────────── */
const ConfirmDeleteStaff = ({ user, onConfirm, onClose, loading }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold text-[var(--theme-text-main)]">Remove Staff Member?</h3>
            <p className="text-sm text-[var(--theme-text-muted)]">
                Remove <strong className="text-[var(--theme-text-main)]">{user.username}</strong> ({user.role})? They will no longer be able to log in.
            </p>
            <div className="flex gap-3">
                <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--theme-border)] text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)] transition-colors">Cancel</button>
                <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-60 transition-colors">
                    {loading ? 'Removing…' : 'Remove'}
                </button>
            </div>
        </div>
    </div>
);

/* ── Main Page ──────────────────────────────────────────────────────────── */
export default function RestaurantDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [restaurant, setRestaurant] = useState(null);
    const [stats, setStats] = useState(null);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modal, setModal] = useState(null); // 'addStaff' | 'setup' | { type: 'deleteStaff', user }
    const [deleteLoading, setDeleteLoading] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const [detailRes, staffRes] = await Promise.all([
                api.get(`/superadmin/restaurants/${id}/stats`),
                api.get(`/superadmin/restaurants/${id}/staff`),
            ]);
            setRestaurant(detailRes.data.restaurant);
            setStats(detailRes.data.stats);
            setStaff(staffRes.data);
        } catch {
            navigate('/superadmin/restaurants');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [id]);

    const handleToggleStatus = async () => {
        try {
            const { data } = await api.patch(`/superadmin/restaurants/${id}/toggle`);
            setRestaurant(data);
        } catch { /* silent */ }
    };

    const handleDeleteStaff = async () => {
        setDeleteLoading(true);
        try {
            await api.delete(`/superadmin/restaurants/${id}/staff/${modal.user._id}`);
            setStaff((prev) => prev.filter((u) => u._id !== modal.user._id));
            setModal(null);
        } catch { /* silent */ }
        finally { setDeleteLoading(false); }
    };

    const fmtCur = (n) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0)}`;

    if (loading) {
        return (
            <div className="min-h-screen bg-[var(--theme-bg-deep)] flex items-center justify-center">
                <RefreshCw size={24} className="animate-spin text-[var(--theme-text-muted)]" />
            </div>
        );
    }

    if (!restaurant) return null;

    const isPrimary = restaurant._id === 1;

    return (
        <div className="h-screen overflow-y-auto bg-[var(--theme-bg-deep)] text-[var(--theme-text-main)]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[var(--theme-topbar-bg)] backdrop-blur border-b border-[var(--theme-border)] px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
                <button onClick={() => navigate('/superadmin/restaurants')} className="p-2 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)] flex-shrink-0">
                    <ArrowLeft size={16} />
                </button>
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-sm flex-shrink-0">
                    {restaurant.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                    <h1 className="font-semibold truncate">{restaurant.name}</h1>
                    <p className="text-xs text-[var(--theme-text-muted)] font-mono truncate hidden sm:block">{restaurant.slug}</p>
                </div>
                <div className="ml-auto flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                    {!isPrimary && (
                        <button
                            onClick={handleToggleStatus}
                            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                                restaurant.isActive
                                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20'
                                    : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                        >
                            {restaurant.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                            <span className="hidden sm:block">{restaurant.isActive ? 'Deactivate' : 'Activate'}</span>
                        </button>
                    )}
                    <button
                        onClick={() => setModal('setup')}
                        className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl text-sm font-medium bg-[var(--theme-bg-card)] border border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:border-[var(--primary)] transition-colors"
                    >
                        <Settings size={14} />
                        <span className="hidden sm:block">Quick Setup</span>
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
                {/* Status badges */}
                <div className="flex flex-wrap items-center gap-2">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${
                        restaurant.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                        {restaurant.isActive ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {restaurant.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="text-xs text-[var(--theme-text-muted)] capitalize bg-[var(--theme-bg-card)] px-3 py-1.5 rounded-full border border-[var(--theme-border)]">
                        {restaurant.plan} plan
                    </span>
                    {isPrimary && (
                        <span className="text-xs text-purple-400 bg-purple-500/10 px-3 py-1.5 rounded-full">Primary</span>
                    )}
                </div>

                {/* Stats */}
                {stats && (
                    <section>
                        <h2 className="text-xs sm:text-sm font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider mb-3 sm:mb-4">Statistics</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                            <StatCard title="Total Orders"   value={stats.orders.total}   icon={ShoppingBag}  color="orange"  sub={`${stats.orders.completed} completed`} />
                            <StatCard title="Revenue"        value={fmtCur(stats.revenue)} icon={IndianRupee}  color="emerald" />
                            <StatCard title="Total Staff"    value={stats.staff.total}    icon={Users}        color="blue"    sub={`${stats.staff.admins} admin`} />
                            <StatCard title="Pending"        value={stats.orders.pending} icon={ShoppingBag}  color="purple" />
                        </div>
                    </section>
                )}

                {/* Staff */}
                <section>
                    <div className="flex items-center justify-between mb-3 sm:mb-4">
                        <h2 className="text-xs sm:text-sm font-semibold text-[var(--theme-text-muted)] uppercase tracking-wider">Staff Members</h2>
                        <button
                            onClick={() => setModal('addStaff')}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold transition-colors"
                        >
                            <UserPlus size={14} />
                            <span>Add Staff</span>
                        </button>
                    </div>

                    {/* Mobile cards (< sm) */}
                    <div className="sm:hidden space-y-2">
                        {staff.length === 0 ? (
                            <p className="text-sm text-[var(--theme-text-muted)] text-center py-8">No staff yet. Run Quick Setup or add manually.</p>
                        ) : staff.map((u) => (
                            <div key={u._id} className="bg-[var(--theme-bg-card)] rounded-xl border border-[var(--theme-border)] px-4 py-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-mono text-sm text-[var(--theme-text-main)] truncate">{u.username}</p>
                                    {u.name && <p className="text-xs text-[var(--theme-text-muted)] truncate">{u.name}</p>}
                                </div>
                                <RoleBadge role={u.role} />
                                <button
                                    onClick={() => setModal({ type: 'deleteStaff', user: u })}
                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors flex-shrink-0"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Desktop table (>= sm) */}
                    <div className="hidden sm:block bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-[var(--theme-border)] text-xs text-[var(--theme-text-muted)] uppercase tracking-wide">
                                        <th className="px-5 py-3 text-left font-medium">Username</th>
                                        <th className="px-5 py-3 text-left font-medium hidden md:table-cell">Name</th>
                                        <th className="px-5 py-3 text-left font-medium">Role</th>
                                        <th className="px-5 py-3 text-right font-medium">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {staff.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-5 py-10 text-center text-[var(--theme-text-muted)]">
                                                No staff yet. Run Quick Setup to create an admin, or add staff manually.
                                            </td>
                                        </tr>
                                    ) : staff.map((u) => (
                                        <tr key={u._id} className="border-b border-[var(--theme-border)] hover:bg-[var(--theme-bg-hover)] transition-colors">
                                            <td className="px-5 py-3 font-mono text-[var(--theme-text-main)]">{u.username}</td>
                                            <td className="px-5 py-3 text-[var(--theme-text-muted)] hidden md:table-cell">{u.name || '—'}</td>
                                            <td className="px-5 py-3"><RoleBadge role={u.role} /></td>
                                            <td className="px-5 py-3 text-right">
                                                <button
                                                    onClick={() => setModal({ type: 'deleteStaff', user: u })}
                                                    className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
                                                    title="Remove staff member"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            </main>

            {/* Modals */}
            {modal === 'addStaff' && (
                <AddStaffModal
                    tenantId={id}
                    onClose={() => setModal(null)}
                    onAdded={(u) => setStaff((prev) => [...prev, u])}
                />
            )}
            {modal === 'setup' && (
                <SetupModal
                    tenantId={id}
                    onClose={() => setModal(null)}
                    onDone={load}
                />
            )}
            {modal?.type === 'deleteStaff' && (
                <ConfirmDeleteStaff
                    user={modal.user}
                    onConfirm={handleDeleteStaff}
                    onClose={() => setModal(null)}
                    loading={deleteLoading}
                />
            )}
        </div>
    );
}
