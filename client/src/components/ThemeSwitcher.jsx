import { useState, useRef, useEffect } from 'react';
import { Palette, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * ThemeSwitcher
 *
 * Two modes:
 *  1. Global mode (default)  — uses ThemeContext; changes the app-wide theme.
 *  2. Tenant-local mode      — when `tenantTheme` + `setTenantTheme` props are
 *                              provided, uses those instead. The parent (Layout)
 *                              applies the theme as `data-theme` only on its own
 *                              root div, so no other pages are affected.
 *
 * SuperAdmin pages never render <Layout>, so they are completely unaffected
 * regardless of which mode is active.
 */
const THEMES_META = [
    { id: 'default', label: 'Default',   icon: '🌌', description: 'Blue-black premium dark' },
    { id: 'dark',    label: 'Pure Dark', icon: '⚫', description: 'True black, maximum contrast' },
    { id: 'light',   label: 'Light',     icon: '☀️', description: 'Clean white, easy on eyes' },
];

const ThemeSwitcher = ({
    collapsed = false,
    isNav = false,
    /* Tenant-local props — passed from Layout → Sidebar */
    tenantTheme,
    setTenantTheme,
}) => {
    /* Decide which theme source to use */
    const globalCtx = useTheme();
    const isTenantMode = tenantTheme !== undefined && setTenantTheme !== undefined;

    const currentThemeId = isTenantMode ? tenantTheme : globalCtx.theme;
    const changeTheme    = isTenantMode ? setTenantTheme : globalCtx.setTheme;

    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    const handleThemeChange = (id) => {
        changeTheme(id);
        setOpen(false);
    };

    useEffect(() => {
        const handler = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    useEffect(() => {
        const handler = (e) => { if (e.key === 'Escape') setOpen(false); };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const current = THEMES_META.find(t => t.id === currentThemeId);

    return (
        <div ref={ref} className="relative flex-shrink-0">
            <button
                onClick={() => setOpen(o => !o)}
                title={(collapsed || isNav) ? `Theme: ${current?.label}` : undefined}
                aria-label="Switch theme"
                className={`
                    flex items-center gap-2.5 rounded-xl transition-all duration-200 min-h-[40px]
                    text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)]
                    hover:bg-[var(--theme-bg-hover)]
                    border border-[var(--theme-border)] hover:border-[var(--theme-border)]
                    ${open ? 'bg-[var(--theme-bg-hover)] border-orange-500 text-[var(--theme-text-main)] shadow-lg' : ''}
                    ${(collapsed || isNav) ? 'w-10 h-10 justify-center p-0' : 'w-full px-4 py-2.5'}
                `}
            >
                <Palette size={18} className="flex-shrink-0" />
                {!collapsed && !isNav && (
                    <>
                        <span className="font-semibold text-sm flex-1 text-left">{current?.label}</span>
                        <span className="text-base leading-none">{current?.icon}</span>
                    </>
                )}
            </button>

            {open && (
                <div className={`
                    absolute w-52
                    bg-[var(--theme-bg-card)] border border-[var(--theme-border)]
                    rounded-2xl shadow-2xl shadow-black/40
                    overflow-hidden z-[100] animate-scale-in
                    ${collapsed
                        ? 'left-full ml-3 bottom-0'
                        : isNav
                            ? 'right-0 top-full mt-2'
                            : 'bottom-full left-0 mb-2'
                    }
                `}>
                    <div className="px-3 py-2.5 border-b border-[var(--theme-border)]">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--theme-text-muted)] text-center">
                            {isTenantMode ? 'Restaurant Theme' : 'Interface Style'}
                        </p>
                    </div>

                    <div className="p-1.5 space-y-0.5">
                        {THEMES_META.map(t => {
                            const active = t.id === currentThemeId;
                            return (
                                <button
                                    key={t.id}
                                    onClick={() => handleThemeChange(t.id)}
                                    className={`
                                        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                        transition-all duration-150 text-left
                                        ${active
                                            ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30 font-black'
                                            : 'hover:bg-[var(--theme-bg-hover)] text-[var(--theme-text-muted)] hover:text-[var(--theme-text-main)] border border-transparent'
                                        }
                                    `}
                                    aria-pressed={active}
                                >
                                    <span className="text-lg leading-none flex-shrink-0">{t.icon}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold leading-tight">{t.label}</p>
                                        <p className="text-[10px] opacity-60 truncate mt-0.5">{t.description}</p>
                                    </div>
                                    {active && (
                                        <Check size={14} className="flex-shrink-0 text-orange-400" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemeSwitcher;
