import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';

import { cx } from '../../lib/cx';
import type { LsoaArea } from '../../types';

const MAX_RESULTS = 8;

interface AreaSearchProps {
    areas: LsoaArea[];
    onSelect: (lsoa: string) => void;
}

/**
 * Find a neighbourhood by name (e.g. "Canterbury 011B", or just "Canterbury") or by LSOA code.
 * An ARIA 1.2 combobox: type, move through results with the arrow keys, Enter to choose,
 * Escape to close. It is also the way to pick an area without using the map at all.
 */
export default function AreaSearch({ areas, onSelect }: AreaSearchProps) {
    const [query, set_query] = useState('');
    const [open, set_open] = useState(false);
    const [active, set_active] = useState(0);
    const list_id = useId();
    const input = useRef<HTMLInputElement>(null);

    // Names starting with the text come first, then names or codes containing it
    const { results, total } = useMemo(() => {
        const text = query.trim().toLowerCase();
        if (text.length < 2) {
            return { results: [], total: 0 };
        }

        const starts: LsoaArea[] = [];
        const contains: LsoaArea[] = [];
        for (const area of areas) {
            const name = area.lsoaNM.toLowerCase();
            if (name.startsWith(text) || area.lsoa.toLowerCase() === text) {
                starts.push(area);
            } else if (name.includes(text) || area.lsoa.toLowerCase().startsWith(text)) {
                contains.push(area);
            }
        }

        const all = starts.concat(contains);
        return { results: all.slice(0, MAX_RESULTS), total: all.length };
    }, [areas, query]);

    const expanded = open && results.length > 0;

    const choose = (area: LsoaArea) => {
        set_query(area.lsoaNM);
        set_open(false);
        onSelect(area.lsoa);
    };

    const on_key_down = (e: KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            set_open(true);
            set_active(current => Math.min(current + 1, results.length - 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            set_active(current => Math.max(current - 1, 0));
        } else if (e.key === 'Enter' && expanded) {
            e.preventDefault();
            choose(results[active]);
        } else if (e.key === 'Escape') {
            // Close the list (or clear the text) without also closing the area details
            if (expanded || query) {
                e.stopPropagation();
                if (expanded) set_open(false);
                else set_query('');
            }
        }
    };

    return (
        <div className="relative">
            <label htmlFor={`${list_id}-input`} className="mb-1 block text-[11px] font-bold tracking-[0.04em] uppercase">
                Find a neighbourhood
            </label>

            <input
                ref={input}
                id={`${list_id}-input`}
                type="search"
                role="combobox"
                aria-expanded={expanded}
                aria-controls={list_id}
                aria-autocomplete="list"
                aria-activedescendant={expanded ? `${list_id}-${active}` : undefined}
                aria-describedby={`${list_id}-hint`}
                autoComplete="off"
                spellCheck={false}
                placeholder="Town, council or LSOA code"
                // 16px text: smaller makes iOS zoom the page when the field is focused
                className={cx(
                    'block h-11 w-full border-2 border-ink bg-surface px-3 font-sans text-base text-ink',
                    'placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink'
                )}
                value={query}
                onChange={e => {
                    set_query(e.target.value);
                    set_open(true);
                    set_active(0);
                }}
                onFocus={() => set_open(true)}
                onBlur={() => set_open(false)}
                onKeyDown={on_key_down}
            />
            <p id={`${list_id}-hint`} className="sr-only">
                Type at least two letters, then use the arrow keys and Enter to choose.
            </p>

            {/* Result count for screen readers as the list changes */}
            <p className="sr-only" aria-live="polite">
                {open && query.trim().length >= 2 ? `${total} neighbourhood${total === 1 ? '' : 's'} found` : ''}
            </p>

            <ul
                id={list_id}
                role="listbox"
                aria-label="Neighbourhoods"
                hidden={!expanded}
                className="absolute inset-x-0 top-full z-10 m-0 mt-1 max-h-80 list-none overflow-y-auto border-2 border-ink bg-surface p-0 shadow-button"
            >
                {results.map((area, i) => (
                    <li
                        key={area.lsoa}
                        id={`${list_id}-${i}`}
                        role="option"
                        aria-selected={i === active}
                        className={cx(
                            'flex cursor-pointer items-baseline justify-between gap-2 px-3 py-2.5 text-sm',
                            i === active ? 'bg-brand text-brand-ink' : 'text-ink'
                        )}
                        // mousedown, not click: runs before the input's blur closes the list
                        onMouseDown={e => {
                            e.preventDefault();
                            choose(area);
                        }}
                        onMouseEnter={() => set_active(i)}
                    >
                        <span className="truncate font-semibold">{area.lsoaNM}</span>
                        <span className="shrink-0 font-mono text-xs">{area.lsoa}</span>
                    </li>
                ))}
                {total > results.length && (
                    <li role="presentation" className="border-t border-line px-3 py-1.5 text-xs text-ink-2">
                        {total - results.length} more: keep typing to narrow down
                    </li>
                )}
            </ul>
        </div>
    );
}
