/**
 * Join Tailwind class names, skipping falsy ones: cx('a', open && 'b').
 */
export function cx(...classes: (string | false | null | undefined)[]): string {
    return classes.filter(Boolean).join(' ');
}
