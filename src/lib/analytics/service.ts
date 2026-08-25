import "server-only";

import {
  getChannelEarliestGrowthDate,
  getChannelGrowthTrend,
} from "./channelGrowthRepository";
import {
  getChannelLatestRecords,
  type ChannelLatestRecord,
} from "./channelLatestRepository";
import {
  getContentChannels,
  getContentEarliestPublishedDate,
  getContentRankings,
  getContentSummary,
} from "./contentRepository";
import type {
  ChannelPeriodSummary,
  ChannelOption,
  DashboardData,
  DashboardFilters,
  DashboardNotice,
  EpisodePerformance,
  HighlightItem,
  KpiMetric,
  PlatformSummary,
  ProgrammeComparison,
  RankingRow,
  SelectOption,
  TimeSeriesPoint,
} from "./types";

type DashboardModule = "overview" | "youtube-channel" | "youtube-content";

const programmes: SelectOption[] = [
  { id: "all", label: "All programmes" },
  { id: "9pm-drama", label: "9pm Drama" },
  { id: "main-news", label: "Main News Bulletin" },
  { id: "ts03", label: "Drama TS03" },
  { id: "little-star", label: "Little Star S13" },
];

const campaigns: SelectOption[] = [
  { id: "all", label: "All campaigns" },
  { id: "brand-reach", label: "Brand Reach" },
  { id: "programme-launch", label: "Programme Launch" },
  { id: "news-promo", label: "News Promo" },
];

const defaultFilters: DashboardFilters = {
  channel: "all",
  programme: "all",
  campaign: "all",
  startDate: "2026-09-01",
  endDate: "2026-09-30",
};

const newsTrend: TimeSeriesPoint[] = [
  { date: "Sep 01", subscribers: 0, views: 980000, videos: 0 },
  { date: "Sep 05", subscribers: 0, views: 1110000, videos: 0 },
  { date: "Sep 10", subscribers: 0, views: 1040000, videos: 0 },
  { date: "Sep 15", subscribers: 0, views: 1260000, videos: 0 },
  { date: "Sep 20", subscribers: 0, views: 1190000, videos: 0 },
  { date: "Sep 25", subscribers: 0, views: 1330000, videos: 0 },
  { date: "Sep 30", subscribers: 0, views: 1410000, videos: 0 },
];

const rankings: RankingRow[] = [
  {
    rank: 1,
    title: "Prime-time drama launch episode",
    programme: "9pm Drama",
    views: 1840000,
    watchTimeHours: 72800,
    engagementRate: 8.9,
  },
  {
    rank: 2,
    title: "Main News Bulletin highlights",
    programme: "Main News",
    views: 1410000,
    watchTimeHours: 51900,
    engagementRate: 6.7,
  },
  {
    rank: 3,
    title: "TS03 weekly recap",
    programme: "Drama TS03",
    views: 1180000,
    watchTimeHours: 46800,
    engagementRate: 7.4,
  },
  {
    rank: 4,
    title: "Little Star solo performance",
    programme: "Little Star S13",
    views: 940000,
    watchTimeHours: 38200,
    engagementRate: 9.8,
  },
];

const comparisons: ProgrammeComparison[] = [
  {
    programme: "830 launch",
    launchViews: 980000,
    averageViews: 760000,
    retention: 74,
  },
  {
    programme: "9pm launch",
    launchViews: 1840000,
    averageViews: 1320000,
    retention: 81,
  },
  {
    programme: "TS04",
    launchViews: 1120000,
    averageViews: 890000,
    retention: 69,
  },
  {
    programme: "News bulletin",
    launchViews: 1410000,
    averageViews: 1080000,
    retention: 63,
  },
];

const platformSummary: PlatformSummary[] = [
  {
    platform: "YouTube",
    primaryMetric: "Views",
    value: "30.1M",
    delta: "+11.8%",
    status: "positive",
  },
  {
    platform: "Facebook",
    primaryMetric: "Follower growth",
    value: "84.2K",
    delta: "+4.6%",
    status: "positive",
  },
  {
    platform: "Meta Ads",
    primaryMetric: "Spend efficiency",
    value: "LKR 182 CPM",
    delta: "-7.1%",
    status: "positive",
  },
];

const metaAdsOverview: PlatformSummary[] = [
  {
    platform: "Spend",
    primaryMetric: "Media investment",
    value: "LKR 4.8M",
    delta: "+6.1%",
    status: "neutral",
  },
  {
    platform: "Impressions",
    primaryMetric: "Delivered ad views",
    value: "18.4M",
    delta: "+10.9%",
    status: "positive",
  },
  {
    platform: "Clicks",
    primaryMetric: "Traffic generated",
    value: "352K",
    delta: "+8.6%",
    status: "positive",
  },
  {
    platform: "Campaign efficiency",
    primaryMetric: "CPM improvement",
    value: "LKR 182 CPM",
    delta: "-7.1%",
    status: "positive",
  },
];

