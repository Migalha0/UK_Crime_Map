import { useId, type ReactNode } from 'react';

import { cx } from '../../lib/cx';
import { CARD_SUBTITLE, CARD_TEXT, FOCUS_RING } from '../../lib/styles';

interface CollapsiblePanelProps {
    title: string;
    subtitle?: string;
    open: boolean;
    onToggle: () => void;
    children: ReactNode;
}

/**
 * Card whose yellow title bar toggles its body (a disclosure: the bar is a button
 * with aria-expanded). Open state is owned by the parent.
 */
export default function CollapsiblePanel({ title, subtitle, open, onToggle, children }: CollapsiblePanelProps) {
    const body_id = useId();

    return (
        <section
            className={cx(CARD_TEXT, 'border-2 border-ink bg-surface shadow-button')}
        >
            <h2 className="m-0 text-[length:inherit] font-[inherit]">
                <button
                    type="button"
                    className={cx(
                        // yellow title bar, as on the portfolio's section headings
                        'relative block min-h-11 w-full cursor-pointer border-0 border-b-2 border-ink bg-brand px-3 py-2 pr-8',
                        'text-left text-brand-ink',
                        FOCUS_RING,
                        'focus-visible:-outline-offset-4',
                        // chevron: points down when open, right when collapsed
                        'after:absolute after:top-1/2 after:right-3.5 after:size-2 after:-translate-y-2/3 after:-rotate-45',
                        'after:border-r-2 after:border-b-2 after:border-brand-ink aria-expanded:after:rotate-45'
                    )}
                    aria-expanded={open}
                    aria-controls={body_id}
                    onClick={onToggle}
                >
                    <span className="block text-[13px]/[1.3] font-bold tracking-[0.02em] uppercase">{title}</span>
                </button>
            </h2>

            {subtitle && <p className={cx(CARD_SUBTITLE, 'mt-0 px-3 pt-1.5', !open && 'pb-2')}>{subtitle}</p>}

            {open && (
                <div id={body_id} className="px-3 pt-2.5 pb-3">
                    {children}
                </div>
            )}
        </section>
    );
}
