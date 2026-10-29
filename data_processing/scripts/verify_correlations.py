"""
Independent check of the correlation panels using SciPy instead of the
app's own TypeScript (front_end/src/data/statistics.ts and correlation.ts).

  python3 verify_correlations.py                    # checks + stability + significance
  python3 verify_correlations.py --bootstrap        # also bootstraps the "top vs runner-up" gaps (~30 s)
  python3 verify_correlations.py --check-data       # rebuild the latest month + census from the raw downloads and compare
  python3 verify_correlations.py --check-data all   # same for all 36 months (~3 GB of CSV, a few minutes)
  python3 verify_correlations.py --export-csv 2026-04
                                                    # one row per neighbourhood, to redo panel 1 in Excel / Sheets

Reads the same files the app does and re-derives the area filter and group
list from the front end's source, so the two can't silently drift apart.
"""

import csv
import json
import re
import sys
from collections import Counter
from pathlib import Path

import numpy as np
from scipy.stats import rankdata, spearmanr

ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ROOT / 'data_processing/data_raw'
DATA = ROOT / 'front_end/public/data'
SRC = ROOT / 'front_end/src/data'

# ~~~~~~~~~~ same inputs and coverage rules as the app ~~~~~~~~~~

groups = re.findall(r"^\s+(\w+):", (SRC / 'demography_groups.ts').read_text(), re.M)

demography = json.loads((DATA / 'LSOA_2021_demography.json').read_text())
lsoa_index = json.loads((DATA / 'lsoa_index.json').read_text())
precomputed = json.loads((DATA / 'crime_group_correlation.json').read_text())
precomputed_deprivation = json.loads((DATA / 'crime_deprivation_correlation.json').read_text())
deprivation = json.loads((DATA / 'LSOA_2021_deprivation.json').read_text())['lsoa']
manifest = json.loads((SRC / 'crime_manifest.json').read_text())
lsoa_forces = json.loads((DATA / 'lsoa_forces.json').read_text())
month_files = [DATA / 'crime' / f'{month}.json' for month in manifest['months']]

# Every LSOA with census residents; coverage decides month by month which of them count
areas = [lsoa for lsoa in lsoa_index['lsoa'] if demography.get(lsoa, {}).get('total_population', 0) > 0]
index = {lsoa: i for i, lsoa in enumerate(areas)}
area_force = [lsoa_forces['forces'][lsoa_forces['lsoa'][a]] if a in lsoa_forces['lsoa'] else None for a in areas]

population = np.array([demography[a]['total_population'] for a in areas], dtype=float)

# Deprivation score: average number of dimensions (0-4) a household is deprived in
households = np.array([deprivation[a] for a in areas], dtype=float)
deprivation_score = households @ np.arange(5) / households.sum(axis=1)
shares = {g: np.array([demography[a].get(g, 0) for a in areas]) / population for g in groups}


def covered(month):
    """True for areas whose police force published this month (or that no force ever reported)."""
    published = set(manifest['forces_by_month'][month])
    return np.array([force is None or force in published for force in area_force])


print(f"{len(lsoa_index['lsoa'])} LSOAs on the map, {len(areas)} with census residents")
print(f"{len(groups)} groups, {len(month_files)} months ({month_files[0].stem} … {month_files[-1].stem})\n")


def month_counts(path):
    """[crime_id][area] counts for one month (codes not on the map are dropped)."""
    month = json.loads(path.read_text())
    counts = np.zeros((len(month['crime_lookup']), len(areas)))
    for lsoa, crimes in month['lsoa'].items():
        if lsoa in index:
            for crime_id, count in crimes.items():
                counts[int(crime_id), index[lsoa]] += count
    return month['crime_lookup'], counts


def rho(x, y):
    return spearmanr(x, y).statistic


# ~~~~~~~~~~ panel 1: crime vs. resident ethnicity, per month ~~~~~~~~~~

print('== Panel 1: share of residents vs. all crime per 1,000 residents, every month')
monthly = {g: [] for g in groups}
areas_per_month = []
for path in month_files:
    _, counts = month_counts(path)
    mask = covered(path.stem)
    areas_per_month.append(mask.sum())
    rate = counts.sum(axis=0)[mask] / population[mask] * 1000
    for g in groups:
        monthly[g].append(rho(shares[g][mask], rate))

