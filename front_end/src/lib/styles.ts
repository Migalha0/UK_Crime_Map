// Tailwind class groups reused across components

/** Base text style of every card, panel and popup */
export const CARD_TEXT = "font-sans text-[12.5px]/[1.45] text-ink";

/** Floating white surface (month bar, analysis panels, status pill) */
export const PANEL = `${CARD_TEXT} box-border border-2 border-ink bg-surface shadow-panel`;

export const CARD_TITLE = "m-0 block text-[15px] font-bold";

export const CARD_SUBTITLE = "mt-0.5 mb-0 block font-mono text-[11px] text-ink-3";

/** Keyboard-only focus outline for buttons */
export const FOCUS_RING =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

/** The portfolio's button: yellow, bold uppercase, 2px border and a hard shadow that presses in on click */
export const BRAND_BUTTON =
  "cursor-pointer border-2 border-ink bg-brand font-sans font-bold text-brand-ink uppercase no-underline shadow-button " +
  "transition-[translate,box-shadow] duration-100 hover:translate-[1px] hover:shadow-button-pressed " +
  "active:translate-[3px] active:shadow-none";
