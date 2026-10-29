import { useId } from 'react';

import { MONTHS, MONTHS_BY_YEAR, format_month } from '../../data/months';
import { cx } from '../../lib/cx';
import { BRAND_BUTTON, FOCUS_RING } from '../../lib/styles';

const step_button = cx(
    BRAND_BUTTON,
    'flex size-10 shrink-0 items-center justify-center text-lg leading-none',
    'disabled:translate-0 disabled:cursor-default disabled:border-line disabled:bg-transparent disabled:text-ink-3 disabled:shadow-none',
    FOCUS_RING
);

// Where each year starts along the slider, for the tick labels under it
const YEAR_TICKS = Object.entries(MONTHS_BY_YEAR).map(([year, months]) => ({
    year,
    position: MONTHS.indexOf(months[0]) / (MONTHS.length - 1),
}));

interface MonthControlProps {
    selected: string;
    onSelect: (month: string) => void;
}

/**
 * Time control: the month shown with previous/next buttons, and a timeline slider
 * over every month (arrow keys step a month, Home/End jump to the ends).
 */
export default function MonthControl({ selected, onSelect }: MonthControlProps) {
    const index = MONTHS.indexOf(selected);
    const slider_id = useId();

    return (
        <section aria-label="Month">
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    className={step_button}
                    aria-label="Previous month"
                    disabled={index <= 0}
                    onClick={() => onSelect(MONTHS[index - 1])}
                >‹</button>

                <label htmlFor={slider_id} className="min-w-0 flex-1 text-center">
                    <span className="block text-[11px] font-bold tracking-[0.06em] text-ink-2 uppercase">Showing</span>
                    <strong className="block text-base font-bold whitespace-nowrap">{format_month(selected, 'long')}</strong>
                </label>

                <button
                    type="button"
                    className={step_button}
                    aria-label="Next month"
                    disabled={index >= MONTHS.length - 1}
                    onClick={() => onSelect(MONTHS[index + 1])}
                >›</button>
            </div>

            <input
                id={slider_id}
                type="range"
                className="month-slider mt-2 block w-full"
                min={0}
                max={MONTHS.length - 1}
                step={1}
                value={index}
                aria-valuetext={format_month(selected, 'long')}
                onChange={e => onSelect(MONTHS[Number(e.target.value)])}
            />

            {/* Year labels where each year starts; decorative, the slider announces the month itself */}
            <div className="relative mx-3 mt-0.5 h-4 text-[11px] font-semibold text-ink-2" aria-hidden>
                {YEAR_TICKS.map(({ year, position }) => (
                    <span key={year} className="absolute -translate-x-1/2" style={{ left: `${position * 100}%` }}>
                        {year}
                    </span>
                ))}
            </div>
        </section>
    );
}
