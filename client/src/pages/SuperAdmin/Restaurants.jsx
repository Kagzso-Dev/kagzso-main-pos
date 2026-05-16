import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api';
import {
    Building2, Plus, Search, ChevronRight, CheckCircle2,
    XCircle, RefreshCw, ArrowLeft, ToggleLeft, ToggleRight,
    Trash2, X, Copy, Check, KeyRound, User, Pencil, Eye, EyeOff,
    Sun, Moon, Monitor, IndianRupee, TrendingUp
} from 'lucide-react';

/* ── Copy Button ─────────────────────────────────────────────────────────── */
const CopyBtn = ({ text }) => {
    const [copied, setCopied] = useState(false);
    const copy = () => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        });
    };
    return (
        <button onClick={copy} title="Copy"
            className="p-1 rounded text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] transition-colors">
            {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
        </button>
    );
};

/* ── Credentials Modal (after restaurant creation) ───────────────────────── */
const CredentialsModal = ({ restaurant, staff, onClose }) => {
    const roleColor = {
        admin:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
        waiter:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
        kitchen: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        cashier: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-[var(--theme-border)]">
                    <div className="flex items-center gap-2">
                        <KeyRound size={16} className="text-emerald-400" />
                        <h3 className="font-semibold text-[var(--theme-text-main)]">Restaurant Created</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)]">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                        <p className="text-sm text-emerald-400 font-medium">
                            <span className="font-bold">{restaurant?.name}</span> created successfully
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wide mb-1.5">Auto-Created Staff Credentials</p>
                        <p className="text-xs text-[var(--theme-text-subtle)] mb-3">Share these with the restaurant owner. Passwords can be changed in Settings.</p>
                        <div className="space-y-2">
                            {staff?.map((s) => (
                                <div key={s.role} className={`flex items-center justify-between px-3 py-2.5 rounded-xl border ${roleColor[s.role] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                    <div className="flex items-center gap-2">
                                        <User size={13} />
                                        <span className="text-xs font-semibold capitalize">{s.role}</span>
                                    </div>
                                    <div className="flex items-center gap-3 font-mono text-xs">
                                        <div className="flex items-center gap-0.5">
                                            <span className="opacity-60">u:</span>
                                            <span className="font-semibold">{s.username}</span>
                                            <CopyBtn text={s.username} />
                                        </div>
                                        <div className="flex items-center gap-0.5">
                                            <span className="opacity-60">p:</span>
                                            <span className="font-semibold">{s.password}</span>
                                            <CopyBtn text={s.password} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <button onClick={onClose}
                        className="w-full px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-dark)] transition-colors">
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ── Create Modal ─────────────────────────────────────────────────────────── */
const CreateModal = ({ onClose, onCreate }) => {
    const [form, setForm] = useState({ name: '', slug: '', plan: 'pro' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [createdData, setCreatedData] = useState(null);

    const slugify = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const handleNameChange = (e) => {
        const name = e.target.value;
        setForm((f) => ({ ...f, name, slug: slugify(name) }));
    };

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim() || !form.slug.trim()) { setError('Name and slug are required'); return; }
        setLoading(true);
        try {
            const { data } = await api.post('/superadmin/restaurants', form);
            onCreate(data);
            setCreatedData(data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create restaurant');
        } finally {
            setLoading(false);
        }
    };

    if (createdData) {
        return <CredentialsModal restaurant={createdData} staff={createdData.autoCreatedStaff} onClose={onClose} />;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-[var(--theme-border)]">
                    <h3 className="font-semibold text-[var(--theme-text-main)]">Create Restaurant</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)]">
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
                    <div>
                        <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Restaurant Name</label>
                        <input type="text" value={form.name} onChange={handleNameChange} autoFocus
                            className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--theme-text-main)] focus:outline-none focus:border-[var(--primary)] placeholder-[var(--theme-text-subtle)]"
                            placeholder="e.g. Skyline Grill" />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Slug (unique identifier)</label>
                        <input type="text" value={form.slug}
                            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                            className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--theme-text-main)] font-mono focus:outline-none focus:border-[var(--primary)] placeholder-[var(--theme-text-subtle)]"
                            placeholder="skyline-grill" />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Plan</label>
                        <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                            className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--theme-text-main)] focus:outline-none focus:border-[var(--primary)]">
                            <option value="trial">Trial</option>
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--theme-border)] text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)] transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-dark)] disabled:opacity-60 transition-colors">
                            {loading ? 'Creating…' : 'Create'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Edit Modal ───────────────────────────────────────────────────────────── */
const EditModal = ({ restaurant, onClose, onSave }) => {
    const [form, setForm]     = useState({ name: restaurant.name, slug: restaurant.slug, plan: restaurant.plan });
    const [loading, setLoading] = useState(false);
    const [error, setError]   = useState('');

    const slugify = (str) => str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

    const handleNameChange = (e) => {
        const name = e.target.value;
        setForm((f) => ({ ...f, name, slug: slugify(name) }));
    };

    const submit = async (e) => {
        e.preventDefault();
        setError('');
        if (!form.name.trim() || !form.slug.trim()) { setError('Name and slug are required'); return; }
        setLoading(true);
        try {
            const { data } = await api.put(`/superadmin/restaurants/${restaurant._id}`, form);
            onSave(data);
            onClose();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to update restaurant');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-[var(--theme-border)]">
                    <h3 className="font-semibold text-[var(--theme-text-main)]">Edit Restaurant</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)]">
                        <X size={16} />
                    </button>
                </div>
                <form onSubmit={submit} className="p-5 space-y-4">
                    {error && <div className="text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
                    <div>
                        <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Restaurant Name</label>
                        <input type="text" value={form.name} onChange={handleNameChange} autoFocus
                            className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--theme-text-main)] focus:outline-none focus:border-[var(--primary)]" />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Slug</label>
                        <input type="text" value={form.slug}
                            onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                            className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--theme-text-main)] font-mono focus:outline-none focus:border-[var(--primary)]" />
                    </div>
                    <div>
                        <label className="block text-xs text-[var(--theme-text-muted)] mb-1.5 font-medium">Plan</label>
                        <select value={form.plan} onChange={(e) => setForm((f) => ({ ...f, plan: e.target.value }))}
                            className="w-full bg-[var(--theme-input-bg)] border border-[var(--theme-border)] rounded-xl px-3 py-2.5 text-sm text-[var(--theme-text-main)] focus:outline-none focus:border-[var(--primary)]">
                            <option value="trial">Trial</option>
                            <option value="basic">Basic</option>
                            <option value="pro">Pro</option>
                            <option value="enterprise">Enterprise</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-1">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--theme-border)] text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)] transition-colors">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading}
                            className="flex-1 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-dark)] disabled:opacity-60 transition-colors">
                            {loading ? 'Saving…' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

/* ── Confirm Modal ──────────────────────────────────────────────────────────── */
const ConfirmModal = ({ title, message, confirmLabel, confirmClass, onConfirm, onClose, loading }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}>
        <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] w-full max-w-sm shadow-2xl p-6 space-y-4">
            <h3 className="font-semibold text-[var(--theme-text-main)]">{title}</h3>
            <p className="text-sm text-[var(--theme-text-muted)]">{message}</p>
            <div className="flex gap-3">
                <button onClick={onClose}
                    className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--theme-border)] text-sm text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)] transition-colors">
                    Cancel
                </button>
                <button onClick={onConfirm} disabled={loading}
                    className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-60 transition-colors text-white ${confirmClass}`}>
                    {loading ? 'Please wait…' : confirmLabel}
                </button>
            </div>
        </div>
    </div>
);

/* ── Staff Row (username + password inline editing) ──────────────────────── */
const StaffRow = ({ s, restaurantId, roleColor, onUpdate }) => {
    const [displayUn, setDisplayUn] = useState(s.username);
    const [showUn, setShowUn]       = useState(false);
    const [displayPw, setDisplayPw] = useState(s.plainPassword || '');
    const [showPass, setShowPass]   = useState(false);

    // username edit state
    const [unOpen, setUnOpen]     = useState(false);
    const [newUn, setNewUn]       = useState('');
    const [unSaving, setUnSaving] = useState(false);
    const [unSaved, setUnSaved]   = useState(false);
    const [unErr, setUnErr]       = useState('');

    // password reset state
    const [pwOpen, setPwOpen]     = useState(false);
    const [pw, setPw]             = useState('');
    const [pwSaving, setPwSaving] = useState(false);
    const [pwSaved, setPwSaved]   = useState(false);
    const [pwErr, setPwErr]       = useState('');

    const saveUsername = async () => {
        if (!newUn.trim()) return;
        setUnSaving(true); setUnErr('');
        try {
            const { data } = await api.patch(
                `/superadmin/restaurants/${restaurantId}/staff/${s._id}/username`,
                { username: newUn }
            );
            setDisplayUn(data.username);
            setShowUn(true);
            onUpdate?.({ _id: s._id, username: data.username });
            setUnSaved(true); setNewUn(''); setUnOpen(false);
            setTimeout(() => setUnSaved(false), 2000);
        } catch (e) {
            setUnErr(e.response?.data?.message || 'Failed');
        } finally { setUnSaving(false); }
    };

    const savePassword = async () => {
        if (!pw.trim()) return;
        setPwSaving(true); setPwErr('');
        try {
            await api.patch(
                `/superadmin/restaurants/${restaurantId}/staff/${s._id}/password`,
                { password: pw }
            );
            setDisplayPw(pw);
            setPwSaved(true); setPw(''); setPwOpen(false);
            setTimeout(() => setPwSaved(false), 2000);
        } catch (e) {
            setPwErr(e.response?.data?.message || 'Failed');
        } finally { setPwSaving(false); }
    };

    const openUsername = () => { setUnOpen(o => !o); setUnErr(''); setNewUn(displayUn); setPwOpen(false); };
    const openPassword = () => { setPwOpen(o => !o); setPwErr(''); setPw(''); setUnOpen(false); };

    return (
        <div className={`rounded-xl border ${roleColor[s.role] || 'bg-gray-500/10 text-gray-400 border-gray-500/20'} overflow-hidden`}>
            {/* Main row */}
            <div className="flex items-center justify-between px-3 py-2.5 gap-2 min-w-0 flex-wrap sm:flex-nowrap">
                <div className="flex items-center gap-2 shrink-0">
                    <User size={12} />
                    <span className="text-[10px] sm:text-xs font-semibold capitalize">{s.role}</span>
                </div>
                <div className="flex items-center gap-0.5 font-mono text-[10px] sm:text-xs min-w-0 flex-1 justify-end">
                    <span className="font-medium truncate max-w-[80px] sm:max-w-none">
                        {showUn ? displayUn : '••••••••'}
                    </span>
                    <button onClick={() => setShowUn(v => !v)} title={showUn ? 'Hide username' : 'Show username'}
                        className="p-1 rounded hover:bg-black/10 transition-colors shrink-0">
                        {showUn ? <EyeOff size={11} /> : <Eye size={11} />}
                    </button>
                    {showUn && <div className="shrink-0"><CopyBtn text={displayUn} /></div>}
                    <button onClick={openUsername} title="Edit username"
                        className="p-1 rounded hover:bg-black/10 transition-colors shrink-0">
                        {unSaved ? <Check size={11} className="text-emerald-400" /> : <Pencil size={11} />}
                    </button>
                    <button onClick={openPassword} title="Reset password"
                        className="p-1 rounded hover:bg-black/10 transition-colors shrink-0">
                        {pwSaved ? <Check size={11} className="text-emerald-400" /> : <KeyRound size={11} />}
                    </button>
                </div>
            </div>

            {/* Password display */}
            {displayPw && (
                <div className="flex items-center gap-1.5 px-3 pb-2 font-mono text-[10px] sm:text-xs opacity-80 min-w-0">
                    <span className="text-[9px] sm:text-[10px] opacity-60 shrink-0">pw:</span>
                    <span className="truncate flex-1 max-w-[100px] sm:max-w-none">{showPass ? displayPw : '••••••••'}</span>
                    <button onClick={() => setShowPass(v => !v)} className="p-0.5 rounded hover:bg-black/10 shrink-0" title={showPass ? 'Hide password' : 'Show password'}>
                        {showPass ? <EyeOff size={10} /> : <Eye size={10} />}
                    </button>
                    <div className="shrink-0"><CopyBtn text={displayPw} /></div>
                </div>
            )}

            {/* Inline username edit */}
            {unOpen && (
                <div className="px-3 pb-2.5 space-y-1.5 w-full">
                    <div className="flex gap-1.5">
                        <input
                            type="text"
                            value={newUn}
                            onChange={(e) => setNewUn(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                            onKeyDown={(e) => e.key === 'Enter' && saveUsername()}
                            placeholder="New username"
                            autoFocus
                            className="flex-1 min-w-0 bg-black/20 border border-current/20 rounded-lg px-2 py-1.5 sm:px-2.5 text-[10px] sm:text-xs placeholder-current/40 focus:outline-none focus:ring-1 focus:ring-current/40 font-mono"
                        />
                        <button onClick={saveUsername} disabled={unSaving || !newUn.trim()}
                            className="shrink-0 px-2 sm:px-2.5 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-[10px] sm:text-xs font-semibold disabled:opacity-40 transition-colors">
                            {unSaving ? '…' : 'Save'}
                        </button>
                    </div>
                    {unErr && <p className="text-[10px] sm:text-xs text-red-400 truncate">{unErr}</p>}
                </div>
            )}

            {/* Inline password reset */}
            {pwOpen && (
                <div className="px-3 pb-2.5 space-y-1.5 w-full">
                    <div className="flex gap-1.5">
                        <input
                            type="text"
                            value={pw}
                            onChange={(e) => setPw(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && savePassword()}
                            placeholder="New password"
                            autoFocus
                            className="flex-1 min-w-0 bg-black/20 border border-current/20 rounded-lg px-2 py-1.5 sm:px-2.5 text-[10px] sm:text-xs placeholder-current/40 focus:outline-none focus:ring-1 focus:ring-current/40 font-mono"
                        />
                        <button onClick={savePassword} disabled={pwSaving || !pw.trim()}
                            className="shrink-0 px-2 sm:px-2.5 py-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-[10px] sm:text-xs font-semibold disabled:opacity-40 transition-colors">
                            {pwSaving ? '…' : 'Save'}
                        </button>
                    </div>
                    {pwErr && <p className="text-[10px] sm:text-xs text-red-400 truncate">{pwErr}</p>}
                </div>
            )}
        </div>
    );
};

const ORDER_STATUSES = [
    { key: 'pending',   label: 'Pending',   cls: 'text-amber-400' },
    { key: 'accepted',  label: 'Accepted',  cls: 'text-purple-400' },
    { key: 'preparing', label: 'Preparing', cls: 'text-orange-400' },
    { key: 'ready',     label: 'Ready',     cls: 'text-emerald-400' },
    { key: 'payment',   label: 'Payment',   cls: 'text-blue-400' },
    { key: 'completed', label: 'Completed', cls: 'text-gray-400' },
    { key: 'cancelled', label: 'Cancelled', cls: 'text-red-400' },
];

const DEFAULT_STATUSES = { pending: true, accepted: true, preparing: true, ready: true, payment: true, completed: true, cancelled: true };

const fmtINR = (n) => `₹${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(n || 0)}`;

/* ── Right Detail Panel ──────────────────────────────────────────────────── */
const DetailPanel = ({ restaurant, onClose, onToggle, onDelete, onEdit, actionLoading, navigate }) => {
    const [staff, setStaff] = useState([]);
    const [staffLoading, setStaffLoading] = useState(false);
    const [orderStatuses, setOrderStatuses] = useState(DEFAULT_STATUSES);
    const [statusSaving, setStatusSaving] = useState(null);

    const roleColor = {
        admin:   'bg-purple-500/10 text-purple-400 border-purple-500/20',
        waiter:  'bg-blue-500/10 text-blue-400 border-blue-500/20',
        kitchen: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        cashier: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    };

    useEffect(() => {
        if (!restaurant) return;
        setStaffLoading(true);
        api.get(`/superadmin/restaurants/${restaurant._id}/staff`)
            .then(({ data }) => setStaff(data))
            .catch(() => setStaff([]))
            .finally(() => setStaffLoading(false));

        api.get(`/superadmin/restaurants/${restaurant._id}/settings`)
            .then(({ data }) => setOrderStatuses({ ...DEFAULT_STATUSES, ...data.orderStatusesConfig }))
            .catch(() => setOrderStatuses(DEFAULT_STATUSES));
    }, [restaurant?._id]);

    const toggleStatus = async (key) => {
        const enabled = !orderStatuses[key];
        setOrderStatuses(prev => ({ ...prev, [key]: enabled }));
        setStatusSaving(key);
        try {
            const { data } = await api.patch(`/superadmin/restaurants/${restaurant._id}/order-statuses`, { key, enabled });
            setOrderStatuses({ ...DEFAULT_STATUSES, ...data.orderStatusesConfig });
        } catch {
            setOrderStatuses(prev => ({ ...prev, [key]: !enabled }));
        } finally {
            setStatusSaving(null);
        }
    };

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 z-30 bg-black/30" onClick={onClose} />

            {/* Slide-in panel — full width on mobile, 320px on sm+ */}
            <aside className="fixed top-0 right-0 z-40 h-full w-full sm:w-80 bg-[var(--theme-bg-card)] border-l border-[var(--theme-border)] shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--theme-border)] shrink-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-purple-500/15 flex items-center justify-center text-purple-400 font-bold text-sm shrink-0">
                            {restaurant.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--theme-text-main)] truncate">{restaurant.name}</p>
                            <p className="text-xs text-[var(--theme-text-muted)] font-mono truncate">{restaurant.slug}</p>
                        </div>
                    </div>
                    <button onClick={onClose} title="Hide panel"
                        className="p-1.5 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)] shrink-0 ml-2">
                        <X size={15} />
                    </button>
                </div>

                {/* Scrollable body */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">

                    {/* Info */}
                    <div className="rounded-xl border border-[var(--theme-border)] overflow-hidden divide-y divide-[var(--theme-border)]">
                        <div className="flex items-center justify-between px-4 py-3 bg-[var(--theme-bg-deep)]">
                            <span className="text-xs text-[var(--theme-text-muted)]">Status</span>
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${restaurant.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                {restaurant.isActive ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                {restaurant.isActive ? 'Active' : 'Inactive'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 bg-[var(--theme-bg-deep)]">
                            <span className="text-xs text-[var(--theme-text-muted)]">Plan</span>
                            <span className="text-xs font-semibold text-[var(--theme-text-main)] capitalize">{restaurant.plan}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 bg-[var(--theme-bg-deep)]">
                            <span className="text-xs text-[var(--theme-text-muted)]">Revenue</span>
                            <span className="text-xs font-semibold text-emerald-400">{fmtINR(restaurant.revenue ?? 0)}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 bg-[var(--theme-bg-deep)]">
                            <span className="text-xs text-[var(--theme-text-muted)]">Orders</span>
                            <span className="text-xs font-semibold text-[var(--theme-text-main)]">{restaurant.orderCount ?? 0}</span>
                        </div>
                        <div className="flex items-center justify-between px-4 py-3 bg-[var(--theme-bg-deep)]">
                            <span className="text-xs text-[var(--theme-text-muted)]">Staff</span>
                            <span className="text-xs font-semibold text-[var(--theme-text-main)]">{restaurant.userCount ?? 0}</span>
                        </div>
                    </div>

                    {/* Order Status Toggles */}
                    <div>
                        <p className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wide mb-3">Order Statuses</p>
                        <div className="space-y-1.5">
                            {ORDER_STATUSES.map(({ key, label, cls }) => (
                                <div key={key} className="flex items-center justify-between px-3 py-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg-deep)]">
                                    <span className={`text-xs font-medium ${cls}`}>{label}</span>
                                    <button
                                        onClick={() => toggleStatus(key)}
                                        disabled={statusSaving === key}
                                        className="transition-colors disabled:opacity-40"
                                        title={orderStatuses[key] ? 'Disable' : 'Enable'}
                                    >
                                        {orderStatuses[key]
                                            ? <ToggleRight size={22} className="text-emerald-400" />
                                            : <ToggleLeft size={22} className="text-[var(--theme-text-muted)]" />
                                        }
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Staff logins — click key icon to set password */}
                    <div>
                        <p className="text-xs font-semibold text-[var(--theme-text-muted)] uppercase tracking-wide mb-1">Staff Logins</p>
                        <p className="text-xs text-[var(--theme-text-subtle)] mb-3">
                            <Pencil size={10} className="inline mr-0.5" /> edit username &nbsp;·&nbsp;
                            <KeyRound size={10} className="inline mr-0.5" /> reset password
                        </p>
                        {staffLoading ? (
                            <div className="flex justify-center py-6">
                                <RefreshCw size={16} className="animate-spin text-[var(--theme-text-muted)]" />
                            </div>
                        ) : staff.length === 0 ? (
                            <p className="text-xs text-[var(--theme-text-subtle)] text-center py-4">No staff found</p>
                        ) : (
                            <div className="space-y-2">
                                {staff.map((s) => (
                                    <StaffRow key={s._id} s={s} restaurantId={restaurant._id} roleColor={roleColor}
                                        onUpdate={(u) => setStaff(prev => prev.map(m => m._id === u._id ? { ...m, ...u } : m))} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer actions */}
                <div className="shrink-0 px-5 py-4 border-t border-[var(--theme-border)] space-y-2">
                    <button
                        onClick={() => navigate(`/superadmin/restaurants/${restaurant._id}`)}
                        className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 text-xs font-semibold transition-colors">
                        <ChevronRight size={14} /> View Full Details
                    </button>
                    <button onClick={() => onEdit(restaurant)}
                        className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 text-xs font-semibold transition-colors">
                        <Pencil size={13} /> Edit Restaurant
                    </button>
                    {restaurant._id !== 1 && (
                        <>
                            <button onClick={() => onToggle(restaurant)} disabled={actionLoading}
                                className={`w-full flex items-center justify-center gap-2 h-9 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 ${
                                    restaurant.isActive
                                        ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400'
                                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400'
                                }`}>
                                {restaurant.isActive ? <ToggleLeft size={14} /> : <ToggleRight size={14} />}
                                {restaurant.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button onClick={() => onDelete(restaurant)} disabled={actionLoading}
                                className="w-full flex items-center justify-center gap-2 h-9 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-semibold transition-colors disabled:opacity-50">
                                <Trash2 size={13} /> Delete Restaurant
                            </button>
                        </>
                    )}
                </div>
            </aside>
        </>
    );
};

/* ── Theme Cycle Button (page-local only) ──────────────────────────────── */
const PAGE_THEMES  = ['default', 'dark', 'light'];
const THEME_ICONS  = { default: Monitor, dark: Moon, light: Sun };
const THEME_LABELS = { default: 'Default', dark: 'Dark', light: 'Light' };

const ThemeCycleBtn = ({ theme, onCycle }) => {
    const Icon = THEME_ICONS[theme] || Monitor;
    return (
        <button
            onClick={onCycle}
            title={`Page theme: ${THEME_LABELS[theme] || theme} — click to switch`}
            className="p-2 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] transition-colors flex items-center gap-1.5"
        >
            <Icon size={16} />
            <span className="hidden lg:inline text-xs font-medium capitalize">{THEME_LABELS[theme]}</span>
        </button>
    );
};

/* ── Revenue Summary Cards ───────────────────────────────────────────────── */
const RevenueCards = ({ restaurants }) => {
    const totalRevenue = restaurants.reduce((s, r) => s + (r.revenue || 0), 0);
    const activeRevenue = restaurants.filter(r => r.isActive).reduce((s, r) => s + (r.revenue || 0), 0);
    const topRestaurant = [...restaurants].sort((a, b) => (b.revenue || 0) - (a.revenue || 0))[0];

    return (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            {/* Total Revenue */}
            <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                    <IndianRupee size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-[var(--theme-text-muted)] font-medium uppercase tracking-wide">Total Revenue</p>
                    <p className="text-xl font-bold text-[var(--theme-text-main)] mt-0.5 truncate">{fmtINR(totalRevenue)}</p>
                    <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">{restaurants.length} restaurants</p>
                </div>
            </div>

            {/* Active Revenue */}
            <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 flex-shrink-0">
                    <TrendingUp size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-[var(--theme-text-muted)] font-medium uppercase tracking-wide">Active Revenue</p>
                    <p className="text-xl font-bold text-[var(--theme-text-main)] mt-0.5 truncate">{fmtINR(activeRevenue)}</p>
                    <p className="text-xs text-[var(--theme-text-muted)] mt-0.5">{restaurants.filter(r => r.isActive).length} active</p>
                </div>
            </div>

            {/* Top Earner */}
            <div className="bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 flex-shrink-0">
                    <Building2 size={18} />
                </div>
                <div className="min-w-0">
                    <p className="text-xs text-[var(--theme-text-muted)] font-medium uppercase tracking-wide">Top Earner</p>
                    {topRestaurant ? (
                        <>
                            <p className="text-sm font-bold text-[var(--theme-text-main)] mt-0.5 truncate">{topRestaurant.name}</p>
                            <p className="text-xs text-orange-400 font-semibold mt-0.5">{fmtINR(topRestaurant.revenue)}</p>
                        </>
                    ) : (
                        <p className="text-sm text-[var(--theme-text-muted)] mt-0.5">—</p>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── Main Page ──────────────────────────────────────────────────────────────── */
export default function Restaurants() {
    const navigate = useNavigate();
    const [restaurants, setRestaurants] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [showCreate, setShowCreate] = useState(false);
    const [confirm, setConfirm] = useState(null);
    const [editTarget, setEditTarget] = useState(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [selectedRestaurant, setSelectedRestaurant] = useState(null);
    const [toast, setToast] = useState(null);

    /* ── Page-local theme (never touches global ThemeContext) ───────────── */
    const [pageTheme, setPageTheme] = useState('default');
    const cyclePageTheme = () => {
        setPageTheme(prev => {
            const idx = PAGE_THEMES.indexOf(prev);
            return PAGE_THEMES[(idx + 1) % PAGE_THEMES.length];
        });
    };

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3500);
    };

    const load = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/superadmin/restaurants');
            setRestaurants(data);
        } catch { /* silent */ }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const filtered = restaurants.filter((r) =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.slug.toLowerCase().includes(search.toLowerCase())
    );

    const handleEditSave = (updated) => {
        setRestaurants((prev) => prev.map((r) => r._id === updated._id ? updated : r));
        if (selectedRestaurant?._id === updated._id) setSelectedRestaurant(updated);
        showToast(`"${updated.name}" updated successfully`);
    };

    const handleToggle = async () => {
        setActionLoading(true);
        try {
            const { data } = await api.patch(`/superadmin/restaurants/${confirm.restaurant._id}/toggle`);
            setRestaurants((prev) => prev.map((r) => r._id === data._id ? data : r));
            if (selectedRestaurant?._id === data._id) setSelectedRestaurant(data);
            setConfirm(null);
            showToast(`"${data.name}" ${data.isActive ? 'activated' : 'deactivated'} successfully`);
        } catch (err) {
            setConfirm(null);
            showToast(err.response?.data?.message || 'Failed to update restaurant status', 'error');
        } finally { setActionLoading(false); }
    };

    const handleDelete = async () => {
        const name = confirm.restaurant.name;
        setActionLoading(true);
        try {
            await api.delete(`/superadmin/restaurants/${confirm.restaurant._id}`);
            setRestaurants((prev) => prev.filter((r) => r._id !== confirm.restaurant._id));
            if (selectedRestaurant?._id === confirm.restaurant._id) setSelectedRestaurant(null);
            setConfirm(null);
            showToast(`"${name}" deleted successfully`);
        } catch (err) {
            setConfirm(null);
            showToast(err.response?.data?.message || 'Failed to delete restaurant', 'error');
        } finally { setActionLoading(false); }
    };

    return (
        <div data-theme={pageTheme} className="h-screen overflow-y-auto bg-[var(--theme-bg-deep)] text-[var(--theme-text-main)]">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-[var(--theme-topbar-bg)] backdrop-blur border-b border-[var(--theme-border)] px-4 sm:px-6 h-14 sm:h-16 flex items-center gap-2 sm:gap-4">
                <button onClick={() => navigate('/superadmin')} className="p-2 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)] flex-shrink-0">
                    <ArrowLeft size={16} />
                </button>
                <Building2 size={16} className="text-purple-400 flex-shrink-0" />
                <h1 className="font-semibold truncate">Manage Restaurants</h1>
                <div className="ml-auto flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                    <ThemeCycleBtn theme={pageTheme} onCycle={cyclePageTheme} />
                    <button onClick={load} className="p-2 rounded-lg hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)]" title="Refresh">
                        <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setShowCreate(true)}
                        className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl bg-[var(--primary)] hover:bg-[var(--primary-dark)] text-white text-sm font-semibold transition-colors">
                        <Plus size={15} />
                        <span className="hidden xs:inline sm:inline">New</span>
                        <span className="hidden sm:inline"> Restaurant</span>
                    </button>
                </div>
            </header>

            <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-4 sm:space-y-6">
                {/* Revenue Summary */}
                {!loading && restaurants.length > 0 && (
                    <RevenueCards restaurants={restaurants} />
                )}

                {/* Search */}
                <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--theme-text-muted)]" />
                    <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search restaurants…"
                        className="w-full pl-10 pr-4 py-2.5 bg-[var(--theme-bg-card)] border border-[var(--theme-border)] rounded-xl text-sm text-[var(--theme-text-main)] placeholder-[var(--theme-text-subtle)] focus:outline-none focus:border-[var(--primary)]" />
                </div>

                {loading ? (
                    <div className="flex justify-center py-16">
                        <RefreshCw size={22} className="animate-spin text-[var(--theme-text-muted)]" />
                    </div>
                ) : (
                    <>
                        {/* Mobile cards (< md) */}
                        <div className="md:hidden space-y-2">
                            {filtered.length === 0 ? (
                                <p className="text-center text-sm text-[var(--theme-text-muted)] py-10">
                                    {search ? 'No restaurants match your search' : 'No restaurants yet'}
                                </p>
                            ) : filtered.map((r) => (
                                <div key={r._id}
                                    onClick={() => setSelectedRestaurant(prev => prev?._id === r._id ? null : r)}
                                    className={`bg-[var(--theme-bg-card)] rounded-xl border transition-all cursor-pointer active:scale-[0.99] ${
                                        selectedRestaurant?._id === r._id
                                            ? 'border-purple-400 ring-1 ring-purple-400/30'
                                            : 'border-[var(--theme-border)] hover:bg-[var(--theme-bg-hover)]'
                                    }`}>
                                    <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-3.5">
                                        <div className="flex items-center gap-3 flex-1 min-w-[150px]">
                                            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-sm flex-shrink-0">
                                                {r.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium text-sm sm:text-base text-[var(--theme-text-main)] truncate">{r.name}</p>
                                                <p className="text-[10px] sm:text-xs text-[var(--theme-text-muted)] font-mono truncate">{r.slug}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between sm:justify-end gap-2 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t border-[var(--theme-border)] sm:border-0">
                                            <span className={`inline-flex items-center gap-1 text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${
                                                r.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                            }`}>
                                                {r.isActive ? <CheckCircle2 size={10} className="sm:w-3 sm:h-3" /> : <XCircle size={10} className="sm:w-3 sm:h-3" />}
                                                {r.isActive ? 'Active' : 'Off'}
                                            </span>
                                            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 sm:gap-1.5">
                                                <button onClick={() => setEditTarget(r)}
                                                    className="p-1.5 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors">
                                                    <Pencil size={14} className="sm:w-4 sm:h-4" />
                                                </button>
                                                {r._id !== 1 && (
                                                    <button onClick={() => setConfirm({ type: 'toggle', restaurant: r })}
                                                        className={`p-1.5 rounded-lg transition-colors ${r.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)]'}`}>
                                                        {r.isActive ? <ToggleRight size={16} className="sm:w-[18px] sm:h-[18px]" /> : <ToggleLeft size={16} className="sm:w-[18px] sm:h-[18px]" />}
                                                    </button>
                                                )}
                                                {r._id !== 1 && (
                                                    <button onClick={() => setConfirm({ type: 'delete', restaurant: r })}
                                                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                                                        <Trash2 size={14} className="sm:w-4 sm:h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop table (>= md) */}
                        <div className="hidden md:block bg-[var(--theme-bg-card)] rounded-2xl border border-[var(--theme-border)] overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-[var(--theme-border)] text-xs text-[var(--theme-text-muted)] uppercase tracking-wide">
                                            <th className="px-5 py-3 text-left font-medium">Restaurant</th>
                                            <th className="px-5 py-3 text-left font-medium">Status</th>
                                            <th className="px-5 py-3 text-left font-medium hidden lg:table-cell">Plan</th>
                                            <th className="px-5 py-3 text-right font-medium hidden lg:table-cell">Revenue</th>
                                            <th className="px-5 py-3 text-right font-medium hidden lg:table-cell">Orders</th>
                                            <th className="px-5 py-3 text-right font-medium hidden lg:table-cell">Staff</th>
                                            <th className="px-5 py-3 text-right font-medium">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="px-5 py-10 text-center text-[var(--theme-text-muted)]">
                                                    {search ? 'No restaurants match your search' : 'No restaurants yet'}
                                                </td>
                                            </tr>
                                        ) : filtered.map((r) => (
                                            <tr key={r._id}
                                                onClick={() => setSelectedRestaurant(prev => prev?._id === r._id ? null : r)}
                                                className={`border-b border-[var(--theme-border)] hover:bg-[var(--theme-bg-hover)] transition-colors cursor-pointer ${
                                                    selectedRestaurant?._id === r._id ? 'bg-purple-500/5 border-l-2 border-l-purple-400' : ''
                                                }`}>
                                                <td className="px-5 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-bold text-xs flex-shrink-0">
                                                            {r.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <div className="font-medium text-[var(--theme-text-main)] truncate">{r.name}</div>
                                                            <div className="text-xs text-[var(--theme-text-muted)] font-mono truncate">{r.slug}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3">
                                                    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                                        r.isActive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                                                    }`}>
                                                        {r.isActive ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                                                        {r.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-5 py-3 text-[var(--theme-text-muted)] capitalize text-sm hidden lg:table-cell">{r.plan}</td>
                                                <td className="px-5 py-3 text-right hidden lg:table-cell">
                                                    <span className="text-emerald-400 font-semibold text-xs">{fmtINR(r.revenue)}</span>
                                                </td>
                                                <td className="px-5 py-3 text-[var(--theme-text-muted)] text-right hidden lg:table-cell">{r.orderCount}</td>
                                                <td className="px-5 py-3 text-[var(--theme-text-muted)] text-right hidden lg:table-cell">{r.userCount}</td>
                                                <td className="px-5 py-3" onClick={(e) => e.stopPropagation()}>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button onClick={() => setEditTarget(r)}
                                                            title="Edit restaurant"
                                                            className="p-2 rounded-lg text-blue-400 hover:bg-blue-500/10 transition-colors">
                                                            <Pencil size={15} />
                                                        </button>
                                                        {r._id !== 1 && (
                                                            <button onClick={() => setConfirm({ type: 'toggle', restaurant: r })}
                                                                title={r.isActive ? 'Deactivate' : 'Activate'}
                                                                className={`p-2 rounded-lg transition-colors ${r.isActive ? 'text-emerald-400 hover:bg-emerald-500/10' : 'text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg-hover)]'}`}>
                                                                {r.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                                                            </button>
                                                        )}
                                                        {r._id !== 1 && (
                                                            <button onClick={() => setConfirm({ type: 'delete', restaurant: r })}
                                                                title="Delete restaurant"
                                                                className="p-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors">
                                                                <Trash2 size={15} />
                                                            </button>
                                                        )}
                                                        {r._id === 1 && (
                                                            <span className="text-xs text-[var(--theme-text-subtle)] px-2">Primary</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
            </main>

            {/* Right detail panel */}
            {selectedRestaurant && (
                <DetailPanel
                    restaurant={selectedRestaurant}
                    onClose={() => setSelectedRestaurant(null)}
                    onToggle={(r) => setConfirm({ type: 'toggle', restaurant: r })}
                    onDelete={(r) => setConfirm({ type: 'delete', restaurant: r })}
                    onEdit={(r) => setEditTarget(r)}
                    actionLoading={actionLoading}
                    navigate={navigate}
                />
            )}

            {/* Modals */}
            {editTarget && (
                <EditModal
                    restaurant={editTarget}
                    onClose={() => setEditTarget(null)}
                    onSave={handleEditSave}
                />
            )}

            {showCreate && (
                <CreateModal
                    onClose={() => setShowCreate(false)}
                    onCreate={(r) => setRestaurants((prev) => [...prev, r])}
                />
            )}

            {confirm?.type === 'toggle' && (
                <ConfirmModal
                    title={confirm.restaurant.isActive ? 'Deactivate Restaurant?' : 'Activate Restaurant?'}
                    message={confirm.restaurant.isActive
                        ? `Staff at "${confirm.restaurant.name}" will lose access until reactivated.`
                        : `"${confirm.restaurant.name}" will be accessible again.`}
                    confirmLabel={confirm.restaurant.isActive ? 'Deactivate' : 'Activate'}
                    confirmClass={confirm.restaurant.isActive ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'}
                    onConfirm={handleToggle}
                    onClose={() => setConfirm(null)}
                    loading={actionLoading}
                />
            )}

            {confirm?.type === 'delete' && (
                <ConfirmModal
                    title="Delete Restaurant?"
                    message={`This will permanently delete "${confirm.restaurant.name}" and ALL its data — orders, menu, staff, tables. This cannot be undone.`}
                    confirmLabel="Delete Permanently"
                    confirmClass="bg-red-600 hover:bg-red-700"
                    onConfirm={handleDelete}
                    onClose={() => setConfirm(null)}
                    loading={actionLoading}
                />
            )}

            {toast && (
                <div className={`fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl border text-sm font-medium animate-fade-in ${
                    toast.type === 'error'
                        ? 'bg-red-500/10 border-red-500/30 text-red-400'
                        : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                }`}>
                    {toast.type === 'error' ? <XCircle size={15} /> : <CheckCircle2 size={15} />}
                    {toast.message}
                </div>
            )}
        </div>
    );
}
