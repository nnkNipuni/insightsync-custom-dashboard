import "server-only";

import {
  BigQuery,
  type BigQueryDate,
} from "@google-cloud/bigquery";

import { analyticsConfig } from "./config";
import type { TimeSeriesPoint } from "./types";

type ChannelGrowthRow = {
  ingestion_date: BigQueryDate | string;
  subscriber_count: number | string | null;
  view_count: number | string | null;
  video_count: number | string | null;
};

type ChannelAvailabilityRow = {
  earliest_ingestion_date: BigQueryDate | string | null;
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

const channelAvailabilityQuery = `
  SELECT
    MIN(ingestion_date) AS earliest_ingestion_date
  FROM \`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.${analyticsConfig.channelDailyGrowthView}\`
  WHERE channel_id = @channelId
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
