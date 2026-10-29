import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';

/**
 * Small uppercase heading between card sections.
 */
export function CardSection({ title, children }: { title: string; children: ReactNode }) {
    return (
        <>
            <h3 className="mt-4 mb-1.5 border-b-2 border-ink pb-0.5 text-[11px] font-bold tracking-[0.04em] text-ink uppercase">{title}</h3>
            {children}
        </>
    );
}

/**
 * Small muted footnote, e.g. a caveat under a chart.
 */
export function CardNote({ className, children }: { className?: string; children: ReactNode }) {
    return <p className={cx('mt-2 mb-0 text-[11px] text-ink-3', className)}>{children}</p>;
}

/**
 * Plain secondary text, e.g. "No crimes recorded".
 */
export function CardEmpty({ children }: { children: ReactNode }) {
    return <p className="mt-2 mb-0 text-ink-2">{children}</p>;
}

/**
 * Shaded callout for something the reader should know before the data.
 */
export function CardNotice({ children }: { children: ReactNode }) {
    return <p className="mt-2 mb-0 border-2 border-ink bg-highlight px-2.5 py-2 text-ink">{children}</p>;
}
