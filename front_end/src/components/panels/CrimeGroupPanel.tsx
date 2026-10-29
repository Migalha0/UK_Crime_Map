import { useState } from 'react';

import CollapsiblePanel from './CollapsiblePanel';
import MeasureToggle, { type Measure } from './MeasureToggle';
import { CardNote } from '../Card/Card';
import { GROUP_LABELS } from '../../data/demography_groups';
import { format_month } from '../../data/months';
import { format_rho } from '../../lib/format';
import type { CrimeGroupCorrelation, GroupCorrelation } from '../../types';

// A runner-up this close to the top group is treated as a tie
const tie_margin = 0.02;

// Below this the "top" group is barely associated at all
const weak_rho = 0.1;

const explanations: Record<Measure, string> = {
    mix: `How much of a neighbourhood's recorded crime is this type. Removes the effect
            of cities simply having more crime of every kind.`,
    rate: `Crimes of this type per 1,000 residents. Mostly reflects city centres
            having more crime of every kind, so groups that live mostly in cities lead most rows.`,
};

interface CrimeTypeRanking {
    crime_type: string;
    /** Groups from most to least associated */
    ranking: GroupCorrelation[];
}

/**
 * For each crime type, its groups ranked from most to least associated.
 */
function rank_groups(result: CrimeGroupCorrelation, measure: Measure): CrimeTypeRanking[] {
    return result.crime_lookup.map((crime_type, crime_id) => ({
        crime_type,
        ranking: result.groups
            .map((group, i) => ({ group, rho: result[measure][crime_id][i] }))
            .sort((a, b) => b.rho - a.rho),
    }));
}

interface CrimeGroupPanelProps {
    result: CrimeGroupCorrelation;
    open: boolean;
    onToggle: () => void;
}

/**
 * For each crime type, the ethnic group whose share of residents is most associated
 * with it across every neighbourhood and every month (precomputed by data_processing).
 */
export default function CrimeGroupPanel({ result, open, onToggle }: CrimeGroupPanelProps) {
    const [measure, set_measure] = useState<Measure>('mix');

    const rows = rank_groups(result, measure).sort((a, b) => b.ranking[0].rho - a.ranking[0].rho);
    const largest = Math.max(...rows.map(({ ranking }) => ranking[0].rho));
    const domain = Math.max(0.1, Math.ceil(largest * 10) / 10);

    return (
        <CollapsiblePanel
            title="Crime types and neighbourhood ethnic makeup"
            subtitle={
                `${format_month(result.first_month, 'short_year')} – ${format_month(result.last_month, 'short_year')} · ` +
                `Spearman ρ across ${result.areas.toLocaleString('en-GB')} neighbourhoods`
            }
            open={open}
            onToggle={onToggle}
        >
            <MeasureToggle measure={measure} onChange={set_measure} />
            <CardNote className="mb-2.5">{explanations[measure]}</CardNote>

            <ol className="m-0 list-none p-0">
                {rows.map(row => <AssociationRow key={row.crime_type} {...row} domain={domain} />)}
            </ol>

            <CardNote>
                Each row names the group that makes up more of the residents in neighbourhoods where that crime type
                is more common, followed by the next two. This describes neighbourhoods, not individuals: it says nothing about who
                committed the crimes. Crime is recorded where it happens, and deprivation, population density and
                city-centre footfall drive much of it.
            </CardNote>
        </CollapsiblePanel>
    );
}

function Tag({ children }: { children: string }) {
    return <span className="ml-1.5 border-2 border-ink bg-brand px-[5px] text-[11px] font-bold text-brand-ink uppercase">{children}</span>;
}

function AssociationRow({ crime_type, ranking, domain }: CrimeTypeRanking & { domain: number }) {
    const [top, second, third] = ranking;
    const width = Math.max(0, top.rho) / domain * 100;

    const full_ranking = ranking.map(({ group, rho }) => `${GROUP_LABELS[group]} ${format_rho(rho)}`).join('\n');

    return (
        <li className="cursor-default border-t border-line py-1.5" title={`${crime_type}\n\n${full_ranking}`}>
            <div className="flex justify-between gap-2">
                <span className="font-medium">{crime_type}</span>
                <span className="font-mono text-xs text-ink-2 tabular-nums">{format_rho(top.rho)}</span>
            </div>

            <span className="my-1 block h-2 bg-track">
                <span className="block h-full bg-pos" style={{ width: `${width}%` }} />
            </span>

            <p className="m-0 text-xs">
                <strong>{GROUP_LABELS[top.group]}</strong>
                {top.rho - second.rho < tie_margin && <Tag>≈ tie</Tag>}
                {top.rho < weak_rho && <Tag>weak</Tag>}
                <span className="text-ink-3">
                    {' '}· {GROUP_LABELS[second.group]} {format_rho(second.rho)}
                    {' '}· {GROUP_LABELS[third.group]} {format_rho(third.rho)}
                </span>
            </p>
        </li>
    );
}
