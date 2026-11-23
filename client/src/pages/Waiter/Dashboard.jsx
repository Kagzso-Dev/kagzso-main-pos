import { useState, useEffect, useContext, useCallback, memo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AuthContext } from '../../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../../api';
import { queueAction } from '../../utils/syncEngine';
import { Utensils, Package, Grid, List, ShoppingBag, Clock, History, WifiOff, ChevronRight, ChevronLeft, RefreshCw, X, Armchair, LogOut, Printer, LayoutGrid, Loader2 } from 'lucide-react';
import TableGrid from '../../components/TableGrid';
import { printKOTSlip } from '../../components/KotPrint';
import { playWaiterSound } from '../../utils/bellSound';
import CancelOrderModal from '../../components/CancelOrderModal';
import OrderDetailsModal from '../../components/OrderDetailsModal';
import StatusBadge from '../../components/StatusBadge';
import NotificationBell from '../../components/NotificationBell';

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

/* ── KOT-style Box Card (Waiter) ─────────────────────────────────────────── */
const WaiterBoxCard = memo(({ order, formatPrice, kotPrintEnabled, settings, onUpdateStatus, userRole }) => {
    const elapsed = useElapsed(order.createdAt);
    const urgency = (Date.now() - new Date(order.createdAt)) > 600000;
    const isReady = order.orderStatus?.toLowerCase() === 'ready';
    const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

    const _statusChain = ['pending', 'accepted', 'preparing', 'ready'];
    const _statusLabelsShort = { accepted: 'ACCEPT', preparing: 'PREPARE', ready: 'READY' };
    const getNextEnabledStatus = (cur) => {
        const cfg = settings?.orderStatusesConfig;
        const idx = _statusChain.indexOf(cur?.toLowerCase());
        if (idx === -1) return null;
        for (let i = idx + 1; i < _statusChain.length; i++) {
            if (!cfg || cfg[_statusChain[i]] !== false) return _statusChain[i];
        }
        return null;
    };

    const handlePrintKOT = (e) => {
        e.stopPropagation();
        printKOTSlip(order, settings || {});
    };
    const isPaid = order.paymentStatus === 'paid';

    const bgColor =
        order.paymentStatus === 'paid' ? 'bg-red-500/10 border-red-500/30' :
            order.orderStatus === 'pending' ? 'bg-orange-500/10 border-orange-500/30' :
                order.orderStatus === 'accepted' ? 'bg-blue-500/10 border-blue-500/30' :
                    order.orderStatus === 'preparing' ? 'bg-indigo-500/10 border-indigo-500/30' :
                        order.orderStatus === 'ready' ? 'bg-emerald-500/10 border-emerald-500/40' :
                            order.orderStatus === 'readyToServe' ? 'bg-blue-500/10 border-blue-500/30' :
                                order.orderStatus === 'payment' ? 'bg-red-500/10 border-red-500/30' :
                                    'bg-[var(--theme-bg-dark)] border-[var(--theme-border)]';

    const borderAccent =
        order.paymentStatus === 'paid' ? 'border-l-red-500' :
            order.orderStatus === 'pending' ? 'border-l-orange-500' :
                order.orderStatus === 'accepted' ? 'border-l-blue-500' :
                    order.orderStatus === 'preparing' ? 'border-l-indigo-500' :
                        order.orderStatus === 'ready' ? 'border-l-emerald-500' :
                            order.orderStatus === 'readyToServe' ? 'border-l-blue-500' :
                                order.orderStatus === 'payment' ? 'border-l-red-500' :
                                    'border-l-[var(--theme-text-muted)]';

    const visibleItems = order.items?.filter(i => i.status?.toUpperCase() !== 'CANCELLED') || [];

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
                                onClick={handlePrintKOT}
                                title="Print KOT"
                                aria-label="Print KOT"
                                className="flex items-center justify-center gap-1 min-w-[44px] min-h-[44px] lg:min-w-0 lg:min-h-0 lg:w-auto lg:h-7 lg:px-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[10px] font-black rounded-lg transition-all shadow-sm shadow-blue-600/30 uppercase tracking-wide"
                            >
                                <Printer size={14} strokeWidth={2.5} className="lg:w-3 lg:h-3" />
                                <span className="hidden lg:inline">KOT</span>
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
                    <div className="flex items-center gap-1.5 min-w-0">
                        {userRole !== 'cashier' && settings?.kitchenEnabled === false &&
                            ['pending', 'accepted', 'preparing'].includes(order.orderStatus?.toLowerCase()) &&
                            getNextEnabledStatus(order.orderStatus) && onUpdateStatus ? (
                            <button
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (isUpdatingOrder) return;
                                    setIsUpdatingOrder(true);
                                    const nextStatus = getNextEnabledStatus(order.orderStatus);
                                    try { await onUpdateStatus(order._id, nextStatus); } finally { setIsUpdatingOrder(false); }
                                }}
                                disabled={isUpdatingOrder}
                                className={`px-2.5 py-1 flex items-center justify-center min-w-[55px] h-6 text-white text-[9px] font-black rounded-lg shadow-sm transition-all active:scale-95 uppercase tracking-wider
                                    ${order.orderStatus?.toLowerCase() === 'pending' ? 'bg-[var(--status-pending,#f59e0b)] hover:brightness-110' :
                                        order.orderStatus?.toLowerCase() === 'accepted' ? 'bg-[var(--status-accepted,#8b5cf6)] hover:brightness-110' :
                                            'bg-[var(--status-ready,#10b981)] hover:brightness-110'}
                                    ${isUpdatingOrder ? 'opacity-30' : ''}`}
                            >
                                {isUpdatingOrder ? <Loader2 size={11} className="animate-spin" /> : (_statusLabelsShort[getNextEnabledStatus(order.orderStatus)] || 'NEXT')}
                            </button>
                        ) : null}
                        <span className="min-w-0 truncate text-[11px] sm:text-xs font-black text-[var(--theme-text-main)] tabular-nums">
                            {formatPrice(order.finalAmount)}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
});

