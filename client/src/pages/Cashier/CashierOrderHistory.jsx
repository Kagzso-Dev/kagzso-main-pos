import { useState, useEffect, useContext, useCallback, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../context/AuthContext';
import api from '../../api';
import {
    Utensils,
    Package,
    Grid,
    ShoppingBag,
    Clock,
    History,
    WifiOff,
    RefreshCw,
    Printer,
    LayoutGrid
} from 'lucide-react';
import { printBill } from '../../components/BillPrint';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';

/* ── Elapsed time hook ───────────────────────────────────────────────────── */
const useElapsed = (createdAt) => {
    const [elapsed, setElapsed] = useState('');
    useEffect(() => {
        const calc = () => {
            const diff = Math.floor((Date.now() - new Date(createdAt)) / 1000);
            if (diff < 60) { setElapsed(`${diff}s`); return; }
            const m = Math.floor(diff / 60);
            if (m < 60) { setElapsed(`${m}m ${diff % 60}s`); return; }
            const h = Math.floor(m / 60);
            if (h < 24) { setElapsed(`${h}h ${m % 60}m`); return; }
            const days = Math.floor(h / 24);
            if (days < 30) { setElapsed(`${days}d ${h % 24}h`); return; }
            const months = Math.floor(days / 30);
            if (months < 12) { setElapsed(`${months}mo ${days % 30}d`); return; }
            setElapsed(`${Math.floor(months / 12)}y ${months % 12}mo`);
        };
        calc();
        const id = setInterval(calc, 1000);
        return () => clearInterval(id);
    }, [createdAt]);
    return elapsed;
};

/* ── KOT-style Box Card (Waiter style) ───────────────────────────────────── */
const WaiterBoxCard = memo(({ order, formatPrice, kotPrintEnabled, settings }) => {
    const elapsed = useElapsed(order.createdAt);
    const urgency = (Date.now() - new Date(order.createdAt)) > 600000;
    const isReady = order.orderStatus?.toLowerCase() === 'ready';

    const handlePrint = (e) => {
        e.stopPropagation();
        printBill(order, formatPrice, settings || {});
    };

    const bgColor =
        order.paymentStatus === 'paid' ? 'bg-red-500/10 border-red-500/30' :
            order.orderStatus === 'pending' ? 'bg-orange-500/10 border-orange-500/30' :
                order.orderStatus === 'accepted' ? 'bg-blue-500/10 border-blue-500/30' :
                    order.orderStatus === 'preparing' ? 'bg-indigo-500/10 border-indigo-500/30' :
                        order.orderStatus === 'ready' ? 'bg-emerald-500/10 border-emerald-500/40' :
                            order.orderStatus === 'readyToServe' ? 'bg-blue-500/10 border-blue-500/30' :
                                order.orderStatus === 'payment' ? 'bg-red-500/10 border-red-500/30' :
                                    order.orderStatus === 'cancelled' ? 'bg-rose-500/10 border-rose-500/30' :
                                        order.orderStatus === 'completed' ? 'bg-gray-500/10 border-gray-500/30' :
                                            'bg-[var(--theme-bg-dark)] border-[var(--theme-border)]';

    const borderAccent =
        order.paymentStatus === 'paid' ? 'border-l-red-500' :
            order.orderStatus === 'pending' ? 'border-l-orange-500' :
                order.orderStatus === 'accepted' ? 'border-l-blue-500' :
                    order.orderStatus === 'preparing' ? 'border-l-indigo-500' :
                        order.orderStatus === 'ready' ? 'border-l-emerald-500' :
                            order.orderStatus === 'readyToServe' ? 'border-l-blue-500' :
                                order.orderStatus === 'payment' ? 'border-l-red-500' :
                                    order.orderStatus === 'cancelled' ? 'border-l-rose-500' :
                                        order.orderStatus === 'completed' ? 'border-l-gray-600' :
                                            'border-l-[var(--theme-text-muted)]';

    return (
        <div className={`
            relative flex flex-col rounded-xl border border-l-4 shadow-sm transition-all duration-200
            hover:shadow-md active:scale-[0.98] cursor-pointer overflow-hidden h-full
            ${bgColor} ${borderAccent} ${isReady ? 'animate-pulse' : ''}
        `}>
            {/* ── Header ── */}
            <div className="px-2 sm:px-2.5 pt-2.5 pb-2 border-b border-black/[0.04]">
                <div className="flex items-center justify-between gap-1 mb-1 min-w-0">
                    <h3 className="min-w-0 text-[13px] sm:text-sm font-black text-[var(--theme-text-main)] tracking-tight leading-none truncate pr-1">
                        {order.orderType === 'dine-in' ? 'DI' : 'TK'}-{String(order.orderNumber).startsWith('ORD-') ? String(order.orderNumber).replace('ORD-', '') : order.orderNumber}
                    </h3>
                    <div className="flex items-center gap-1 shrink-0">
                        {kotPrintEnabled && (
                            <button
                                onClick={handlePrint}
                                title="Print"
                                aria-label="Print"
                                className="flex items-center justify-center gap-1 w-10 h-10 lg:w-auto lg:h-7 lg:px-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[10px] font-black rounded-lg transition-all shadow-sm shadow-blue-600/30 uppercase tracking-wide"
                            >
                                <Printer size={14} strokeWidth={2.5} className="lg:w-3 lg:h-3" />
                                <span className="hidden lg:inline">PRINT</span>
                            </button>
                        )}
                        <StatusBadge status={order.orderStatus} items={order.items || []} size="xs" />
                    </div>
                </div>

                <div className="flex flex-col gap-1 mt-1.5">
                    <div className="flex items-center justify-between gap-1 min-w-0">
                        <span className="inline-flex items-center gap-0.5 min-w-0 px-1.5 py-0.5 bg-white/60 border border-black/5 rounded-md text-[10px] font-black text-gray-700 shadow-sm max-w-[55%]">
                            <Utensils size={10} className="text-orange-500 shrink-0" />
                            <span className="truncate">
                                {order.orderType === 'dine-in'
                                    ? `T ${order.tableId?.number || order.tableId || '?'}`
                                    : `TK ${order.tokenNumber || '?'}`}
                            </span>
                        </span>
                        <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold shrink-0 tabular-nums ${urgency ? 'text-red-600 bg-red-100 px-1 py-0.5 rounded-md' : 'text-gray-400'}`}>
                            <Clock size={10} />{elapsed}
                        </span>
                    </div>
                </div>
            </div>

            {/* ── Items ── */}
            <div className="flex-1 px-2 py-2 space-y-1 min-h-[60px] max-h-[120px] overflow-y-auto custom-scrollbar">
                {(order.items || []).map((item, i) => {
                    const isCancelled = item.status?.toUpperCase() === 'CANCELLED';
                    return (
                        <div key={i} className="flex flex-col gap-0.5">
                            <div className="flex items-start gap-1.5">
                                <div className={`min-w-[1rem] h-4 px-0.5 rounded flex-shrink-0 flex items-center justify-center text-[10px] font-black ${isCancelled ? 'bg-red-50 text-red-400 border border-red-100' : 'bg-white/5 text-[var(--theme-text-muted)]'}`}>
                                    {item.quantity}
                                </div>
                                <span className={`flex-1 min-w-0 break-words text-[11px] sm:text-xs font-bold leading-tight line-clamp-2 ${isCancelled ? 'text-red-500 line-through' : 'text-[var(--theme-text-main)]'}`}>
                                    {item.name}{item.variant ? ` (${item.variant.name})` : ''}
                                </span>
                            </div>
                            {isCancelled && item.cancelReason && (
                                <p className="text-[10px] text-red-400/80 italic pl-5 leading-tight truncate">"{item.cancelReason}"</p>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* ── Footer ── */}
            <div className="px-2 py-2 border-t border-white/5 bg-white/[0.02] mt-auto">
                <div className="flex items-center justify-between gap-1">
                    <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-tighter shrink-0">
                        {order.orderType === 'dine-in' ? 'DINE' : 'TAKE'}
                    </span>
                    <span className="min-w-0 truncate text-[11px] sm:text-xs font-black text-[var(--theme-text-main)] tabular-nums">
                        {formatPrice ? formatPrice(order.finalAmount) : `₹${order.finalAmount}`}
                    </span>
                </div>
            </div>
        </div>
    );
});

/* ── Production Token Card ───────────────────────────────────────────────── */
const STATUS_META = {
    pending: { bar: 'bg-amber-500', card: 'bg-amber-50 border-amber-200', num: 'text-amber-600', badge: 'bg-amber-100 text-amber-700 border-amber-300', glow: 'shadow-amber-200' },
    accepted: { bar: 'bg-blue-500', card: 'bg-blue-50 border-blue-200', num: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border-blue-300', glow: 'shadow-blue-200' },
    preparing: { bar: 'bg-violet-500', card: 'bg-violet-50 border-violet-200', num: 'text-violet-600', badge: 'bg-violet-100 text-violet-700 border-violet-300', glow: 'shadow-violet-200' },
    ready: { bar: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-300', num: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-400', glow: 'shadow-emerald-300' },
    readytoserve: { bar: 'bg-blue-500', card: 'bg-blue-50 border-blue-200', num: 'text-blue-600', badge: 'bg-blue-100 text-blue-700 border-blue-300', glow: 'shadow-blue-200' },
    payment: { bar: 'bg-red-500', card: 'bg-red-50 border-red-200', num: 'text-red-700', badge: 'bg-red-100 text-red-800 border-red-300', glow: 'shadow-red-200' },
    completed: { bar: 'bg-gray-800', card: 'bg-gray-50 border-gray-300', num: 'text-gray-900', badge: 'bg-gray-200 text-gray-800 border-gray-400', glow: 'shadow-gray-200' },
    cancelled: { bar: 'bg-rose-500', card: 'bg-rose-50 border-rose-200', num: 'text-rose-600', badge: 'bg-rose-100 text-rose-700 border-rose-300', glow: 'shadow-rose-200' },
};

const TokenSquare = memo(({ order, onClick, isSelected }) => {
    const elapsed = useElapsed(order.createdAt);
    const s = STATUS_META[order.orderStatus?.toLowerCase()] || STATUS_META.completed;
    const isDine = order.orderType === 'dine-in';
    const identifier = isDine
        ? (order.tableId?.number || order.tableId || '?')
        : (order.tokenNumber || '?');
    const activeItems = order.items?.filter(i => i.status?.toUpperCase() !== 'CANCELLED') || [];
    const itemCount = activeItems.length;

    return (
        <button
            onClick={onClick}
            style={{ transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease, ring 200ms ease' }}
            className={`
                w-full min-w-0 rounded-xl border flex flex-col overflow-hidden group text-left
                hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:scale-[0.98]
                ${s.card} ${s.glow} shadow-sm
                ${isSelected ? 'ring-2 ring-orange-500 ring-offset-1 -translate-y-0.5 shadow-lg shadow-orange-200' : ''}
            `}
        >
            {/* Status accent bar */}
            <div className={`h-1 w-full shrink-0 ${s.bar}`} />

            {/* Metric Top Section */}
            <div className="flex flex-col items-center pt-2.5 pb-2">
                <div className="flex items-center gap-1 mb-2 max-w-full px-1">
                    <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${s.bar}`} />
                    <span className={`text-[10px] font-black uppercase tracking-wider truncate ${s.num}`}>
                        {order.orderStatus}
                    </span>
                </div>

                <div className="flex flex-col items-center justify-center max-w-full px-1">
                    <span className="text-2xl sm:text-3xl font-black leading-none tracking-tighter text-black group-hover:scale-110 transition-transform duration-200 truncate max-w-full">
                        {identifier}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.15rem] text-black mt-1">
                        {isDine ? 'TABLE' : 'TOKEN'}
                    </span>
                </div>
            </div>

            {/* Middle Section: Financial & Order Info */}
            <div className="grid grid-cols-2 border-t border-black/[0.04] bg-black/[0.01]">
                <div className="flex flex-col items-center min-w-0 px-1 py-1.5 border-r border-black/[0.04]">
                    <span className="text-[11px] font-black text-black tracking-tight leading-none truncate max-w-full">
                        {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(order.finalAmount)}
                    </span>
                    <span className="text-[10px] font-black text-black uppercase tracking-tight mt-0.5">AMOUNT</span>
                </div>
                <div className="flex flex-col items-center min-w-0 px-1 py-1.5">
                    <span className="text-[11px] font-black text-black tracking-tight leading-none truncate max-w-full">
                        {order.orderType === 'dine-in' ? 'DI' : 'TK'}-{String(order.orderNumber).startsWith('ORD-') ? String(order.orderNumber).replace('ORD-', '') : order.orderNumber}
                    </span>
                    <span className="text-[10px] font-black text-black uppercase tracking-tight mt-0.5 truncate max-w-full">
                        {order.orderType === 'dine-in' ? 'DINE IN' : 'TAKEAWAY'}
                    </span>
                </div>
            </div>

            {/* Item list */}
            {(order.items || []).length > 0 && (
                <div className="px-2 pb-1.5 space-y-0.5 border-t border-black/[0.04] pt-1.5 text-left">
                    {(order.items || []).slice(0, 2).map((item, i) => {
                        const isCancelled = item.status?.toUpperCase() === 'CANCELLED';
                        return (
                            <div key={i} className="flex flex-col min-w-0">
                                <div className={`flex items-center gap-1 min-w-0 text-[10px] sm:text-[11px] font-bold leading-tight ${isCancelled ? 'text-red-500 line-through' : 'text-gray-950'}`}>
                                    <span className={`min-w-[1rem] h-4 px-0.5 rounded flex items-center justify-center text-[10px] font-black shrink-0 ${isCancelled ? 'bg-red-50 text-red-600 border border-red-200' : `${s.badge} border`}`}>
                                        {item.quantity}
                                    </span>
                                    <span className="truncate">{item.name}{item.variant ? ` · ${item.variant.name}` : ''}</span>
                                </div>
                            </div>
                        );
                    })}
                    {(order.items || []).length > 2 && (
                        <div className="pl-[1.25rem] w-full text-left">
                            <span className={`text-[10px] font-black ${s.num} opacity-70 uppercase tracking-tight`}>
                                +{(order.items || []).length - 2} more
                            </span>
                        </div>
                    )}
                </div>
            )}

            {/* Footer bar */}
            <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-t border-black/[0.04] bg-black/[0.025] shrink-0 mt-auto">
                <span className="flex items-center gap-1 text-[10px] font-black text-gray-400">
                    <ShoppingBag size={10} />
                    {itemCount}
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-black tabular-nums truncate ${(Date.now() - new Date(order.createdAt)) > 600000 ? 'text-red-500' : 'text-gray-400'}`}>
                    <Clock size={10} className="shrink-0" />
                    {elapsed}
                </span>
            </div>
        </button>
    );
});

/* ── Cashier Order History Component ─────────────────────────────────────── */
const CashierOrderHistory = () => {
    const [orders, setOrders] = useState([]);
    const { user, socket, formatPrice, settings } = useContext(AuthContext);
    const [filterType, setFilterType] = useState('all');
    const [isProductionMode, setIsProductionMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    useEffect(() => {
        if (filterType === 'dine-in' && settings?.dineInEnabled === false) setFilterType('all');
        if (filterType === 'takeaway' && settings?.takeawayEnabled === false) setFilterType('all');
    }, [settings?.dineInEnabled, settings?.takeawayEnabled, filterType]);

    const fetchOrders = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            setFetchError(false);
            const res = await api.get('/api/orders', {
                params: { status: 'history', limit: 100 },
                headers: { Authorization: `Bearer ${user.token}` },
            });
            setOrders(res.data.orders || []);
        } catch (err) {
            console.error('[CashierOrderHistory] fetch error:', err);
            setFetchError(true);
        } finally {
            setLoading(false);
        }
    }, [user]);

    // Background poll fallback every 15s
    useEffect(() => {
        if (!user) return;
        fetchOrders();
        const interval = setInterval(fetchOrders, 15000);
        return () => clearInterval(interval);
    }, [user, fetchOrders]);

    // Socket listeners for real-time history changes
    useEffect(() => {
        const onUpdate = (order) => {
            if (['completed', 'cancelled'].includes(order.orderStatus) || order.paymentStatus === 'paid') {
                setOrders(prev => {
                    const exists = prev.find(o => o._id === order._id);
                    if (exists) {
                        return prev.map(o => o._id === order._id ? order : o);
                    }
                    return [order, ...prev];
                });
            }
        };

        const onRefresh = () => fetchOrders();

        if (socket) {
            socket.on('order-completed', onUpdate);
            socket.on('orderCancelled', onUpdate);
            socket.on('order-updated', onUpdate);
            window.addEventListener('pos-refresh', onRefresh);
            return () => {
                socket.off('order-completed', onUpdate);
                socket.off('orderCancelled', onUpdate);
                socket.off('order-updated', onUpdate);
                window.removeEventListener('pos-refresh', onRefresh);
            };
        }
        window.addEventListener('pos-refresh', onRefresh);
        return () => window.removeEventListener('pos-refresh', onRefresh);
    }, [socket, fetchOrders]);

    const filteredOrders = orders
        .filter(o => settings?.dineInEnabled !== false || o.orderType !== 'dine-in')
        .filter(o => settings?.takeawayEnabled !== false || o.orderType !== 'takeaway')
        .filter(o => filterType === 'all' || o.orderType === filterType)
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return (
        <div className="flex flex-col gap-2 animate-fade-in text-left flex-1 overflow-hidden min-h-0 pb-4 h-full">
            {fetchError && (
                <div className="bg-red-500/10 border border-red-500/30 p-3 mx-2 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-bounce-subtle">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <WifiOff size={18} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-600">Network Connection Error</h3>
                            <p className="text-[10px] text-red-500 font-medium">Cannot retrieve order history from server.</p>
                        </div>
                    </div>
                    <button
                        onClick={fetchOrders}
                        className="w-full sm:w-auto min-h-[36px] px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95"
                    >
                        Try Again
                    </button>
                </div>
            )}

            {/* ── Subheader Controls ── */}
            <div className="shrink-0 px-2 sm:px-4 py-2 border-b border-[var(--theme-border)] bg-[var(--theme-bg-card)]/40 flex items-center justify-between gap-2 flex-wrap">
                {/* Type Filter Pills */}
                <div
                    className="flex items-center gap-1 p-0.5 bg-black/5 dark:bg-white/5 rounded-xl border border-[var(--theme-border)] shadow-inner overflow-x-auto no-scrollbar scroll-smooth"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {['all', 'dine-in', 'takeaway']
                        .filter(t => t !== 'dine-in' || settings?.dineInEnabled !== false)
                        .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                        .map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setFilterType(t)}
                                className={`min-h-[36px] px-3.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all duration-200 whitespace-nowrap active:scale-95 ${
                                    filterType === t
                                        ? 'bg-orange-600 text-white shadow-sm'
                                        : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                                }`}
                            >
                                {t === 'all' ? 'All' : t === 'dine-in' ? 'Dine In' : 'Takeaway'}
                            </button>
                        ))}
                </div>

                {/* Right controls: view toggle, count, refresh */}
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[11px] font-black uppercase tracking-wider text-[var(--theme-text-muted)] hidden sm:inline">
                        {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
                    </span>

                    <button
                        type="button"
                        onClick={() => setIsProductionMode(m => !m)}
                        title={isProductionMode ? 'Detailed Grid view' : 'Token view'}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${
                            isProductionMode
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                                : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'
                        }`}
                    >
                        {isProductionMode ? <LayoutGrid size={16} strokeWidth={2.5} /> : <Grid size={16} strokeWidth={2.5} />}
                    </button>

                    <button
                        type="button"
                        onClick={fetchOrders}
                        title="Refresh"
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg-dark)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] transition-all active:scale-95"
                    >
                        <RefreshCw size={15} strokeWidth={2.5} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* ── Main Content Area ── */}
            <div className="flex gap-0 relative flex-1 min-h-0 min-w-0 overflow-hidden">
                {/* ── Left panel (Order Grid) ── */}
                <div className="flex-1 min-w-0 kot-scroll transition-all duration-300 overflow-y-auto">
                    {loading && orders.length === 0 ? (
                        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-2">
                            {Array(8).fill(0).map((_, i) => (
                                <div key={i} className="skeleton rounded-2xl h-40 sm:h-48" />
                            ))}
                        </div>
                    ) : filteredOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center px-4 py-16 text-[var(--theme-text-subtle)] my-auto h-full">
                            <History size={52} className="mb-3 opacity-20" />
                            <h3 className="text-lg font-bold text-[var(--theme-text-muted)]">No history yet</h3>
                            <p className="text-sm mt-1">Completed & cancelled orders appear here.</p>
                        </div>
                    ) : (
                        <div className={`grid p-1.5 sm:p-2 w-full mx-auto gap-2 sm:gap-3 transition-all duration-300 ${
                            isProductionMode
                                ? selectedOrder
                                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                                : selectedOrder
                                    ? 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3'
                                    : 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                        }`}>
                            {filteredOrders.map(order => (
                                isProductionMode ? (
                                    <TokenSquare
                                        key={order._id}
                                        order={order}
                                        onClick={() => setSelectedOrder(order)}
                                        isSelected={selectedOrder?._id === order._id}
                                    />
                                ) : (
                                    <div
                                        key={order._id}
                                        onClick={() => setSelectedOrder(order)}
                                        className={`min-w-0 transition-all duration-200 rounded-xl ring-2 ${
                                            selectedOrder?._id === order._id
                                                ? 'ring-orange-500 shadow-lg shadow-orange-500/20'
                                                : 'ring-transparent'
                                        }`}
                                    >
                                        <WaiterBoxCard
                                            order={order}
                                            formatPrice={formatPrice}
                                            kotPrintEnabled={settings?.kotPrintEnabled !== false}
                                            settings={settings}
                                        />
                                    </div>
                                )
                            ))}
                        </div>
                    )}
                    <div className="pb-10" />
                </div>

                {/* ── Right Panel (Details Panel) ── desktop (lg+) only ── */}
                {selectedOrder && (
                    <div className="hidden lg:flex flex-col flex-shrink-0 min-h-0 overflow-y-auto lg:w-[380px] xl:w-[420px] 2xl:w-[460px] border-l border-[var(--theme-border)] bg-[var(--theme-bg-card)] animate-in slide-in-from-right duration-300 ease-out">
                        <OrderDetailsModal
                            variant="panel"
                            isOpen={true}
                            order={selectedOrder}
                            onClose={() => setSelectedOrder(null)}
                            formatPrice={formatPrice}
                            userRole="cashier"
                            settings={settings}
                        />
                    </div>
                )}
            </div>

            {/* ── Mobile (full-screen) / Tablet (centered modal) details ── below lg ── */}
            {selectedOrder && createPortal(
                <div className="lg:hidden">
                    <OrderDetailsModal
                        variant="overlay"
                        isOpen={true}
                        order={selectedOrder}
                        onClose={() => setSelectedOrder(null)}
                        formatPrice={formatPrice}
                        userRole="cashier"
                        settings={settings}
                    />
                </div>,
                document.body
            )}
        </div>
    );
};

export default CashierOrderHistory;
