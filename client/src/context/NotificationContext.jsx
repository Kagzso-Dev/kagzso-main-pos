import { createContext, useState, useEffect, useContext, useCallback, useRef } from 'react';
import { AuthContext } from './AuthContext';
import { playKitchenSound, playWaiterSound } from '../utils/bellSound';

export const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
    const { socket, user, settings } = useContext(AuthContext);
    const settingsRef = useRef(settings);
    useEffect(() => { settingsRef.current = settings; }, [settings]);

    const tenantId    = user?.tenantId ?? null;
    const storageKey  = tenantId ? `notifications_${tenantId}` : 'notifications';
    const soundKey    = tenantId ? `notif_sound_${tenantId}` : 'notif_sound';

    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount]     = useState(0);
    const [toasts, setToasts]               = useState([]);

    // ─── Load from localStorage when tenant is known ────────────────────────
    useEffect(() => {
        try {
            const saved  = localStorage.getItem(storageKey);
            const parsed = saved ? JSON.parse(saved) : [];
            const dayAgo = Date.now() - 86400000;
            setNotifications(parsed.filter(n => new Date(n.createdAt).getTime() > dayAgo));
        } catch (e) {
            setNotifications([]);
        }
    }, [storageKey]);

    // ─── Sound alert (follows Admin Sound & Alert Settings) ──────────────────
    const playSound = useCallback((notification) => {
        try {
            // Order lifecycle sounds are played directly by Kitchen/Dashboard and Waiter/Dashboard
            if (['NEW_ORDER', 'ORDER_UPDATED', 'ORDER_READY', 'PAYMENT_SUCCESS'].includes(notification?.type)) {
                return;
            }
            const sc = settingsRef.current?.soundConfig;
            if (user?.role === 'kitchen') {
                if (sc?.kitchenEnabled !== false) {
                    playKitchenSound(sc?.kitchenSound, sc?.kitchenVolume ?? 0.8);
                }
                return;
            }
            if (sc?.waiterEnabled !== false) {
                playWaiterSound(sc?.waiterSound, sc?.waiterVolume ?? 0.6);
            }
        } catch (e) { /* ignore */ }
    }, [user?.role]);

    // ─── Persist to localStorage whenever history changes ───────────────────
    useEffect(() => {
        localStorage.setItem(storageKey, JSON.stringify(notifications));
        setUnreadCount(notifications.filter(n => !n.isRead).length);
    }, [notifications, storageKey]);

    // ─── Auto-expiry Timer (Every hour) ─────────────────────────────────────
    useEffect(() => {
        const interval = setInterval(() => {
            const dayAgo = Date.now() - 86400000;
            setNotifications(prev => prev.filter(n => new Date(n.createdAt).getTime() > dayAgo));
        }, 3600000);
        return () => clearInterval(interval);
    }, []);

    // ─── Actions ────────────────────────────────────────────────────────────
    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t._id !== id));
    }, []);

    // ─── Real-time: listen for new notifications ────────────────────────────
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notification) => {
            // Ignore notifications from other tenants (defence-in-depth)
            if (tenantId && notification.tenantId && notification.tenantId !== tenantId) return;

            setNotifications(prev => {
                if (prev.find(n => n._id === notification._id)) return prev;
                return [notification, ...prev].slice(0, 50);
            });

            setToasts(prev => [...prev, notification].slice(-3));

            const soundOn = localStorage.getItem(soundKey) !== 'off';
            if (soundOn) playSound(notification);

            setTimeout(() => removeToast(notification._id), 5000);
        };

        socket.on('notification', handleNewNotification);
        return () => socket.off('notification', handleNewNotification);
    }, [socket, tenantId, soundKey, playSound, removeToast]);

    // ─── Actions ────────────────────────────────────────────────────────────
    const markAsRead = useCallback((notificationId) => {
        setNotifications(prev => prev.map(n =>
            n._id === notificationId ? { ...n, isRead: true } : n
        ));
    }, []);

    const markAllAsRead = useCallback(() => {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    }, []);

    const clearAll = useCallback(() => {
        setNotifications([]);
    }, []);

    const deleteNotification = useCallback((id) => {
        setNotifications(prev => prev.filter(n => n._id !== id));
    }, []);

    return (
        <NotificationContext.Provider value={{
            notifications,
            unreadCount,
            toasts,
            markAsRead,
            markAllAsRead,
            clearAll,
            deleteNotification,
            removeToast
        }}>
            {children}
        </NotificationContext.Provider>
    );
};
