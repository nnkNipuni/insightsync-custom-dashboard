import "server-only";

import {
  BigQuery,
  type BigQueryDate,
} from "@google-cloud/bigquery";

import { analyticsConfig } from "./config";
import type {
  ChannelComparisonSeries,
  ChannelSnapshotGrowthPoint,
  TimeSeriesPoint,
} from "./types";

type ChannelGrowthRow = {
  ingestion_date: BigQueryDate | string;
  subscriber_count: number | string | null;
  view_count: number | string | null;
  video_count: number | string | null;
};

type ChannelAvailabilityRow = {
  earliest_ingestion_date: BigQueryDate | string | null;
};

type ChannelComparisonRow = ChannelGrowthRow & {
  channel_id: string;
};

type ChannelSnapshotGrowthRow = {
  ingestion_date: BigQueryDate | string;
  previous_snapshot_date: BigQueryDate | string | null;
  interval_days: number | string | null;
  views_added_since_last_snapshot: number | string | null;
  subscribers_added_since_last_snapshot: number | string | null;
  uploads_added_since_last_snapshot: number | string | null;
};

const bigquery = new BigQuery({
  projectId: analyticsConfig.projectId,
});

export async function getChannelGrowthTrend({
  channelId,
  endDate,
  startDate,
}: {
  channelId: string;
  endDate: string;
  startDate: string;
}): Promise<TimeSeriesPoint[]> {
  const isAllChannels = channelId === "all";
  const query = isAllChannels ? allChannelsTrendQuery : singleChannelTrendQuery;
  const params = isAllChannels
    ? { startDate, endDate }
    : { startDate, endDate, channelId };

  const [rows] = await bigquery.query({
    query,
    params,
    location: analyticsConfig.location,
  });

  return (rows as ChannelGrowthRow[]).map((row) => ({
    date: formatDate(row.ingestion_date),
    subscribers: toNumber(row.subscriber_count),
    views: toNumber(row.view_count),
    videos: toNumber(row.video_count),
  }));
}

export async function getChannelEarliestGrowthDate(
  channelId: string,
): Promise<string | null> {
  const [rows] = await bigquery.query({
    query: channelAvailabilityQuery,
    params: { channelId },
    location: analyticsConfig.location,
  });
  const [row] = rows as ChannelAvailabilityRow[];

  if (!row?.earliest_ingestion_date) {
    return null;
  }

  return formatDate(row.earliest_ingestion_date);
}

export async function getChannelSnapshotGrowth({
  channelId,
  endDate,
  startDate,
}: {
  channelId: string;
  endDate: string;
  startDate: string;
}): Promise<ChannelSnapshotGrowthPoint[]> {
  const isAllChannels = channelId === "all";
  const query = isAllChannels
    ? allChannelsSnapshotGrowthQuery
    : singleChannelSnapshotGrowthQuery;
  const params = isAllChannels
    ? { startDate, endDate }
    : { startDate, endDate, channelId };

  const [rows] = await bigquery.query({
    query,
    params,
    location: analyticsConfig.location,
  });

  return (rows as ChannelSnapshotGrowthRow[]).map((row) => ({
    date: formatDate(row.ingestion_date),
    previousSnapshotDate: row.previous_snapshot_date
      ? formatDate(row.previous_snapshot_date)
      : null,
    intervalDays:
      row.interval_days === null ? null : Number(row.interval_days),
    viewsGained: toNumber(row.views_added_since_last_snapshot),
    subscribersGained: toNumber(row.subscribers_added_since_last_snapshot),
    uploadsAdded: toNumber(row.uploads_added_since_last_snapshot),
  }));
}

export async function getChannelComparisonTrend({
  channelIds,
  channelTitles,
  endDate,
  startDate,
}: {
  channelIds: string[];
  channelTitles: Map<string, string>;
  endDate: string;
  startDate: string;
}): Promise<ChannelComparisonSeries[]> {
  if (channelIds.length === 0) {
    return [];
  }

  const [rows] = await bigquery.query({
    query: channelComparisonQuery,
    params: { channelIds, startDate, endDate },
    location: analyticsConfig.location,
  });
  const seriesByChannel = new Map<string, ChannelComparisonSeries>();

  channelIds.forEach((channelId) => {
    seriesByChannel.set(channelId, {
      channelId,
      channelTitle: channelTitles.get(channelId) ?? channelId,
      points: [],
    });
  });

  (rows as ChannelComparisonRow[]).forEach((row) => {
    const channelId = row.channel_id;
    const series = seriesByChannel.get(channelId);

    if (!series) {
      return;
    }

    series.points.push({
      date: formatDate(row.ingestion_date),
      subscribers: toNumber(row.subscriber_count),
      views: toNumber(row.view_count),
      videos: toNumber(row.video_count),
    });
  });

  return [...seriesByChannel.values()];
}

