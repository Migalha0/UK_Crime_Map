import { cx } from "../../lib/cx";

export interface BarRow {
  key: string;
  label: string;
  /** Bar length, 0..1 */
  fraction: number;
  value: string;
  title?: string;
}

const fill_colours = {
  crime: "bg-crime",
  people: "bg-people",
};

/**
 * Compact horizontal bars: label, bar, value.
 */
export default function BarList({
  rows,
  variant,
}: {
  rows: BarRow[];
  variant: keyof typeof fill_colours;
}) {
  return (
    <ul className="m-0 list-none p-0">
      {rows.map((row) => (
        <li
          className="grid grid-cols-[1fr_72px_44px] items-center gap-2 py-0.5"
          key={row.key}
          title={row.title}
        >
          <span className="truncate">{row.label}</span>
          <span className="h-2 overflow-hidden bg-track">
            <span
              className={cx(
                "block h-full",
                fill_colours[variant],
              )}
              style={{ width: `${row.fraction * 100}%` }}
            />
          </span>
          <span className="text-right font-mono text-xs text-ink-2 tabular-nums">
            {row.value}
          </span>
        </li>
      ))}
    </ul>
  );
}
