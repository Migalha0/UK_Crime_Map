import { useTheme } from '../../hooks/useTheme';
import { cx } from '../../lib/cx';
import { BRAND_BUTTON, FOCUS_RING } from '../../lib/styles';

/**
 * Square button switching between light and dark mode; shows the theme it switches to.
 */
export default function ThemeToggle({ className }: { className?: string }) {
    const [theme, toggle] = useTheme();
    const next = theme === 'dark' ? 'light' : 'dark';

    return (
        <button
            type="button"
            className={cx(BRAND_BUTTON, 'flex size-8 shrink-0 items-center justify-center', FOCUS_RING, className)}
            aria-label={`Switch to ${next} mode`}
            title={`Switch to ${next} mode`}
            onClick={toggle}
        >
            {next === 'dark' ? (
                // moon
                <svg className="size-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                    <path d="M6.2 1.5a6.5 6.5 0 1 0 8.3 8.3A5.5 5.5 0 0 1 6.2 1.5z" />
                </svg>
            ) : (
                // sun
                <svg className="size-4" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <circle cx="8" cy="8" r="3" fill="currentColor" />
                    <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" strokeLinecap="square" />
                </svg>
            )}
        </button>
    );
}
