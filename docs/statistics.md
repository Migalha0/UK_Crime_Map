# How the analysis panels work: a plain-language guide

This guide explains, without assuming any statistics background, how the analysis panels on the map get their numbers:

1. **Crime and neighbourhood ethnic makeup**: one number per ethnic group, for the month you've selected.
2. **Crime types and neighbourhood ethnic makeup**: for each type of crime, which group it's most associated with, over every month (currently 40).
3. **Crime and household deprivation**: crime in the least to most deprived neighbourhoods, and one number per crime type.
4. **Ethnic makeup, accounting for deprivation**: panel 1 again, with the part explained by deprivation taken out.
5. **How far do offenders travel?**: published research, not computed here (§11).

Every step comes with **what** happens, **why** it's done that way, and **where** it lives in the code. The last section shows three ways to check the work yourself. The first needs nothing but Excel or Google Sheets.

> **Already checked for you** (details in [§12](#12-checking-it-yourself)):
> - The processed data matches the raw Police.uk and census downloads **exactly**: all 19,924,377 crimes across 40 months, and every census count.
> - The app's maths gives the same answers as SciPy, a widely used scientific library, and as a plain spreadsheet. That includes panels 3 and 4, and the census deprivation file matches the raw census CSV exactly.
> - Two data problems turned up during checking and are now fixed; see [§3.3](#33-earlier-problems-now-fixed).

---

## Contents

1. [The question, in everyday words](#1-the-question-in-everyday-words)
2. [The two numbers we give every neighbourhood](#2-the-two-numbers-we-give-every-neighbourhood)
3. [Which neighbourhoods are included](#3-which-neighbourhoods-are-included)
4. [Step A: turn the numbers into positions (ranking)](#4-step-a-turn-the-numbers-into-positions-ranking)
5. [Step B: measure whether the positions move together (correlation)](#5-step-b-measure-whether-the-positions-move-together-correlation)
6. [How to read the result (ρ)](#6-how-to-read-the-result-ρ)
7. [Panel 1: Crime and neighbourhood ethnic makeup](#7-panel-1-crime-and-neighbourhood-ethnic-makeup)
8. [Panel 2: Crime types and neighbourhood ethnic makeup](#8-panel-2-crime-types-and-neighbourhood-ethnic-makeup)
9. [Panel 3: Crime and household deprivation](#9-panel-3-crime-and-household-deprivation)
10. [Panel 4: Ethnic makeup, accounting for deprivation](#10-panel-4-ethnic-makeup-accounting-for-deprivation)
11. [How far do offenders travel?](#11-how-far-do-offenders-travel)
12. [Checking it yourself](#12-checking-it-yourself)
13. [What these numbers do NOT tell you](#13-what-these-numbers-do-not-tell-you)
14. [Glossary](#14-glossary)
15. [Appendix: technical notes for a statistician](#15-appendix-technical-notes-for-a-statistician)

---

## 1. The question, in everyday words

England and Wales are divided by the government into about 35,000 small neighbourhoods called **LSOAs** (Lower layer Super Output Areas). Each has roughly 1,000–3,000 residents. For each one we know:
- **who lives there**, from the 2021 census;
- **how many crimes the police recorded there**, from Police.uk, month by month.

Both panels ask the same kind of question:

> *"In neighbourhoods where group X makes up a bigger part of the population, is recorded crime usually higher, usually lower, or neither?"*

The answer is a single number between **−1** and **+1** called **ρ** (the Greek letter "rho"). Positive means "usually higher", negative means "usually lower", and close to zero means "no consistent pattern". The method is called **Spearman's rank correlation**. The rest of this guide takes it apart piece by piece.

**Important from the start:** this compares *places*, not *people*. It can't say who commits crimes. See [§13](#13-what-these-numbers-do-not-tell-you).

---

## 2. The two numbers we give every neighbourhood

To compare neighbourhoods, each one is reduced to two numbers.

### 2.1 Number 1: the group's **share** of residents

```
share = residents from group X  ÷  all residents
```

**Example:** 300 Black residents out of 1,500 → share = 0.20 (20%).

**Why a share and not a plain count?** Neighbourhoods differ in size. 300 people is a large part of a 1,500-person area but a small part of a 9,000-person one. Dividing by the total makes neighbourhoods of different sizes comparable.

The census lists 19 ethnic categories. The app merges them into 13 groups (e.g. Indian, Pakistani and Bangladeshi → "South Asian"). The full mapping is in the table below and in [`demography_maker.mjs`](../data_processing/scripts/demography_maker.mjs).

| Group in the app | Census 2021 categories included |
|---|---|
| White British | White: English, Welsh, Scottish, Northern Irish or British |
| White Irish | White: Irish |
| Gypsy, Traveller & Roma | White: Gypsy or Irish Traveller; White: Roma |
| Other White | White: Other White |
| South Asian | Asian: Bangladeshi; Indian; Pakistani |
| Chinese | Asian: Chinese |
| Other Asian | Asian: Other Asian |
| Black | Black: African; Caribbean; Other Black |
| Mixed White & Asian | Mixed: White and Asian |
| Mixed White & Black | Mixed: White and Black African; White and Black Caribbean |
| Other Mixed | Mixed: Other Mixed or Multiple |
| Arab | Other: Arab |
| Other | Other: Any other ethnic group |

### 2.2 Number 2: **crime per 1,000 residents**

```
crime rate = crimes recorded in the area  ÷  residents  ×  1,000
```

**Example:** 45 crimes in a month, 1,500 residents → 30 crimes per 1,000 residents.

**Why "per 1,000 residents"?** It's the same fairness fix as above: a bigger neighbourhood will naturally have more crimes. The "×1,000" is only there to avoid tiny decimals (30 instead of 0.030), and as you'll see in Step A, it doesn't change the result at all.

Panel 2 also uses a second version, the **crime mix**, which is explained in [§8.2](#82-two-ways-to-measure-crime-rate-and-mix).

### 2.3 Where the data comes from

| Data | Source | File the app reads |
|---|---|---|
| Neighbourhood shapes and names | ONS | `front_end/public/data/lsoa_boundaries.json` (shapes) and `lsoa_index.json` (codes, names) |
| Residents per group | ONS Census 2021 (`data_raw/UK_demography.csv`) | `front_end/public/data/LSOA_2021_demography.json` |
| Crimes per neighbourhood and type | Police.uk monthly downloads (`data_raw/crime/YYYY-MM/*.csv`) | `front_end/public/data/crime/YYYY-MM.json` |

---

## 3. Which neighbourhoods are included

### 3.1 The rule: only areas whose police force published that month

Not every police force publishes crime by neighbourhood every month:
- **Greater Manchester Police** hasn't published at all in this period.
- **Gwent Police** paused from September 2025 to April 2026, and has been back since May 2026.
- **Gloucestershire Constabulary** stopped after January 2026.

If we kept those neighbourhoods in a month their force didn't publish, they would look like "zero crime" areas. That's false, and it would distort every result. So, **month by month**, a neighbourhood only counts if its force published that month. Otherwise it's grey on the map and left out of the statistics for that month.

This needs two pieces of information. Both are produced by the updater ([`update_crime_data.mjs`](../data_processing/scripts/update_crime_data.mjs)) and stored next to the data:

| File | What it says | How it's worked out |
|---|---|---|
| `front_end/src/data/crime_manifest.json` | Which forces published in each month | The file names in each month's Police.uk download (one file per force) |
| `front_end/public/data/lsoa_forces.json` | Which force each neighbourhood belongs to | See below |

**How each neighbourhood gets its force.** Every council in England & Wales lies wholly inside one police force. So for each council, the updater counts which force's files recorded its crimes, and the force with the most wins. Every neighbourhood in that council then gets that force.
- *Why per council and not per neighbourhood:* forces occasionally record a crime just over their border. Deciding neighbourhood by neighbourhood let a handful of such stray records "claim" Greater Manchester neighbourhoods for the Met or Lancashire. Per council, the real force wins by thousands of records to a few.
- *Greater Manchester* is set explicitly: its force publishes nothing, so only stray records ever appear there.
- *Checks:* all 35,672 neighbourhoods are assigned, and every council maps to exactly one force. The updater warns whenever a council's leading force has under 90% of its records. The only such council is the tiny City of London, where the Met records about 1 in 5 incidents near its edge and its own force still clearly leads.

The rule itself lives in [`coverage.ts`](../front_end/src/data/coverage.ts). The map, both panels, the precompute script and the verification script all use it, so they can never disagree.

### 3.2 What else is left out

- **Crimes with no location.** About 15,000–27,000 crimes a month have no neighbourhood code. They can't be placed, so they can't be compared. They do count in the "of N crimes in England & Wales" total in the area details.
- **Crimes in codes not on the map.** About **0.12%** of crimes (22,111 of 17.8 million across the first 36 months) carry neighbourhood codes that aren't in the 2021 map, most likely older 2011 codes that some forces still use. They can't be drawn or compared. That's small, but it's a known gap.

### 3.3 Earlier problems, now fixed

Before the automatic rule, the app used a hand-written list of 21 council names, matched by text. Checking it against the data showed two problems:
1. **"Gloucester" also matched "South Gloucestershire".** That wrongly left out 175 neighbourhoods policed by Avon & Somerset, which does publish.
2. **Months with real data were thrown away.** Gwent and Gloucestershire were left out for *every* month, including the many months they did publish.

Both are fixed by §3.1. This changed the results slightly; the tables below use the new rule.

## 4. Step A: turn the numbers into positions (ranking)

Code: `rank_values` in [`statistics.ts`](../front_end/src/data/statistics.ts)

### 4.1 What happens

Before comparing, each list of numbers is replaced by **positions**, the way a race result is: the smallest number becomes 1st, the next 2nd, and so on up to roughly 33,500th (one per neighbourhood with data that month).

```
crime rates:  [ 30,  9,  12,  335,  5 ]
positions:    [  4,  2,   3,    5,  1 ]
```

### 4.2 Why bother?

Look at the 335. That's a real kind of value: city-centre neighbourhoods with few residents but huge numbers of visitors (Westminster 018A really does record **335 crimes per 1,000 residents** in one month, against about 9 for a typical area).

If we compared the raw numbers, a few dozen of these extreme areas would dominate the whole result. After ranking, 335 is simply "5th of 5". It's still the highest, but it can't outweigh everyone else.

Ranking also means **only the order matters**. Crimes, crimes per 1,000 or crimes per 100 all give the same positions, so they all give the same result. And a pattern that rises steadily but not in a straight line still counts.

### 4.3 Ties: when two numbers are equal

If two neighbourhoods have exactly the same value, neither is "really" ahead. They would have taken two places, so they **share the average** of those places:

```
values:     [ 0.10,  0.30,  0.10,  0.50 ]
            the two 0.10s would be 1st and 2nd → both get (1 + 2) / 2 = 1.5
positions:  [ 1.5,   3,     1.5,   4    ]
```

Ties are common here. For example, over the whole period about a third of neighbourhoods recorded **zero** bicycle thefts, and all of those zeros share one averaged position. Averaging is the standard way to handle ties. It's exactly what Excel's `RANK.AVG` and SciPy do, which is why they can be used to check this code.

### 4.4 How the code does it

1. **Sort positions, not values** (`positions_smallest_first`). Sorting the values directly would lose track of which neighbourhood each one belongs to. So the code sorts the neighbourhood *indexes* by their values, and every rank can then be written back to the right neighbourhood.
2. **Walk the sorted list in groups of equal values** (`group_start` … `group_end`). A value with no tie is just a group of one.
3. **Give every member of the group the average position** (`average_rank`) and write it back at the neighbourhood's original spot (`ranks[...]`).

---

## 5. Step B: measure whether the positions move together (correlation)

Code: `pearson_correlation` in [`statistics.ts`](../front_end/src/data/statistics.ts)

We now have two lists of positions for the same neighbourhoods: one for the group's share, one for crime. We want **one number** that says whether they go up together.

### 5.1 The idea, with five neighbourhoods

| Neighbourhood | Share position | Crime position |
|---|---:|---:|
| A | 2 | 2 |
| B | 4 | 5 |
| C | 3 | 3 |
| D | 5 | 4 |
| E | 1 | 1 |

The two columns clearly mostly agree. Here's how the code turns "mostly agree" into a number.

**1. Find the middle of each list** (`first_average`, `second_average`). Both columns average **3**.
*Why:* "high" and "low" only mean something relative to a middle.

**2. For each neighbourhood, measure how far above (+) or below (−) the middle it is, in both lists** (`first_distance`, `second_distance`).

| | Share distance | Crime distance | **Multiply them** |
|---|---:|---:|---:|
| A | −1 | −1 | **+1** |
| B | +1 | +2 | **+2** |
| C | 0 | 0 | **0** |
| D | +2 | +1 | **+2** |
| E | −2 | −2 | **+4** |
| | | **total** | **+9** |

**3. Multiply the two distances and add up the results** (`moving_together`).
*Why multiplying works:*
- **Both high** (+ × +) or **both low** (− × −) gives a **positive** product: evidence they move together.
- **One high, one low** (+ × −) gives a **negative** product: evidence they move in opposite directions.
- **Exactly average** (0) gives **0**: no evidence either way.

So a big positive total means "mostly together", a big negative total means "mostly opposite", and a total near zero means "no pattern". Here the total is **+9**.

**4. Scale it to between −1 and +1** (`first_spread`, `second_spread`).
The total depends on how many neighbourhoods there are and how spread out the values are. To make it comparable, we divide by the largest it *could* have been:

```
first_spread  = (−1)² + 1² + 0² + 2² + (−2)²  = 10
second_spread = (−1)² + 2² + 0² + 1² + (−2)²  = 10

ρ = moving_together ÷ √(first_spread × second_spread)  =  9 ÷ √(10 × 10)  =  9 ÷ 10  =  0.90
```

*Why this divisor:* if the two columns matched perfectly, the total would equal exactly √(first_spread × second_spread), giving 1. If they were perfect opposites, it would give −1. So every result lands between −1 and +1, whatever the data.

**Result: ρ = 0.90** — a strong "move together", which matches what we saw in the table.

### 5.2 Putting A and B together: that's "Spearman"

`spearman_correlation` simply runs **Step A on both lists, then Step B on the positions**. That combination is what's called *Spearman's rank correlation*. Doing Step B on the *raw* numbers instead would be the plainer "Pearson correlation", which the 335-type outliers would distort.

**One detail:** if one of the lists never changes (every value identical), step 4 divides by zero. The result is "not a number", and the app shows "–".

---

## 6. How to read the result (ρ)

| ρ | In plain words |
|---|---|
| **+1** | Perfect agreement: the more of group X, the more crime, in every single case |
| **about +0.3** | A noticeable tendency, with lots of exceptions |
| **0** | No pattern at all |
| **about −0.3** | A noticeable tendency in the *opposite* direction |
| **−1** | Perfect opposite |

### 6.1 An everyday translation

Pick two neighbourhoods at random. One has a larger share of group X than the other. **How often does it also have more crime?** I measured this directly on August 2026 data, using two million random pairs:

| Group | ρ in the panel | Pairs where "more of the group" also has "more crime" |
|---|---:|---:|
| Black | +0.29 | **60%** |
| Mixed White & Asian | +0.09 | 53% |
| White Irish | −0.01 | 50%, a coin flip |
| White British | −0.29 | **40%** (so 60% of the time it has *less*) |

So even the strongest results in panel 1 mean "**6 times out of 10** instead of 5 out of 10". That's a real tendency, but **far** from a rule. The strongest results in panel 2 (about 0.55) are roughly 7 out of 10.

---

## 7. Panel 1: Crime and neighbourhood ethnic makeup

### 7.1 What it computes

For the **month selected in the month bar**, and for each of the 13 groups:

> ρ between *the group's share of residents* and *crime per 1,000 residents*, across every neighbourhood with data that month (about 33,200–34,000, depending on which forces published).

That's 13 numbers, recalculated every time you change month.

### 7.2 How the code does it, and why in this order

| Step | Where | What and why |
|---|---|---|
| 1 | [`useStaticData.ts`](../front_end/src/hooks/useStaticData.ts) | Loads neighbourhood shapes, census data and the coverage files **once**. *Why once:* these never change between months. |
| 2 | [`correlation.ts`](../front_end/src/data/correlation.ts) `make_group_correlator` | Applies the month's coverage (§3), works out every group's share for the included neighbourhoods and **ranks them** (Step A). *Why it's cached:* shares never change, and most months include the same neighbourhoods, so the ranking is done once per distinct set of neighbourhoods and reused, instead of repeating 13 big sorts on every month change. |
| 3 | [`useMonthData.ts`](../front_end/src/hooks/useMonthData.ts) | Downloads the selected month's crime file. *Why:* each month is a separate file. If you click quickly through months, late downloads for months you've already left are ignored. |
| 4 | `correlate(...)` inside `correlation.ts` | Works out crime per 1,000 for every neighbourhood, ranks it (Step A), then compares it with each group's ranked shares (Step B). Takes about 25 ms. |
| 5 | [`CorrelationPanel.tsx`](../front_end/src/components/panels/CorrelationPanel.tsx) | Draws the result (below). |

### 7.3 How it's drawn

- **One row per group**, sorted from highest ρ to lowest.
- **Bars grow from a centre line**: right (red) for positive, left (blue) for negative. The number is always printed too, so colour isn't the only clue.
- **The bar scale fits the data.** The axis runs from −d to +d, where d is the biggest value rounded *up* to the next 0.1 (so with 0.291 → the axis is ±0.3). *Why:* the bars use the space well. *Catch:* when comparing months, read the numbers, not the bar lengths.
- **Hovering a row** gives a sentence, e.g. "Neighbourhoods with a larger share of Black residents tend to have more recorded crime per resident (ρ = +0.29)".

### 7.4 What it shows, and how much it changes month to month

| Group | Aug 2026 | Lowest month | Highest month |
|---|---:|---:|---:|
| Black | +0.29 | +0.29 | +0.35 |
| Mixed White & Black | +0.29 | +0.29 | +0.35 |
| Gypsy, Traveller & Roma | +0.29 | +0.26 | +0.31 |
| Other White | +0.29 | +0.27 | +0.35 |
| Other | +0.26 | +0.26 | +0.31 |
| Other Asian | +0.25 | +0.25 | +0.30 |
| Arab | +0.24 | +0.24 | +0.28 |
| South Asian | +0.20 | +0.20 | +0.26 |
| Other Mixed | +0.20 | +0.18 | +0.25 |
| Chinese | +0.14 | +0.14 | +0.18 |
| Mixed White & Asian | +0.09 | +0.08 | +0.13 |
| White Irish | −0.01 | −0.02 | +0.02 |
| White British | −0.29 | −0.36 | −0.29 |

**What's reliable:**
- **Which direction each group goes.** It never changes in 40 months (except White Irish, which hovers around zero).
- **"Several groups at around +0.3".**

**What's NOT reliable:** the exact order at the top. Those groups are within about 0.05 of each other and swap places between months.

**Why White British is the mirror image of everyone else:** the shares in each neighbourhood add up to 100%. Wherever the White British share is lower, the other groups' shares are, together, higher. More on this in [§13](#13-what-these-numbers-do-not-tell-you).

---

## 8. Panel 2: Crime types and neighbourhood ethnic makeup

### 8.1 What it computes

For **each of the 14 crime types** and **each of the 13 groups**: the same Spearman ρ as panel 1, but with:
- crime counted **for that crime type only**, and
- **every month added together** for each neighbourhood, counting only the months in which its police force published (§3).

**Why add the months together?** Many crime types are rare in a single neighbourhood in a single month: most areas record no robbery or bicycle theft in a given month. Comparing thousands of zeros tells us little. Adding all the months together gives enough crimes per neighbourhood to see a pattern.

### 8.2 Two ways to measure crime: rate and mix

The panel has a toggle between two questions.

**Per 1,000 residents ("rate"):** *"Is there more robbery per resident where group X lives?"*
Because neighbourhoods can have data for different numbers of months, this is worked out **per month covered**: robberies ÷ (residents × months with data) × 1,000.
**Problem:** busy city areas have more of *every* crime type, so this mostly repeats panel 1 fourteen times. Groups concentrated in cities win most rows, and White British comes last in all of them.

**Share of local crime ("mix", the default):** *"Does robbery make up a bigger part of the crime where group X lives?"*

```
mix = this neighbourhood's robberies  ÷  this neighbourhood's crimes of all types
```

**Example:** a neighbourhood with 400 crimes over the whole period, 40 of them robberies → mix = 0.10 (10% of its crime is robbery).

**Why mix is the default:** dividing by the neighbourhood's *own* total cancels out "this place has a lot of crime in general". What's left is the area's crime **profile**: what *kind* of crime happens there. That's why results differ meaningfully from one crime type to the next.

**Catch:** mix is relative. In every neighbourhood the 14 crime types' shares add up to 100%. "White British comes top for violence" in mix means *violence is a larger part of the (often smaller) crime total* in those areas, **not** that there's more violence there.

**Edge case:** 14 neighbourhoods recorded no crime at all over the whole period. 0 ÷ 0 has no answer, so their mix is set to 0.

### 8.3 How the code does it

This panel is **calculated in advance**, not in your browser, because it needs every month's file, which is too much to download. The daily updater reruns it whenever new months arrive. The script is [`correlation_maker.mjs`](../data_processing/scripts/correlation_maker.mjs), run with `npm run correlations` in `data_processing/`:

| Step | What and why |
|---|---|
| 1 | Uses the same coverage rule (§3) as the browser, from the same code file, so the two can't disagree. |
| 2 | Reads every month and **adds up** crimes per neighbourhood per crime type, skipping months in which that neighbourhood's force didn't publish. |
| 3 | Works out each neighbourhood's total crime (for mix), and residents × months with data (for rate). |
| 4 | Ranks every group's shares once (Step A). *Why:* same reason as panel 1. |
| 5 | For each crime type, ranks the mix and the rate (Step A), then compares them with all 13 groups (Step B), using the **same `statistics.ts`** as the browser. |
| 6 | Rounds to 4 decimals and saves `crime_group_correlation.json` (6 KB). The app just loads and draws it. |

### 8.4 How it's drawn

[`CrimeGroupPanel.tsx`](../front_end/src/components/panels/CrimeGroupPanel.tsx):
- **One row per crime type.** It shows the group with the **highest ρ**, its value and a bar, plus the **2nd and 3rd** groups in grey. Hovering shows all 13.
- **Rows are sorted** from the strongest top result to the weakest.
- **"≈ tie" tag** when 1st and 2nd are less than **0.02** apart. *Why:* a gap that small doesn't justify calling one group "the" answer. Section 12 confirms this rule catches every genuine tie.
- **"weak" tag** when even the top group is below **0.1**. *Why:* that's barely any association (about 52–53% in the pairs translation of §6.1).
- **Both cut-offs are judgment calls** chosen for readability, not results of a formula.

### 8.5 What it shows (mix view)

| Crime type | Top group | ρ | Note |
|---|---|---:|---|
| Robbery | Black | +0.55 | Other is close behind (+0.52) |
| Theft from the person | Other | +0.50 | Other White close behind (+0.48) |
| Bicycle theft | Other White | +0.42 | clearest single winner |
| Vehicle crime | South Asian | +0.40 | |
| Other crime | White British | +0.35 | every other group is negative |
| Drugs | Black | +0.34 | ≈ tie with Other |
| Criminal damage and arson | White British | +0.34 | every other group is negative |
| Violence and sexual offences | White British | +0.31 | every other group is negative |
| Other theft | White Irish | +0.21 | |
| Burglary | White Irish | +0.20 | |
| Public order | White British | +0.18 | every other group is negative |
| Anti-social behaviour | Other White | +0.15 | |
| Shoplifting | Chinese | +0.12 | ≈ tie (gap 0.004) |
| Possession of weapons | Mixed White & Black | +0.07 | ≈ tie, weak |

In plain words:
- **Robbery, drugs, theft from the person, vehicle crime:** a bigger part of crime in dense, mixed inner-city areas.
- **Violence, criminal damage, public order, "other crime":** a bigger part of crime in mostly White British small towns and rural areas.
- **Bicycle theft:** a bigger part of crime in student and young-professional areas.

All of these are *places*, not people.

---

## 9. Panel 3: Crime and household deprivation

### 9.1 The deprivation number

The 2021 census asked whether each household is deprived in four ways ("dimensions"):
- **employment:** someone is unemployed or long-term sick;
- **education:** no one has good qualifications;
- **health:** someone is in bad health or disabled;
- **housing:** the home is overcrowded, shared or has no central heating.

For each neighbourhood it counts the households deprived in 0, 1, 2, 3 and all 4 ways. We turn those five counts into one **deprivation score**: the average number of ways a household there is deprived.

> 600 households: 300 deprived in none, 200 in one, 100 in two.
> Score = (300×0 + 200×1 + 100×2) ÷ 600 = **0.67**.

*Why this and not "share deprived in at least one way"?* The score uses all five counts, so a place where many households are deprived in several ways scores higher than one where each is deprived in just one. Scores run from about 0.1 to 1.5.

*Where:*
- [`deprivation_maker.mjs`](../data_processing/scripts/deprivation_maker.mjs) turns the census CSV into `LSOA_2021_deprivation.json`. It checks that every map area is present, and it adds up to 24,783,106 households, the census total for England & Wales.
- [`deprivation.ts`](../front_end/src/data/deprivation.ts) `deprivation_score` turns the counts into the score.

### 9.2 What the panel shows

- **The chart:** all neighbourhoods are sorted by score and cut into ten equal groups ("tenths", or *deciles*). For each tenth we add up its crimes and its residents and divide: crimes per 1,000 residents. This uses no ranking or correlation at all, only adding and dividing, so it's the easiest part to check.
- **The ρ in the subtitle:** the same Spearman correlation as panel 1 (§4–§6), between the score and crime per 1,000 residents, for the selected month.
- **"By crime type":** the same as panel 2 (§8), with the score in place of a group's share, pooled over every month. It has the same rate and mix views.

### 9.3 Results (August 2026)

| Least deprived tenth → most deprived tenth |
|---|
| 6.0 · 5.8 · 6.4 · 6.5 · 7.4 · 8.8 · 9.9 · 11.5 · 12.4 · **15.0** crimes per 1,000 residents |

- **The gap:** the most deprived tenth records **2.5×** the crime per resident of the least deprived.
- **Month by month:** ρ = **+0.47** (between +0.46 and +0.50 in every month).
- **All months pooled:** ρ = **+0.57**, because adding months together smooths out month-to-month noise.

That's clearly stronger than any ethnic group's correlation in panel 1 (the largest is about ±0.29).

**By crime type (rate):** violence (+0.65), criminal damage (+0.57), drugs, other crime, public order and weapons (≈ +0.50). The weakest is shoplifting (+0.18), which is driven by where shops are, not by who lives nearby.

**By crime type (mix):** burglary (−0.29), other theft (−0.27) and vehicle crime (−0.21) make up a *smaller* part of crime in deprived areas. They still happen there (their rates rise too), but less than violence and drugs do.

---

## 10. Panel 4: Ethnic makeup, accounting for deprivation

### 10.1 The question

Panel 1 found that neighbourhoods with more residents from some groups record more crime. Panel 3 found that deprived neighbourhoods record more crime. Some groups live in deprived neighbourhoods more often than others. So **how much of panel 1 is just deprivation showing up again?**

### 10.2 The method: partial correlation, in plain words

Take one group, say Black residents. We have three correlations across neighbourhoods:
- **share ↔ crime** (panel 1): +0.29;
- **share ↔ deprivation:** +0.23 (Black residents live in more deprived areas more often);
- **deprivation ↔ crime** (panel 3): +0.47.

If the share-crime link were *only* deprivation, it would be about 0.23 × 0.47 = 0.11, the amount "passed through" deprivation. The **partial correlation** subtracts that from 0.29 and rescales what's left back onto the −1 … +1 scale:

> (0.29 − 0.23 × 0.47) ÷ √((1 − 0.23²) × (1 − 0.47²)) = **+0.21**

So for Black residents, about a quarter of the link disappears once deprivation is taken out, and **+0.21 remains**. Computed on ranks like this, it's called the *partial Spearman correlation*.

*Where:* [`statistics.ts`](../front_end/src/data/statistics.ts) `partial_correlation` holds the formula, and [`correlation.ts`](../front_end/src/data/correlation.ts) applies it to every group each month. The share ↔ deprivation correlations never change for a given set of neighbourhoods, so they're cached like the share ranks.

### 10.3 Results (August 2026)

| Group | Before | After | Share ↔ deprivation |
|---|---:|---:|---:|
| Other White | +0.29 | +0.28 | +0.09 |
| Chinese | +0.14 | +0.23 | −0.12 |
| Gypsy, Traveller & Roma | +0.29 | +0.22 | +0.21 |
| Black | +0.29 | +0.21 | +0.23 |
| Mixed White & Black | +0.29 | +0.21 | +0.23 |
| Other | +0.26 | +0.21 | +0.16 |
| Other Mixed | +0.20 | +0.21 | +0.02 |
| Other Asian | +0.25 | +0.21 | +0.15 |
| Arab | +0.24 | +0.20 | +0.13 |
| Mixed White & Asian | +0.09 | +0.20 | −0.18 |
| South Asian | +0.20 | +0.18 | +0.08 |
| White Irish | −0.01 | +0.11 | −0.24 |
| White British | −0.29 | −0.24 | −0.17 |

How to read it:
- **Groups that live in more deprived areas** (positive last column): the link with crime *shrinks*. Part of it was deprivation.
- **Groups that live in less deprived areas** (negative last column: Chinese, Mixed White & Asian, White Irish): the link *grows*. These groups live in places with more crime than their low deprivation would predict, and that's mostly **city centres**.
- **After the adjustment almost every minority group lands at about +0.2.** That's what you'd expect if what's left is mostly "lives in a city", which applies to all of them (§13, point 2).

### 10.4 What it does not do

- **It removes one measure only:** deprivation as the census measures it. Everything else that differs between neighbourhoods (city centres, footfall, students, nightlife, policing) is still in "after".
- **It removes only the steady part:** the part where crime and deprivation rise together. If deprivation mattered in a more complicated way (a lot above some level, nothing below it), some of that would remain.
- **It is still about places, not people** (§13).

---

## 11. How far do offenders travel?

The fifth panel collects published research on the distance between an offender's home and the crime ("journey to crime"). It isn't computed from this app's data; every number is copied from its source and listed in [`journey_to_crime.ts`](../front_end/src/data/journey_to_crime.ts).

| Source | What | Median | Middle half of trips |
|---|---|---:|---|
| [Sorensen (2005)](https://www.justitsministeriet.dk/sites/default/files/media/Arbejdsomraader/Forskning/Forskningspuljen/2011/2005/Journey_to_Danish_Burglary__full_report_.pdf), Danish Ministry of Justice, 3,238 trips | All residential burglaries | 4.7 km | 1.3–13.5 km |
| | Cellars & lofts | 1.0 km | 0.1–2.8 km |
| | Apartments | 1.3 km | 0.3–4.9 km |
| | Houses | 3.5 km | 1.1–11.3 km |
| | Garages & sheds | 5.8 km | 1.5–11.8 km |
| | Farms | 10.6 km | 5.2–20.8 km |
| | Holiday homes | 13.3 km | 6.4–23.4 km |
| [Lentz et al. (2022)](https://doi.org/10.1186/s40163-022-00172-1), *Crime Science*, US suburb, 2,926 offences | Violent | 5.9 km (3.64 mi) | n/a |
| | Disorder | 6.0 km (3.75 mi) | n/a |
| | Property | 8.3 km (5.13 mi) | n/a |
| [West Midlands Police](https://popcenter.asu.edu/content/step-16-study-journey-crime), 258,074 trips | All crime | about half under 1.6 km (1 mile) | n/a |

**Compared with this map:** half of the neighbourhoods here are less than **0.68 km** across (measured from the map's own boundaries: the square root of each area, median area 0.46 km²). So even a short trip crosses several neighbourhoods. §13, point 8 explains why this research doesn't let these panels say who commits crime.

---

## 12. Checking it yourself

There are three levels, from no code at all to a full rebuild from the raw downloads.

### 12.1 Level 1: redo panel 1 in a spreadsheet (no code)

Steps A and B both exist as **built-in spreadsheet functions**: `RANK.AVG` is Step A, including the tie averaging, and `CORREL` is Step B. Tested in LibreOffice; works the same in Excel and Google Sheets.

1. Create the spreadsheet file (one row per neighbourhood, with every share and crime rate):
   ```bash
   cd data_processing/scripts
   python3 verify_correlations.py --export-csv 2026-08
   ```
   This writes `data_processing/verification/panel1_2026-08.csv`, which is git-ignored. It contains only the neighbourhoods with data that month.
2. Open it. Columns: **D** = `british_share` … **K** = `black_share` … **R** = `crimes_per_1000`. Rows 2–33578 are the 33,577 neighbourhoods.
3. In **S2**, type `=RANK.AVG(D2, D$2:D$33578, 1)` and fill it down to S33578. *(Step A for White British share.)*
4. In **T2**, type `=RANK.AVG(R2, R$2:R$33578, 1)` and fill it down. *(Step A for crime rate.)*
5. Anywhere, type `=CORREL(S2:S33578, T2:T33578)`. *(Step B.)*
6. You should get **−0.2908**, the panel's −0.29 for White British. Repeat with column **K** to get **+0.2913** for Black.

The script prints the expected value for every group when it writes the file. If your spreadsheet agrees, the app's maths is right, checked with a tool that shares none of its code.

> Some locales use `;` instead of `,` between arguments: `=RANK.AVG(D2; D$2:D$33578; 1)`.

### 12.2 Level 2: one command, everything recalculated independently

```bash
cd data_processing/scripts
python3 verify_correlations.py              # ~10 seconds
```

This recalculates the panels with **SciPy**, a widely used scientific library, instead of the app's code, and reads the coverage files and the group list the app uses. What good output looks like:
- `mix: max |SciPy − app| = 0.000050` and the same for `rate`. All 364 panel-2 numbers agree to within 0.00005, which is just the rounding to 4 decimals.
- A panel 1 table for every month, matching §7.4.
- **Panel 3:** `Census: 35672 LSOAs rebuilt from the raw CSV; … 0 differ`, the decile row from §9.3, and `max |SciPy − app|` under 0.00005 for the per-crime-type numbers.
- **Panel 4:** the before/after table from §10.3. Python computes the partial correlation a *different way* from the app: it removes deprivation's straight-line part from both rankings and correlates what's left. Both methods give the same answer only if the app's formula is right. Running the app's own TypeScript on August 2026 gave identical numbers to three decimals.

### 12.3 Level 3: is the data intact?

```bash
python3 verify_correlations.py --check-data        # latest month + census, ~10 s
python3 verify_correlations.py --check-data all    # every month, a few minutes
```

This **rebuilds the data from the original downloads**, without using the app's processing scripts, and compares every number with the files the app reads:

| Check | Result |
|---|---|
| Census: all 19 categories regrouped for 35,672 neighbourhoods | **0 differences** |
| Crime: every month, every (neighbourhood, crime type) count | **0 differences in all 40 months** |
| Crime rows accounted for | **19,924,377 of 19,924,377** |

So nothing was lost, double-counted or put in the wrong place between the downloads and the map.

**What this can't check:** whether Police.uk's and the census's own figures are right. We use them as published.

### 12.4 Optional: is the "top" group really ahead?

```bash
python3 verify_correlations.py --bootstrap    # ~30 seconds
```

This asks: if we had a slightly different set of neighbourhoods, would the same group still come top? It re-draws the neighbourhoods at random 200 times and watches the gap between 1st and 2nd place. **Result:** only three rows have no reliable winner (Shoplifting in mix; Burglary and Possession of weapons in rate), and all three already carry the "≈ tie" tag. The tag also appears on some rows the check considers settled, so the 0.02 rule errs on the side of caution.

---

## 13. What these numbers do NOT tell you

**1. Places, not people.** "Neighbourhoods with more of group X have more robbery" says **nothing** about whether people from group X commit robbery, are robbed, or have nothing to do with it. Crime is recorded **where it happens**. A shopping centre's thefts are counted against the few people who live next to it. (Statisticians call mistaking one for the other the *ecological fallacy*.)

**2. Cities explain most of it.** Ethnic groups aren't spread evenly. Most minority groups live mainly in cities, and White British residents are the large majority in towns and the countryside. Cities have more visitors, nightlife, shops, transport hubs, students and deprivation, and all of those raise recorded crime regardless of who lives there. Nothing in these panels separates "ethnicity" from "being in a city". Most of panel 1 is very likely this city-vs-countryside difference.

**3. Shares add up to 100%.** If a neighbourhood has fewer White British residents, it *must* have more of the others combined. So the 13 results aren't 13 separate discoveries: White British going down and "everyone else" going up are largely the same fact.

**4. Recorded crime isn't all crime.** It depends on what people report and what police find. Drug and weapons offences, in particular, are mostly discovered by police activity, so they partly measure **where police look**.

**5. The census is from 2021, the crime from 2023–2026.** Populations change. And "residents" ignores the workers, shoppers and tourists who are actually present, which is why city centres look so extreme per resident.

**6. Small groups are noisy.** Gypsy, Traveller & Roma and Arab residents are under 0.2% of a typical neighbourhood, and the ONS deliberately adds small random adjustments to tiny census counts to protect privacy. Treat those two groups' results with extra caution.

**7. Merged groups can hide differences.** For example, "South Asian" combines Indian, Pakistani and Bangladeshi residents, who often live in different places.

**8. "Offenders don't travel far" doesn't close the gap.** Journey-to-crime research finds that most offences happen fairly close to the offender's home, and that the distance depends on the crime. The figures are in §11: for example, half of Danish burglaries were within 4.7 km, and about half of West Midlands crime trips were under a mile. [Andresen & Shen (2019)](https://www.crimrxiv.com/pub/slkb1v54) review this research. That's a good reason to study crime **by neighbourhood**. It is still not a reason to read these panels as "residents of group X commit crime Y", for four reasons:
- **The distances are bigger than our areas.** A neighbourhood here (an LSOA) has about 1,500 residents and, in cities, is often well under 1 km across. "A couple of kilometres" spans dozens of them, so a nearby offender is usually from a *different* neighbourhood.
- **Averages hide who's travelling.** Once each offender is counted fairly, the typical "short trip" pattern holds clearly for only a few prolific offenders ([Townsley & Sidebottom, 2010](https://ojp.gov/ncjrs/virtual-library/abstracts/all-offenders-are-equal-some-are-more-equal-others-variation)).
- **Living nearby says nothing about ethnicity.** A neighbourhood that is 30% group X is also 70% everyone else. A local offender is no more likely to be from group X than the local mix suggests, and the panels can't tell which residents (or visitors) were involved.
- **Victims and visitors live there too.** The same share of residents is equally the share of potential victims and witnesses.

To say anything about **who** commits crime you need data recorded about offenders. That's the Ministry of Justice's *Statistics on Race and the Criminal Justice System*, which is national, not by neighbourhood. These panels can't stand in for it.

---

## 14. Glossary

| Term | Meaning here |
|---|---|
| **LSOA** | A small neighbourhood defined by the government, about 1,000–3,000 residents |
| **Share** | A group's residents divided by all residents of the neighbourhood |
| **Rate** | Crimes per 1,000 residents |
| **Mix** | One crime type's part of all the crime in a neighbourhood |
| **Rank / position** | Where a value comes when everything is sorted smallest to largest |
| **Tie** | Two or more equal values; they share the average position |
| **Correlation** | A number from −1 to +1 saying how much two things go up and down together |
| **ρ (rho)** | The symbol for the Spearman correlation |
| **Spearman** | Correlation calculated on positions instead of raw values (Step A, then Step B) |
| **Pearson** | Correlation calculated on raw values (Step B alone) |
| **Outlier** | A value far from all the others, like a city centre's crime rate |
| **Pooling** | Adding several months together before calculating |

---

## 15. Appendix: technical notes for a statistician

For anyone reviewing the method formally:
- **Estimator:** Spearman's ρ, computed as Pearson's r on mid-ranks. That's equivalent to `scipy.stats.spearmanr` with its default tie handling (verified to 5e-5).
- **Sample:** per month, the LSOAs whose territorial force published that month (33,203–33,970). LSOA → force is assigned per council by majority of street-level rows, with Greater Manchester fixed (§3.1). Population denominators are Census 2021 and held fixed. Unlocated crimes (`""` key) and codes outside the 2021 geometry (0.12% of crimes) are excluded.
- **Panel 2:** counts pooled over covered months only (n = 33,970 LSOAs with ≥ 1 covered month). Rate = count / (population × covered months). Mix = within-LSOA proportion, with 0/0 set to 0 (14 LSOAs). Coefficients are rounded to 4 d.p.
- **Inference:** none is shown, on purpose. At this n, |ρ| > 0.011 has p < 0.05 under independence (|ρ| > 0.021 with Bonferroni over 182 tests). But spatial autocorrelation makes the effective n much smaller, and the substantive issue is confounding, not sampling error.
- **Bootstrap** (`--bootstrap`): 200 i.i.d. resamples of LSOAs, percentile 95% CI of ρ(top) − ρ(runner-up). It ignores spatial dependence, so the intervals are anti-conservative.
- **Known confounders not adjusted for:** urbanity and ambient population, deprivation (IMD), age structure, policing intensity. The composition variables are compositional (they sum to 1).
- **Natural next steps:**
  - partial correlations, or a negative binomial model of counts with a log-population offset and IMD, density and age covariates;
  - spatial error or lag specifications;
  - workday or ambient population denominators;
  - disaggregated ethnic groups where the counts allow.
