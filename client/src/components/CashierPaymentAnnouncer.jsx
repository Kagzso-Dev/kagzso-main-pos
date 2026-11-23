import { useEffect, useRef, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import { playWaiterSound } from '../utils/bellSound';
import api from '../api';

// Module-scoped set of announced order IDs so state survives component remounts
// or route transitions while staying within the same cashier session/tenant.
const announcedOrderIds = new Set();
let lastTenantId = null;

export const clearAnnouncedPaymentOrders = () => {
    announcedOrderIds.clear();
};

/**
 * CashierPaymentAnnouncer
 * 
 * Mounted once at the CashierRoute level.
 * Plays the "Payment ready, Table X / Token Y" voice announcement and waiter bell sound
 * ONLY for users with role === 'cashier' across cashier routes:
 *   /cashier, /cashier/orders (both tabs), /cashier/kitchen, etc.
 * 
 * Guarantees:
 * 1. Only role === 'cashier' triggers speech or sound.
 * 2. Only transitions into 'payment' are announced; pre-existing payment orders
 *    on initial load or socket reconnect are seeded and suppressed.
 * 3. Each order is announced at most once per session.
 * 4. Cleared on logout and when tenant changes.
 * 5. Handles browser autoplay blocking safely and cleans up speech on unmount.
 */
const CashierPaymentAnnouncer = () => {
    const { user, socket, settings } = useContext(AuthContext);
    const tenantId = user?.tenantId;
    const settingsRef = useRef(settings);

    useEffect(() => {
        settingsRef.current = settings;
    }, [settings]);

    // Clear announced orders on logout or when tenant changes
    useEffect(() => {
        if (!user || user.role !== 'cashier' || (lastTenantId && tenantId !== lastTenantId)) {
            announcedOrderIds.clear();
        }
        lastTenantId = tenantId || null;
    }, [user, tenantId]);

    useEffect(() => {
        if (!socket || user?.role !== 'cashier') return;

        // Seed existing orders so orders already in 'payment' status aren't announced
        const seedExistingOrders = async () => {
            try {
                const token = user?.token;
                const res = await api.get('/api/orders', {
                    params: { limit: 100, view: 'all' },
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                const orders = res.data?.orders || [];
                orders.forEach(o => {
                    if (o.orderStatus?.toLowerCase() === 'payment') {
                        announcedOrderIds.add(o._id);
                    }
                });
            } catch (e) {
                // Ignore seed errors in offline/transient states
            }
        };

        const playBell = () => {
            try {
                const sc = settingsRef.current?.soundConfig;
                if (sc?.waiterEnabled !== false) {
                    playWaiterSound(sc?.waiterSound, sc?.waiterVolume ?? 0.6);
                }
            } catch (e) {
                // Safely handle audio errors
            }
        };

        const announcePayment = (order) => {
            try {
                const identifier = order.orderType === 'dine-in'
                    ? `Table ${order.tableId?.number || order.tableId?.name || (typeof order.tableId === 'string' ? order.tableId : '?')}`
                    : `Token ${order.tokenNumber || '?'}`;

                if (!('speechSynthesis' in window)) {
                    playBell();
                    return;
                }

                try {
                    window.speechSynthesis.cancel();
                } catch (e) {}

                const text = `Payment ready, ${identifier}`;
                const utterance = new SpeechSynthesisUtterance(text);

                utterance.onend = () => {
                    playBell();
                };

                utterance.onerror = () => {
                    // Fallback to bell sound if speech is blocked by browser policy or fails
                    playBell();
                };

                window.speechSynthesis.speak(utterance);
            } catch (err) {
                // If speech synthesis throws (e.g. autoplay restriction), fallback to bell
                playBell();
            }
        };

        const onOrderUpdated = (order) => {
            if (!order || !order._id) return;
            // Tenant isolation safety
            if (tenantId && order.tenantId && order.tenantId !== tenantId) return;

            if (order.orderStatus?.toLowerCase() === 'payment') {
                if (!announcedOrderIds.has(order._id)) {
                    announcedOrderIds.add(order._id);
                    announcePayment(order);
                }
            }
        };

        const onConnect = () => {
            // Re-seed on socket reconnection to avoid blasting historical orders
            seedExistingOrders();
        };

        // Initial seed on mount
        seedExistingOrders();

        socket.on('connect', onConnect);
        socket.on('order-updated', handleOrderTransition);
        socket.on('new-order', handleOrderTransition);

        function handleOrderTransition(order) {
            onOrderUpdated(order);
        }

        return () => {
            socket.off('connect', onConnect);
            socket.off('order-updated', handleOrderTransition);
            socket.off('new-order', handleOrderTransition);
            try {
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                }
            } catch (e) {}
        };
    }, [socket, user, tenantId]);

    return null;
};

export default CashierPaymentAnnouncer;
