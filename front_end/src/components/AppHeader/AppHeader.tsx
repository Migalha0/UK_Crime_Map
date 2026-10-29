import SiteLinks from '../SiteLinks/SiteLinks';

/**
 * Top bar: the app's name (in the portfolio's yellow name banner) and links.
 */
export default function AppHeader() {
    return (
        <header className="flex h-14 shrink-0 items-center gap-3 border-b-2 border-ink bg-surface px-3 max-sm:h-13">
            <div className="flex min-w-0 items-center gap-3">
                <h1 className="m-0 shrink-0 border-2 border-ink bg-brand px-2 py-0.5 text-base font-bold tracking-[0.02em] text-brand-ink uppercase shadow-button">
                    UK Crime Map
                </h1>
                <p className="m-0 truncate text-xs text-ink-2 max-md:hidden">
                    Street-level crime in England &amp; Wales, with the 2021 census
                </p>
            </div>

            <SiteLinks className="ml-auto" />
        </header>
    );
}
