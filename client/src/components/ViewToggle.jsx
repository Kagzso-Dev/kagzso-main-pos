import { LayoutGrid, List, Grid2X2 } from 'lucide-react';

/**
 * Enhanced ViewToggle
 * Supports 'grid', 'compact', and 'list' modes.
 */
const ViewToggle = ({ viewMode, setViewMode }) => {
    const modes = [
        { id: 'grid', icon: LayoutGrid, label: 'Grid' },
        { id: 'list', icon: List, label: 'List' }
    ];

    const activeIdx = modes.findIndex(m => m.id === viewMode);

    return (
        <div className="relative flex items-center bg-[var(--theme-bg-dark)] p-1 rounded-2xl shadow-inner border border-[var(--theme-border)] flex-shrink-0 h-10 w-[100px] sm:w-[110px]">
            {/* Sliding Background */}
            <div 
                className="absolute top-1 bottom-1 w-[calc(50%-4px)] bg-orange-500 rounded-xl transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-md shadow-orange-500/30 active:scale-95"
                style={{ 
                    left: `${(activeIdx * 50) + (activeIdx === 0 ? 3 : 1)}%`,
                    width: 'calc(50% - 6px)'
                }}
            />
            
            {modes.map(mode => {
                const Icon = mode.icon;
                const active = viewMode === mode.id;
                return (
                    <button
                        key={mode.id}
                        onClick={() => setViewMode(mode.id)}
                        className={`
                            relative z-10 flex-1 h-full flex items-center justify-center transition-all duration-300
                            ${active ? 'text-white scale-110' : 'text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]'}
                        `}
                        title={mode.label}
                    >
                        <Icon size={16} strokeWidth={active ? 3 : 2} />
                    </button>
                );
            })}
        </div>
    );
};

export default ViewToggle;
