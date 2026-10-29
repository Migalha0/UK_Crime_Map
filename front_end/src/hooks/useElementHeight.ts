import { useEffect, useState, type RefObject } from 'react';

/**
 * Height of an element in pixels, kept up to date as it resizes.
 */
export function useElementHeight(ref: RefObject<HTMLElement | null>): number {
    const [height, set_height] = useState(0);

    useEffect(() => {
        const element = ref.current;
        if (!element) return;

        const observer = new ResizeObserver(([entry]) => set_height(entry.contentRect.height));
        observer.observe(element);
        return () => observer.disconnect();
    }, [ref]);

    return height;
}
