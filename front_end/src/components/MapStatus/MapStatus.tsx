import { cx } from '../../lib/cx';
import { PANEL } from '../../lib/styles';

const pill = cx(PANEL, 'absolute bottom-6 left-1/2 z-1000 -translate-x-1/2 bg-brand! px-3.5 py-2 text-xs font-bold text-brand-ink uppercase');

/**
 * Small pill over the bottom of the map for loading progress or a load error.
 */
export default function MapStatus({ loadingLabel, error }: { loadingLabel: string | null; error: Error | null }) {

    if (error) {
        return (
            <div className={cx(pill, 'text-crime')} role="alert">
                Couldn't load the data: {error.message}
            </div>
        );
    }

    if (loadingLabel) {
        return (
            <div className={cx(pill, 'whitespace-nowrap text-ink-2')} role="status">
                {loadingLabel}
            </div>
        );
    }

    return null;
}
