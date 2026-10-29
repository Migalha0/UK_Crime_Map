// Display names for the ethnic groups produced by data_processing/scripts/demography_maker.mjs
export const GROUP_LABELS = {
    british: 'White British',
    irish: 'White Irish',
    non_british_white: 'Other White',
    gypsy: 'Gypsy, Traveller & Roma',
    south_asian: 'South Asian',
    chinese: 'Chinese',
    other_asian: 'Other Asian',
    black: 'Black',
    asian_white: 'Mixed White & Asian',
    black_white: 'Mixed White & Black',
    mixed: 'Other Mixed',
    arab: 'Arab',
    other: 'Other',
} as const;

export type Group = keyof typeof GROUP_LABELS;

export const GROUPS = Object.keys(GROUP_LABELS) as Group[];
