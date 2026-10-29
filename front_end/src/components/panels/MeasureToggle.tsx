import Segmented from '../ui/Segmented';

/** The two ways the precomputed panels measure each crime type in an area */
export type Measure = 'mix' | 'rate';

const MEASURE_OPTIONS: { value: Measure; label: string }[] = [
    { value: 'mix', label: 'Share of local crime' },
    { value: 'rate', label: 'Per 1,000 residents' },
];

/**
 * Switch between the mix and rate measures.
 */
export default function MeasureToggle({ measure, onChange }: { measure: Measure; onChange: (measure: Measure) => void }) {
    return <Segmented label="Measure" options={MEASURE_OPTIONS} value={measure} onChange={onChange} />;
}
