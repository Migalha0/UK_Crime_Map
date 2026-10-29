import { useEffect, useState } from 'react';

import { load_month } from '../data/load_data';
import type { MonthCrimeData } from '../types';

export interface MonthDataState {
    /** The month crime_data belongs to (lags the selected month while loading) */
    month: string | null;
    crime_data: MonthCrimeData | null;
    error: Error | null;
}

// Wait this long after the last month change before downloading, so clicking or
// holding the arrows through several months only loads the one you stop on
const SETTLE_MS = 180;

// Months already downloaded, so going back to one is instant. Each is a few MB
// once parsed, so only the most recent few are kept.
const CACHE_SIZE = 6;
const cache = new Map<string, MonthCrimeData>();

function remember(month: string, crime_data: MonthCrimeData) {
    cache.delete(month);
    cache.set(month, crime_data);
    if (cache.size > CACHE_SIZE) {
        cache.delete(cache.keys().next().value!);
    }
}

/**
 * Crime data for the selected month. Keeps showing the previous month until the
 * new one arrives. Only the month the user settles on is downloaded: a change
 * within SETTLE_MS cancels the pending one, and leaving a month aborts its download.
 */
export function useMonthData(month: string): MonthDataState {
    const [state, set_state] = useState<MonthDataState>({ month: null, crime_data: null, error: null });

    useEffect(() => {
        const cached = cache.get(month);
        if (cached) {
            set_state({ month, crime_data: cached, error: null });
            return;
        }

        const controller = new AbortController();
        // The first month loads straight away; later changes wait to see if the user keeps clicking
        const delay = state.crime_data ? SETTLE_MS : 0;

        const timer = setTimeout(() => {
            load_month(month, controller.signal)
                .then(crime_data => {
                    remember(month, crime_data);
                    if (!controller.signal.aborted) set_state({ month, crime_data, error: null });
                })
                .catch((error: Error) => {
                    if (!controller.signal.aborted) set_state(current => ({ ...current, error }));
                });
        }, delay);

        return () => {
            clearTimeout(timer);
            controller.abort();
        };
        // state.crime_data is only read to choose the first delay
    }, [month]);

    return state;
}
