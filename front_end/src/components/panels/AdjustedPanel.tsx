import CollapsiblePanel from './CollapsiblePanel';
import { CardNote } from '../Card/Card';
import { DivergingAxis, DivergingTrack, domain_for, position_on_track } from '../charts/DivergingTrack';
import { GROUP_LABELS } from '../../data/demography_groups';
import { cx } from '../../lib/cx';
import { format_rho } from '../../lib/format';
import type { CorrelationResult, GroupMonthCorrelation } from '../../types';

// label | dumbbell | adjusted value
const row_grid = 'grid grid-cols-[1fr_110px_40px] items-center gap-2';

// Square markers, matching the blocky style: hollow = before, filled = after
const marker = 'absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 border-2 border-ink';

interface AdjustedPanelProps {
    month: string;
    result: CorrelationResult;
    open: boolean;
    onToggle: () => void;
}

/**
 * Crime, ethnic makeup and deprivation together: each group's Spearman ρ with crime
 * per 1,000 residents before and after taking deprivation out (partial Spearman correlation).
 */
export default function AdjustedPanel({ month, result, open, onToggle }: AdjustedPanelProps) {
    const groups = [...result.groups].sort((a, b) => (b.adjusted_rho || 0) - (a.adjusted_rho || 0));
    const domain = domain_for(groups.flatMap(({ rho, adjusted_rho }) => [rho, adjusted_rho]));

    const shrunk = groups.filter(({ rho, adjusted_rho }) => Math.abs(adjusted_rho) < Math.abs(rho)).length;

    return (
        <CollapsiblePanel
            title="Ethnic makeup, accounting for deprivation"
            subtitle={`${month} · partial Spearman ρ across ${result.areas.toLocaleString('en-GB')} neighbourhoods`}
            open={open}
            onToggle={onToggle}
        >
            <p className="mt-0 mb-2.5 text-xs text-ink-2">
                Some groups live in more deprived areas more often, and deprivation goes with more recorded crime
                (ρ {format_rho(result.deprivation.rho)}). This takes that shared part out of each group's correlation.
            </p>

            <div className="mb-2 flex gap-4 text-[11px] text-ink-2" aria-hidden>
                <span className="flex items-center gap-1.5">
                    <span className="size-2.5 border-2 border-ink bg-surface" /> Before
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="size-2.5 border-2 border-ink bg-ink" /> After accounting for deprivation
                </span>
            </div>

            <ol className="m-0 list-none p-0">
                {groups.map(group => <DumbbellRow key={group.group} {...group} domain={domain} />)}
            </ol>
            <div className={cx(row_grid, 'mt-1')}>
                <DivergingAxis domain={domain} className="col-start-2" />
            </div>

            <p className="mt-2.5 mb-0 text-xs">
                For <strong>{shrunk} of {groups.length}</strong> groups the link with crime gets weaker once deprivation
                is accounted for.
            </p>

            <CardNote>
                What's left is still about neighbourhoods, not people, and still includes everything else that differs
                between them (city centres, footfall, policing). Only deprivation, as measured by the census, is
                taken out, and only its steady, rising-together part.
            </CardNote>
        </CollapsiblePanel>
    );
}

function DumbbellRow({ group, rho, adjusted_rho, rho_with_deprivation, domain }: GroupMonthCorrelation & { domain: number }) {
    const before = position_on_track(rho, domain);
    const after = position_on_track(adjusted_rho, domain);

    return (
        <li
            className={cx(row_grid, 'cursor-default py-[3px] hover:bg-track')}
            title={
                `${GROUP_LABELS[group]}\n` +
                `Before: ρ = ${format_rho(rho)}\n` +
                `After accounting for deprivation: ρ = ${format_rho(adjusted_rho)}\n` +
                `This group's share vs. deprivation: ρ = ${format_rho(rho_with_deprivation)}`
            }
        >
            <span className="truncate">
                {GROUP_LABELS[group]}
                <span className="sr-only">: before {format_rho(rho)}, after accounting for deprivation</span>
            </span>

            <DivergingTrack>
                <span
                    className="absolute top-1/2 h-0.5 -translate-y-1/2 bg-ink-3"
                    style={{ left: `${Math.min(before, after)}%`, width: `${Math.abs(after - before)}%` }}
                />
                <span className={cx(marker, 'bg-surface')} style={{ left: `${before}%` }} />
                <span className={cx(marker, 'bg-ink')} style={{ left: `${after}%` }} />
            </DivergingTrack>

            <span className="text-right font-mono text-xs text-ink-2 tabular-nums">{format_rho(adjusted_rho)}</span>
        </li>
    );
}
