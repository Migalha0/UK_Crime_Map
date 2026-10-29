import Segmented from '../ui/Segmented';
import { GROUPS, GROUP_LABELS, type Group } from '../../data/demography_groups';
import { NO_DATA_COLOUR } from '../../lib/map_style';
import { OVERLAY_LABELS, type MapOverlay, type OverlayId } from '../../lib/map_overlays';
import { cx } from '../../lib/cx';
import { FOCUS_RING, PANEL } from '../../lib/styles';

const OVERLAY_OPTIONS = (Object.keys(OVERLAY_LABELS) as OverlayId[]).map(id => ({ value: id, label: OVERLAY_LABELS[id] }));

interface MapLayersProps {
    overlayId: OverlayId;
    onOverlayChange: (id: OverlayId) => void;
    group: Group;
    onGroupChange: (group: Group) => void;
    /** The overlay currently drawn; null until its data has loaded */
    overlay: MapOverlay | null;
}

/**
 * Map layer picker and colour key, floating on the map: crime (per month), household
 * deprivation, or one ethnic group's share of residents. Bottom-left on wide screens;
 * along the top on phones, where the bottom sheet takes the bottom.
 */
export default function MapLayers({ overlayId, onOverlayChange, group, onGroupChange, overlay }: MapLayersProps) {
    return (
        <section
            aria-label="Map layer"
            className={cx(
                PANEL,
                'absolute z-1000 p-2.5',
                'bottom-3 left-3 w-[380px]',
                'max-lg:top-2 max-lg:right-2 max-lg:bottom-auto max-lg:left-2 max-lg:w-auto max-lg:p-2 max-lg:shadow-button'
            )}
        >
            <Segmented label="Map shows" options={OVERLAY_OPTIONS} value={overlayId} onChange={onOverlayChange} />

            {overlayId === 'ethnicity' && (
                <label className="mt-2 flex items-center gap-2 text-xs font-semibold">
                    Group
                    <select
                        className={cx('h-9 min-w-0 flex-1 cursor-pointer border-2 border-ink bg-surface px-1.5 font-sans text-sm text-ink', FOCUS_RING)}
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
        <figure className="m-0 mt-2">
            <figcaption className="mb-1 truncate text-[11px] font-bold text-ink uppercase">{title}</figcaption>

            <div className="flex items-end gap-2">
                <ol className="m-0 flex min-w-0 flex-1 list-none gap-0.5 p-0">
                    {classes.map(({ label, colour }) => (
                        <li key={label} className="flex min-w-0 flex-1 flex-col gap-0.5">
                            <span className="block h-3 border border-ink/30" style={{ backgroundColor: colour }} aria-hidden />
                            <span className="truncate text-center font-mono text-[11px] text-ink-2">{label}</span>
                        </li>
                    ))}
                </ol>

                {has_no_data && (
                    <div className="flex w-12 shrink-0 flex-col gap-0.5">
                        <span className="block h-3 border border-ink/30 opacity-70" style={{ backgroundColor: NO_DATA_COLOUR }} aria-hidden />
                        <span className="text-center font-mono text-[11px] text-ink-2">No data</span>
                    </div>
                )}
            </div>
        </figure>
    );
}
