import ThemeToggle from '../ThemeToggle/ThemeToggle';
import { cx } from '../../lib/cx';
import { BRAND_BUTTON, FOCUS_RING } from '../../lib/styles';

const PORTFOLIO_URL = 'https://www.gmagellan.dev/';
const REPOSITORY_URL = 'https://github.com/Migalha0/UK_Crime_Map';

// Same buttons as on the portfolio itself: yellow, bold, uppercase, with an arrow for external links
const link_button = cx(BRAND_BUTTON, 'flex h-8 shrink-0 items-center gap-1.5 px-2.5 text-xs', FOCUS_RING);

/**
 * Links to the author's portfolio and to this project's source code, and the theme toggle.
 * Labels collapse to icons on narrow screens.
 */
export default function SiteLinks({ className }: { className?: string }) {
    return (
        <div className={cx('flex shrink-0 gap-1.5', className)}>
            <a className={link_button} href={PORTFOLIO_URL} target="_blank" rel="noreferrer" title="Portfolio: gmagellan.dev">
                <svg className="size-3.5" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden>
                    <path d="M2 2h12v12H2z" />
                    <path d="M2 6h12" />
                    <path d="M5 4h.01M7 4h.01" strokeLinecap="square" />
                </svg>
                <span className="max-md:sr-only">Portfolio</span>
                <span className="sr-only"> (opens in a new tab)</span>
                <ExternalArrow />
            </a>

            <a className={link_button} href={REPOSITORY_URL} target="_blank" rel="noreferrer" title="Source code on GitHub">
                <svg className="size-3.5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
                </svg>
                <span className="max-md:sr-only">GitHub</span>
                <span className="sr-only"> (opens in a new tab)</span>
                <ExternalArrow />
            </a>

            <ThemeToggle />
        </div>
    );
}

/** ↗ drawn as an icon: Poppins has no arrow glyph, and the fallback renders it as an emoji */
function ExternalArrow() {
    return (
        <svg className="size-3 max-md:hidden" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 9L9 3M4 3h5v5" strokeLinecap="square" />
        </svg>
    );
}
