import { GROUPS, GROUP_LABELS, type Group } from '../../data/demography_groups';
import { NO_DATA_COLOUR } from '../../lib/map_style';
import { OVERLAY_LABELS, type MapOverlay, type OverlayId } from '../../lib/map_overlays';
import { cx } from '../../lib/cx';
import { FOCUS_RING, PANEL } from '../../lib/styles';

interface MapLayersProps {
    overlayId: OverlayId;
    onOverlayChange: (id: OverlayId) => void;
    group: Group;
    onGroupChange: (group: Group) => void;
    /** The overlay currently drawn; null until its data has loaded */
    overlay: MapOverlay | null;
    className?: string;
}

/**
 * Map layer picker and colour key, over the map's bottom-left corner:
 * crime (per month), household deprivation, or one ethnic group's share of residents.
 */
export default function MapLayers({ overlayId, onOverlayChange, group, onGroupChange, overlay, className }: MapLayersProps) {
    return (
        <section className={cx(PANEL, 'absolute bottom-2.5 left-2.5 z-1000 w-[300px] p-2.5 max-sm:w-[calc(100%-20px)]', className)} aria-label="Map layer">
            <div className="flex border-2 border-ink" role="radiogroup" aria-label="Map shows">
                {(Object.keys(OVERLAY_LABELS) as OverlayId[]).map(id => (
                    <button
                        key={id}
                        type="button"
                        role="radio"
                        aria-checked={id === overlayId}
                        className={cx(
                            'flex-1 cursor-pointer border-0 px-1.5 py-1 text-xs font-bold uppercase',
                            FOCUS_RING,
                            id === overlayId ? 'bg-brand text-brand-ink' : 'bg-transparent text-ink-2 hover:bg-highlight'
                        )}
                        onClick={() => onOverlayChange(id)}
                    >
                        {OVERLAY_LABELS[id]}
                    </button>
                ))}
            </div>

            {overlayId === 'ethnicity' && (
                <label className="mt-2 flex items-center gap-2 text-xs font-semibold">
                    Group
                    <select
                        className={cx('min-w-0 flex-1 cursor-pointer border-2 border-ink bg-surface px-1.5 py-1 font-sans text-xs text-ink', FOCUS_RING)}
                        value={group}
                        onChange={e => onGroupChange(e.target.value as Group)}
                    >
                        {GROUPS.map(id => <option key={id} value={id}>{GROUP_LABELS[id]}</option>)}
                    </select>
                </label>
            )}

            {overlay && <Legend {...overlay.legend} />}
        </section>
    );
}

/**
 * One block per colour band, low to high, labelled with where the band starts;
 * then the no-data colour set apart when the layer can have it.
 */
function Legend({ title, classes, has_no_data }: MapOverlay['legend']) {
    return (
        <figure className="m-0 mt-2.5">
            <figcaption className="mb-1 text-[10px] font-bold tracking-[0.04em] text-ink uppercase">{title}</figcaption>

            <div className="flex items-end gap-2">
                <ol className="m-0 flex min-w-0 flex-1 list-none gap-0.5 p-0">
                    {classes.map(({ label, colour }) => (
                        <li key={label} className="flex min-w-0 flex-1 flex-col gap-1">
                            <span className="block h-3 border border-ink/30" style={{ backgroundColor: colour }} />
                            <span className="truncate text-center font-mono text-[9.5px] text-ink-2">{label}</span>
                        </li>
                    ))}
                </ol>

                {has_no_data && (
                    <div className="flex w-11 shrink-0 flex-col gap-1">
                        <span className="block h-3 border border-ink/30 opacity-70" style={{ backgroundColor: NO_DATA_COLOUR }} />
                        <span className="text-center font-mono text-[9.5px] text-ink-2">No data</span>
                    </div>
                )}
            </div>
        </figure>
    );
}
