import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';

import { cx } from '../../lib/cx';

/** How far the phone bottom sheet is pulled up */
export type SheetSnap = 'peek' | 'half' | 'full';

// Peek shows the handle, search and month control
const PEEK_HEIGHT = 228;
// Full leaves a strip of map visible above the sheet, so it's clear the map is still there
const FULL_GAP = 56;

/** Height of the bottom sheet at a snap point, given the height of the space it sits in */
export function sheet_height(snap: SheetSnap, available: number): number {
    const full = Math.max(PEEK_HEIGHT, available - FULL_GAP);
    if (snap === 'peek') return Math.min(PEEK_HEIGHT, full);
    if (snap === 'half') return Math.min(Math.max(PEEK_HEIGHT, Math.round(available * 0.5)), full);
    return full;
}

const NEXT_SNAP: Record<SheetSnap, SheetSnap> = { peek: 'half', half: 'full', full: 'peek' };

interface SidebarProps {
    /** Docked column on desktop; bottom sheet on phones and tablets */
    docked: boolean;
    snap: SheetSnap;
    onSnapChange: (snap: SheetSnap) => void;
    /** Height of the space the sheet sits in (the map area), for its snap points */
    available: number;
    children: ReactNode;
}

/**
 * Container for the controls and details: a column docked left of the map on wide screens,
 * a bottom sheet over the map on narrow ones. The sheet snaps between peek, half and full;
 * drag its handle, or tap / press it to step through them.
 */
export default function Sidebar({ docked, snap, onSnapChange, available, children }: SidebarProps) {
    const content_id = useId();

    // Height while the handle is being dragged; null when resting at a snap point
    const [drag_height, set_drag_height] = useState<number | null>(null);
    const drag = useRef<{ start_y: number; start_height: number; moved: boolean } | null>(null);
    const dragged = useRef(false);

    // Back to the top when the sheet closes to peek, so the search and month are what shows
    const scroller = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (snap === 'peek') scroller.current?.scrollTo({ top: 0 });
    }, [snap]);

    if (docked) {
        return (
            <aside
                id="controls"
                aria-label="Map controls and details"
                className="flex w-[400px] shrink-0 flex-col overflow-y-auto border-r-2 border-ink bg-surface"
            >
                {children}
            </aside>
        );
    }

    const rest_height = sheet_height(snap, available);
    const height = drag_height ?? rest_height;

    const on_pointer_down = (e: PointerEvent<HTMLButtonElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { start_y: e.clientY, start_height: rest_height, moved: false };
    };

    const on_pointer_move = (e: PointerEvent<HTMLButtonElement>) => {
        const current = drag.current;
        if (!current) return;
        const delta = current.start_y - e.clientY;
        if (Math.abs(delta) > 4) current.moved = true;
        if (current.moved) {
            set_drag_height(Math.min(sheet_height('full', available), Math.max(PEEK_HEIGHT * 0.6, current.start_height + delta)));
        }
    };

    const on_pointer_up = () => {
        const current = drag.current;
        drag.current = null;
        if (!current?.moved || drag_height === null) return;

        // Snap to whichever resting height is closest to where the sheet was let go
        dragged.current = true;
        const closest = (['peek', 'half', 'full'] as SheetSnap[]).reduce((best, candidate) =>
            Math.abs(sheet_height(candidate, available) - drag_height) < Math.abs(sheet_height(best, available) - drag_height) ? candidate : best
        );
        set_drag_height(null);
        onSnapChange(closest);
    };

    return (
        <aside
            id="controls"
            aria-label="Map controls and details"
            className={cx(
                'absolute inset-x-0 bottom-0 z-1001 flex flex-col border-t-2 border-ink bg-surface',
                'shadow-[0_-4px_0_0_var(--color-ink)]',
                drag_height === null && 'transition-[height] duration-200 ease-out'
            )}
            style={{ height }}
        >
            <button
                type="button"
                className={cx(
                    'flex h-7 shrink-0 cursor-grab touch-none items-center justify-center border-0 bg-transparent',
                    'focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-ink'
                )}
                aria-label={snap === 'full' ? 'Collapse panel' : 'Expand panel'}
                aria-expanded={snap !== 'peek'}
                aria-controls={content_id}
                onPointerDown={on_pointer_down}
                onPointerMove={on_pointer_move}
                onPointerUp={on_pointer_up}
                onPointerCancel={on_pointer_up}
                onClick={() => {
                    // A drag ends with a click event too; only taps and key presses step the sheet
                    if (dragged.current) {
                        dragged.current = false;
                        return;
                    }
                    onSnapChange(NEXT_SNAP[snap]);
                }}
            >
                <span className="block h-1.5 w-12 bg-ink" aria-hidden />
            </button>

            <div
                ref={scroller}
                id={content_id}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[env(safe-area-inset-bottom)]"
            >
                {children}
            </div>
        </aside>
    );
}
