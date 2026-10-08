"use client";

import { useMemo, useState, useTransition, type ReactNode } from "react";

import type {
  ChannelPeriodSummary,
  ContentRankingRow,
  ContentSummary,
  DashboardData,
  DashboardFilters,
  EpisodePerformance,
  HighlightItem,
  KpiMetric,
  PlatformSummary,
  ProgrammeComparison,
  RankingRow,
  TimeSeriesPoint,
} from "@/lib/analytics/types";

type TrendMetric = "views" | "subscribers" | "videos";

const trendMetricOptions: {
  id: TrendMetric;
  label: string;
}[] = [
  { id: "views", label: "Views" },
  { id: "subscribers", label: "Subscribers" },
  { id: "videos", label: "Videos" },
];

type InsightDashboardProps = {
  initialData: DashboardData;
};

type ModuleId =
  | "overview"
  | "youtube-channel"
  | "youtube-content"
  | "youtube-programmes"
  | "youtube-news"
  | "facebook-page"
  | "facebook-content"
  | "meta-overview"
  | "meta-campaigns"
  | "meta-ads";

type NavGroup = {
  title: string;
  items: {
    id: ModuleId;
    label: string;
  }[];
};

const navGroups: NavGroup[] = [
  {
    title: "Executive",
    items: [{ id: "overview", label: "Overview" }],
  },
  {
    title: "YouTube",
    items: [
      { id: "youtube-channel", label: "Channel" },
      { id: "youtube-content", label: "Content" },
      { id: "youtube-programmes", label: "Programmes" },
      { id: "youtube-news", label: "News" },
    ],
  },
  {
    title: "Facebook",
    items: [
      { id: "facebook-page", label: "Page Analytics" },
      { id: "facebook-content", label: "Content" },
    ],
  },
  {
    title: "Meta Ads",
    items: [
      { id: "meta-overview", label: "Overview" },
      { id: "meta-campaigns", label: "Campaigns" },
      { id: "meta-ads", label: "Ads" },
    ],
  },
];

const moduleTitles: Record<ModuleId, { title: string; eyebrow: string }> = {
  overview: {
    title: "Overview",
    eyebrow: "What is happening across InsightSync?",
  },
  "youtube-channel": {
    title: "YouTube Channel Analytics",
    eyebrow: "Subscriber, view, and engagement trends",
  },
  "youtube-content": {
    title: "YouTube Video Performance",
    eyebrow: "Top content and publishing outcomes",
  },
  "youtube-programmes": {
    title: "Programme and Drama Analytics",
    eyebrow: "Episode performance, rankings, and launch comparison",
  },
  "youtube-news": {
    title: "News Analytics",
    eyebrow: "Main bulletin, late-night, and daily news trends",
  },
  "facebook-page": {
    title: "Facebook Page Analytics",
    eyebrow: "Followers, growth, reach, and engagement",
  },
  "facebook-content": {
    title: "Facebook Content",
    eyebrow: "Publishing performance and content response",
  },
  "meta-overview": {
    title: "Meta Ads Overview",
    eyebrow: "Spend, reach, impressions, and efficiency",
  },
  "meta-campaigns": {
    title: "Meta Campaign Performance",
    eyebrow: "Campaign-level spend and response",
  },
  "meta-ads": {
    title: "Meta Ad Performance",
    eyebrow: "Ad-level CTR, CPM, reach, and delivery",
  },
};

const numberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});

const fullNumberFormatter = new Intl.NumberFormat("en", {
  maximumFractionDigits: 0,
});