/* ── Order Card (List box style) ─────────────────────────────────────────── */
const OrderCard = memo(({ order, formatPrice }) => {
    const isReady = order.orderStatus?.toLowerCase() === 'ready';
    const isPaid = order.paymentStatus === 'paid';
    const borderColor =
        order.paymentStatus === 'paid' ? 'border-l-red-500' :
            order.orderStatus === 'pending' ? 'border-l-orange-500' :
                order.orderStatus === 'accepted' ? 'border-l-blue-500' :
                    order.orderStatus === 'preparing' ? 'border-l-indigo-500' :
                        order.orderStatus === 'readyToServe' ? 'border-l-blue-500' :
                            order.orderStatus === 'payment' ? 'border-l-red-500' :
                                'border-l-red-500';
    const bgColor =
        order.paymentStatus === 'paid' ? 'bg-red-500/5 border-red-500/30' :
            order.orderStatus === 'pending' ? 'bg-orange-500/5 border-orange-500/30' :
                order.orderStatus === 'accepted' ? 'bg-blue-500/5 border-blue-500/30' :
                    order.orderStatus === 'preparing' ? 'bg-indigo-500/5 border-indigo-500/30' :
                        order.orderStatus === 'ready' ? 'bg-emerald-500/5 border-emerald-500/40' :
                            order.orderStatus === 'readyToServe' ? 'bg-blue-500/5 border-blue-500/30' :
                                order.orderStatus === 'payment' ? 'bg-red-500/5 border-red-500/30' :
                                    'bg-[var(--theme-bg-card)]';

    return (
        <div className={`
            ${bgColor} ${isReady ? 'animate-pulse' : ''}
            rounded-2xl border border-[var(--theme-border)] border-l-4 shadow-sm
            hover:shadow-md active:scale-[0.99] transition-all cursor-pointer p-3.5
        `}>
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm font-black text-[var(--theme-text-main)] tracking-tight">{order.orderType === 'dine-in' ? 'DI' : 'TK'}-{String(order.orderNumber).startsWith('ORD-') ? String(order.orderNumber).replace('ORD-', '') : order.orderNumber}</span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-white/60 dark:bg-white/10 border border-[var(--theme-border)] text-[10px] font-black text-[var(--theme-text-main)] whitespace-nowrap shadow-sm">
                        {order.orderType === 'dine-in'
                            ? `Table ${order.tableId?.number || order.tableId || '?'}`
                            : `Token ${order.tokenNumber || '?'}`}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-black text-[var(--theme-text-main)]">{formatPrice(order.finalAmount)}</span>
                    <StatusBadge status={order.orderStatus} items={order.items || []} />
                </div>
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
                <p className="text-[11px] text-[var(--theme-text-subtle)] line-clamp-2 mt-1 px-1 opacity-70">
                    {(order.items || []).map(i => `${i.status?.toUpperCase() === 'CANCELLED' ? '~~' : ''}${i.quantity}× ${i.name}${i.variant ? ` (${i.variant.name})` : ''}${i.status?.toUpperCase() === 'CANCELLED' ? '~~' : ''}`).join(', ') || 'No items'}
                </p>
                <div className="flex items-center gap-1 text-[10px] text-[var(--theme-text-subtle)] font-bold shrink-0">
                    <Clock size={10} />
                    {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>
        </div>
    );
});

/* ── Production Token Card ───────────────────────────────────────────────── */
const STATUS_META = {
    pending: { bar: 'bg-amber-500', card: 'bg-amber-50   border-amber-200', num: 'text-amber-600', badge: 'bg-amber-100   text-amber-700   border-amber-300', glow: 'shadow-amber-200' },
    accepted: { bar: 'bg-blue-500', card: 'bg-blue-50    border-blue-200', num: 'text-blue-600', badge: 'bg-blue-100    text-blue-700    border-blue-300', glow: 'shadow-blue-200' },
    preparing: { bar: 'bg-violet-500', card: 'bg-violet-50  border-violet-200', num: 'text-violet-600', badge: 'bg-violet-100  text-violet-700  border-violet-300', glow: 'shadow-violet-200' },
    ready: { bar: 'bg-emerald-500', card: 'bg-emerald-50 border-emerald-300', num: 'text-emerald-600', badge: 'bg-emerald-100 text-emerald-700 border-emerald-400', glow: 'shadow-emerald-300' },
    readytoserve: { bar: 'bg-blue-500', card: 'bg-blue-50    border-blue-200', num: 'text-blue-600', badge: 'bg-blue-100    text-blue-700    border-blue-300', glow: 'shadow-blue-200' },
    payment: { bar: 'bg-red-500', card: 'bg-red-50  border-red-200', num: 'text-red-700', badge: 'bg-red-100  text-red-800  border-red-300', glow: 'shadow-red-200' },
    completed: { bar: 'bg-gray-800', card: 'bg-gray-50    border-gray-300', num: 'text-gray-900', badge: 'bg-gray-200    text-gray-800    border-gray-400', glow: 'shadow-gray-200' },
    cancelled: { bar: 'bg-rose-500', card: 'bg-rose-50    border-rose-200', num: 'text-rose-600', badge: 'bg-rose-100    text-rose-700    border-rose-300', glow: 'shadow-rose-200' },
};

const TokenSquare = memo(({ order, onClick, isSelected, settings, onUpdateStatus, kotPrintEnabled, userRole }) => {
    const elapsed = useElapsed(order.createdAt);
    const isReady = order.orderStatus?.toLowerCase() === 'ready';
    const s = STATUS_META[order.orderStatus?.toLowerCase()] || STATUS_META.pending;
    const isDine = order.orderType === 'dine-in';
    const identifier = isDine
        ? (order.tableId?.number || order.tableId || '?')
        : (order.tokenNumber || '?');
    const activeItems = order.items?.filter(i => i.status?.toUpperCase() !== 'CANCELLED') || [];
    const itemCount = activeItems.length;
    const [isUpdatingOrder, setIsUpdatingOrder] = useState(false);

    const _statusChain = ['pending', 'accepted', 'preparing', 'ready'];
    const _statusLabelsShort = { accepted: 'ACCEPT', preparing: 'PREPARE', ready: 'READY' };
    const getNextEnabledStatus = (cur) => {
        const cfg = settings?.orderStatusesConfig;
        const idx = _statusChain.indexOf(cur?.toLowerCase());
        if (idx === -1) return null;
        for (let i = idx + 1; i < _statusChain.length; i++) {
            if (!cfg || cfg[_statusChain[i]] !== false) return _statusChain[i];
        }
        return null;
    };

    // Use the DB flag as the canonical source — set by server when new items are added to a ready order,
    // cleared by server when all items are READY again.
    const isPartiallyReady = !!order.isPartiallyReady;

    return (
        <button
            onClick={onClick}
            style={{ transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms ease, ring 200ms ease' }}
            className={`
                w-full min-w-0 rounded-xl border flex flex-col overflow-hidden group
                hover:-translate-y-1 hover:shadow-xl active:translate-y-0 active:scale-[0.98]
                ${isPartiallyReady ? 'bg-amber-50 border-emerald-300 shadow-emerald-100' : `${s.card} ${s.glow}`}
                ${isReady && !isPartiallyReady ? 'shadow-md shadow-emerald-200' : 'shadow-sm'}
                ${isSelected ? 'ring-2 ring-orange-500 ring-offset-1 -translate-y-0.5 shadow-lg shadow-orange-200' : ''}
            `}
        >
            {/* Status accent bar */}
            <div className={`h-1 w-full shrink-0 ${isPartiallyReady ? 'bg-emerald-500' : s.bar} ${isReady ? 'animate-pulse' : ''}`} />

            {/* Metric Top Section (Value on Top, Label Below) */}
            <div className="flex flex-col items-center pt-2.5 pb-2">
                {/* 1. Status Row */}
                <div className="flex items-center gap-1 mb-2 max-w-full px-1">
                    <div className={`w-1.5 h-1.5 shrink-0 rounded-full ${isPartiallyReady ? 'bg-emerald-500' : s.bar}`} />
                    <span className={`text-[10px] font-black uppercase tracking-wider truncate ${isPartiallyReady ? 'text-emerald-700' : s.num}`}>
                        {isPartiallyReady ? 'Partial Ready' : order.orderStatus}
                    </span>
                </div>


                {/* 2. Primary Identifier (Table/Token) - FORCED BLACK */}
                <div className="flex flex-col items-center justify-center max-w-full px-1">
                    <span className={`text-2xl sm:text-3xl font-black leading-none tracking-tighter text-black group-hover:scale-110 transition-transform duration-200 truncate max-w-full`}>
                        {identifier}
                    </span>
                    <span className="text-[10px] font-black uppercase tracking-[0.15rem] text-black mt-1">
                        {isDine ? 'TABLE' : 'TOKEN'}
                    </span>
                </div>
            </div>

            {/* Middle Section: Financial & Order Info - FORCED BLACK */}
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
                    <span className="text-[10px] font-black text-black uppercase tracking-tight mt-0.5 truncate max-w-full">{order.orderType === 'dine-in' ? 'DINE IN' : 'TAKEAWAY'}</span>
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
                                {isCancelled && item.cancelReason && <p className="text-[10px] text-red-400 italic pl-5 truncate">"{item.cancelReason}"</p>}
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
            <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-t border-black/[0.04] bg-black/[0.025] shrink-0">
                <span className="flex items-center gap-1 text-[10px] font-black text-gray-400">
                    <ShoppingBag size={10} />
                    {itemCount}
                </span>
                <span className={`flex items-center gap-1 text-[10px] font-black tabular-nums truncate ${(Date.now() - new Date(order.createdAt)) > 600000 ? 'text-red-500' : 'text-gray-400'}`}>
                    <Clock size={10} className="shrink-0" />
                    {elapsed}
                </span>
            </div>

            {(kotPrintEnabled || (settings?.kitchenEnabled === false && userRole !== 'cashier' && ['pending', 'accepted', 'preparing'].includes(order.orderStatus?.toLowerCase()) && getNextEnabledStatus(order.orderStatus) && onUpdateStatus)) && (
                <div className="flex items-center justify-between gap-1 px-2 py-1.5 border-t border-black/[0.04] bg-black/[0.03] shrink-0" onClick={(e) => e.stopPropagation()}>
                    {kotPrintEnabled && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                printKOTSlip(order, settings || {});
                            }}
                            className="flex items-center justify-center gap-1 min-h-[44px] min-w-[44px] sm:min-w-0 sm:min-h-0 sm:px-2 sm:py-0.5 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-[9px] font-black rounded shrink-0 shadow-sm uppercase tracking-wide"
                            title="Print KOT"
                            aria-label="Print KOT"
                        >
                            <Printer size={10} strokeWidth={2.5} />
                            <span>KOT</span>
                        </button>
                    )}
                    {settings?.kitchenEnabled === false && userRole !== 'cashier' && ['pending', 'accepted', 'preparing'].includes(order.orderStatus?.toLowerCase()) && getNextEnabledStatus(order.orderStatus) && onUpdateStatus && (
                        <button
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (isUpdatingOrder) return;
                                setIsUpdatingOrder(true);
                                const nextStatus = getNextEnabledStatus(order.orderStatus);
                                try { await onUpdateStatus(order._id, nextStatus); } finally { setIsUpdatingOrder(false); }
                            }}
                            disabled={isUpdatingOrder}
                            className={`ml-auto px-2 py-0.5 flex items-center justify-center min-w-[50px] h-6 text-white text-[9px] font-black rounded shadow-sm transition-all active:scale-95 uppercase tracking-wider
                                ${order.orderStatus?.toLowerCase() === 'pending' ? 'bg-[var(--status-pending,#f59e0b)] hover:brightness-110' :
                                    order.orderStatus?.toLowerCase() === 'accepted' ? 'bg-[var(--status-accepted,#8b5cf6)] hover:brightness-110' :
                                        'bg-[var(--status-ready,#10b981)] hover:brightness-110'}
                                ${isUpdatingOrder ? 'opacity-30' : ''}`}
                        >
                            {isUpdatingOrder ? <Loader2 size={10} className="animate-spin" /> : (_statusLabelsShort[getNextEnabledStatus(order.orderStatus)] || 'NEXT')}
                        </button>
                    )}
                </div>
            )}
        </button>
    );
});

