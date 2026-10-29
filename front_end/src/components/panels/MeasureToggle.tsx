import { cx } from '../../lib/cx';
import { FOCUS_RING } from '../../lib/styles';

/** The two ways the precomputed panels measure each crime type in an area */
export type Measure = 'mix' | 'rate';

const MEASURE_LABELS: Record<Measure, string> = {
    mix: 'Share of local crime',
    rate: 'Per 1,000 residents',
};

/**
 * Segmented control switching between the mix and rate measures.
 */
export default function MeasureToggle({ measure, onChange }: { measure: Measure; onChange: (measure: Measure) => void }) {
    return (
        <div className="flex border-2 border-ink" role="radiogroup" aria-label="Measure">
            {(Object.keys(MEASURE_LABELS) as Measure[]).map(key => (
                <button
                    key={key}
                    type="button"
                    role="radio"
                    className={cx(
                        'flex-1 cursor-pointer border-0 px-1.5 py-[5px] text-xs',
                        FOCUS_RING,
                        key === measure ? 'bg-brand font-bold text-brand-ink' : 'bg-transparent text-ink-2 hover:bg-highlight'
                    )}
                    aria-checked={key === measure}
                    onClick={() => onChange(key)}
                >
                    {MEASURE_LABELS[key]}
                </button>
            ))}
        </div>
    );
}
