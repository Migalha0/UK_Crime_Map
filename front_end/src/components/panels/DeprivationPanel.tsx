import { useState } from 'react';

import CollapsiblePanel from './CollapsiblePanel';
import MeasureToggle, { type Measure } from './MeasureToggle';
import { CardNote, CardSection } from '../Card/Card';
import { DivergingAxis, DivergingBar, domain_for } from '../charts/DivergingTrack';
import { format_month } from '../../data/months';
import { cx } from '../../lib/cx';
import { format_rho } from '../../lib/format';
import type { CorrelationResult, CrimeDeprivationCorrelation, DeprivationDecile } from '../../types';

// label | diverging bar | value
const row_grid = 'grid grid-cols-[1fr_110px_40px] items-center gap-2';

const explanations: Record<Measure, string> = {
    mix: `Whether this type makes up more of the recorded crime in more deprived neighbourhoods,
        whatever their total.`,
    rate: `Whether more deprived neighbourhoods record more of this type per 1,000 residents.`,
};

interface DeprivationPanelProps {
    month: string;
    result: CorrelationResult['deprivation'];
    byCrimeType: CrimeDeprivationCorrelation;
    open: boolean;
    onToggle: () => void;
}

/**
 * Crime against household deprivation (Census 2021): crimes per 1,000 residents in each
 * tenth of neighbourhoods for the selected month, then each crime type's Spearman ρ over every month.
 */
export default function DeprivationPanel({ month, result, byCrimeType, open, onToggle }: DeprivationPanelProps) {
    const [measure, set_measure] = useState<Measure>('rate');

    const rows = byCrimeType.crime_lookup
        .map((crime_type, crime_id) => ({ crime_type, rho: byCrimeType[measure][crime_id] }))
        .sort((a, b) => b.rho - a.rho);
    const domain = domain_for(rows.map(({ rho }) => rho));

    return (
        <CollapsiblePanel
            title="Crime and household deprivation"
            subtitle={`${month} · Spearman ρ ${format_rho(result.rho)} across neighbourhoods`}
            open={open}
            onToggle={onToggle}
        >
            <DecileChart deciles={result.deciles} />

            <CardNote>
                Neighbourhoods split into ten equal groups by their deprivation score: the average number of ways
                (employment, education, health, housing) a household there is deprived, from the 2021 census.
            </CardNote>

            <CardSection
                title={`By crime type · ${format_month(byCrimeType.first_month, 'short_year')} – ${format_month(byCrimeType.last_month, 'short_year')}`}
            >
                <MeasureToggle measure={measure} onChange={set_measure} />
                <CardNote className="mb-2.5">{explanations[measure]}</CardNote>

                <ol className="m-0 list-none p-0">
                    {rows.map(({ crime_type, rho }) => (
                        <li
                            key={crime_type}
                            className={cx(row_grid, 'cursor-default py-[3px] hover:bg-track')}
                            title={`${crime_type}: ρ = ${format_rho(rho)} with the deprivation score`}
                        >
                            <span className="truncate">{crime_type}</span>
                            <DivergingBar value={rho} domain={domain} />
                            <span className="text-right font-mono text-xs text-ink-2 tabular-nums">{format_rho(rho)}</span>
                        </li>
                    ))}
                </ol>
                <div className={cx(row_grid, 'mt-1')}>
                    <DivergingAxis domain={domain} className="col-start-2" />
                </div>
            </CardSection>

            <CardNote>
                Like the other panels this describes neighbourhoods, not individuals: it doesn't say deprived people
                commit more crime. Deprived areas also differ in policing, reporting, density and footfall.
            </CardNote>
        </CollapsiblePanel>
    );
}

const format_rate = (rate: number) => rate.toFixed(rate < 100 ? 1 : 0);

/**
 * Column chart: crimes per 1,000 residents in each deprivation decile.
 * The readout above it names the hovered column, and shows the most deprived one otherwise.
 */
function DecileChart({ deciles }: { deciles: DeprivationDecile[] }) {
    const [hovered, set_hovered] = useState<number | null>(null);

    const highest = Math.max(...deciles.map(({ rate }) => rate));
    const shown = deciles[hovered ?? deciles.length - 1];
    const ratio = deciles[deciles.length - 1].rate / deciles[0].rate;

    return (
        <figure className="m-0">
            <figcaption className="mb-2 flex items-baseline justify-between gap-2">
                <span className="text-xs text-ink-2">
                    {hovered === null ? 'Most deprived tenth' : `Tenth ${shown.decile} of 10`}
                    <span className="text-ink-3"> · score {shown.min_score.toFixed(2)}–{shown.max_score.toFixed(2)}</span>
                </span>
                <span className="font-mono text-xs whitespace-nowrap">
                    <strong className="text-sm">{format_rate(shown.rate)}</strong>
                    <span className="text-ink-3"> per 1,000</span>
                </span>
            </figcaption>

            <ol
                className="m-0 flex h-28 list-none items-end gap-0.5 border-b border-ink p-0"
                aria-label="Crimes per 1,000 residents by deprivation decile"
                onMouseLeave={() => set_hovered(null)}
            >
                {deciles.map(({ decile, rate }, i) => (
                    <li
                        key={decile}
                        className="flex h-full flex-1 cursor-default items-end"
                        onMouseEnter={() => set_hovered(i)}
                        aria-label={`Decile ${decile}: ${format_rate(rate)} crimes per 1,000 residents`}
                    >
                        <span
                            className={cx('block w-full bg-crime transition-opacity', hovered !== null && hovered !== i && 'opacity-40')}
                            style={{ height: `${rate / highest * 100}%` }}
                        />
                    </li>
                ))}
            </ol>

            <div className="mt-1 flex justify-between font-mono text-[10px] text-ink-3">
                <span>← least deprived</span>
                <span>most deprived →</span>
            </div>

            <p className="mt-2 mb-0 text-xs">
                The most deprived tenth records <strong>{ratio.toFixed(1)}×</strong> the crime per resident of the least
                deprived tenth.
            </p>
        </figure>
    );
}
