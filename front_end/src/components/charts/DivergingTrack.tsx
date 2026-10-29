import type { ReactNode } from 'react';

import { cx } from '../../lib/cx';

/**
 * Horizontal track for values from −domain to +domain, with a zero line in the middle.
 * Children are positioned with position_on_track().
 */
export function DivergingTrack({ className, children }: { className?: string; children: ReactNode }) {
    return (
        // zero line drawn by ::before
        <span
            aria-hidden
            className={cx(
                'relative block h-2.5',
                'before:absolute before:-top-[3px] before:-bottom-[3px] before:left-1/2 before:w-px before:bg-ink-3',
                className
            )}
        >
            {children}
        </span>
    );
}

/** Where a value sits on a DivergingTrack, as a CSS percentage from the left */
export function position_on_track(value: number, domain: number): number {
    const clamped = Math.max(-domain, Math.min(domain, Number.isFinite(value) ? value : 0));
    return 50 + clamped / domain * 50;
}

/**
 * A bar from zero to the value: red when positive, blue when negative.
 */
export function DivergingBar({ value, domain }: { value: number; domain: number }) {
    const end = position_on_track(value, domain);

    return (
        <DivergingTrack>
            <span
                className={cx('absolute top-0 h-full', value >= 0 ? 'bg-pos' : 'bg-neg')}
                style={{ left: `${Math.min(50, end)}%`, width: `${Math.abs(end - 50)}%` }}
            />
        </DivergingTrack>
    );
}

/** Axis labels under a column of tracks: −domain, 0, +domain */
export function DivergingAxis({ domain, className }: { domain: number; className?: string }) {
    return (
        <span aria-hidden className={cx('flex justify-between font-mono text-[11px] text-ink-3', className)}>
            <span>−{domain.toFixed(1)}</span>
            <span>0</span>
            <span>+{domain.toFixed(1)}</span>
        </span>
    );
}

/** Smallest round domain (0.1 steps, at least 0.1) that fits every value */
export function domain_for(values: number[]): number {
    const largest = Math.max(0, ...values.filter(Number.isFinite).map(Math.abs));
    return Math.max(0.1, Math.ceil(largest * 10) / 10);
}
