export const analyticsConfig = {
  projectId: process.env.BIGQUERY_PROJECT_ID ?? "insightsync-v2-458117",
  youtubeRawDataset:
    process.env.BIGQUERY_YOUTUBE_RAW_DATASET ?? "mkt_youtube_raw",
  youtubeSemanticDataset:
    process.env.BIGQUERY_YOUTUBE_SEMANTIC_DATASET ?? "mkt_youtube_semantic",
  channelLatestView:
    process.env.BIGQUERY_CHANNEL_LATEST_VIEW ??
    "vw_channel_latest_bronze_prod",
  channelDailyGrowthView:
    process.env.BIGQUERY_CHANNEL_DAILY_GROWTH_VIEW ??
    "vw_channel_daily_growth_bronze_prod",
  youtubeContentLatestView:
    process.env.BIGQUERY_YOUTUBE_CONTENT_LATEST_VIEW ??
    "youtube_content_latest",
  location: process.env.BIGQUERY_LOCATION ?? "asia-south2",
};
