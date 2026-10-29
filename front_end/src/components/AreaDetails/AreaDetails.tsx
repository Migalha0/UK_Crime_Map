import BarList, { type BarRow } from "./BarList";
import { CardEmpty, CardNotice, CardSection } from "../Card/Card";
import {
  get_lsoa_crimes,
  sum_crimes,
  get_top_crime,
} from "../../data/crime_stats";
import { GROUP_LABELS, type Group } from "../../data/demography_groups";
import {
  deprivation_score,
  type HouseholdDeprivation,
} from "../../data/deprivation";
import { format_number } from "../../lib/format";
import { CARD_TEXT } from "../../lib/styles";
import type {
  CrimeCounts,
  Demography,
  LsoaDemography,
  LsoaArea,
  MonthCrimeData,
} from "../../types";

interface AreaDetailsProps {
  feature: LsoaArea;
  /** Whether this area's police force published crime data for the month */
  hasData: boolean;
  demography: Demography;
  /** Households by number of deprivation dimensions (Census 2021) */
  deprivation?: HouseholdDeprivation;
  crimeData: MonthCrimeData;
  countryCrime: number;
}

/**
 * Demographic and crime information for one LSOA, shown in the area panel.
 * The panel itself provides the title and close button.
 */
export default function AreaDetails({
  feature,
  hasData,
  demography,
  deprivation,
  crimeData,
  countryCrime,
}: AreaDetailsProps) {
  const { lsoa } = feature;
  const no_data = !hasData;

  const lsoa_demography = demography[lsoa];
  const population = lsoa_demography?.total_population ?? 0;

  const crimes = get_lsoa_crimes(crimeData, lsoa);
  const localCrime = sum_crimes(crimes);
  const topCrime = get_top_crime(crimes, crimeData.crime_lookup);
  const per_thousand =
    population > 0 ? ((localCrime / population) * 1000).toFixed(1) : "–";

  return (
    <article className={CARD_TEXT}>
      <dl className="m-0 grid grid-cols-3 gap-2">
        <Stat label="Residents" value={format_number(population)} />
        <Stat
          label="Crimes"
          value={no_data ? "–" : format_number(localCrime)}
        />
        <Stat label="Per 1,000" value={no_data ? "–" : per_thousand} />
      </dl>

      {no_data ? (
        <CardNotice>
          This area's police force didn't publish crime by neighbourhood for
          this month, so there is no crime data to show.
        </CardNotice>
      ) : (
        <>
          {topCrime.count > 0 && (
            <p className="mt-2.5 mb-0 border-l-[3px] border-crime bg-highlight px-2.5 py-2 font-medium">
              <span className="block text-[11px] font-normal text-ink-2">
                Most common
              </span>
              {topCrime.name}
            </p>
          )}
          <CrimeSection crimes={crimes} crimeLookup={crimeData.crime_lookup} />
        </>
      )}

      {lsoa_demography && population > 0 && (
        <DemographySection
          lsoaDemography={lsoa_demography}
          population={population}
        />
      )}

      {deprivation && <DeprivationSection households={deprivation} />}

      {!no_data && (
        <footer className="mt-3.5 border-t border-line pt-2.5 text-xs text-ink-3">
          {format_number(localCrime)} of {format_number(countryCrime)} crimes
          recorded in England &amp; Wales this month
        </footer>
      )}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-line p-2">
      <dt className="text-[11px] text-ink-3">{label}</dt>
      <dd className="mt-0.5 text-base font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function CrimeSection({
  crimes,
  crimeLookup,
}: {
  crimes: CrimeCounts;
  crimeLookup: string[];
}) {
  const entries = Object.entries(crimes).sort(([, a], [, b]) => b - a);

  if (entries.length === 0) {
    return (
      <CardSection title="Crimes this month">
        <CardEmpty>No crimes recorded this month.</CardEmpty>
      </CardSection>
    );
  }

  const top_count = entries[0][1];
  const rows: BarRow[] = entries.map(([crime_id, count]) => ({
    key: crime_id,
    label: crimeLookup[Number(crime_id)],
    fraction: count / top_count,
    value: format_number(count),
  }));

  return (
    <CardSection title="Crimes this month">
      <BarList rows={rows} variant="crime" />
    </CardSection>
  );
}

function DemographySection({
  lsoaDemography,
  population,
}: {
  lsoaDemography: LsoaDemography;
  population: number;
}) {
  const rows: BarRow[] = Object.entries(lsoaDemography)
    .filter(([group, count]) => group !== "total_population" && count > 0)
    .sort(([, a], [, b]) => b - a)
    .map(([group, count]) => ({
      key: group,
      label: GROUP_LABELS[group as Group] ?? group,
      fraction: count / population,
      value: `${((count / population) * 100).toFixed(1)}%`,
      title: `${format_number(count)} residents`,
    }));

  return (
    <CardSection title="Residents by ethnic group (Census 2021)">
      <BarList rows={rows} variant="people" />
    </CardSection>
  );
}

const deprivation_labels = [
  "Not deprived",
  "1 dimension",
  "2 dimensions",
  "3 dimensions",
  "All 4 dimensions",
];

function DeprivationSection({
  households,
}: {
  households: HouseholdDeprivation;
}) {
  const total = households.reduce((sum, count) => sum + count, 0);
  if (total === 0) {
    return null;
  }

  const rows: BarRow[] = households.map((count, dimensions) => ({
    key: String(dimensions),
    label: deprivation_labels[dimensions],
    fraction: count / total,
    value: `${((count / total) * 100).toFixed(1)}%`,
    title: `${format_number(count)} households`,
  }));

  return (
    <CardSection title="Households by deprivation (Census 2021)">
      <BarList rows={rows} variant="people" />
      <p className="mt-1.5 mb-0 text-xs text-ink-2">
        Score{" "}
        <strong className="font-mono text-ink">
          {deprivation_score(households).toFixed(2)}
        </strong>
        : the average number of ways (employment, education, health,
        housing) a household here is deprived.
      </p>
    </CardSection>
  );
}
