import type { ExpressionSpecification } from 'maplibre-gl';

// Colours are "match" expressions from LSOA code to colour, rebuilt whenever the map
// overlay or month changes (fill_for). MapLibre evaluates them in its background worker
// while cutting tiles, so neither zooming nor switching costs the main thread anything per area.
//
// Only the hovered and selected areas use "feature state" (set from CrimeMap): just two
// areas, so updating them is instant.

/** One colour band of a map: values from min up to the next band's min */
export interface ColourClass {
    min: number;
    label: string;
    colour: string;
}

/**
 * Crimes recorded in a neighbourhood in one month.
 *
 * The breaks are fixed (not recomputed per month), so a colour means the same
 * number of crimes in every month and months can be compared by eye. They were
 * picked from the distribution of monthly totals (median ≈ 10, 95th percentile ≈ 40).
 *
 * All three maps use 7-class sequential schemes from ColorBrewer by Cynthia Brewer
 * (colorbrewer2.org), a standard for choropleth maps: light means low, dark means high,
 * lightness falls steadily so the order reads in greyscale and for colour-blind viewers.
 * Crime is "YlOrRd" (yellow-orange-red).
 */
export const CRIME_CLASSES: ColourClass[] = [
    { min: 0, label: '0', colour: '#ffffb2' },
    { min: 1, label: '1–4', colour: '#fed976' },
    { min: 5, label: '5–9', colour: '#feb24c' },
    { min: 10, label: '10–14', colour: '#fd8d3c' },
    { min: 15, label: '15–24', colour: '#fc4e2a' },
    { min: 25, label: '25–49', colour: '#e31a1c' },
    { min: 50, label: '50+', colour: '#b10026' },
];

/**
 * Deprivation score (average number of ways a household is deprived, 0–4), ColorBrewer "RdPu".
 * Breaks sit near the deciles of all areas: median 0.71, 10% below 0.48, 10% above 1.06.
 */
export const DEPRIVATION_CLASSES: ColourClass[] = [
    { min: 0, label: '<0.5', colour: '#feebe2' },
    { min: 0.5, label: '0.5', colour: '#fcc5c0' },
    { min: 0.6, label: '0.6', colour: '#fa9fb5' },
    { min: 0.7, label: '0.7', colour: '#f768a1' },
    { min: 0.8, label: '0.8', colour: '#dd3497' },
    { min: 0.9, label: '0.9', colour: '#ae017e' },
    { min: 1.05, label: '1.05+', colour: '#7a0177' },
];

/**
 * Share of residents from one ethnic group, ColorBrewer "YlGnBu".
 * The same roughly logarithmic bands for every group, so groups can be compared:
 * small groups are under 1% in most places, White British is over 75% in most.
 */
export const SHARE_CLASSES: ColourClass[] = [
    { min: 0, label: '<1%', colour: '#ffffcc' },
    { min: 0.01, label: '1%', colour: '#c7e9b4' },
    { min: 0.03, label: '3%', colour: '#7fcdbb' },
    { min: 0.1, label: '10%', colour: '#41b6c4' },
    { min: 0.25, label: '25%', colour: '#1d91c0' },
    { min: 0.5, label: '50%', colour: '#225ea8' },
    { min: 0.75, label: '75%+', colour: '#0c2c84' },
];

/** Areas without a value (their police force didn't publish that month) */
export const NO_DATA_COLOUR = '#5b6470';

// Opacity is part of each colour, low enough for the satellite imagery to show through
const DATA_ALPHA = 0.6;
const NO_DATA_ALPHA = 0.35;

const with_alpha = (hex: string, alpha: number) =>
    `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, ${alpha})`;

const NO_DATA_FILL = with_alpha(NO_DATA_COLOUR, NO_DATA_ALPHA);

/** fill-color before anything has loaded */
export const EMPTY_FILL = NO_DATA_FILL;

/** Index of the colour class a value falls into */
function class_index(classes: ColourClass[], value: number): number {
    let index = 0;
    classes.forEach(({ min }, i) => {
        if (value >= min) index = i;
    });
    return index;
}

/**
 * fill-color for a whole map: each area's class colour, grey where value_of returns null.
 */
export function fill_for(lsoas: string[], classes: ColourClass[], value_of: (lsoa: string) => number | null): ExpressionSpecification | string {
    const codes_by_class: string[][] = classes.map(() => []);
    for (const lsoa of lsoas) {
        const value = value_of(lsoa);
        if (value !== null && Number.isFinite(value)) {
            codes_by_class[class_index(classes, value)].push(lsoa);
        }
    }

    // ["match", ["get", "lsoa"], [codes…], colour, [codes…], colour, …, fallback]
    // Empty branches aren't allowed, so classes no area falls into are skipped
    const branches = codes_by_class.flatMap((codes, i) =>
        codes.length > 0 ? [codes, with_alpha(classes[i].colour, DATA_ALPHA)] : []
    );

    // The expression types can't describe a variable number of branches, hence the cast
    return branches.length > 0
        ? ['match', ['get', 'lsoa'], ...branches, NO_DATA_FILL] as unknown as ExpressionSpecification
        : NO_DATA_FILL;
}

/** Thin dark seams between neighbourhoods */
export const SEAM_PAINT = { 'line-color': '#141518', 'line-width': 0.4, 'line-opacity': 0.6 } as const;

const is_selected: ExpressionSpecification = ['boolean', ['feature-state', 'selected'], false];
const is_highlighted: ExpressionSpecification = ['any', is_selected, ['boolean', ['feature-state', 'hover'], false]];

// The hovered and selected areas get the portfolio's yellow outline over a dark casing,
// so it stands out on pale yellow areas as well as on dark imagery

/** Dark casing under the outline */
export const HIGHLIGHT_CASING_PAINT = {
    'line-color': '#141518',
    'line-width': ['case', is_selected, 6.5, 4.5] as ExpressionSpecification,
    'line-opacity': ['case', is_highlighted, 1, 0] as ExpressionSpecification,
} as const;

/** Yellow outline on top */
export const HIGHLIGHT_PAINT = {
    'line-color': '#ffff00',
    'line-width': ['case', is_selected, 3, 1.75] as ExpressionSpecification,
    'line-opacity': ['case', is_highlighted, 1, 0] as ExpressionSpecification,
} as const;
