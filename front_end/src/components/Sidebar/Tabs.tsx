import { useRef, type KeyboardEvent } from 'react';

import { cx } from '../../lib/cx';

export interface TabDefinition<T extends string> {
    id: T;
    label: string;
}

interface TabsProps<T extends string> {
    /** Prefix for element ids, so panels can point back at their tab */
    idPrefix: string;
    label: string;
    tabs: TabDefinition<T>[];
    selected: T;
    onSelect: (id: T) => void;
}

export const tab_id = (prefix: string, id: string) => `${prefix}-tab-${id}`;
export const panel_id = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/**
 * ARIA tab list: one tab in the Tab order, arrow keys / Home / End move between tabs.
 * The parent renders each panel with role="tabpanel" and the ids from panel_id / tab_id.
 */
export default function Tabs<T extends string>({ idPrefix, label, tabs, selected, onSelect }: TabsProps<T>) {
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);

    const on_key_down = (e: KeyboardEvent) => {
        const index = tabs.findIndex(tab => tab.id === selected);
        const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: tabs.length - 1 }[e.key];
        if (next === undefined) return;

        e.preventDefault();
        const wrapped = (next + tabs.length) % tabs.length;
        onSelect(tabs[wrapped].id);
        buttons.current[wrapped]?.focus();
    };

    return (
        <div role="tablist" aria-label={label} className="flex border-b-2 border-ink" onKeyDown={on_key_down}>
            {tabs.map((tab, i) => {
                const is_selected = tab.id === selected;
                return (
                    <button
                        key={tab.id}
                        ref={button => { buttons.current[i] = button; }}
                        type="button"
                        role="tab"
                        id={tab_id(idPrefix, tab.id)}
                        aria-selected={is_selected}
                        aria-controls={panel_id(idPrefix, tab.id)}
                        tabIndex={is_selected ? 0 : -1}
                        className={cx(
                            'h-11 flex-1 cursor-pointer border-0 px-3 text-sm font-bold uppercase',
                            'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink',
                            is_selected ? 'bg-brand text-brand-ink' : 'bg-transparent text-ink-2 hover:bg-highlight'
                        )}
                        onClick={() => onSelect(tab.id)}
                    >
                        {tab.label}
                    </button>
                );
            })}
        </div>
    );
}
