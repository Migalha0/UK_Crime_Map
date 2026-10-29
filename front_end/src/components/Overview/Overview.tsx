import { useMemo } from 'react';

import BarList, { type BarRow } from '../AreaDetails/BarList';
import { CardNote, CardSection } from '../Card/Card';
import { format_month } from '../../data/months';
import { format_number } from '../../lib/format';
import type { LsoaArea, MonthSummary } from '../../types';

interface OverviewProps {
    summary: MonthSummary;
    areas: LsoaArea[];
}

/**
 * What the sidebar shows when no area is selected: the month across England & Wales,
 * and how to pick an area.
 */
export default function Overview({ summary, areas }: OverviewProps) {
    const { crime_data, coverage, countryCrime, month } = summary;

    const by_type = useMemo(() => {
        const totals = new Array<number>(crime_data.crime_lookup.length).fill(0);
        for (const crimes of Object.values(crime_data.lsoa)) {
            for (const [crime_id, count] of Object.entries(crimes)) {
                totals[Number(crime_id)] += count;
            }
        }
        return totals;
    }, [crime_data]);

    const covered = useMemo(() => areas.filter(area => coverage.has_data(area.lsoa)).length, [areas, coverage]);

    const largest = Math.max(...by_type);
    const rows: BarRow[] = by_type
        .map((count, crime_id) => ({ count, name: crime_data.crime_lookup[crime_id] }))
        .sort((a, b) => b.count - a.count)
        .map(({ count, name }) => ({
            key: name,
            label: name,
            fraction: count / largest,
            value: format_number(count),
        }));

    return (
        <section aria-labelledby="overview-heading">
            <h2 id="overview-heading" className="m-0 border-2 border-ink bg-brand px-2 py-1 text-[15px] font-bold text-brand-ink">
                England &amp; Wales · {format_month(month, 'long')}
            </h2>

            <dl className="m-0 mt-3 grid grid-cols-2 gap-2">
                <div className="border-2 border-ink p-2">
                    <dt className="text-[11px] font-semibold text-ink-2">Crimes recorded</dt>
                    <dd className="m-0 mt-0.5 text-lg font-bold tabular-nums">{format_number(countryCrime)}</dd>
                </div>
                <div className="border-2 border-ink p-2">
                    <dt className="text-[11px] font-semibold text-ink-2">Neighbourhoods with data</dt>
                    <dd className="m-0 mt-0.5 text-lg font-bold tabular-nums">
                        {format_number(covered)} <span className="text-xs font-semibold text-ink-2">/ {format_number(areas.length)}</span>
                    </dd>
                </div>
            </dl>

            <p className="mt-3 mb-0 border-2 border-dashed border-ink-3 px-2.5 py-2 text-xs">
                Select a neighbourhood on the map, or find one by name above, to see its crime and census details.
            </p>

            <CardSection title="Crimes by type this month">
                <BarList rows={rows} variant="crime" />
            </CardSection>

            {covered < areas.length && (
                <CardNote>
                    Grey areas on the map: their police force didn't publish crime by neighbourhood this month.
                </CardNote>
            )}
        </section>
    );
}
