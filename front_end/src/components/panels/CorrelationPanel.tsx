import CollapsiblePanel from './CollapsiblePanel';
import { CardNote } from '../Card/Card';
import { DivergingAxis, DivergingBar, domain_for } from '../charts/DivergingTrack';
import { GROUP_LABELS } from '../../data/demography_groups';
import { cx } from '../../lib/cx';
import { format_rho } from '../../lib/format';
import type { CorrelationResult, GroupCorrelation } from '../../types';

// label | diverging bar | value
const row_grid = 'grid grid-cols-[1fr_110px_40px] items-center gap-2';

interface CorrelationPanelProps {
    month: string;
    result: CorrelationResult;
    open: boolean;
    onToggle: () => void;
}

/**
 * Country-wide Spearman correlation between each group's share of a neighbourhood's
 * residents and the crimes recorded there per 1,000 residents, for the selected month.
 */
export default function CorrelationPanel({ month, result, open, onToggle }: CorrelationPanelProps) {
    const groups = [...result.groups].sort((a, b) => (b.rho || 0) - (a.rho || 0));
    const domain = domain_for(groups.map(({ rho }) => rho));

    return (
        <CollapsiblePanel
            title="Crime and neighbourhood ethnic makeup"
            subtitle={`${month} · Spearman ρ across ${result.areas.toLocaleString('en-GB')} neighbourhoods`}
            open={open}
            onToggle={onToggle}
        >
            <ol className="m-0 list-none p-0">
                {groups.map(group => <CorrelationRow key={group.group} {...group} domain={domain} />)}
            </ol>

            <div className={cx(row_grid, 'mt-1')}>
                <DivergingAxis domain={domain} className="col-start-2" />
            </div>

            <CardNote>
                Each bar shows whether neighbourhoods where a group makes up more of the residents tend to record
                more (red) or less (blue) crime per 1,000 residents. This describes neighbourhoods, not individuals: it says nothing about who
                committed the crimes. Crime is recorded where it happens, and deprivation, population density and
                city-centre footfall drive much of it.
            </CardNote>
        </CollapsiblePanel>
    );
}

function CorrelationRow({ group, rho, domain }: GroupCorrelation & { domain: number }) {
    const label = GROUP_LABELS[group];
    const tendency = rho >= 0 ? 'more' : 'less';

    return (
        <li
            className={cx(row_grid, 'cursor-default py-[3px] hover:bg-track')}
            title={`Neighbourhoods where more of the residents are ${label} tend to record ${tendency} crime per resident (ρ = ${format_rho(rho)})`}
        >
            <span className="truncate">{label}</span>

            <DivergingBar value={rho} domain={domain} />

            <span className="text-right font-mono text-xs text-ink-2 tabular-nums">{format_rho(rho)}</span>
        </li>
    );
}
