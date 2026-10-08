export type DashboardFilters = {
  channel: string;
  programme: string;
  campaign: string;
  startDate: string;
  endDate: string;
};

export type KpiMetric = {
  label: string;
  value: string;
  delta: string;
  direction: "up" | "down" | "flat";
};

export type TimeSeriesPoint = {
  date: string;
  subscribers: number;
  views: number;
  videos: number;
};

export type RankingRow = {
  rank: number;
  title: string;
  programme: string;
  views: number;
  watchTimeHours: number;
  engagementRate: number;
};

export type ContentRankingRow = {
  rank: number;
  videoId: string;
  title: string;
  channelId: string;
  channelTitle: string;
  publishedDate: string;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number | null;
};

export type ContentSummary = {
  videosPublished: number;
  combinedViews: number;
  likes: number;
  comments: number;
  engagementRate: number | null;
};

export type ProgrammeComparison = {
  programme: string;
  launchViews: number;
  averageViews: number;
  retention: number;
};

export type ProgrammeSummary = {
  programmesTracked: number;
  episodesTracked: number;
  combinedViews: number;
  likes: number;
  comments: number;
  engagementRate: number | null;
};

export type ProgrammeRankingRow = {
  rank: number;
  programmeId: string;
  programmeTitle: string;
  channelTitle: string;
  episodes: number;
  views: number;
  likes: number;
  comments: number;
  engagementRate: number | null;
};

export type ChannelOption = {
  id: string;
  label: string;
};

export type SelectOption = {
  id: string;
  label: string;
};

export type PlatformSummary = {
  platform: string;
  primaryMetric: string;
  value: string;
  delta: string;
  status: "positive" | "negative" | "neutral";
};

export type HighlightItem = {
  title: string;
  description: string;
  metric: string;
};

export type EpisodePerformance = {
  episode: string;
  programme: string;
  views: number;
  engagementRate: number;
  completionRate: number;
};

export type DashboardNotice = {
  type: "info";
  message: string;
};

export type ChannelPeriodSummary = {
  channelId: string;
  channelTitle: string;
  startDate: string;
  endDate: string;
  viewsGained: number;
  subscribersGained: number;
  uploadsAdded: number;
  viewGrowthPercent: number | null;
  subscriberGrowthPercent: number | null;
  videoGrowthPercent: number | null;
};

export type ChannelComparisonSeries = {
  channelId: string;
  channelTitle: string;
  points: TimeSeriesPoint[];
};

export type DashboardData = {
  filters: DashboardFilters;
  notice?: DashboardNotice;
  channels: ChannelOption[];
  contentChannels: ChannelOption[];
  programmes: SelectOption[];
  campaigns: SelectOption[];
  kpis: KpiMetric[];
  growth: TimeSeriesPoint[];
  channelPeriodSummary: ChannelPeriodSummary | null;
  channelComparison: ChannelComparisonSeries[];
  channelComparisonNotices: string[];
  selectedComparisonChannels: string[];
  newsTrend: TimeSeriesPoint[];
  rankings: RankingRow[];
  programmeSummary: ProgrammeSummary;
  programmeRankings: ProgrammeRankingRow[];
  contentRankings: ContentRankingRow[];
  contentSummary: ContentSummary;
  contentFreshness: string | null;
  comparisons: ProgrammeComparison[];
  platformSummary: PlatformSummary[];
  metaAdsOverview: PlatformSummary[];
  programmeHighlights: HighlightItem[];
  newsHighlights: HighlightItem[];
  episodePerformance: EpisodePerformance[];
  facebookSummary: KpiMetric[];
  metaAdsSummary: KpiMetric[];
};
