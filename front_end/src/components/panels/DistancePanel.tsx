import { useState } from 'react';

import CollapsiblePanel from './CollapsiblePanel';
import { CardNote, CardSection } from '../Card/Card';
import {
    MEDIAN_LSOA_WIDTH_KM,
    SOURCES,
    TRIP_DISTANCES,
    WEST_MIDLANDS_HALF_UNDER_KM,
    type SourceId,
    type TripDistance,
} from '../../data/journey_to_crime';
import { cx } from '../../lib/cx';

// The axis runs 0 – 24 km, enough for every middle-half range in the data
const AXIS_KM = 24;
const AXIS_TICKS = [0, 5, 10, 15, 20];

// label | range track | median
const row_grid = 'grid grid-cols-[92px_1fr_42px] items-center gap-2';

const percent = (km: number) => `${Math.min(km, AXIS_KM) / AXIS_KM * 100}%`;
const format_km = (km: number) => `${km < 10 ? km.toFixed(1) : km.toFixed(0)} km`;

/**
 * Published research on how far offenders travel from home to commit a crime,
 * set against the size of the neighbourhoods on this map.
 */
export default function DistancePanel({ open, onToggle }: { open: boolean; onToggle: () => void }) {
    const [hovered, set_hovered] = useState<TripDistance | null>(null);

    // Rows grouped by study, in the order they're listed
    const by_source: Partial<Record<SourceId, TripDistance[]>> = {};
    for (const trip of TRIP_DISTANCES) {
        (by_source[trip.source] ??= []).push(trip);
    }

    return (
        <CollapsiblePanel
            title="How far do offenders travel?"
            subtitle="Published journey-to-crime research"
            open={open}
            onToggle={onToggle}
        >
            <dl className="m-0 grid grid-cols-3 gap-1.5">
                <Stat value="~½" label={`of crime trips under ${format_km(WEST_MIDLANDS_HALF_UNDER_KM)}`} source="West Midlands Police" />
                <Stat value={format_km(4.7)} label="median trip to a burglary" source="Denmark" />
                <Stat value={format_km(MEDIAN_LSOA_WIDTH_KM)} label="width of a typical neighbourhood here" source="This map" />
            </dl>

            <CardSection title="Distance from home to the crime">
                <figure className="m-0" onMouseLeave={() => set_hovered(null)}>
                    <figcaption className="mb-2 min-h-8 text-xs text-ink-2">
                        {hovered ? (
                            <>
                                <strong className="text-ink">{hovered.label}</strong>: half of trips under{' '}
                                <strong className="font-mono text-ink">{format_km(hovered.median_km)}</strong>
                                {hovered.middle_half_km && (
                                    <>, middle half {format_km(hovered.middle_half_km[0])}–{format_km(hovered.middle_half_km[1])}</>
                                )}
                            </>
                        ) : 'Hover a row for its numbers.'}
                    </figcaption>

                    {(Object.keys(by_source) as SourceId[]).map(source => (
                        <div key={source} className="mb-2">
                            <h4 className="m-0 mb-1 text-[11px] font-semibold text-ink-2">
                                <a className="text-inherit underline decoration-ink-3 underline-offset-2 hover:text-ink" href={SOURCES[source].url} target="_blank" rel="noreferrer">
                                    {SOURCES[source].label}
                                </a>
                            </h4>
                            <ol className="m-0 list-none p-0">
                                {by_source[source]!.map(trip => (
                                    <RangeRow key={trip.label} trip={trip} active={hovered === trip} onHover={set_hovered} />
                                ))}
                            </ol>
                        </div>
                    ))}

                    <div className={row_grid}>
                        <span className="relative col-start-2 h-3 font-mono text-[11px] text-ink-3">
                            {AXIS_TICKS.map(km => (
                                <span key={km} className="absolute -translate-x-1/2" style={{ left: percent(km) }}>{km}</span>
                            ))}
                        </span>
                        <span className="font-mono text-[11px] text-ink-3">km</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-2" aria-hidden>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-4 bg-crime/35" /> Middle half of trips</span>
                        <span className="flex items-center gap-1.5"><span className="size-2.5 bg-ink" /> Median</span>
                        <span className="flex items-center gap-1.5"><span className="h-3 w-0 border-l-2 border-dashed border-neg" /> Typical neighbourhood width</span>
                    </div>
                </figure>
            </CardSection>

            <CardSection title="What it means for this map">
                <p className="m-0 text-xs">
                    Most crime happens fairly close to the offender's home, so looking at crime by neighbourhood makes
                    sense. But even a short trip of 1–2 km crosses several neighbourhoods on this map, so the people
                    living where a crime is recorded are usually <strong>not</strong> the people who committed it, and
                    nothing here records who did.
                </p>
                <p className="mt-2 mb-0 text-xs">
                    Averages also hide a lot: counting each offender once, only a few prolific offenders show the
                    classic "most crimes close to home" pattern (
                    <a className="text-inherit underline underline-offset-2" href={SOURCES.townsley.url} target="_blank" rel="noreferrer">Townsley &amp; Sidebottom, 2010</a>).
                </p>
            </CardSection>

            <CardSection title="Sources">
                <ol className="m-0 list-decimal space-y-1 pl-4 text-[11px] text-ink-2">
                    {Object.values(SOURCES).map(({ citation, url }) => (
                        <li key={url}>
                            {citation}{' '}
                            <a className="break-all text-ink underline underline-offset-2" href={url} target="_blank" rel="noreferrer">{url.replace(/^https:\/\//, '')}</a>
                        </li>
                    ))}
                </ol>
                <CardNote>Distances are straight lines from home to the crime. Studies differ in place, period and method, so compare within a study, not across.</CardNote>
            </CardSection>
        </CollapsiblePanel>
    );
}

function Stat({ value, label, source }: { value: string; label: string; source: string }) {
    return (
        <div className="flex flex-col border border-line p-1.5">
            <dd className="m-0 font-mono text-[15px] font-semibold">{value}</dd>
            <dt className="mt-0.5 text-[11px]/[1.3] text-ink-2">{label}</dt>
            <span className="mt-auto pt-1 font-mono text-[11px] text-ink-3 uppercase">{source}</span>
        </div>
    );
}

function RangeRow({ trip, active, onHover }: { trip: TripDistance; active: boolean; onHover: (trip: TripDistance) => void }) {
    const { label, median_km, middle_half_km } = trip;

    return (
        <li className={cx(row_grid, 'cursor-default py-[3px]', active && 'bg-track')} onMouseEnter={() => onHover(trip)}>
            <span className="truncate text-xs">
                {label}
                <span className="sr-only">
                    : median {format_km(median_km)}
                    {middle_half_km && `, middle half of trips ${format_km(middle_half_km[0])} to ${format_km(middle_half_km[1])}`}
                </span>
            </span>

            <span className="relative block h-3 bg-track/60" aria-hidden>
                {/* typical neighbourhood width */}
                <span className="absolute -top-0.5 -bottom-0.5 border-l-2 border-dashed border-neg" style={{ left: percent(MEDIAN_LSOA_WIDTH_KM) }} />
                {middle_half_km && (
                    <span
                        className="absolute top-0.5 bottom-0.5 bg-crime/35"
                        style={{ left: percent(middle_half_km[0]), width: `calc(${percent(middle_half_km[1])} - ${percent(middle_half_km[0])})` }}
                    />
                )}
                <span className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 bg-ink" style={{ left: percent(median_km) }} />
            </span>

            <span className="text-right font-mono text-[11px] text-ink-2 tabular-nums">{format_km(median_km)}</span>
        </li>
    );
}
