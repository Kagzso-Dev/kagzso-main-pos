import { X, Plus, Minus, Info } from 'lucide-react';

const VariantSelectorModal = ({ item, isOpen, onClose, onAdd, formatPrice }) => {
    if (!isOpen || !item) return null;

    const isVeg = item.isVeg;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 sm:p-6 animate-fade-in">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative z-10 w-full max-w-md bg-[var(--theme-bg-card)] rounded-3xl shadow-2xl border border-[var(--theme-border)] overflow-hidden animate-zoom-in">
                {/* Header */}
                <div className="px-6 py-5 border-b border-[var(--theme-border)] flex items-start justify-between bg-[var(--theme-bg-card2)]">
                    <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full shrink-0 ${isVeg ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <div>
                            <h3 className="text-lg font-black text-[var(--theme-text-main)] uppercase tracking-tight">{item.name}</h3>
                            <p className="text-[10px] text-[var(--theme-text-muted)] font-black tracking-widest uppercase opacity-60 mt-0.5">{item.category?.name || 'Item'}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-[var(--theme-bg-hover)] rounded-xl transition-colors">
                        <X size={20} className="text-[var(--theme-text-muted)]" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                    {item.description && (
                        <div className="flex gap-2 p-3 bg-blue-500/5 border border-blue-500/10 rounded-2xl">
                            <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
                            <p className="text-[11px] text-[var(--theme-text-muted)] leading-relaxed">{item.description}</p>
                        </div>
                    )}

                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] ml-1">Choose Size</p>
                        <div className="grid gap-2.5">
                            {item.variants.map((v, i) => (
                                <button
                                    key={i}
                                    onClick={() => {
                                        onAdd(item, v);
                                        onClose();
                                    }}
                                    className="group flex items-center justify-between p-4 rounded-2xl bg-[var(--theme-bg-dark)] border border-[var(--theme-border)] hover:border-orange-500/40 hover:bg-orange-500/5 transition-all text-left active:scale-[0.98]"
                                >
                                    <div className="flex flex-col">
                                        <span className="text-sm font-black text-[var(--theme-text-main)] group-hover:text-orange-500 transition-colors uppercase tracking-tight">
                                            {v.name}
                                        </span>
                                        <span className="text-xs font-bold text-gray-500 mt-0.5">
                                            {formatPrice(v.price)}
                                        </span>
                                    </div>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-white/10 group-hover:bg-orange-500 group-hover:text-white text-[var(--theme-text-muted)] transition-all border border-[var(--theme-border)] shadow-sm">
                                        <Plus size={16} />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 bg-[var(--theme-bg-card2)] border-t border-[var(--theme-border)]">
                    <button 
                        onClick={onClose}
                        className="w-full h-12 flex items-center justify-center text-[10px] font-black uppercase tracking-widest text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VariantSelectorModal;