print(f'areas with data per month: {min(areas_per_month):,} – {max(areas_per_month):,}')
print(f"{'group':<20}{'latest':>8}{'min':>8}{'max':>8}{'spread':>8}")
for g in sorted(groups, key=lambda g: -monthly[g][-1]):
    values = np.array(monthly[g])
    print(f"{g:<20}{values[-1]:>+8.3f}{values.min():>+8.3f}{values.max():>+8.3f}{values.max() - values.min():>8.3f}")

# ~~~~~~~~~~ panel 2: crime type vs. resident ethnicity, all months pooled ~~~~~~~~~~

print('\n== Panel 2: pooled over covered months, compared with crime_group_correlation.json')
lookup, pooled = None, None
months_covered = np.zeros(len(areas))
for path in month_files:
    month_lookup, counts = month_counts(path)
    mask = covered(path.stem)
    months_covered += mask
    if pooled is None or len(month_lookup) > len(lookup):
        grown = np.zeros((len(month_lookup), len(areas)))
        if pooled is not None:
            grown[:len(pooled)] = pooled
        pooled, lookup = grown, month_lookup
    pooled[:len(counts)] += counts * mask

# Areas with at least one covered month
kept = months_covered > 0
pooled = pooled[:, kept]
kept_shares = {g: shares[g][kept] for g in groups}
totals = pooled.sum(axis=0)
measures = {
    'mix': np.divide(pooled, totals, out=np.zeros_like(pooled), where=totals > 0),
    'rate': pooled / (population[kept] * months_covered[kept]) * 1000,
}
print(f'{kept.sum():,} areas with at least one covered month (app file: {precomputed["areas"]:,})')

for name, values in measures.items():
    mine = np.array([[rho(kept_shares[g], values[c]) for g in groups] for c in range(len(lookup))])
    app = np.array(precomputed[name])
    print(f"{name}: max |SciPy − app| = {np.abs(mine - app).max():.6f} across {app.size} coefficients")

zero_share = (pooled == 0).mean(axis=1)
print('\nShare of areas with zero of each crime type over the whole period (ties at zero):')
for c, crime in enumerate(lookup):
    print(f"  {crime:<30}{zero_share[c]:>6.1%}")
print(f"Areas with no crime at all over the period (mix undefined, set to 0): {(totals == 0).sum()}")

# ~~~~~~~~~~ panel 3: crime vs. household deprivation ~~~~~~~~~~

print('\n== Panel 3: deprivation score vs. crime per 1,000 residents')

# Rebuild the deprivation file from the raw census CSV, with Python's own csv module
raw_deprivation = RAW_DIR / 'LSOA_2021_deprivation_index.csv'
if raw_deprivation.exists():
    rebuilt = {}
    with raw_deprivation.open(newline='') as f:
        reader = csv.reader(f)
        next(reader)
        for code, _name, category, _label, count in reader:
            if category != '-8':
                rebuilt.setdefault(code, [0] * 5)[int(category) - 1] += int(count)
    differing = sum(rebuilt.get(code) != counts for code, counts in deprivation.items())
    print(f'Census: {len(rebuilt)} LSOAs rebuilt from the raw CSV; {len(deprivation)} in the app file; {differing} differ')

deprivation_monthly = []
for path in month_files:
    _, counts = month_counts(path)
    mask = covered(path.stem)
    deprivation_monthly.append(rho(deprivation_score[mask], counts.sum(axis=0)[mask] / population[mask] * 1000))
deprivation_monthly = np.array(deprivation_monthly)
print(f'per month: latest {deprivation_monthly[-1]:+.3f}, range {deprivation_monthly.min():+.3f} – {deprivation_monthly.max():+.3f}')

# Deciles for the latest month: crimes per 1,000 residents in each tenth of areas by deprivation
_, latest_counts = month_counts(month_files[-1])
latest_mask = covered(month_files[-1].stem)
latest_crime = latest_counts.sum(axis=0)[latest_mask]
latest_population = population[latest_mask]
latest_score = deprivation_score[latest_mask]
decile = np.minimum(9, ((rankdata(latest_score) - 1) / latest_mask.sum() * 10).astype(int))
decile_rates = [latest_crime[decile == d].sum() / latest_population[decile == d].sum() * 1000 for d in range(10)]
print(f'{month_files[-1].stem} crimes per 1,000 by decile (least → most deprived): '
      + ' '.join(f'{r:.1f}' for r in decile_rates)
      + f'  (×{decile_rates[-1] / decile_rates[0]:.1f})')

