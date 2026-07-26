import { useContext, useState, useMemo, useCallback, useRef, useEffect } from 'react';
import api from '../api';
import { AuthContext } from '../context/AuthContext';
import { X, ChevronDown, Pencil, Check } from 'lucide-react';
import TableCard, { STATUS_CONFIG } from './TableCard';
import { useTablesData } from '../hooks/useTablesData';

const TableGrid = ({
    onSelectTable,
    allowedStatuses = ['available', 'occupied', 'cleaning'],
    filterByAllowedStatuses = false,
    showCleanAction = false,
    onReserve,
    onCancelReservation,
}) => {
    const { tables, setTables } = useTablesData();
    const { user } = useContext(AuthContext);

    // ── Sidebar collapse state ─────────────────────────────────────────────────
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    useEffect(() => {
        const handler = (e) => setSidebarCollapsed(e.detail?.collapsed ?? true);
        window.addEventListener('sidebar-toggle', handler);
        return () => window.removeEventListener('sidebar-toggle', handler);
    }, []);

    // ── Section / filter state ────────────────────────────────────────────────
    const [activeTab, setActiveTab] = useState('All tables');
    const [statusFilter, setStatusFilter] = useState('all');
    const [filterOpen, setFilterOpen] = useState(false);
    const [editingSection, setEditingSection] = useState(null); // tableId being edited
    const [sectionInput, setSectionInput] = useState('');
    const filterRef = useRef(null);

    // ── Derive unique section names from table.section (DB-backed) ────────────
    const sectionNames = useMemo(() => {
        const names = new Set();
        tables.forEach(t => { if (t.section) names.add(t.section); });
        return ['All tables', ...Array.from(names).sort()];
    }, [tables]);

    // Reset active tab if its section disappears
    useEffect(() => {
        if (activeTab !== 'All tables' && !sectionNames.includes(activeTab)) {
            setActiveTab('All tables');
        }
    }, [sectionNames, activeTab]);

    // ── Filtered tables ───────────────────────────────────────────────────────
    const filtered = useMemo(() => {
        return tables.filter(t => {
            const inSection = activeTab === 'All tables' || (t.section || 'Other') === activeTab;
            const inStatus = statusFilter === 'all' || t.status === statusFilter;
            const isAllowed = !filterByAllowedStatuses || allowedStatuses.includes(t.status);
            return inSection && inStatus && isAllowed;
        });
    }, [tables, activeTab, statusFilter, filterByAllowedStatuses, allowedStatuses]);

    // ── Tables grouped by section ─────────────────────────────────────────────
    const grouped = useMemo(() => {
        const map = {};
        filtered.forEach(t => {
            const s = t.section || 'Other';
            if (!map[s]) map[s] = [];
            map[s].push(t);
        });
        return Object.fromEntries(Object.entries(map).sort(([a], [b]) => a.localeCompare(b)));
    }, [filtered]);

    // ── Section assignment — saves to DB via PATCH ────────────────────────────
    const assignSection = useCallback(async (tableId, sectionName) => {
        const trimmed = sectionName.trim() || null;
        // Optimistic update
        setTables(prev => prev.map(t => t._id === tableId ? { ...t, section: trimmed } : t));
        setEditingSection(null);
        setSectionInput('');
        try {
            await api.patch(`/api/tables/${tableId}/section`, { section: trimmed }, {
                headers: { Authorization: `Bearer ${user.token}` },
            });
        } catch (err) {
            // Revert on failure
            setTables(prev => prev.map(t => t._id === tableId ? { ...t, section: t.section } : t));
            alert(err.response?.data?.message || 'Failed to save section');
        }
    }, [user, setTables]);

    // ── Table action handlers ─────────────────────────────────────────────────
    const handleTableClick = useCallback((table) => {
        if (allowedStatuses.includes(table.status)) onSelectTable?.(table);
    }, [allowedStatuses, onSelectTable]);

    const handleCleanTable = useCallback(async (e, table) => {
        e.stopPropagation();
        try {
            await api.put(`/api/tables/${table._id}/clean`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            setTables(prev => prev.map(t => t._id === table._id ? { ...t, status: 'available', lockedBy: null } : t));
        } catch (err) { alert(err.response?.data?.message || 'Failed to mark table as clean'); }
    }, [user, setTables]);

    const handleReserveClick = useCallback(async (e, table) => {
        e.stopPropagation();
        if (onReserve) { onReserve(table._id); return; }
        try {
            const res = await api.put(`/api/tables/${table._id}/reserve`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            setTables(prev => prev.map(t => t._id === table._id ? res.data : t));
        } catch (err) { alert(err.response?.data?.message || 'Failed to reserve'); }
    }, [user, onReserve, setTables]);

    const handleCancelReservation = useCallback(async (e, table) => {
        e.stopPropagation();
        if (onCancelReservation) { onCancelReservation(table._id); return; }
        try {
            const res = await api.put(`/api/tables/${table._id}/release`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            setTables(prev => prev.map(t => t._id === table._id ? res.data : t));
        } catch (err) { alert(err.response?.data?.message || 'Failed to release'); }
    }, [user, onCancelReservation, setTables]);

    const isClickable = (table) => {
        if (table.status === 'available') return true;
        if (showCleanAction && table.status === 'cleaning') return true;
        return allowedStatuses.includes(table.status);
    };

    const getActions = (table) => {
        if (table.status === 'reserved') {
            return (
                <button
                    onClick={(e) => handleCancelReservation(e, table)}
                    className="p-1.5 bg-rose-500 text-white rounded-lg shadow-lg hover:bg-rose-600 transition-all active:scale-90"
                    title="Cancel Reservation"
                >
                    <X size={14} strokeWidth={3} />
                </button>
            );
        }
        return null;
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="font-sans">
            {/* ── Top bar: Section tabs + Filter dropdown ────────────────────── */}
            <div className="flex items-center justify-between border-b border-gray-200 mb-5">
                {/* Section tabs */}
                <div className="flex items-center gap-0 overflow-x-auto no-scrollbar">
                    {sectionNames.map(s => (
                        <button
                            key={s}
                            onClick={() => setActiveTab(s)}
                            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all duration-150 ${
                                activeTab === s
                                    ? 'border-red-500 text-red-500'
                                    : 'border-transparent text-gray-500 hover:text-gray-800'
                            }`}
                        >
                            {s}
                        </button>
                    ))}
                </div>

                {/* Filter By dropdown */}
                <div className="relative shrink-0 ml-4" ref={filterRef}>
                    <button
                        onClick={() => setFilterOpen(o => !o)}
                        className="flex items-center gap-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <span className="text-xs text-gray-400 font-semibold">Filter By</span>
                        <span className="text-gray-800 font-semibold capitalize">
                            {statusFilter === 'all' ? 'All Tables' : STATUS_CONFIG[statusFilter]?.label}
                        </span>
                        <ChevronDown size={14} className={`transition-transform ${filterOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {filterOpen && (
                        <div className="absolute right-0 top-full mt-1 w-40 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                            {['all', ...Object.keys(STATUS_CONFIG)].map(s => (
                                <button
                                    key={s}
                                    onClick={() => { setStatusFilter(s); setFilterOpen(false); }}
                                    className={`w-full text-left px-4 py-2.5 text-sm font-medium transition-colors ${statusFilter === s ? 'bg-red-50 text-red-600' : 'text-gray-700 hover:bg-gray-50'}`}
                                >
                                    {s === 'all' ? 'All Tables' : STATUS_CONFIG[s]?.label}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* ── Table groups ──────────────────────────────────────────────── */}
            {Object.keys(grouped).length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                    <p className="text-sm font-medium">No tables found</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([sectionName, sectionTables]) => (
                        <div key={sectionName}>
                            {/* Section heading */}
                            <p className="text-sm font-semibold text-gray-700 mb-3">{sectionName}</p>

                            {/* Table cards grid */}
                            <div className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 ${sidebarCollapsed ? 'lg:grid-cols-6 xl:grid-cols-7' : 'lg:grid-cols-5 xl:grid-cols-6'} gap-3`}>
                                {sectionTables.map(table => {
                                    const clickable = isClickable(table);
                                    return (
                                        <div key={table._id} className="flex flex-col gap-1.5 relative group/section">
                                            <TableCard
                                                table={table}
                                                variant="grid"
                                                clickable={clickable}
                                                onClick={() => clickable && handleTableClick(table)}
                                                actions={getActions(table)}
                                            />

                                            {/* Mark Clean */}
                                            {showCleanAction && table.status === 'cleaning' && (
                                                <button
                                                    onClick={(e) => handleCleanTable(e, table)}
                                                    className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 active:scale-[0.98] text-white text-base font-bold uppercase rounded-xl transition-all shadow-[0_4px_12px_rgba(16,185,129,0.2)] hover:shadow-[0_6px_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
                                                >
                                                    <Check size={18} strokeWidth={4} />
                                                    Clean
                                                </button>
                                            )}

                                            {/* Section assign button (admin only) — saves to DB */}
                                            {user?.role === 'admin' && (
                                                editingSection === table._id ? (
                                                    <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                                                        <input
                                                            autoFocus
                                                            value={sectionInput}
                                                            onChange={e => setSectionInput(e.target.value)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') assignSection(table._id, sectionInput);
                                                                if (e.key === 'Escape') { setEditingSection(null); setSectionInput(''); }
                                                            }}
                                                            placeholder="e.g. Main Floor"
                                                            className="flex-1 text-[9px] border border-gray-300 rounded px-1.5 py-1 outline-none focus:border-red-400 w-[55px]"
                                                        />
                                                        <button
                                                            onClick={() => assignSection(table._id, sectionInput)}
                                                            className="w-5 h-5 flex items-center justify-center bg-emerald-500 text-white rounded"
                                                        >
                                                            <Check size={10} />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); setEditingSection(table._id); setSectionInput(table.section || ''); }}
                                                        className="opacity-0 group-hover/section:opacity-100 flex items-center gap-0.5 text-[9px] text-gray-400 hover:text-red-500 transition-all font-medium"
                                                    >
                                                        <Pencil size={9} /> {table.section ? 'Section' : 'Set section'}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Click-outside to close filter */}
            {filterOpen && <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />}
        </div>
    );
};

export default TableGrid;