export function InsightDashboard({ initialData }: InsightDashboardProps) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState<DashboardFilters>(initialData.filters);
  const [activeModule, setActiveModule] = useState<ModuleId>("overview");
  const [isPending, startTransition] = useTransition();

  const activeMeta = moduleTitles[activeModule];
  const selectedProgrammeLabel = getOptionLabel(
    data.programmes,
    filters.programme,
  );
  const selectedCampaignLabel = getOptionLabel(data.campaigns, filters.campaign);

  const scopedEpisodeRows = useMemo(() => {
    if (filters.programme === "all") {
      return data.episodePerformance;
    }

    return data.episodePerformance.filter(
      (episode) => episode.programme === selectedProgrammeLabel,
    );
  }, [data.episodePerformance, filters.programme, selectedProgrammeLabel]);

  const scopedComparisons = useMemo(() => {
    if (filters.programme === "all") {
      return data.comparisons;
    }

    return data.comparisons.filter((comparison) =>
      selectedProgrammeLabel
        .toLowerCase()
        .includes(comparison.programme.toLowerCase().split(" ")[0]),
    );
  }, [data.comparisons, filters.programme, selectedProgrammeLabel]);

  function commitFilters(nextFilters: DashboardFilters) {
    setFilters(nextFilters);
    const params = new URLSearchParams({
      ...nextFilters,
      activeModule,
    });

    startTransition(async () => {
      const response = await fetch(`/api/dashboard?${params.toString()}`);

      if (!response.ok) {
        console.error("Dashboard data request failed");
        return;
      }

      const nextData = (await response.json()) as DashboardData;
      setData(nextData);
      setFilters(nextData.filters);
    });
  }

  function updateFilter(name: keyof DashboardFilters, value: string) {
    if (name === "channel") {
      commitFilters({
        ...filters,
        channel: value,
      });
      return;
    }

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function applyFilters() {
    commitFilters(filters);
  }

  function removeFilter(name: keyof DashboardFilters) {
    const nextFilters = {
      ...filters,
      [name]: initialData.filters[name],
    };

    commitFilters(nextFilters);
  }

  function clearFilters() {
    commitFilters(initialData.filters);
  }

  function selectProgramme(programmeLabel: string) {
    const programme = data.programmes.find(
      (option) => option.label === programmeLabel,
    );

    if (!programme) {
      return;
    }

    setActiveModule("youtube-programmes");
    commitFilters({
      ...filters,
      programme: programme.id,
    });
  }

  return (
    <main className="min-h-screen bg-[#f5f7fb] text-slate-950">
      <div className="grid min-h-screen lg:grid-cols-[280px_1fr]">
        <aside className="border-b border-slate-200 bg-[#0d1b2a] px-4 py-5 text-white lg:border-b-0 lg:border-r lg:border-slate-900">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-200">
              InsightSync
            </p>
            <h1 className="mt-2 text-xl font-semibold">Dashboard Platform</h1>
          </div>

          <nav className="flex gap-3 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {navGroups.map((group) => (
              <div key={group.title} className="min-w-44 lg:min-w-0">
                <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {group.title}
                </p>
                <div className="grid gap-1">
                  {group.items.map((item) => (
                    <button
                      key={item.id}
                      className={navButtonClass(activeModule === item.id)}
                      onClick={() => setActiveModule(item.id)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        <section className="min-w-0">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
            <header className="flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-medium text-cyan-700">
                  {activeMeta.eyebrow}
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-950">
                  {activeMeta.title}
                </h2>
              </div>
              <ActiveFilters
                campaignLabel={selectedCampaignLabel}
                channelLabel={getOptionLabel(
                  activeModule === "youtube-content"
                    ? data.contentChannels
                    : data.channels,
                  filters.channel,
                )}
                filters={filters}
                onClear={clearFilters}
                onRemove={removeFilter}
                programmeLabel={selectedProgrammeLabel}
              />
            </header>

            <FilterBar
              activeModule={activeModule}
              data={data}
              filters={filters}
              isPending={isPending}
              onApply={applyFilters}
              onChange={updateFilter}
            />

            {data.notice && <Notice message={data.notice.message} />}

            {activeModule === "overview" && (
              <OverviewView data={data} />
            )}

            {activeModule === "youtube-channel" && (
              <YoutubeChannelView data={data} />
            )}

            {activeModule === "youtube-content" && (
              <YoutubeContentView data={data} />
            )}

            {activeModule === "youtube-programmes" && (
              <ProgrammeView
                comparisons={scopedComparisons}
                episodes={scopedEpisodeRows}
                rankings={data.rankings}
                selectedProgramme={selectedProgrammeLabel}
                onProgrammeSelect={selectProgramme}
              />
            )}

            {activeModule === "youtube-news" && (
              <NewsView data={data} />
            )}

            {activeModule === "facebook-page" && (
              <MetricModuleView
                kpis={data.facebookSummary}
                primary={
                  <Highlights
                    items={[
                      {
                        title: "Follower growth is ahead of baseline",
                        description:
                          "The current period is outperforming the previous month.",
                        metric: "84.2K net followers",
                      },
                      {
                        title: "Reach is concentrated in short-form posts",
                        description:
                          "Video-led posts are carrying most of the page reach.",
                        metric: "11.6M reach",
                      },
                    ]}
                  />
                }
              />
            )}

            {activeModule === "facebook-content" && (
              <ContentView
                rows={data.rankings}
                title="Facebook Content Performance"
                onProgrammeSelect={selectProgramme}
              />
            )}

            {activeModule === "meta-overview" && (
              <MetricModuleView
                kpis={data.metaAdsSummary}
                primary={<PlatformSummaryGrid items={data.metaAdsOverview} />}
              />
            )}

            {activeModule === "meta-campaigns" && (
              <MetaAdsView
                campaignLabel={selectedCampaignLabel}
                kpis={data.metaAdsSummary}
              />
            )}

            {activeModule === "meta-ads" && (
              <MetaAdsView
                campaignLabel={selectedCampaignLabel}
                kpis={data.metaAdsSummary}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function navButtonClass(isActive: boolean) {
  return [
    "w-full rounded-md px-3 py-2 text-left text-sm font-medium transition",
    isActive
      ? "bg-white text-slate-950 shadow-sm"
      : "text-slate-300 hover:bg-white/10 hover:text-white",
  ].join(" ");
}

function FilterBar({
  activeModule,
  data,
  filters,
  isPending,
  onApply,
  onChange,
}: {
  activeModule: ModuleId;
  data: DashboardData;
  filters: DashboardFilters;
  isPending: boolean;
  onApply: () => void;
  onChange: (name: keyof DashboardFilters, value: string) => void;
}) {
  const showChannel = activeModule.startsWith("youtube") || activeModule === "overview";
  const showProgramme = activeModule === "youtube-programmes";
  const showCampaign = activeModule.startsWith("meta");
  const channelOptions =
    activeModule === "youtube-content" ? data.contentChannels : data.channels;

  return (
    <section className="grid gap-3 rounded-md border border-slate-200 bg-white p-4 shadow-sm xl:grid-cols-[repeat(5,minmax(0,1fr))_auto]">
      <Field label="Start date">
        <input
          className={inputClass}
          type="date"
          value={filters.startDate}
          onChange={(event) => onChange("startDate", event.target.value)}
        />
      </Field>

      <Field label="End date">
        <input
          className={inputClass}
          type="date"
          value={filters.endDate}
          onChange={(event) => onChange("endDate", event.target.value)}
        />
      </Field>

      {showChannel && (
        <Field label="YouTube channel">
          <select
            className={inputClass}
            value={filters.channel}
            onChange={(event) => onChange("channel", event.target.value)}
          >
            {channelOptions.map((channel) => (
              <option key={channel.id} value={channel.id}>
                {channel.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {showProgramme && (
        <Field label="Programme">
          <select
            className={inputClass}
            value={filters.programme}
            onChange={(event) => onChange("programme", event.target.value)}
          >
            {data.programmes.map((programme) => (
              <option key={programme.id} value={programme.id}>
                {programme.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      {showCampaign && (
        <Field label="Ad campaign">
          <select
            className={inputClass}
            value={filters.campaign}
            onChange={(event) => onChange("campaign", event.target.value)}
          >
            {data.campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.label}
              </option>
            ))}
          </select>
        </Field>
      )}

      <button
        className="h-11 self-end rounded-md bg-[#0d1b2a] px-5 text-sm font-semibold text-white transition hover:bg-[#15263a] disabled:cursor-wait disabled:bg-slate-500"
        disabled={isPending}
        onClick={onApply}
        type="button"
      >
        {isPending ? "Applying" : "Apply"}
      </button>
    </section>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none ring-cyan-700 transition focus:ring-2";

function Notice({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-cyan-200 bg-cyan-50 px-4 py-3 text-sm font-medium text-cyan-900">
      {message}
    </div>
  );
}

function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      {label}
      {children}
    </label>
  );
}

function ActiveFilters({
  campaignLabel,
  channelLabel,
  filters,
  onClear,
  onRemove,
  programmeLabel,
}: {
  campaignLabel: string;
  channelLabel: string;
  filters: DashboardFilters;
  onClear: () => void;
  onRemove: (name: keyof DashboardFilters) => void;
  programmeLabel: string;
}) {
  type FilterChip = {
    key: string;
    label: string;
    remove: keyof DashboardFilters | null;
  };

  const chips: FilterChip[] = [
    {
      key: "date",
      label: `${filters.startDate} to ${filters.endDate}`,
      remove: null,
    },
    filters.channel !== "all"
      ? {
          key: "channel",
          label: channelLabel,
          remove: "channel" as keyof DashboardFilters,
        }
      : null,
    filters.programme !== "all"
      ? {
          key: "programme",
          label: programmeLabel,
          remove: "programme" as keyof DashboardFilters,
        }
      : null,
    filters.campaign !== "all"
      ? {
          key: "campaign",
          label: campaignLabel,
          remove: "campaign" as keyof DashboardFilters,
        }
      : null,
  ].filter((chip): chip is FilterChip => chip !== null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex h-8 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700"
        >
          {chip.label}
          <RemoveFilterButton chip={chip} onRemove={onRemove} />
        </span>
      ))}
      <button
        className="h-8 rounded-md px-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-50"
        onClick={onClear}
        type="button"
      >
        Clear all
      </button>
    </div>
  );
}

function RemoveFilterButton({
  chip,
  onRemove,
}: {
  chip: {
    label: string;
    remove: keyof DashboardFilters | null;
  };
  onRemove: (name: keyof DashboardFilters) => void;
}) {
  if (!chip.remove) {
    return null;
  }

  const removeKey = chip.remove;

  return (
    <button
      className="text-slate-400 transition hover:text-slate-950"
      onClick={() => onRemove(removeKey)}
      type="button"
      aria-label={`Remove ${chip.label} filter`}
    >
      x
    </button>
  );
}

function OverviewView({
  data,
}: {
  data: DashboardData;
}) {
  const isAllChannels = data.filters.channel === "all";
  const channelTrendDescription = isAllChannels
    ? "Tracks the combined cumulative total view count of the available YouTube channels over the selected period based on daily snapshots."
    : "Tracks how the selected channel's cumulative total view count changes over time based on available daily snapshots.";

  return (
    <div className="grid gap-5">
      <section className="grid gap-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">
            Latest Channel Snapshot
          </h3>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Latest available channel totals. The selected date range applies to
            trend and period-change metrics.
          </p>
        </div>
        <KpiGrid metrics={data.kpis} />
      </section>

      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel
          title="Channel Total Views Trend"
          description={channelTrendDescription}
        >
          <LineChart points={data.growth} />
        </Panel>
        <Panel
          title="Change During Selected Period"
          description="Uses the first and last available channel snapshots in the selected date range."
        >
          <ChannelPeriodSummaryPanel summary={data.channelPeriodSummary} />
        </Panel>
      </section>
    </div>
  );
}

function YoutubeChannelView({ data }: { data: DashboardData }) {
  const [trendMetric, setTrendMetric] = useState<TrendMetric>("views");

  return (
    <div className="grid gap-5">
      <KpiGrid metrics={data.kpis} />
      <section className="grid gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Panel
          title={`${getTrendMetricLabel(trendMetric)} Trend`}
          action={
            <SegmentedControl
              onChange={setTrendMetric}
              options={trendMetricOptions}
              value={trendMetric}
            />
          }
        >
          <LineChart metric={trendMetric} points={data.growth} />
        </Panel>
        <Panel title="Selected Period Summary">
          <ChannelPeriodSummaryPanel summary={data.channelPeriodSummary} />
        </Panel>
      </section>
    </div>
  );
}

function YoutubeContentView({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-5">
      <ContentFreshnessNote timestamp={data.contentFreshness} />
      <section className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
        <Panel
          title="Top Videos by Latest Captured Views"
          description="Ranks videos using the most recent statistics available in the content dataset. Values may not represent current YouTube totals."
        >
          <ContentRankingTable rows={data.contentRankings} />
        </Panel>
        <Panel title="Content Summary">
          <ContentSummaryPanel summary={data.contentSummary} />
        </Panel>
      </section>
    </div>
  );
}

function ContentView({
  onProgrammeSelect,
  rows,
  title,
}: {
  onProgrammeSelect: (programme: string) => void;
  rows: RankingRow[];
  title: string;
}) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <Panel title={title}>
        <RankingTable rows={rows} onProgrammeSelect={onProgrammeSelect} />
      </Panel>
      <Panel title="Content Response">
        <ComparisonChart
          comparisons={[
            {
              programme: "Short clips",
              launchViews: 1680000,
              averageViews: 1180000,
              retention: 68,
            },
            {
              programme: "Full episodes",
              launchViews: 1840000,
              averageViews: 1320000,
              retention: 81,
            },
            {
              programme: "News highlights",
              launchViews: 1410000,
              averageViews: 1080000,
              retention: 63,
            },
          ]}
        />
      </Panel>
    </section>
  );
}

function ContentSummaryPanel({ summary }: { summary: ContentSummary }) {
  const metrics = [
    {
      label: "Videos Published",
      value: fullNumberFormatter.format(summary.videosPublished),
      note: "Published in selected range",
    },
    {
      label: "Combined Captured Views",
      value: fullNumberFormatter.format(summary.combinedViews),
      note: "Latest captured statistics for selected videos",
    },
    {
      label: "Captured Likes",
      value: fullNumberFormatter.format(summary.likes),
      note: "Latest captured statistics for selected videos",
    },
    {
      label: "Captured Comments",
      value: fullNumberFormatter.format(summary.comments),
      note: "Latest captured statistics for selected videos",
    },
    {
      label: "Captured Engagement Rate",
      value: formatPercent(summary.engagementRate),
      note: "Captured likes plus comments over captured views",
    },
  ];

  return (
    <div className="grid gap-3">
      {metrics.map((metric) => (
        <div key={metric.label} className="rounded-md border border-slate-200 p-4">
          <p className="text-sm font-medium text-slate-500">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950">
            {metric.value}
          </p>
          <p className="mt-1 text-xs text-slate-500">{metric.note}</p>
        </div>
      ))}
    </div>
  );
}

function ContentFreshnessNote({ timestamp }: { timestamp: string | null }) {
  if (!timestamp) {
    return null;
  }

  return (
    <p className="text-sm font-medium text-slate-500">
      Content statistics captured through: {formatTimestamp(timestamp)}
    </p>
  );
}

function ContentRankingTable({ rows }: { rows: ContentRankingRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 font-semibold">Rank</th>
            <th className="pb-3 font-semibold">Video</th>
            <th className="pb-3 font-semibold">Channel</th>
            <th className="pb-3 font-semibold">Published</th>
            <th className="pb-3 font-semibold">Views</th>
            <th className="pb-3 font-semibold">Likes</th>
            <th className="pb-3 font-semibold">Comments</th>
            <th className="pb-3 font-semibold">Engagement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.videoId} className="border-b border-slate-100">
              <td className="py-4 font-semibold text-slate-950">
                #{row.rank}
              </td>
              <td className="max-w-[300px] py-4">
                <p className="line-clamp-2 font-medium text-slate-950">
                  {row.title}
                </p>
              </td>
              <td className="py-4 text-slate-700">{row.channelTitle}</td>
              <td className="py-4 text-slate-700">
                {formatAxisDate(row.publishedDate)}
              </td>
              <td className="py-4 text-slate-700">
                {numberFormatter.format(row.views)}
              </td>
              <td className="py-4 text-slate-700">
                {numberFormatter.format(row.likes)}
              </td>
              <td className="py-4 text-slate-700">
                {numberFormatter.format(row.comments)}
              </td>
              <td className="py-4 text-slate-700">
                {formatPercent(row.engagementRate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">
          No published videos are available for this selection.
        </p>
      )}
    </div>
  );
}

function ProgrammeView({
  comparisons,
  episodes,
  onProgrammeSelect,
  rankings,
  selectedProgramme,
}: {
  comparisons: ProgrammeComparison[];
  episodes: EpisodePerformance[];
  onProgrammeSelect: (programme: string) => void;
  rankings: RankingRow[];
  selectedProgramme: string;
}) {
  return (
    <div className="grid gap-5">
      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title="Programme Ranking">
          <RankingTable rows={rankings} onProgrammeSelect={onProgrammeSelect} />
        </Panel>
        <Panel title="Launch and Replacement Comparison">
          <ComparisonChart comparisons={comparisons} />
        </Panel>
      </section>
      <Panel title={`Episode Performance: ${selectedProgramme}`}>
        <EpisodeTable rows={episodes} />
      </Panel>
    </div>
  );
}

function NewsView({ data }: { data: DashboardData }) {
  return (
    <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <Panel title="News Performance Trends">
        <LineChart points={data.newsTrend} />
      </Panel>
      <div className="grid gap-5">
        <Panel title="Bulletin Highlights">
          <Highlights items={data.newsHighlights} />
        </Panel>
        <Panel title="Bulletin Comparison">
          <ComparisonChart
            comparisons={[
              {
                programme: "Main Bulletin",
                launchViews: 1410000,
                averageViews: 1080000,
                retention: 63,
              },
              {
                programme: "Late Night",
                launchViews: 720000,
                averageViews: 610000,
                retention: 58,
              },
            ]}
          />
        </Panel>
      </div>
    </section>
  );
}

function MetricModuleView({
  kpis,
  primary,
}: {
  kpis: KpiMetric[];
  primary: ReactNode;
}) {
  return (
    <div className="grid gap-5">
      <KpiGrid metrics={kpis} />
      <Panel title="Performance Summary">{primary}</Panel>
    </div>
  );
}

function MetaAdsView({
  campaignLabel,
  kpis,
}: {
  campaignLabel: string;
  kpis: KpiMetric[];
}) {
  return (
    <div className="grid gap-5">
      <KpiGrid metrics={kpis} />
      <section className="grid gap-5 xl:grid-cols-[1fr_1fr]">
        <Panel title={`Campaign Delivery: ${campaignLabel}`}>
          <ComparisonChart
            comparisons={[
              {
                programme: "Reach",
                launchViews: 9700000,
                averageViews: 7600000,
                retention: 74,
              },
              {
                programme: "Impressions",
                launchViews: 18400000,
                averageViews: 13200000,
                retention: 81,
              },
              {
                programme: "Clicks",
                launchViews: 352000,
                averageViews: 286000,
                retention: 69,
              },
            ]}
          />
        </Panel>
        <Panel title="Efficiency Signals">
          <Highlights
            items={[
              {
                title: "CPM improved in the selected period",
                description:
                  "Delivery efficiency is trending better than the previous month.",
                metric: "LKR 182 CPM",
              },
              {
                title: "CTR is stable",
                description:
                  "Creative response is consistent across high-reach campaigns.",
                metric: "1.92% CTR",
              },
            ]}
          />
        </Panel>
      </section>
    </div>
  );
}

function KpiGrid({ metrics }: { metrics: KpiMetric[] }) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {metrics.map((metric) => (
        <KpiCard key={metric.label} metric={metric} />
      ))}
    </section>
  );
}

function KpiCard({ metric }: { metric: KpiMetric }) {
  const deltaClass =
    metric.direction === "up"
      ? "text-emerald-700"
      : metric.direction === "down"
        ? "text-rose-700"
        : "text-slate-500";

  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{metric.label}</p>
        <span className={`text-sm font-semibold ${deltaClass}`}>
          {metric.delta}
        </span>
      </div>
      <p className="mt-4 text-3xl font-semibold text-slate-950">
        {metric.value}
      </p>
    </article>
  );
}

function Panel({
  action,
  children,
  description,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  description?: string;
  title: string;
}) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-950">{title}</h3>
          {description && (
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      {children}
    </article>
  );
}

function SegmentedControl<T extends string>({
  onChange,
  options,
  value,
}: {
  onChange: (value: T) => void;
  options: { id: T; label: string }[];
  value: T;
}) {
  return (
    <div className="flex rounded-md border border-slate-300 bg-white p-1 shadow-sm">
      {options.map((option) => (
        <button
          key={option.id}
          className={[
            "h-8 rounded px-3 text-sm font-semibold transition",
            option.id === value
              ? "bg-[#0d1b2a] text-white"
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
          ].join(" ")}
          onClick={() => onChange(option.id)}
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function ChannelPeriodSummaryPanel({
  summary,
}: {
  summary: ChannelPeriodSummary | null;
}) {
  if (!summary) {
    return (
      <div className="flex min-h-[260px] items-center justify-center rounded-md border border-dashed border-slate-300 px-5 text-center text-sm leading-6 text-slate-500">
        Select a specific YouTube channel to view real period changes for the
        selected date range.
      </div>
    );
  }

  const metrics = [
    {
      label: "Views gained",
      value: summary.viewsGained,
      percent: summary.viewGrowthPercent,
    },
    {
      label: "Subscribers gained",
      value: summary.subscribersGained,
      percent: summary.subscriberGrowthPercent,
    },
    {
      label: "Uploads added",
      value: summary.uploadsAdded,
      percent: summary.videoGrowthPercent,
    },
  ];

  return (
    <div className="grid gap-4">
      <div>
        <p className="text-sm font-semibold text-slate-950">
          {summary.channelTitle}
        </p>
        <p className="mt-1 text-sm text-slate-500">
          {formatAxisDate(summary.startDate)} to {formatAxisDate(summary.endDate)}
        </p>
      </div>
      <div className="grid gap-3">
        {metrics.map((metric) => (
          <div
            key={metric.label}
            className="rounded-md border border-slate-200 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <p className="text-sm font-medium text-slate-500">
                {metric.label}
              </p>
              <span className={deltaClass(metric.value)}>
                {formatSignedPercent(metric.percent)}
              </span>
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-950">
              {formatSignedNumber(metric.value)}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlatformSummaryGrid({ items }: { items: PlatformSummary[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div
          key={item.platform}
          className="rounded-md border border-slate-200 p-4"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-slate-950">{item.platform}</p>
              <p className="mt-1 text-sm text-slate-500">
                {item.primaryMetric}
              </p>
            </div>
            <span
              className={
                item.status === "positive"
                  ? "text-sm font-semibold text-emerald-700"
                  : item.status === "negative"
                    ? "text-sm font-semibold text-rose-700"
                    : "text-sm font-semibold text-slate-500"
              }
            >
              {item.delta}
            </span>
          </div>
          <p className="mt-3 text-2xl font-semibold text-slate-950">
            {item.value}
          </p>
        </div>
      ))}
    </div>
  );
}

function Highlights({ items }: { items: HighlightItem[] }) {
  return (
    <div className="grid gap-3">
      {items.map((item) => (
        <div key={item.title} className="rounded-md border border-slate-200 p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-semibold text-slate-950">{item.title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {item.description}
              </p>
            </div>
            <span className="shrink-0 rounded-md bg-cyan-50 px-3 py-1 text-sm font-semibold text-cyan-800">
              {item.metric}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function LineChart({
  metric = "views",
  points,
}: {
  metric?: TrendMetric;
  points: TimeSeriesPoint[];
}) {
  const metricLabel = getTrendMetricLabel(metric);
  const chart = useMemo(() => {
    if (points.length === 0) {
      return {
        path: "",
        points: [],
        xTicks: [],
        yTicks: [],
        minValue: 0,
        maxValue: 0,
      };
    }

    const width = 640;
    const height = 300;
    const margin = {
      top: 18,
      right: 18,
      bottom: 44,
      left: 72,
    };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const values = points.map((point) => point[metric]);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const padding = Math.max((max - min) * 0.08, max * 0.01, 1);
    const minValue = Math.max(0, min - padding);
    const maxValue = max + padding;

    const plottedPoints = points.map((point, index) => {
      const x =
        margin.left + (index / Math.max(points.length - 1, 1)) * plotWidth;
      const y =
        margin.top +
        (1 - (point[metric] - minValue) / Math.max(maxValue - minValue, 1)) *
          plotHeight;

      return {
        ...point,
        x,
        y,
      };
    });

    const path = plottedPoints
      .map((point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
      )
      .join(" ");

    const xTicks = getEvenlySpacedItems(plottedPoints, 6);
    const yTicks = Array.from({ length: 5 }, (_, index) => {
      const ratio = index / 4;
      const value = minValue + (maxValue - minValue) * ratio;
      const y = margin.top + (1 - ratio) * plotHeight;

      return { value, y };
    });

    return {
      path,
      points: plottedPoints,
      xTicks,
      yTicks,
      minValue,
      maxValue,
    };
  }, [metric, points]);

  if (points.length === 0) {
    return (
      <div className="flex min-h-[310px] items-center justify-center rounded-md border border-dashed border-slate-300 text-sm text-slate-500">
        No trend records are available for this selection.
      </div>
    );
  }

  return (
    <div className="min-h-[310px]">
      <svg
        className="h-72 w-full overflow-visible"
        viewBox="0 0 640 300"
        role="img"
        aria-label={`${metricLabel} trend time-series chart`}
      >
        {chart.yTicks.map((tick) => (
          <line
            key={tick.value}
            x1="72"
            x2="622"
            y1={tick.y}
            y2={tick.y}
            stroke="#e5e7eb"
            strokeWidth="1"
          />
        ))}
        <line x1="72" x2="622" y1="256" y2="256" stroke="#cbd5e1" />
        <line x1="72" x2="72" y1="18" y2="256" stroke="#cbd5e1" />
        {chart.yTicks.map((tick) => (
          <text
            key={`label-${tick.value}`}
            x="60"
            y={tick.y + 4}
            fill="#64748b"
            fontSize="12"
            textAnchor="end"
          >
            {numberFormatter.format(tick.value)}
          </text>
        ))}
        {chart.xTicks.map((point) => (
          <g key={`x-${point.date}`}>
            <line
              x1={point.x}
              x2={point.x}
              y1="256"
              y2="261"
              stroke="#cbd5e1"
            />
            <text
              x={point.x}
              y="282"
              fill="#64748b"
              fontSize="12"
              textAnchor="middle"
            >
              {formatAxisDate(point.date)}
            </text>
          </g>
        ))}
        <path
          d={chart.path}
          fill="none"
          stroke="#0e7490"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
          vectorEffect="non-scaling-stroke"
        />
        {chart.points.map((point) => (
          <circle
            key={point.date}
            cx={point.x}
            cy={point.y}
            fill="transparent"
            r="8"
          >
            <title>
              {formatLongDate(point.date)}
              {`\n`}
              {metricLabel}: {numberFormatter.format(point[metric])}
            </title>
          </circle>
        ))}
      </svg>
    </div>
  );
}

function getEvenlySpacedItems<T>(items: T[], maxItems: number): T[] {
  if (items.length <= maxItems) {
    return items;
  }

  const lastIndex = items.length - 1;
  const selectedIndexes = new Set<number>();

  for (let index = 0; index < maxItems; index += 1) {
    selectedIndexes.add(Math.round((index / (maxItems - 1)) * lastIndex));
  }

  return [...selectedIndexes]
    .sort((first, second) => first - second)
    .map((index) => items[index]);
}

function getTrendMetricLabel(metric: TrendMetric): string {
  if (metric === "subscribers") {
    return "Subscribers";
  }

  if (metric === "videos") {
    return "Videos";
  }

  return "Views";
}

function formatSignedNumber(value: number): string {
  if (value > 0) {
    return `+${fullNumberFormatter.format(value)}`;
  }

  return fullNumberFormatter.format(value);
}

function formatSignedPercent(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  const formatted = `${Math.abs(value).toFixed(1)}%`;

  if (value > 0) {
    return `+${formatted}`;
  }

  if (value < 0) {
    return `-${formatted}`;
  }

  return formatted;
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return "n/a";
  }

  return `${value.toFixed(2)}%`;
}

function deltaClass(value: number): string {
  if (value > 0) {
    return "text-sm font-semibold text-emerald-700";
  }

  if (value < 0) {
    return "text-sm font-semibold text-rose-700";
  }

  return "text-sm font-semibold text-slate-500";
}

function formatAxisDate(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
  }).format(parsedDate);
}

function formatLongDate(date: string): string {
  const parsedDate = new Date(`${date}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return date;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(parsedDate);
}

function formatTimestamp(timestamp: string): string {
  const normalizedTimestamp = timestamp.includes("T")
    ? timestamp
    : `${timestamp.replace(" ", "T")}Z`;
  const parsedDate = new Date(normalizedTimestamp);

  if (Number.isNaN(parsedDate.getTime())) {
    return timestamp;
  }

  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    timeZoneName: "short",
    year: "numeric",
  }).format(parsedDate);
}

function RankingTable({
  onProgrammeSelect,
  rows,
}: {
  onProgrammeSelect: (programme: string) => void;
  rows: RankingRow[];
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[620px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 font-semibold">Rank</th>
            <th className="pb-3 font-semibold">Content</th>
            <th className="pb-3 font-semibold">Views</th>
            <th className="pb-3 font-semibold">Watch time</th>
            <th className="pb-3 font-semibold">Engagement</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.rank} className="border-b border-slate-100">
              <td className="py-4 font-semibold text-slate-950">
                #{row.rank}
              </td>
              <td className="py-4">
                <button
                  className="text-left font-medium text-slate-950 transition hover:text-cyan-800"
                  onClick={() => onProgrammeSelect(row.programme)}
                  type="button"
                >
                  {row.title}
                </button>
                <p className="mt-1 text-xs text-slate-500">{row.programme}</p>
              </td>
              <td className="py-4 text-slate-700">
                {numberFormatter.format(row.views)}
              </td>
              <td className="py-4 text-slate-700">
                {numberFormatter.format(row.watchTimeHours)} hrs
              </td>
              <td className="py-4 text-slate-700">{row.engagementRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EpisodeTable({ rows }: { rows: EpisodePerformance[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-slate-500">
            <th className="pb-3 font-semibold">Episode</th>
            <th className="pb-3 font-semibold">Programme</th>
            <th className="pb-3 font-semibold">Views</th>
            <th className="pb-3 font-semibold">Engagement</th>
            <th className="pb-3 font-semibold">Completion</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={`${row.programme}-${row.episode}`} className="border-b border-slate-100">
              <td className="py-4 font-medium text-slate-950">{row.episode}</td>
              <td className="py-4 text-slate-700">{row.programme}</td>
              <td className="py-4 text-slate-700">
                {numberFormatter.format(row.views)}
              </td>
              <td className="py-4 text-slate-700">{row.engagementRate}%</td>
              <td className="py-4 text-slate-700">{row.completionRate}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">
          No mock episode rows are attached to this programme yet.
        </p>
      )}
    </div>
  );
}

function ComparisonChart({
  comparisons,
}: {
  comparisons: ProgrammeComparison[];
}) {
  const maxValue = Math.max(
    1,
    ...comparisons.flatMap((comparison) => [
      comparison.launchViews,
      comparison.averageViews,
    ]),
  );

  return (
    <div className="flex flex-col gap-5">
      {comparisons.map((comparison) => (
        <div key={comparison.programme} className="grid gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-950">
              {comparison.programme}
            </p>
            <p className="text-sm text-slate-500">
              {comparison.retention}% retention
            </p>
          </div>
          <div className="grid gap-2">
            <Bar
              color="#0e7490"
              label="Current"
              maxValue={maxValue}
              value={comparison.launchViews}
            />
            <Bar
              color="#f59e0b"
              label="Baseline"
              maxValue={maxValue}
              value={comparison.averageViews}
            />
          </div>
        </div>
      ))}
      {comparisons.length === 0 && (
        <p className="py-8 text-center text-sm text-slate-500">
          No mock comparison rows are attached to this selection yet.
        </p>
      )}
    </div>
  );
}

function Bar({
  color,
  label,
  maxValue,
  value,
}: {
  color: string;
  label: string;
  maxValue: number;
  value: number;
}) {
  return (
    <div className="grid grid-cols-[72px_1fr_72px] items-center gap-3 text-xs text-slate-500">
      <span>{label}</span>
      <div className="h-3 overflow-hidden rounded bg-slate-100">
        <div
          className="h-full rounded"
          style={{ backgroundColor: color, width: `${(value / maxValue) * 100}%` }}
        />
      </div>
      <span className="text-right">{numberFormatter.format(value)}</span>
    </div>
  );
}

function getOptionLabel(
  options: { id: string; label: string }[],
  id: string,
) {
  return options.find((option) => option.id === id)?.label ?? "All";
}
