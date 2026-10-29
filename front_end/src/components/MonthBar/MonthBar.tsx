import { useEffect, useRef } from 'react';

import SiteLinks from '../SiteLinks/SiteLinks';
import { MONTHS, MONTHS_BY_YEAR, format_month } from '../../data/months';
import { cx } from '../../lib/cx';
import { BRAND_BUTTON, FOCUS_RING, PANEL } from '../../lib/styles';

const step_button = cx(
    BRAND_BUTTON,
    'size-8 shrink-0 text-base leading-none',
    'disabled:translate-0 disabled:cursor-default disabled:border-line disabled:bg-transparent disabled:text-ink-3 disabled:shadow-none',
    FOCUS_RING
);

interface MonthBarProps {
    selected: string;
    onSelect: (month: string) => void;
}

/**
 * Horizontal month picker: current month with previous/next arrows,
 * then a scrollable row of month chips grouped by year.
 * Links to the portfolio and source code sit at the far end.
 * On small screens the current month (and the links) sit above the chip row.
 */
export default function MonthBar({ selected, onSelect }: MonthBarProps) {
    const index = MONTHS.indexOf(selected);
    const selected_chip = useRef<HTMLButtonElement>(null);

    // Keep the selected chip in view, e.g. after using the arrows. Again once the web font
    // has loaded, since it changes every chip's width and would push the selection off-screen.
    useEffect(() => {
        const centre = () => selected_chip.current?.scrollIntoView({ block: 'nearest', inline: 'center' });
        centre();
        document.fonts.ready.then(centre);
    }, [selected]);

    return (
        <nav
            className={cx(PANEL, 'flex items-center gap-4 px-3 py-2 max-sm:flex-col max-sm:items-stretch max-sm:gap-2')}
            aria-label="Month"
        >
            <div className="flex shrink-0 items-center gap-2">
                <button
                    className={step_button}
                    aria-label="Previous month"
                    disabled={index <= 0}
                    onClick={() => onSelect(MONTHS[index - 1])}
                >‹</button>

                {/* Fixed width (fits "September 2026"), so the arrows never move as the month changes */}
                <div className="flex w-[136px] flex-col max-sm:items-center">
                    <span className="text-[10px] font-bold tracking-[0.06em] text-ink-2 uppercase">Showing</span>
                    <strong className="text-[15px] font-bold whitespace-nowrap">{format_month(selected, 'long')}</strong>
                </div>

                <button
                    className={step_button}
                    aria-label="Next month"
                    disabled={index >= MONTHS.length - 1}
                    onClick={() => onSelect(MONTHS[index + 1])}
                >›</button>

                <SiteLinks className="ml-auto sm:hidden" />
            </div>

            <div className="flex min-w-0 gap-4 overflow-x-auto py-0.5 [scrollbar-width:thin]">
                {Object.entries(MONTHS_BY_YEAR).map(([year, year_months]) => (
                    <div className="flex shrink-0 items-center gap-1" key={year}>
                        <span className="mr-1 text-[11px] font-bold text-ink">{year}</span>

                        {year_months.map(month => {
                            const is_selected = month === selected;

                            return (
                                <button
                                    key={month}
                                    ref={is_selected ? selected_chip : null}
                                    className={cx(
                                        'cursor-pointer border-2 px-2 py-0.5 text-xs font-semibold',
                                        FOCUS_RING,
                                        is_selected
                                            ? 'border-ink bg-brand text-brand-ink'
                                            : 'border-line bg-transparent text-ink hover:border-ink hover:bg-highlight'
                                    )}
                                    aria-pressed={is_selected}
                                    title={format_month(month, 'long')}
                                    onClick={() => onSelect(month)}
                                >
                                    {format_month(month)}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </div>

            <SiteLinks className="ml-auto max-sm:hidden" />
        </nav>
    );
}
