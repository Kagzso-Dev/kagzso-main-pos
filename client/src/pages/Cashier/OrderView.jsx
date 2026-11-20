import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { LayoutDashboard, History, Loader2 } from 'lucide-react';

const WaiterDashboard = lazy(() => import('../Waiter/Dashboard'));
const CashierOrderHistory = lazy(() => import('./CashierOrderHistory'));

/**
 * Cashier OrderView:
 * Hosts two tabs:
 * 1. Waiter Dashboard (live tokens / active orders)
 * 2. Order History (admin-style history with search, date ranges, and pagination)
 * Synchronized with the URL query parameter ?tab=waiter | history.
 */
const OrderView = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const activeTab = searchParams.get('tab') === 'history' ? 'history' : 'waiter';

    const setTab = (tab) => {
        setSearchParams({ tab }, { replace: true });
    };

    return (
        <div className="flex flex-col h-full w-full min-h-0 overflow-hidden text-left animate-fade-in">
            {/* ── Tab Switcher Header ── */}
            <div className="shrink-0 pt-2 pb-2 px-2 sm:px-4 border-b border-[var(--theme-border)] bg-[var(--theme-bg-card)]/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 p-1 bg-black/5 dark:bg-white/5 rounded-2xl border border-[var(--theme-border)] shadow-inner w-full sm:w-auto overflow-x-auto no-scrollbar">
                    <button
                        type="button"
                        onClick={() => setTab('waiter')}
                        className={`flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap active:scale-95 ${
                            activeTab === 'waiter'
                                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    >
                        <LayoutDashboard size={16} strokeWidth={activeTab === 'waiter' ? 2.5 : 2} />
                        <span>Waiter Dashboard</span>
                    </button>

                    <button
                        type="button"
                        onClick={() => setTab('history')}
                        className={`flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-2 px-4 sm:px-6 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-200 whitespace-nowrap active:scale-95 ${
                            activeTab === 'history'
                                ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                                : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                    >
                        <History size={16} strokeWidth={activeTab === 'history' ? 2.5 : 2} />
                        <span>Order History</span>
                    </button>
                </div>
            </div>

            {/* ── Active Tab Content (Lazy Loaded) ── */}
            <div className="flex-1 min-h-0 overflow-hidden flex flex-col relative">
                <Suspense
                    fallback={
                        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                            <Loader2 size={32} className="animate-spin text-orange-500" />
                            <p className="text-xs font-bold text-[var(--theme-text-muted)] uppercase tracking-wider">
                                Loading {activeTab === 'waiter' ? 'Waiter Dashboard' : 'Order History'}...
                            </p>
                        </div>
                    }
                >
                    {activeTab === 'waiter' ? (
                        <WaiterDashboard />
                    ) : (
                        <CashierOrderHistory />
                    )}
                </Suspense>
            </div>
        </div>
    );
};

export default OrderView;
