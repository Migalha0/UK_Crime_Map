import { useId } from 'react';

import { cx } from '../../lib/cx';

interface SegmentedProps<T extends string> {
    /** Accessible name of the group, e.g. "Map shows" */
    label: string;
    options: { value: T; label: string }[];
    value: T;
    onChange: (value: T) => void;
    className?: string;
}

/**
 * A row of mutually exclusive options. Built on native radio buttons, so arrow keys,
 * Tab and screen readers behave as users expect without extra code.
 */
export default function Segmented<T extends string>({ label, options, value, onChange, className }: SegmentedProps<T>) {
    const name = useId();

    return (
        <fieldset className={cx('m-0 flex min-w-0 border-2 border-ink p-0', className)}>
            <legend className="sr-only">{label}</legend>

            {options.map(option => (
                <label key={option.value} className="relative flex min-w-0 flex-1">
                    <input
                        type="radio"
                        name={name}
                        value={option.value}
                        checked={option.value === value}
                        onChange={() => onChange(option.value)}
                        className="peer sr-only"
                    />
                    <span
                        className={cx(
                            'block w-full cursor-pointer truncate px-1.5 py-1.5 text-center text-xs font-bold uppercase',
                            'text-ink-2 hover:bg-highlight peer-checked:bg-brand peer-checked:text-brand-ink',
                            // keyboard focus lands on the hidden input; show it on the visible label
                            'peer-focus-visible:outline-2 peer-focus-visible:-outline-offset-4 peer-focus-visible:outline-ink',
                            'peer-checked:peer-focus-visible:outline-brand-ink'
                        )}
                    >
                        {option.label}
                    </span>
                </label>
            ))}
        </fieldset>
    );
}
