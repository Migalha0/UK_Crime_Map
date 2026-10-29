import type { ExpressionSpecification } from 'maplibre-gl';

import { get_lsoa_crimes, sum_crimes } from '../data/crime_stats';
import { GROUP_LABELS, type Group } from '../data/demography_groups';
import { deprivation_score, type DeprivationData } from '../data/deprivation';
import { format_month } from '../data/months';
import { CRIME_CLASSES, DEPRIVATION_CLASSES, SHARE_CLASSES, fill_for, type ColourClass } from './map_style';
import type { Demography, MonthSummary } from '../types';

/** The maps you can switch between */
export type OverlayId = 'crime' | 'deprivation' | 'ethnicity';

export const OVERLAY_LABELS: Record<OverlayId, string> = {
    crime: 'Crime',
    deprivation: 'Deprivation',
    ethnicity: 'Ethnicity',
};

/** Everything the map and its legend need to show one overlay */
export interface MapOverlay {
    /** fill-color for the areas layer */
    fill: ExpressionSpecification | string;
    legend: {
        title: string;
        classes: ColourClass[];
        /** Whether some areas can be grey for "no data" */
        has_no_data: boolean;
    };
    /** Short value for the hover label, e.g. "12 crimes" */
    describe: (lsoa: string) => string | null;
}

/** Crimes recorded in each area in the selected month; grey where the police force didn't publish */
export function crime_overlay(lsoas: string[], { month, crime_data, coverage }: MonthSummary): MapOverlay {
    const total = (lsoa: string) => sum_crimes(get_lsoa_crimes(crime_data, lsoa));

    return {
        fill: fill_for(lsoas, CRIME_CLASSES, lsoa => coverage.has_data(lsoa) ? total(lsoa) : null),
        legend: { title: `Crimes recorded · ${format_month(month, 'long')}`, classes: CRIME_CLASSES, has_no_data: true },
        describe: lsoa => {
            if (!coverage.has_data(lsoa)) return 'no data this month';
            const crimes = total(lsoa);
            return `${crimes} crime${crimes === 1 ? '' : 's'}`;
        },
    };
}

/** Household deprivation score from the 2021 census */
export function deprivation_overlay(lsoas: string[], deprivation: DeprivationData): MapOverlay {
    const score = (lsoa: string) => {
        const households = deprivation.lsoa[lsoa];
        return households ? deprivation_score(households) : null;
    };

    return {
        fill: fill_for(lsoas, DEPRIVATION_CLASSES, score),
        legend: { title: 'Household deprivation score · Census 2021', classes: DEPRIVATION_CLASSES, has_no_data: false },
        describe: lsoa => {
            const value = score(lsoa);
            return value === null ? null : `deprivation ${value.toFixed(2)}`;
        },
    };
}

/** One ethnic group's share of residents from the 2021 census */
export function ethnicity_overlay(lsoas: string[], demography: Demography, group: Group): MapOverlay {
    const share = (lsoa: string) => {
        const people = demography[lsoa];
        return people && people.total_population > 0 ? (people[group] ?? 0) / people.total_population : null;
    };

    return {
        fill: fill_for(lsoas, SHARE_CLASSES, share),
        legend: { title: `${GROUP_LABELS[group]} residents · Census 2021`, classes: SHARE_CLASSES, has_no_data: false },
        describe: lsoa => {
            const value = share(lsoa);
            return value === null ? null : `${GROUP_LABELS[group]} ${(value * 100).toFixed(1)}%`;
        },
    };
}
