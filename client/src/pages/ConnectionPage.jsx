import { useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { WifiOff, RefreshCw, Loader2, ChefHat, LayoutDashboard } from 'lucide-react';

const ConnectionPage = () => {
    const { socketConnected, user } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        if (socketConnected) {
            // Auto-restore based on role
            const role = user?.role;
            if (role === 'admin') navigate('/admin');
            else if (role === 'kitchen') navigate('/kitchen');
            else if (role === 'cashier') navigate('/cashier');
            else if (role === 'waiter') navigate('/waiter');
            else navigate('/');
        }
    }, [socketConnected, navigate, user]);

    return (
        <div className="fixed inset-0 bg-[var(--theme-bg-dark)] z-[9999] flex items-center justify-center p-6 text-center overflow-hidden">
            {/* Background Grain/Noise */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
            
            <div className="relative z-10 max-w-sm w-full">
                {/* Visual Identity */}
                <div className="mb-8 relative flex justify-center">
                    <div className="absolute inset-0 bg-orange-500/20 blur-[100px] rounded-full scale-150 animate-pulse" />
                    <div className="w-24 h-24 rounded-[32px] bg-gradient-to-br from-orange-500 to-orange-700 flex items-center justify-center shadow-2xl relative border border-white/10 group overflow-hidden">
                        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <WifiOff size={44} className="text-white animate-bounce-subtle" />
                    </div>
                </div>

                {/* Status Content */}
                <h1 className="text-2xl font-black text-[var(--theme-text-main)] italic tracking-tight uppercase leading-none mb-4">
                    Connection Lost
                </h1>
                <p className="text-[13px] font-bold text-[var(--theme-text-muted)] leading-relaxed mb-10 px-4">
                    The live synchronization link was interrupted. Your POS is currently in <span className="text-orange-500">Auto-Recovery</span> mode. 
                    <br />
                    <span className="opacity-60">Restoring live dashboards shortly...</span>
                </p>

                {/* Progress Indicators */}
                <div className="space-y-4">
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                        <div className="h-full bg-orange-500 animate-reconnect-progress" />
                    </div>

                    <div className="flex items-center justify-center gap-3 py-4">
                        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/20 rounded-2xl">
                            <Loader2 size={14} className="animate-spin text-orange-500" />
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Re-Syncing Data</span>
                        </div>
                    </div>
                </div>

                {/* Footer Tip */}
                <div className="mt-12 pt-8 border-t border-white/5">
                    <p className="text-[10px] font-black text-[var(--theme-text-subtle)] uppercase tracking-tight flex items-center justify-center gap-2">
                        <RefreshCw size={10} className="animate-spin-slow" />
                        Do not refresh this page manually
                    </p>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes reconnect-progress {
                    0% { width: 0%; }
                    50% { width: 70%; }
                    100% { width: 100%; }
                }
                .animate-reconnect-progress {
                    animation: reconnect-progress 15s cubic-bezier(0.65, 0, 0.35, 1) infinite;
                }
                .animate-bounce-subtle {
                    animation: bounce-subtle 2s ease-in-out infinite;
                }
                @keyframes bounce-subtle {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-5px); }
                }
                .animate-spin-slow {
                    animation: spin 3s linear infinite;
                }
                @keyframes spin {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
            `}} />
        </div>
    );
};

export default ConnectionPage;