const programmeHighlights: HighlightItem[] = [
  {
    title: "9pm Drama launch leads the period",
    description: "Launch views are tracking ahead of the September baseline.",
    metric: "1.84M views",
  },
  {
    title: "TS03 maintains stronger engagement",
    description: "Audience actions remain above the drama portfolio average.",
    metric: "7.4% engagement",
  },
];

const newsHighlights: HighlightItem[] = [
  {
    title: "Main bulletin is the strongest news format",
    description: "The evening bulletin continues to outpace late-night clips.",
    metric: "1.41M views",
  },
  {
    title: "Late-night clips need retention review",
    description: "Completion rates are behind the broader news benchmark.",
    metric: "58% completion",
  },
];

const episodePerformance: EpisodePerformance[] = [
  {
    episode: "Episode 01",
    programme: "9pm Drama",
    views: 1840000,
    engagementRate: 8.9,
    completionRate: 76,
  },
  {
    episode: "Episode 02",
    programme: "9pm Drama",
    views: 1620000,
    engagementRate: 8.1,
    completionRate: 73,
  },
  {
    episode: "Weekly recap",
    programme: "Drama TS03",
    views: 1180000,
    engagementRate: 7.4,
    completionRate: 69,
  },
  {
    episode: "Solo performance",
    programme: "Little Star S13",
    views: 940000,
    engagementRate: 9.8,
    completionRate: 82,
  },
];

const facebookSummary: KpiMetric[] = [
  {
    label: "Followers",
    value: "2.18M",
    delta: "+2.7%",
    direction: "up",
  },
  {
    label: "Follower growth",
    value: "84.2K",
    delta: "+4.6%",
    direction: "up",
  },
  {
    label: "Post reach",
    value: "11.6M",
    delta: "+8.2%",
    direction: "up",
  },
  {
    label: "Engagement",
    value: "5.4%",
    delta: "-0.3%",
    direction: "down",
  },
];

const metaAdsSummary: KpiMetric[] = [
  {
    label: "Spend",
    value: "LKR 4.8M",
    delta: "+6.1%",
    direction: "up",
  },
  {
    label: "Reach",
    value: "9.7M",
    delta: "+13.4%",
    direction: "up",
  },
  {
    label: "CTR",
    value: "1.92%",
    delta: "+0.2%",
    direction: "up",
  },
  {
    label: "CPM",
    value: "LKR 182",
    delta: "-7.1%",
    direction: "up",
  },
];

function normalizeFilters(filters?: Partial<DashboardFilters>): DashboardFilters {
  return {
    channel: filters?.channel || defaultFilters.channel,
    programme: filters?.programme || defaultFilters.programme,
    campaign: filters?.campaign || defaultFilters.campaign,
    startDate: filters?.startDate || defaultFilters.startDate,
    endDate: filters?.endDate || defaultFilters.endDate,
  };
}

function getChannelOptions(records: ChannelLatestRecord[]): ChannelOption[] {
  return [
    { id: "all", label: "All channels" },
    ...records.map((record) => ({
      id: record.channelId,
      label: record.channelTitle,
    })),
  ];
}

function selectChannelRecord(
  records: ChannelLatestRecord[],
  requestedChannel: string,
): ChannelLatestRecord | null {
  if (records.length === 0) {
    return null;
  }

  if (requestedChannel !== "all") {
    return (
      records.find((record) => record.channelId === requestedChannel) ??
      records[0]
    );
  }

  return null;
}

function getChannelLatestKpis(record: ChannelLatestRecord | null): KpiMetric[] {
  if (!record) {
    return [
      {
        label: "Subscribers",
        value: "Select channel",
        delta: "Latest",
        direction: "flat",
      },
      {
        label: "Views",
        value: "Select channel",
        delta: "Latest",
        direction: "flat",
      },
      {
        label: "Videos",
        value: "Select channel",
        delta: "Latest",
        direction: "flat",
      },
    ];
  }

  return [
    {
      label: "Subscribers",
      value: formatCount(record.subscriberCount),
      delta: "Latest",
      direction: "flat",
    },
    {
      label: "Views",
      value: formatCount(record.viewCount),
      delta: "Latest",
      direction: "flat",
    },
    {
      label: "Videos",
      value: formatCount(record.videoCount),
      delta: "Latest",
      direction: "flat",
    },
  ];
}