/* ── Main Component ───────────────────────────────────────────────────────── */
const WaiterDashboard = () => {
    const [orders, setOrders] = useState([]);
    const [, setTables] = useState([]);
    const location = useLocation();
    const activeTab = location.pathname.includes('/history') ? 'history' : 'active';
    const { user, socket, formatPrice, formatOrderNumber, settings } = useContext(AuthContext);
    const [statusFilter, setStatusFilter] = useState(null);
    const [filterType, setFilterType] = useState('all');
    useEffect(() => {
        if (filterType === 'dine-in' && settings?.dineInEnabled === false) setFilterType('all');
        if (filterType === 'takeaway' && settings?.takeawayEnabled === false) setFilterType('all');
    }, [settings?.dineInEnabled, settings?.takeawayEnabled, filterType]);
    const [showTables, setShowTables] = useState(false);
    const [showCounters, setShowCounters] = useState(false); // Default Off per user request
    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const selectedOrderRef = useRef(null);
    useEffect(() => { selectedOrderRef.current = selectedOrder; }, [selectedOrder]);
    const [cancelModal, setCancelModal] = useState({ isOpen: false, order: null, item: null });
    const [refreshing, setRefreshing] = useState(false);
    const [isProductionMode, setIsProductionMode] = useState(false);

    useEffect(() => {
        const local = localStorage.getItem('isProductionMode');
        if (local === null && settings?.dashboardView === 'prod') {
            setIsProductionMode(true);
        }
    }, [settings]);

    useEffect(() => {
        localStorage.setItem('isProductionMode', isProductionMode);
    }, [isProductionMode]);
    const navigate = useNavigate();

    // ── Voice Announcements ──
    const announcedReady = useRef(new Set());
    const announcedPayment = useRef(new Set());
    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);
    useEffect(() => {
        if (!orders.length) return;

        const typeAllowed = (o) => {
            if (o.orderType === 'dine-in'  && settings?.dineInEnabled  === false) return false;
            if (o.orderType === 'takeaway' && settings?.takeawayEnabled === false) return false;
            return true;
        };

        // "Ready" announcement
        if (user?.role !== 'cashier') {
            const newReady = orders.filter(o =>
                o.orderStatus?.toLowerCase() === 'ready' &&
                !announcedReady.current.has(o._id) &&
                typeAllowed(o)
            );
            newReady.forEach(o => {
                announcedReady.current.add(o._id);
                const identifier = o.orderType === 'dine-in'
                    ? `table number ${o.tableId?.number || o.tableId || '?'}`
                    : `token number ${o.tokenNumber || '?'}`;
                const msg = new SpeechSynthesisUtterance(`Ready order, ${o.orderType === 'dine-in' ? 'Dine In' : 'Takeaway'} ${identifier}`);
                msg.onend = () => {
                    const sc = settingsRef.current?.soundConfig;
                    if (sc && sc.waiterEnabled !== false)
                        playWaiterSound(sc.waiterSound, sc.waiterVolume ?? 0.6);
                };
                window.speechSynthesis.speak(msg);
            });
        }

        // "Payment" announcement
        const newPayment = orders.filter(o =>
            o.orderStatus?.toLowerCase() === 'payment' &&
            !announcedPayment.current.has(o._id) &&
            typeAllowed(o)
        );
        newPayment.forEach(o => {
            announcedPayment.current.add(o._id);
            const identifier = o.orderType === 'dine-in'
                ? `table number ${o.tableId?.number || o.tableId || '?'}`
                : `token number ${o.tokenNumber || '?'}`;
            const msg = new SpeechSynthesisUtterance(`Payment ready, ${o.orderType === 'dine-in' ? 'Dine In' : 'Takeaway'} ${identifier}`);
            msg.onend = () => {
                const sc = settingsRef.current?.soundConfig;
                if (sc && sc.waiterEnabled !== false)
                    playWaiterSound(sc.waiterSound, sc.waiterVolume ?? 0.6);
            };
            window.speechSynthesis.speak(msg);
        });
    }, [orders, settings?.dineInEnabled, settings?.takeawayEnabled]);

    const fetchOrders = useCallback(async () => {
        try {
            setLoading(true);
            setFetchError(false);
            const params = { limit: 100 };
            const isCashier = user?.role === 'cashier' ||
                (() => { try { return JSON.parse(sessionStorage.getItem('user') || '{}')?.role === 'cashier'; } catch { return false; } })() ||
                window.location.pathname.startsWith('/cashier');
            if (isCashier) {
                params.view = 'all';
            }
            const token = user?.token || (() => { try { return JSON.parse(sessionStorage.getItem('user') || '{}')?.token; } catch { return null; } })();
            const res = await api.get('/api/orders', { params, headers: token ? { Authorization: `Bearer ${token}` } : {} });
            setOrders(res.data.orders || []);
        } catch (err) { setFetchError(true); } finally { setLoading(false); }
    }, [user]);

    const handleReserveTable = useCallback(async (tableId) => {
        try {
            const res = await api.put(`/api/tables/${tableId}/reserve`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            setTables(prev => prev.map(t => t._id === tableId ? res.data : t));
        } catch (err) { alert(err.response?.data?.message || 'Failed to reserve table'); }
    }, [user]);

    const handleCancelReservation = useCallback(async (tableId) => {
        try {
            const res = await api.put(`/api/tables/${tableId}/release`, {}, { headers: { Authorization: `Bearer ${user.token}` } });
            setTables(prev => prev.map(t => t._id === tableId ? res.data : t));
        } catch (err) { alert(err.response?.data?.message || 'Failed to cancel reservation'); }
    }, [user]);

    // ── 5s Background Refresh (fallback for any missed socket events) ──
    useEffect(() => {
        if (!user) return;
        const interval = setInterval(fetchOrders, 5000);
        return () => clearInterval(interval);
    }, [user, fetchOrders]);

    useEffect(() => {
        if (user) fetchOrders();

        const onNew = (o) => setOrders(p => { if (p.find(x => x._id === o._id)) return p; return [o, ...p]; });

        // Uses selectedOrderRef so this handler never needs re-registration when
        // the user opens/closes order details — prevents listener teardown/re-add on every click
        const onUpdate = (o) => {
            setOrders(p => {
                const exists = p.find(x => x._id === o._id);
                return exists ? p.map(x => x._id === o._id ? o : x) : [o, ...p];
            });
            const cur = selectedOrderRef.current;
            if (cur?._id === o._id) {
                if (o.paymentStatus === 'paid' || o.orderStatus === 'cancelled') setSelectedOrder(null);
                else setSelectedOrder(o);
            }
        };

        const onRefresh = () => fetchOrders();

        if (socket) {
            socket.on('new-order', onNew);
            socket.on('order-updated', onUpdate);
            socket.on('order-completed', onUpdate);
            socket.on('orderCancelled', onUpdate);
            socket.on('itemUpdated', onUpdate);
            window.addEventListener('pos-refresh', onRefresh);
            return () => {
                socket.off('new-order', onNew);
                socket.off('order-updated', onUpdate);
                socket.off('order-completed', onUpdate);
                socket.off('orderCancelled', onUpdate);
                socket.off('itemUpdated', onUpdate);
                window.removeEventListener('pos-refresh', onRefresh);
            };
        }
        // No socket — fallback to pos-refresh polling
        window.addEventListener('pos-refresh', onRefresh);
        return () => window.removeEventListener('pos-refresh', onRefresh);
    }, [user, socket, fetchOrders]); // selectedOrder intentionally NOT here — use ref above

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const openId = params.get('openOrder');
        if (openId && orders.length > 0) {
            const target = orders.find(o => o._id === openId);
            if (target) { setSelectedOrder(target); navigate('/waiter', { replace: true }); }
        }
    }, [orders, navigate]);

    const handleCancelAction = async (orderId, arg2, arg3) => {
        const isItem = arg3 !== undefined;
        const url = isItem ? `/api/orders/${orderId}/items/${arg2}/cancel` : `/api/orders/${orderId}/cancel`;
        const reason = isItem ? arg3 : arg2;
        // Errors propagate to CancelOrderModal which shows the message and keeps modal open
        await api.put(url, { reason }, { headers: { Authorization: `Bearer ${user.token}` } });
    };

    const handleUpdateStatus = async (orderId, newStatus) => {
        // Optimistic update — card flips immediately on click
        setOrders(prev => prev.map(o => o._id === orderId ? { ...o, orderStatus: newStatus } : o));
        if (selectedOrderRef.current?._id === orderId) {
            setSelectedOrder(prev => prev ? { ...prev, orderStatus: newStatus } : prev);
        }
        try {
            await api.put(`/api/orders/${orderId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
            // Server confirms and emits order-updated → all pages update via socket
        } catch (err) {
            alert(err.response?.data?.message || "Action failed");
            fetchOrders(); // Roll back on failure
        }
    };

    const handleAddItems = async (orderId, items) => {
        try {
            await api.post(`/api/orders/${orderId}/add-items`,
                { items },
                { headers: { Authorization: `Bearer ${user.token}` } }
            );
        } catch (err) {
            console.log('[Dashboard] Add items failed, queuing:', err.message);
            await queueAction({
                type: 'add-items',
                orderId,
                items,
            });
            alert('Saved offline. Will sync when online.');
        }
    };

    const activeOrders = orders
        .filter(o => o.paymentStatus !== 'paid' && o.orderStatus !== 'cancelled')
        .filter(o => settings?.dineInEnabled !== false || o.orderType !== 'dine-in')
        .filter(o => settings?.takeawayEnabled !== false || o.orderType !== 'takeaway');

    const historyOrders = orders
        .filter(o => o.paymentStatus === 'paid')
        .filter(o => settings?.dineInEnabled !== false || o.orderType !== 'dine-in')
        .filter(o => settings?.takeawayEnabled !== false || o.orderType !== 'takeaway')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const counts = {
        pending: activeOrders.filter(o => o.orderStatus === 'pending').length,
        ready: activeOrders.filter(o => o.orderStatus === 'ready').length,
        history: historyOrders.length,
    };

    const filteredOrders = (activeTab === 'active' ? activeOrders : historyOrders)
        .filter(o => filterType === 'all' || o.orderType === filterType)
        .filter(o => {
            if (activeTab !== 'active') return true;
            if (!statusFilter) return true;
            return o.orderStatus === statusFilter;
        });

    const readyOrders = filteredOrders.filter(o => o.orderStatus === 'ready');
    const processOrders = filteredOrders.filter(o => o.orderStatus !== 'ready');
    const displayOrders = statusFilter
        ? (statusFilter === 'ready' ? readyOrders : processOrders)
        : filteredOrders;

    // TOKEN mode: prev / next navigation
    const tokenIdx = selectedOrder ? displayOrders.findIndex(o => o._id === selectedOrder._id) : -1;
    const goNext = useCallback(() => {
        if (tokenIdx < displayOrders.length - 1) setSelectedOrder(displayOrders[tokenIdx + 1]);
    }, [tokenIdx, displayOrders]);
    const goPrev = useCallback(() => {
        if (tokenIdx > 0) setSelectedOrder(displayOrders[tokenIdx - 1]);
    }, [tokenIdx, displayOrders]);

    return (
        <div className="flex flex-col gap-2 animate-fade-in text-left flex-1 overflow-hidden min-h-0 pb-4">
            {fetchError && (
                <div id="net-error-alert" className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 animate-bounce-subtle">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                            <WifiOff size={20} className="text-red-500" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-red-600">Network Connection Error</h3>
                            <p className="text-[10px] text-red-500 font-medium">Cannot reach the POS server.</p>
                        </div>
                    </div>
                    <button onClick={() => fetchOrders()} className="w-full sm:w-auto min-h-[40px] px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-[11px] font-black uppercase tracking-widest rounded-xl transition-all active:scale-95">Try Again</button>
                </div>
            )}

            {/* ── Desktop/Tablet: Action Bar ── */}
            {document.getElementById('topbar-portal') && createPortal(
                <div className="flex items-center justify-between w-full min-w-0 animate-fade-in px-1 gap-2">
                    {/* Left side: Filters (tablet + desktop) */}
                    <div className="hidden sm:flex items-center flex-1 min-w-0 max-w-full overflow-hidden">
                        <div
                            className="flex items-center gap-1 p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-[var(--theme-border)] shadow-inner overflow-x-auto no-scrollbar scroll-smooth w-fit max-w-full"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {['all', 'dine-in', 'takeaway']
                                .filter(t => t !== 'dine-in' || settings?.dineInEnabled !== false)
                                .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                                .map(t => (
                                    <button
                                        key={t}
                                        onClick={(e) => {
                                            setFilterType(t);
                                            e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                        }}
                                        className={`flex-shrink-0 min-h-[40px] lg:min-h-[36px] px-3 md:px-4 lg:px-5 py-2 rounded-xl text-[11px] font-black uppercase tracking-[0.1em] transition-all duration-300 whitespace-nowrap active:scale-95 ${filterType === t
                                                ? 'bg-orange-600 text-white shadow-[0_4px_12px_rgba(234,88,12,0.3)] scale-[1.02]'
                                                : 'text-[var(--theme-text-muted)] hover:text-orange-500 hover:bg-orange-500/5'
                                            }`}
                                    >
                                        {t === 'all' ? 'All' : t === 'dine-in' ? 'Dine' : 'Take'}
                                    </button>
                                ))}
                        </div>
                    </div>

                    {/* Right side: Actions + Utilities */}
                    <div className="flex items-center gap-2 ml-auto shrink-0">
                        {/* Primary Order Actions (tablet md+ / desktop) */}
                        <div className="hidden md:flex items-center gap-2 mr-1 lg:mr-2 border-r border-[var(--theme-border)] pr-2">
                            {user?.role !== 'cashier' && settings?.dineInEnabled !== false && settings?.dineInEnabled !== 0 && (
                                <button onClick={() => navigate('/dine-in')} title="Dine In" className="flex items-center justify-center gap-2 px-3 xl:px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-xl transition-all font-black text-[11px] uppercase tracking-widest shadow-lg shadow-orange-600/20 whitespace-nowrap min-h-[40px] active:scale-95">
                                    <Utensils size={14} strokeWidth={3} /> <span className="hidden lg:inline">Dine In</span>
                                </button>
                            )}
                            {user?.role !== 'cashier' && settings?.takeawayEnabled !== false && settings?.takeawayEnabled !== 0 && (
                                <button onClick={() => navigate('/take-away')} title="Takeaway" className="flex items-center justify-center gap-2 px-3 xl:px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all font-black text-[11px] uppercase tracking-widest shadow-lg shadow-blue-600/20 whitespace-nowrap min-h-[40px] active:scale-95">
                                    <Package size={14} strokeWidth={3} /> <span className="hidden lg:inline">Takeaway</span>
                                </button>
                            )}
                        </div>

                        {/* Utility controls & Refresh */}
                        <div className="flex items-center gap-1.5 ml-auto">
                            <button onClick={() => setShowCounters(prev => !prev)} title={showCounters ? 'Collapse Stats' : 'Expand Stats'}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90 border-2 ${showCounters
                                        ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/30'
                                        : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:border-orange-500'
                                    }`}>
                                <ChevronRight size={18} strokeWidth={3} className={`transition-transform duration-300 ${showCounters ? 'rotate-90' : ''}`} />
                            </button>

                            <button onClick={() => setIsProductionMode(!isProductionMode)} title={isProductionMode ? 'Detailed Grid view' : 'Token view'}
                                className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${isProductionMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}`}>
                                {isProductionMode ? <LayoutGrid size={16} strokeWidth={2.5} /> : <Grid size={16} strokeWidth={2.5} />}
                            </button>

                            {settings?.tableMapEnabled !== false && (
                                <button onClick={() => setShowTables(t => !t)} title="Tables"
                                    className={`hidden sm:flex w-10 h-10 items-center justify-center rounded-xl border transition-all active:scale-95 ${showTables ? 'bg-green-500/15 border-green-500/40 text-green-500 shadow-sm shadow-green-500/20' : 'bg-green-500/5 border-green-500/20 text-green-500 hover:bg-green-500/15 hover:border-green-500/40'}`}>
                                    <Armchair size={16} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>,
                document.getElementById('topbar-portal')
            )}

            {/* ── Row 2 (mobile + small tablet): Compact Filters & Actions ── */}
            {document.getElementById('topbar-portal-row2') && createPortal(
                <div className="flex flex-col w-full min-w-0 gap-1.5 animate-fade-in px-1 pb-1 md:hidden">
                    <div className="flex sm:hidden items-center gap-1.5 min-w-0">
                        {/* Filter Pill (Mobile) — compact horizontal scroll row */}
                        <div
                            className="flex items-center gap-1 p-0.5 bg-black/5 dark:bg-white/5 rounded-xl border border-[var(--theme-border)] shadow-inner overflow-x-auto no-scrollbar scroll-smooth min-w-0 flex-1"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            {['all', 'dine-in', 'takeaway']
                                .filter(t => t !== 'dine-in' || settings?.dineInEnabled !== false)
                                .filter(t => t !== 'takeaway' || settings?.takeawayEnabled !== false)
                                .map(t => (
                                    <button
                                        key={t}
                                        onClick={(e) => {
                                            setFilterType(t);
                                            e.currentTarget.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                                        }}
                                        className={`flex-1 flex-shrink-0 min-h-[40px] px-3 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all duration-300 whitespace-nowrap active:scale-95 ${filterType === t
                                                ? 'bg-orange-600 text-white shadow-sm'
                                                : 'text-[var(--theme-text-muted)] hover:text-orange-500'
                                            }`}
                                    >
                                        {t === 'all' ? 'All' : t === 'dine-in' ? 'Dine' : 'Take'}
                                    </button>
                                ))}
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                            {settings?.tableMapEnabled !== false && (
                                <button onClick={() => setShowTables(t => !t)} title="Tables" aria-label="Tables" className={`w-10 h-10 flex items-center justify-center rounded-xl border transition-all active:scale-95 ${showTables ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-500' : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] text-[var(--theme-text-muted)]'}`}>
                                    <Armchair size={16} strokeWidth={2.5} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Compact Creation Buttons */}
                    <div className="flex items-center gap-2 py-1">
                        {user?.role !== 'cashier' && settings?.dineInEnabled !== false && settings?.dineInEnabled !== 0 && (
                            <button onClick={() => navigate('/dine-in')} className="flex-1 min-w-0 flex items-center justify-center gap-2 h-11 bg-orange-600 text-white rounded-xl font-black text-[11px] uppercase tracking-wider active:scale-95 shadow-md shadow-orange-600/10 transition-all">
                                <Utensils size={14} strokeWidth={3} className="shrink-0" /> <span className="truncate">Dine In</span>
                            </button>
                        )}
                        {user?.role !== 'cashier' && settings?.takeawayEnabled !== false && settings?.takeawayEnabled !== 0 && (
                            <button onClick={() => navigate('/take-away')} className="flex-1 min-w-0 flex items-center justify-center gap-2 h-11 bg-blue-600 text-white rounded-xl font-black text-[11px] uppercase tracking-wider active:scale-95 shadow-md shadow-blue-600/10 transition-all">
                                <Package size={14} strokeWidth={3} className="shrink-0" /> <span className="truncate">Takeaway</span>
                            </button>
                        )}
                    </div>
                </div>,
                document.getElementById('topbar-portal-row2')
            )}

            {/* ── Stats (Mobile: Modal Popup | Desktop: Inline) ── */}
            {activeTab === 'active' && (
                <div className={`hidden sm:block overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${showCounters ? 'max-h-[400px] opacity-100 mb-3' : 'max-h-0 opacity-0 mb-0'}`}>
                    <div className="bg-[var(--theme-bg-card)] border-b border-[var(--theme-border)] shadow-sm p-2 md:p-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                            {[
                                { key: 'pending', count: counts.pending, color: 'orange', label: 'NEW KOT' },
                                { key: 'ready', count: counts.ready, color: 'emerald', label: 'READY' },
                                { key: 'preparing', count: activeOrders.filter(o => o.orderStatus === 'preparing').length, color: 'blue', label: 'PREPARING' },
                                { key: null, count: activeOrders.length, color: 'orange', label: 'ALL ACTIVE', isClear: true }
                            ].filter(({ key }) => {
                                if (key === null) return true;
                                const cfg = settings?.orderStatusesConfig;
                                return !cfg || cfg[key] !== false;
                            }).map(({ key, count, color, label, isClear }, idx) => {
                                const isActive = (statusFilter === key || (isClear && !statusFilter));
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => setStatusFilter(isClear ? null : key)}
                                        className={`
                                            group relative flex flex-col items-center justify-center py-2 px-3 rounded-2xl transition-all duration-300 border-2
                                            ${isActive
                                                ? 'bg-orange-500/10 border-orange-500 shadow-md shadow-orange-500/10 scale-[0.98]'
                                                : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)] hover:border-orange-500/30'
                                            }
                                        `}
                                    >
                                        <span className={`text-2xl font-black tabular-nums tracking-tighter transition-colors ${isActive ? 'text-orange-500' : 'text-[var(--theme-text-main)]'}`}>
                                            {count}
                                        </span>

                                        <div className="flex items-center gap-1 mt-1">
                                            <div className={`flex items-center opacity-60 ${isActive ? 'text-orange-500' : 'text-[var(--theme-text-muted)]'}`}>
                                                <ChevronRight size={10} strokeWidth={4} className="animate-chevron-r1" />
                                                <ChevronRight size={10} strokeWidth={4} className="-ml-1.5 opacity-60 font-black animate-chevron-r2" />
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-[0.1em] truncate ${isActive ? 'text-orange-500' : 'text-[var(--theme-text-muted)] group-hover:text-[var(--theme-text-main)]'}`}>
                                                {label}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Mobile Stats Modal Popup */}
            {activeTab === 'active' && showCounters && (
                <div className="sm:hidden fixed inset-0 z-[1001] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCounters(false)} />
                    <div className="relative w-full max-w-[320px] max-h-[90vh] overflow-y-auto bg-[var(--theme-bg-card)] rounded-[2rem] border border-[var(--theme-border)] shadow-2xl p-5 xs:p-6 animate-scale-in">
                        <div className="flex items-center justify-between gap-2 mb-5">
                            <h3 className="text-sm font-black uppercase tracking-widest text-[var(--theme-text-muted)] truncate">Order Statistics</h3>
                            <button onClick={() => setShowCounters(false)} aria-label="Close" className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-[var(--theme-bg-dark)]/50 text-[var(--theme-text-muted)]">
                                <X size={18} />
                            </button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { key: 'pending', count: counts.pending, color: 'orange', label: 'NEW KOT' },
                                { key: 'ready', count: counts.ready, color: 'emerald', label: 'READY' },
                                { key: 'preparing', count: activeOrders.filter(o => o.orderStatus === 'preparing').length, color: 'blue', label: 'PREPARING' },
                                { key: null, count: activeOrders.length, color: 'orange', label: 'ALL ACTIVE', isClear: true }
                            ].filter(({ key }) => {
                                if (key === null) return true;
                                const cfg = settings?.orderStatusesConfig;
                                return !cfg || cfg[key] !== false;
                            }).map(({ key, count, color, label, isClear }, idx) => {
                                const isActive = (statusFilter === key || (isClear && !statusFilter));
                                return (
                                    <button
                                        key={idx}
                                        onClick={() => {
                                            setStatusFilter(isClear ? null : key);
                                            setShowCounters(false);
                                        }}
                                        className={`
                                            group relative flex flex-col items-center justify-center py-4 rounded-2xl transition-all border-2
                                            ${isActive
                                                ? 'bg-orange-500/10 border-orange-500 shadow-lg shadow-orange-500/10'
                                                : 'bg-[var(--theme-bg-dark)] border-[var(--theme-border)]'
                                            }
                                        `}
                                    >
                                        <span className={`text-xl font-black tabular-nums transition-colors ${isActive ? 'text-orange-500' : 'text-[var(--theme-text-main)]'}`}>
                                            {count}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase tracking-wider mt-1 px-1 text-center ${isActive ? 'text-orange-500' : 'text-[var(--theme-text-muted)]'}`}>
                                            {label}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {showTables && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-0 sm:p-4" onClick={(e) => { if (e.target === e.currentTarget) setShowTables(false); }}>
                    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowTables(false)} />
                    <div className="relative bg-[var(--theme-bg-card)] rounded-none sm:rounded-3xl border-0 sm:border-2 border-[var(--theme-border)] shadow-2xl w-full h-full sm:h-auto max-w-full sm:max-w-3xl lg:max-w-4xl xl:max-w-5xl sm:max-h-[90vh] flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between gap-3 p-3 sm:p-5 border-b border-[var(--theme-border)] shrink-0 pt-safe">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 shrink-0 bg-emerald-500/10 rounded-xl flex items-center justify-center border border-emerald-500/20">
                                    <Grid size={20} className="text-emerald-500" />
                                </div>
                                <div className="min-w-0">
                                    <h2 className="text-base sm:text-lg font-black text-[var(--theme-text-main)] tracking-tight truncate">Table Map</h2>
                                    <p className="text-[10px] text-[var(--theme-text-muted)] uppercase font-bold tracking-widest opacity-60 truncate">Floor Overview</p>
                                </div>
                            </div>
                            <button onClick={() => setShowTables(false)} aria-label="Close" className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl hover:bg-red-500/10 hover:text-red-500 transition-colors text-[var(--theme-text-muted)]">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="overflow-y-auto overflow-x-hidden p-3 sm:p-5 flex-1 min-h-0">
                            <TableGrid
                                allowedStatuses={['available', 'occupied', 'cleaning']}
                                filterByAllowedStatuses={false}
                                showCleanAction={true}
                                onReserve={handleReserveTable}
                                onCancelReservation={handleCancelReservation}
                            />
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* ── Flex split: cards left + panel right (desktop) ─────────────── */}
            <div className="flex gap-0 relative flex-1 min-h-0 min-w-0 overflow-hidden">

                {/* ── Left panel (Order Grid) ────────────────────────────────── */}
                <div
                    className="flex-1 min-w-0 kot-scroll transition-all duration-300"
                >
                    {loading ? (
                        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-2">
                            {Array(8).fill(0).map((_, i) => <div key={i} className="skeleton rounded-2xl h-40 sm:h-48" />)}
                        </div>
                    ) : displayOrders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center text-center px-4 py-6 text-[var(--theme-text-subtle)]">
                            {activeTab === 'active' ? (
                                <>
                                    <ShoppingBag size={44} className="mb-2 opacity-20" />
                                    <h3 className="text-base font-extrabold text-[var(--theme-text-muted)]">{statusFilter ? `No ${statusFilter} orders` : 'No active orders'}</h3>
                                    <p className="text-xs mt-1 opacity-70 tracking-tight">{statusFilter ? `Try clearing the filter` : `Tap "New Order" to create one`}</p>
                                </>
                            ) : (
                                <>
                                    <History size={52} className="mb-3 opacity-20" />
                                    <h3 className="text-lg font-bold text-[var(--theme-text-muted)]">No history yet</h3>
                                    <p className="text-sm mt-1">Completed & cancelled orders appear here.</p>
                                </>
                            )}
                        </div>
                    ) : (
                        <div className={`grid p-1.5 sm:p-2 w-full mx-auto gap-2 sm:gap-3 transition-all duration-300 ${isProductionMode
                                ? selectedOrder
                                    ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5'
                                    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
                                : selectedOrder
                                    ? 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3'
                                    : 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6'
                            }`}>
                            {displayOrders.map(order => (
                                isProductionMode
                                    ? <TokenSquare key={order._id} order={order} onClick={() => setSelectedOrder(order)} isSelected={selectedOrder?._id === order._id} settings={settings} onUpdateStatus={user?.role === 'cashier' ? null : handleUpdateStatus} kotPrintEnabled={settings?.kotPrintEnabled !== false} userRole={user?.role} />
                                    : (
                                        <div
                                            key={order._id}
                                            onClick={() => setSelectedOrder(order)}
                                            className={`min-w-0 transition-all duration-200 rounded-xl ring-2 ${selectedOrder?._id === order._id ? 'ring-orange-500 shadow-lg shadow-orange-500/20' : 'ring-transparent'}`}
                                        >
                                            <WaiterBoxCard order={order} formatPrice={formatPrice} kotPrintEnabled={settings?.kotPrintEnabled !== false} settings={settings} onUpdateStatus={user?.role === 'cashier' ? null : handleUpdateStatus} userRole={user?.role} />
                                        </div>
                                    )
                            ))}
                        </div>
                    )}
                    <div className="pb-10" />
                </div>

                {/* ── Right Panel (Details Panel) ── desktop (lg+) only ─────────── */}
                {selectedOrder && (
                    <div
                        className="hidden lg:flex flex-col flex-shrink-0 min-h-0 overflow-y-auto lg:w-[380px] xl:w-[420px] 2xl:w-[460px] border-l border-[var(--theme-border)] bg-[var(--theme-bg-card)] animate-in slide-in-from-right duration-300 ease-out"
                    >
                        <OrderDetailsModal
                            variant="panel"
                            isOpen={true}
                            order={selectedOrder}
                            onClose={() => setSelectedOrder(null)}
                            formatPrice={formatPrice}
                            userRole={user?.role}
                            onCancelItem={user?.role === 'cashier' ? null : (o, i) => setCancelModal({ isOpen: true, order: o, item: i })}
                            onCancelOrder={user?.role === 'cashier' ? null : (o) => setCancelModal({ isOpen: true, order: o, item: null })}
                            onUpdateStatus={handleUpdateStatus}
                            onAddItem={user?.role === 'cashier' ? null : handleAddItems}
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
                        userRole={user?.role}
                        onCancelItem={user?.role === 'cashier' ? null : (o, i) => setCancelModal({ isOpen: true, order: o, item: i })}
                        onCancelOrder={user?.role === 'cashier' ? null : (o) => setCancelModal({ isOpen: true, order: o, item: null })}
                        onUpdateStatus={handleUpdateStatus}
                        onAddItem={user?.role === 'cashier' ? null : handleAddItems}
                        settings={settings}
                    />
                </div>,
                document.body
            )}

            <CancelOrderModal
                isOpen={cancelModal.isOpen}
                order={cancelModal.order}
                item={cancelModal.item}
                title={cancelModal.item ? "Cancel Item" : "Cancel Order"}
                onClose={() => setCancelModal({ isOpen: false, order: null, item: null })}
                onConfirm={handleCancelAction}
            />
        </div>
    );
};

export default WaiterDashboard;
