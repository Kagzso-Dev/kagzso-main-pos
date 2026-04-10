import { useState, useContext, useCallback, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import BottomNav from './BottomNav';
import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { Menu, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Responsive Layout
 *
 * Mobile  (<768px):  No sidebar. Full-width content + BottomNav bar.
 *                    Hamburger opens slide-in Drawer.
 * Tablet  (768-1024): Desktop-like: collapsible sidebar (icon-only), no BottomNav.
 *                     Hamburger toggles sidebar expand/collapse.
 * Desktop (1025px+): Permanent full sidebar, no BottomNav.
 */
const Layout = () => {
    const { user, loading } = useContext(AuthContext);
    const location = useLocation();

    // Controls whether the sidebar drawer is open on mobile
    const [drawerOpen, setDrawerOpen] = useState(false);

    // Check initial window width to determine if sidebar should be collapsed
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
    const [isMiniTablet, setIsMiniTablet] = useState(window.innerWidth > 480 && window.innerWidth <= 768);
    const [isTablet, setIsTablet] = useState(window.innerWidth > 768 && window.innerWidth <= 1024);
    
    // Sidebar behavior:
    // Mobile (0-480) -> hidden/drawer
    // Mini Tablet (481-768) -> collapsed
    // Tablet (769-1024) -> collapsed
    // Desktop (1025+) -> collapsed (default)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

    const openDrawer = useCallback(() => {
        setDrawerOpen(true);
        document.body.classList.add('drawer-open');
    }, []);

    const closeDrawer = useCallback(() => {
        setDrawerOpen(false);
        document.body.classList.remove('drawer-open');
    }, []);

    // On mobile: open sidebar drawer. On tablet/desktop: toggle sidebar collapse.
    const handleMenuClick = useCallback(() => {
        if (isMobile) {
            openDrawer();
        } else {
            setSidebarCollapsed(c => {
                const next = !c;
                window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
                return next;
            });
        }
    }, [isMobile, openDrawer]);


    // Resize listener for state updates — debounced to avoid excessive re-renders
    useEffect(() => {
        let resizeTimer;
        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                const width = window.innerWidth;
                const mobile = width <= 480;
                const miniTablet = width > 480 && width <= 768;
                const tablet = width > 768 && width <= 1024;
                const desktop = width > 1024;

                setIsMobile(mobile);
                setIsMiniTablet(miniTablet);
                setIsTablet(tablet);

                if (desktop) {
                    closeDrawer();
                    // Keep sidebar collapsed by default on desktop
                    setSidebarCollapsed(true);
                } else if (miniTablet || tablet) {
                    closeDrawer();
                    setSidebarCollapsed(true);
                } else {
                    // Mobile
                    setSidebarCollapsed(false);
                }
            }, 100);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimer);
        };
    }, [closeDrawer, location.pathname]);

    // ── Auth Guards ──────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-dynamic-screen" style={{ backgroundColor: 'var(--theme-bg-dark)' }}>
                <div className="flex flex-col items-center gap-4">
                    <div className="w-14 h-14 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-[var(--theme-text-muted)] text-sm font-medium tracking-wide">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return (
        <div className="flex h-full text-[var(--theme-text-main)] font-sans overflow-hidden" style={{ backgroundColor: 'var(--theme-bg-dark)' }}>

            {/* ── Mobile: Overlay backdrop when drawer open ─────── */}
            {drawerOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden animate-fade-in"
                    onClick={closeDrawer}
                    aria-hidden="true"
                />
            )}

            {/* ── Sidebar ───────────────────────────────────────────────── */}
            <aside
                className={`
                    fixed top-0 left-0 h-full z-50
                    transition-all duration-300 ease-in-out
                    ${(isMobile && !drawerOpen) ? '-translate-x-full' : 'translate-x-0'}
                    ${!isMobile ? 'relative flex-shrink-0' : ''}
                `}
                style={{
                    width: isMobile ? '288px' : (sidebarCollapsed ? '80px' : '288px'),
                }}
            >
                <Sidebar
                    collapsed={isMobile ? false : sidebarCollapsed}
                    onToggleCollapse={isMobile ? null : () => setSidebarCollapsed(c => {
                        const next = !c;
                        window.dispatchEvent(new CustomEvent('sidebar-toggle', { detail: { collapsed: next } }));
                        return next;
                    })}
                    onClose={isMobile ? closeDrawer : null}
                />
            </aside>

            {/* ── Main Content Area ────────────────────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Top Bar with hamburger menu trigger */}
                {!['/dine-in', '/take-away'].includes(location.pathname) && (
                    <TopBar onMenuClick={handleMenuClick} sidebarCollapsed={sidebarCollapsed} />
                )}

                {/* Content Area */}
                <main className={`flex-1 flex flex-col overflow-y-auto overflow-x-hidden pt-safe pb-10 custom-scrollbar scroll-container ${
                    location.pathname === '/dine-in' || 
                    location.pathname === '/take-away' || 
                    location.pathname.startsWith('/cashier') || 
                    location.pathname.startsWith('/waiter') || 
                    location.pathname === '/kitchen' 
                        ? 'overflow-hidden h-full' 
                        : ''
                }`}>
                    <div
                        className={`w-full animate-fade-in max-w-[1280px] mx-auto overflow-x-hidden min-h-0 ${
                            location.pathname === '/dine-in' || 
                            location.pathname === '/take-away' || 
                            location.pathname.startsWith('/cashier') || 
                            location.pathname.startsWith('/waiter') || 
                            location.pathname === '/kitchen' 
                                ? 'flex-1 flex flex-col h-full overflow-hidden' 
                                : ''
                        }`}
                        style={{ paddingInline: 'var(--content-px, 16px)' }}
                    >
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>

    );
};

export default Layout;

