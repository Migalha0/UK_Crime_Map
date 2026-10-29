// Plain statistics helpers with no imports, so data_processing scripts
// running in Node can share them with the browser.
//
// The first three functions build on each other:
//
//   rank_values           turns numbers into their positions (1st, 2nd, 3rd …)
//   pearson_correlation   measures whether two lists of numbers rise and fall together
//   spearman_correlation  = pearson_correlation applied to the ranks of both lists
//
// partial_correlation then combines three correlations to take a third measure out of the picture.
//
// See docs/statistics.md for a walkthrough with worked examples.

// Any list-like collection of numbers: a normal array or a typed array such as Float64Array
type NumberList = ArrayLike<number>;

/**
 * Replace every number with its rank: the smallest becomes 1, the next 2, and so on.
 * Equal numbers ("ties") all get the average of the ranks they would have taken.
 *
 *   rank_values([0.10, 0.30, 0.10, 0.50])  →  [1.5, 3, 1.5, 4]
 *
 * The two 0.10s would have been 1st and 2nd; neither is "really" first,
 * so both get (1 + 2) / 2 = 1.5. The returned ranks stay in the original order,
 * so ranks[i] is the rank of values[i].
 */
export function rank_values(values: NumberList): Float64Array {

    // Positions 0, 1, 2 … of the input, re-ordered from smallest value to largest.
    // We sort positions (not the values themselves) so we never lose track of
    // which rank belongs to which original item.
    const positions_smallest_first = Array.from(values, (_, position) => position)
        .sort((position_a, position_b) => values[position_a] - values[position_b]);

    const ranks = new Float64Array(values.length);

    // Walk through the sorted positions in groups of equal values.
    // group_start is the place in the sorted list where the current group begins (0 = smallest).
    let group_start = 0;

    while (group_start < positions_smallest_first.length) {

        // Extend the group for as long as the next value equals this one
        const group_value = values[positions_smallest_first[group_start]];
        let group_end = group_start;

        while (
            group_end + 1 < positions_smallest_first.length &&
            values[positions_smallest_first[group_end + 1]] === group_value
        ) {
            group_end++;
        }

        // Places in the sorted list start at 0, ranks start at 1, hence the + 1.
        // For a single value (no tie) this is just its own rank.
        const average_rank = (group_start + group_end) / 2 + 1;

        // Give every member of the group the same averaged rank,
        // written back at its original position
        for (let place_in_order = group_start; place_in_order <= group_end; place_in_order++) {
            ranks[positions_smallest_first[place_in_order]] = average_rank;
        }

        // Continue with the first value after this group
        group_start = group_end + 1;
    }

    return ranks;
}

/**
 * Pearson correlation: a single number from −1 to +1 saying how well two lists
 * of paired numbers move together.
 *
 *   +1  whenever one is above its average, the other is too, in exact proportion
 *    0  no consistent relationship
 *   −1  whenever one is above its average, the other is below it, in exact proportion
 *
 * first_values[i] and second_values[i] must describe the same item
 * (here: the same neighbourhood). Returns NaN if either list never varies.
 */
export function pearson_correlation(first_values: NumberList, second_values: NumberList): number {
    const item_count = first_values.length;

    // Step 1: the average of each list, our reference point for "high" and "low"
    let first_average = 0;
    let second_average = 0;

    for (let i = 0; i < item_count; i++) {
        first_average += first_values[i];
        second_average += second_values[i];
    }
    first_average /= item_count;
    second_average /= item_count;

    // Step 2: compare every item with the averages.
    //
    // For each item, how far is it above (+) or below (−) each average?
    //  - If both distances have the same sign (both high, or both low), their
    //    product is positive: evidence the lists move together.
    //  - If the signs differ (one high, one low), the product is negative:
    //    evidence they move in opposite directions.
    // Adding up those products over every item gives the overall tendency.
    let moving_together = 0;        // sum of (first distance × second distance), the "covariance"
    let first_spread = 0;           // sum of (first distance)², how much the first list varies
    let second_spread = 0;          // sum of (second distance)², how much the second list varies

    for (let i = 0; i < item_count; i++) {
        const first_distance = first_values[i] - first_average;
        const second_distance = second_values[i] - second_average;

        moving_together += first_distance * second_distance;
        first_spread += first_distance * first_distance;
        second_spread += second_distance * second_distance;
    }

    // Step 3: divide by both spreads so the result doesn't depend on units or
    // scale (crimes vs. crimes per 1,000 give the same answer) and always lands
    // between −1 and +1
    return moving_together / Math.sqrt(first_spread * second_spread);
}

/**
 * Spearman rank correlation: Pearson correlation of the ranks instead of the raw numbers.
 *
 * Ranking first means only the order matters ("is this neighbourhood higher than
 * that one?"), not how much higher. One extreme city-centre area can then only
 * be "the highest", instead of dragging the whole result towards itself, and
 * any steadily rising relationship counts, not just a straight line.
 */
export function spearman_correlation(first_values: NumberList, second_values: NumberList): number {
    return pearson_correlation(rank_values(first_values), rank_values(second_values));
}

/**
 * Partial correlation: how strongly x and y move together once the part of
 * each that a third measure z explains has been taken out.
 *
 * Takes the three plain correlations between the lists:
 *   x_y  between x and y        (e.g. a group's share of residents and crime)
 *   x_z  between x and z        (that share and deprivation)
 *   y_z  between y and z        (crime and deprivation)
 *
 * Why it works: if x and y only look related because both rise with z,
 * then x_y is roughly x_z × y_z, the top of the fraction is about 0 and so is the result.
 * Whatever is left over is the part of the x–y relationship z can't account for.
 * The bottom rescales that leftover back onto the usual −1 … +1 range.
 *
 * Given Spearman correlations (correlations of ranks) it gives the partial Spearman
 * correlation. Returns NaN if z explains x or y completely.
 */
export function partial_correlation(x_y: number, x_z: number, y_z: number): number {
    return (x_y - x_z * y_z) / Math.sqrt((1 - x_z * x_z) * (1 - y_z * y_z));
}