const allChannelsTrendQuery = `
  SELECT
    ingestion_date,
    SUM(subscriber_count) AS subscriber_count,
    SUM(view_count) AS view_count,
    SUM(video_count) AS video_count
  FROM \`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.${analyticsConfig.channelDailyGrowthView}\`
  WHERE ingestion_date >= DATE(@startDate)
    AND ingestion_date <= DATE(@endDate)
  GROUP BY ingestion_date
  ORDER BY ingestion_date
`;

const singleChannelTrendQuery = `
  SELECT
    ingestion_date,
    subscriber_count,
    view_count,
    video_count
  FROM \`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.${analyticsConfig.channelDailyGrowthView}\`
  WHERE ingestion_date >= DATE(@startDate)
    AND ingestion_date <= DATE(@endDate)
    AND channel_id = @channelId
  ORDER BY ingestion_date
`;

const allChannelsSnapshotGrowthQuery = `
  WITH per_channel_growth AS (
    SELECT
      channel_id,
      ingestion_date,
      LAG(ingestion_date) OVER (
        PARTITION BY channel_id
        ORDER BY ingestion_date
      ) AS previous_snapshot_date,
      views_added_since_last_snapshot,
      subscribers_added_since_last_snapshot,
      uploads_added_since_last_snapshot
    FROM \`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.${analyticsConfig.channelDailyGrowthView}\`
  ),
  aggregated_growth AS (
    SELECT
      ingestion_date,
      SUM(views_added_since_last_snapshot) AS views_added_since_last_snapshot,
      SUM(subscribers_added_since_last_snapshot) AS subscribers_added_since_last_snapshot,
      SUM(uploads_added_since_last_snapshot) AS uploads_added_since_last_snapshot
    FROM per_channel_growth
    WHERE previous_snapshot_date IS NOT NULL
    GROUP BY ingestion_date
  ),
  aggregate_with_previous AS (
    SELECT
      ingestion_date,
      LAG(ingestion_date) OVER (ORDER BY ingestion_date) AS previous_snapshot_date,
      views_added_since_last_snapshot,
      subscribers_added_since_last_snapshot,
      uploads_added_since_last_snapshot
    FROM aggregated_growth
  )
  SELECT
    ingestion_date,
    previous_snapshot_date,
    DATE_DIFF(ingestion_date, previous_snapshot_date, DAY) AS interval_days,
    views_added_since_last_snapshot,
    subscribers_added_since_last_snapshot,
    uploads_added_since_last_snapshot
  FROM aggregate_with_previous
  WHERE ingestion_date >= DATE(@startDate)
    AND ingestion_date <= DATE(@endDate)
    AND previous_snapshot_date IS NOT NULL
  ORDER BY ingestion_date
`;

const singleChannelSnapshotGrowthQuery = `
  WITH growth_with_previous AS (
    SELECT
      ingestion_date,
      LAG(ingestion_date) OVER (
        PARTITION BY channel_id
        ORDER BY ingestion_date
      ) AS previous_snapshot_date,
      views_added_since_last_snapshot,
      subscribers_added_since_last_snapshot,
      uploads_added_since_last_snapshot
    FROM \`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.${analyticsConfig.channelDailyGrowthView}\`
    WHERE channel_id = @channelId
  )
  SELECT
    ingestion_date,
    previous_snapshot_date,
    DATE_DIFF(ingestion_date, previous_snapshot_date, DAY) AS interval_days,
    views_added_since_last_snapshot,
    subscribers_added_since_last_snapshot,
    uploads_added_since_last_snapshot
  FROM growth_with_previous
  WHERE ingestion_date >= DATE(@startDate)
    AND ingestion_date <= DATE(@endDate)
    AND previous_snapshot_date IS NOT NULL
  ORDER BY ingestion_date
`;

const channelAvailabilityQuery = `
  SELECT
    MIN(ingestion_date) AS earliest_ingestion_date
  FROM \`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.${analyticsConfig.channelDailyGrowthView}\`
  WHERE channel_id = @channelId
`;

const channelComparisonQuery = `
  SELECT
    channel_id,
    ingestion_date,
    subscriber_count,
    view_count,
    video_count
  FROM \`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.${analyticsConfig.channelDailyGrowthView}\`
  WHERE channel_id IN UNNEST(@channelIds)
    AND ingestion_date >= DATE(@startDate)
    AND ingestion_date <= DATE(@endDate)
  ORDER BY channel_id, ingestion_date
`;

function toNumber(value: number | string | null): number {
  if (value === null) {
    return 0;
  }

  return Number(value);
}

function formatDate(value: BigQueryDate | string): string {
  if (typeof value === "string") {
    return value;
  }

  return value.value;
}
