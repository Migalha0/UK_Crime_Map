import { useSyncExternalStore } from 'react';

/**
 * Whether a CSS media query currently matches, updating when it changes.
 */
export function useMediaQuery(query: string): boolean {
    return useSyncExternalStore(
        on_change => {
            const list = matchMedia(query);
            list.addEventListener('change', on_change);
            return () => list.removeEventListener('change', on_change);
        },
        () => matchMedia(query).matches
    );
}

/** Wide enough for the docked sidebar; narrower screens get the bottom sheet */
export const DESKTOP_QUERY = '(min-width: 1024px)';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