kept_score = deprivation_score[kept]
for name, values in measures.items():
    mine = np.array([rho(kept_score, values[c]) for c in range(len(lookup))])
    app = np.array(precomputed_deprivation[name])
    print(f'{name}: max |SciPy − app| = {np.abs(mine - app).max():.6f} across {app.size} coefficients')
all_rate = totals / (population[kept] * months_covered[kept]) * 1000
print(f'all crime, pooled: SciPy {rho(kept_score, all_rate):+.4f}, app {precomputed_deprivation["all_crime_rate"]:+.4f}')

# ~~~~~~~~~~ panel 4: ethnic makeup, accounting for deprivation ~~~~~~~~~~

# Partial Spearman correlation computed a second way: regress the ranks of x and of y
# on the ranks of deprivation, then correlate what's left over (the residuals).
# The app uses the shortcut formula from three correlations; both must agree.
def partial_spearman(x, y, z):
    rx, ry, rz = rankdata(x), rankdata(y), rankdata(z)
    design = np.column_stack([np.ones_like(rz), rz])
    residual_x = rx - design @ np.linalg.lstsq(design, rx, rcond=None)[0]
    residual_y = ry - design @ np.linalg.lstsq(design, ry, rcond=None)[0]
    return np.corrcoef(residual_x, residual_y)[0, 1]

print(f'\n== Panel 4: {month_files[-1].stem}, each group before and after accounting for deprivation')
latest_rate = latest_crime / latest_population * 1000
print(f"{'group':<20}{'before':>8}{'after':>8}{'share~dep':>11}")
partials = {}
for g in groups:
    x = shares[g][latest_mask]
    partials[g] = (rho(x, latest_rate), partial_spearman(x, latest_rate, latest_score), rho(x, latest_score))
for g in sorted(groups, key=lambda g: -partials[g][1]):
    before, after, with_deprivation = partials[g]
    print(f'{g:<20}{before:>+8.3f}{after:>+8.3f}{with_deprivation:>+11.3f}')

# ~~~~~~~~~~ significance ~~~~~~~~~~

n = int(kept.sum())
print(f'\n== Significance with n = {n} (assuming independent areas, which they are not)')
print(f'|ρ| needed for p < 0.05: {1.96 / np.sqrt(n - 1):.4f}')
print(f'|ρ| needed for p < 0.05 after Bonferroni for {len(lookup) * len(groups)} tests: '
      f'{3.85 / np.sqrt(n - 1):.4f}')

# ~~~~~~~~~~ optional: bootstrap the "top vs. runner-up" gaps ~~~~~~~~~~

if '--bootstrap' in sys.argv:
    rng = np.random.default_rng(0)
    repeats = 200
    print(f'\n== Bootstrap ({repeats} resamples of areas): is the top group clearly ahead of the runner-up?')

    for name, values in measures.items():
        print(f'-- {name}')
        app = np.array(precomputed[name])
        for c, crime in enumerate(lookup):
            order = np.argsort(-app[c])
            top, second = groups[order[0]], groups[order[1]]
            gaps = []
            for _ in range(repeats):
                sample = rng.integers(0, n, n)
                y = rankdata(values[c][sample])
                gaps.append(np.corrcoef(rankdata(kept_shares[top][sample]), y)[0, 1]
                            - np.corrcoef(rankdata(kept_shares[second][sample]), y)[0, 1])
            low, high = np.percentile(gaps, [2.5, 97.5])
            verdict = 'clear' if low > 0 else 'NOT clear'
            print(f'  {crime:<30}{top} − {second}: {app[c][order[0]] - app[c][order[1]]:+.3f} '
                  f'[95% CI {low:+.3f}, {high:+.3f}] {verdict}')