function formatCount(value: number): string {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: 0,
  }).format(value);
}

function getChannelPeriodSummary({
  channel,
  points,
}: {
  channel: ChannelLatestRecord | null;
  points: TimeSeriesPoint[];
}): ChannelPeriodSummary | null {
  if (!channel || points.length === 0) {
    return null;
  }

  const first = points[0];
  const last = points[points.length - 1];

  return {
    channelId: channel.channelId,
    channelTitle: channel.channelTitle,
    startDate: first.date,
    endDate: last.date,
    viewsGained: last.views - first.views,
    subscribersGained: last.subscribers - first.subscribers,
    uploadsAdded: last.videos - first.videos,
    viewGrowthPercent: getPercentChange(first.views, last.views),
    subscriberGrowthPercent: getPercentChange(first.subscribers, last.subscribers),
    videoGrowthPercent: getPercentChange(first.videos, last.videos),
  };
}

function getPercentChange(startValue: number, endValue: number): number | null {
  if (startValue === 0) {
    return null;
  }

  return ((endValue - startValue) / startValue) * 100;
}

export async function getDashboardData(
  requestedFilters?: Partial<DashboardFilters>,
  options?: {
    activeModule?: string;
  },
): Promise<DashboardData> {
  const activeModule = normalizeActiveModule(options?.activeModule);
  const filters = normalizeFilters(requestedFilters);
  const [channelLatestRecords, contentChannels] = await Promise.all([
    getChannelLatestRecords(),
    getContentChannels(),
  ]);
  const realChannels = getChannelOptions(channelLatestRecords);
  const selectedChannel = selectChannelRecord(
    channelLatestRecords,
    filters.channel,
  );
  let resolvedFilters: DashboardFilters = {
    ...filters,
    channel:
      filters.channel === "all"
        ? "all"
        : activeModule === "youtube-content"
          ? filters.channel
        : selectedChannel?.channelId ?? filters.channel,
  };
  let notice: DashboardNotice | undefined;

  if (
    activeModule === "youtube-channel" &&
    selectedChannel &&
    resolvedFilters.channel !== "all"
  ) {
    const earliestGrowthDate = await getChannelEarliestGrowthDate(
      selectedChannel.channelId,
    );

    if (earliestGrowthDate && resolvedFilters.startDate < earliestGrowthDate) {
      resolvedFilters = {
        ...resolvedFilters,
        startDate: earliestGrowthDate,
      };
      notice = {
        type: "info",
        message: `Start date adjusted to ${earliestGrowthDate}, the first available growth snapshot for ${selectedChannel.channelTitle}.`,
      };
    }
  }

  if (activeModule === "youtube-content" && resolvedFilters.channel !== "all") {
    const selectedContentChannel = contentChannels.find(
      (channel) => channel.id === resolvedFilters.channel,
    );
    const earliestContentDate = await getContentEarliestPublishedDate(
      resolvedFilters.channel,
    );

    if (earliestContentDate && resolvedFilters.startDate < earliestContentDate) {
      resolvedFilters = {
        ...resolvedFilters,
        startDate: earliestContentDate,
      };
      notice = {
        type: "info",
        message: `Start date adjusted to ${earliestContentDate}, the first available published content date for ${selectedContentChannel?.label ?? "this channel"}.`,
      };
    }
  }

  const [growth, contentRankings, contentSummary] = await Promise.all([
    getChannelGrowthTrend({
      channelId: resolvedFilters.channel,
      startDate: resolvedFilters.startDate,
      endDate: resolvedFilters.endDate,
    }),
    getContentRankings({
      channelId: resolvedFilters.channel,
      startDate: resolvedFilters.startDate,
      endDate: resolvedFilters.endDate,
    }),
    getContentSummary({
      channelId: resolvedFilters.channel,
      startDate: resolvedFilters.startDate,
      endDate: resolvedFilters.endDate,
    }),
  ]);

  return {
    filters: resolvedFilters,
    notice,
    channels: realChannels,
    contentChannels,
    programmes,
    campaigns,
    kpis: getChannelLatestKpis(selectedChannel),
    growth,
    channelPeriodSummary: getChannelPeriodSummary({
      channel: selectedChannel,
      points: growth,
    }),
    newsTrend,
    rankings,
    contentRankings,
    contentSummary,
    comparisons,
    platformSummary,
    metaAdsOverview,
    programmeHighlights,
    newsHighlights,
    episodePerformance,
    facebookSummary,
    metaAdsSummary,
  };
}

function normalizeActiveModule(module?: string): DashboardModule {
  if (module === "youtube-channel" || module === "youtube-content") {
    return module;
  }

  return "overview";
}
