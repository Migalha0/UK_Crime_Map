import manifest from './crime_manifest.json';

// Months with a crime file in /public/data/crime, kept up to date by
// data_processing/scripts/update_crime_data.mjs (oldest first)
export const MONTHS: string[] = manifest.months;

export const LATEST_MONTH = MONTHS[MONTHS.length - 1];

// { '2023': ['2023-05', ...], ... }
export const MONTHS_BY_YEAR = MONTHS.reduce<Record<string, string[]>>((years, month) => {
    (years[month.slice(0, 4)] ??= []).push(month);
    return years;
}, {});

const month_formats = {
    short: { month: 'short' },                      // Apr
    short_year: { month: 'short', year: 'numeric' }, // Apr 2026
    long: { month: 'long', year: 'numeric' },        // April 2026
} satisfies Record<string, Intl.DateTimeFormatOptions>;

/**
 * Format a YYYY-MM month for display.
 */
export function format_month(month: string, style: keyof typeof month_formats = 'short'): string {
    const [year, month_number] = month.split('-').map(Number);

    return new Date(Date.UTC(year, month_number - 1))
        .toLocaleString('en-GB', { ...month_formats[style], timeZone: 'UTC' });
}