def option_value(flag, default):
    """Value following a command-line flag, e.g. --export-csv 2026-04."""
    position = sys.argv.index(flag)
    following = sys.argv[position + 1] if position + 1 < len(sys.argv) else ''
    return default if following.startswith('--') or not following else following


RAW = ROOT / 'data_processing/data_raw'
OUT = ROOT / 'data_processing/verification'

# ~~~~~~~~~~ optional: rebuild the processed data from the raw downloads ~~~~~~~~~~

if '--check-data' in sys.argv:
    print('\n== Data integrity: raw downloads vs. the files the app reads')

    # Census: re-apply demography_maker.mjs's category → group mapping to the raw ONS file
    maker = (ROOT / 'data_processing/scripts/demography_maker.mjs').read_text()
    category_to_group = dict(re.findall(r"'(\d+)':\s*'(\w+)'", maker))

    rebuilt = {}
    with open(RAW / 'UK_demography.csv', newline='') as file:
        for lsoa, category, _name, residents in csv.reader(file):
            group = category_to_group[category]
            rebuilt.setdefault(lsoa, Counter())[group] += int(residents)

    mismatched_areas = [
        lsoa for lsoa, counts in rebuilt.items()
        if any(demography.get(lsoa, {}).get(g, 0) != n for g, n in counts.items())
        or demography.get(lsoa, {}).get('total_population') != sum(counts.values())
    ]
    print(f'Census: {len(rebuilt)} LSOAs rebuilt from {len(category_to_group)} census categories; '
          f'{len(demography)} in the app file; {len(mismatched_areas)} with any differing count')

    # Crime: count raw rows per (LSOA code, crime type), exactly as crimes_maker.mjs does
    months = [p.stem for p in month_files] if option_value('--check-data', 'latest') == 'all' else [month_files[-1].stem]

    for month in months:
        raw_counts = Counter()
        raw_rows = 0
        for force_file in sorted((RAW / 'crime' / month).glob('*.csv')):
            with open(force_file, newline='', encoding='utf-8') as file:
                for row in csv.DictReader(file):
                    raw_counts[(row['LSOA code'], row['Crime type'])] += 1
                    raw_rows += 1

        processed = json.loads((DATA / 'crime' / f'{month}.json').read_text())
        app_counts = Counter({
            (lsoa, processed['crime_lookup'][int(crime_id)]): count
            for lsoa, crimes in processed['lsoa'].items()
            for crime_id, count in crimes.items()
        })

        differing = sum(1 for key in raw_counts.keys() | app_counts.keys() if raw_counts[key] != app_counts[key])
        unlocated = sum(n for (lsoa, _), n in raw_counts.items() if lsoa == '')
        print(f'Crime {month}: {raw_rows:,} raw rows ({unlocated:,} with no LSOA) vs. '
              f'{sum(app_counts.values()):,} in the app file; '
              f'{differing} (LSOA, crime type) counts differ')

# ~~~~~~~~~~ optional: spreadsheet export for checking panel 1 by hand ~~~~~~~~~~

if '--export-csv' in sys.argv:
    month = option_value('--export-csv', month_files[-1].stem)
    _, counts = month_counts(DATA / 'crime' / f'{month}.json')
    crimes = counts.sum(axis=0)
    mask = covered(month)
    names = dict(zip(lsoa_index['lsoa'], lsoa_index['name']))

    OUT.mkdir(exist_ok=True)
    path = OUT / f'panel1_{month}.csv'
    with open(path, 'w', newline='') as file:
        writer = csv.writer(file)
        writer.writerow(['lsoa', 'name', 'residents', *[f'{g}_share' for g in groups], 'crimes', 'crimes_per_1000'])
        for i, lsoa in enumerate(areas):
            if not mask[i]:
                continue
            writer.writerow([
                lsoa, names[lsoa], int(population[i]),
                *[f'{shares[g][i]:.6f}' for g in groups],
                int(crimes[i]), f'{crimes[i] / population[i] * 1000:.6f}',
            ])

    print(f'\nWrote {path.relative_to(ROOT)} ({mask.sum()} rows, the areas with data that month). '
          f'Expected results for {month}:')
    rate = crimes[mask] / population[mask] * 1000
    for g in groups:
        print(f'  {g:<20}{rho(shares[g][mask], rate):+.4f}')
