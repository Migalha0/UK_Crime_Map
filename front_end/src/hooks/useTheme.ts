import { useEffect, useSyncExternalStore } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const SYSTEM_DARK = '(prefers-color-scheme: dark)';

const root = document.documentElement;

const current_theme = (): Theme => root.classList.contains('dark') ? 'dark' : 'light';

const apply = (theme: Theme) => root.classList.toggle('dark', theme === 'dark');

// The .dark class on <html> is the single source of truth, so every component using
// this hook (the month bar renders the toggle twice, for phone and desktop layouts) stays in sync
function subscribe(on_change: () => void) {
    const observer = new MutationObserver(on_change);
    observer.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
}

function saved_theme(): Theme | null {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved === 'light' || saved === 'dark' ? saved : null;
    } catch {
        return null;
    }
}

/**
 * Light or dark theme, as the .dark class on <html> (index.html sets it before first paint,
 * the same way gmagellan.dev does). Follows the system setting until the user picks one,
 * which is then remembered.
 */
export function useTheme(): [Theme, () => void] {
    const theme = useSyncExternalStore(subscribe, current_theme);

    // Keep following the system setting while the user hasn't chosen
    useEffect(() => {
        const query = matchMedia(SYSTEM_DARK);
        const on_change = () => {
            if (!saved_theme()) apply(query.matches ? 'dark' : 'light');
        };
        query.addEventListener('change', on_change);
        return () => query.removeEventListener('change', on_change);
    }, []);

    const toggle = () => {
        const next = current_theme() === 'dark' ? 'light' : 'dark';
        apply(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // Storage blocked (e.g. private mode): the choice just isn't remembered
        }
    };

    return [theme, toggle];
}
