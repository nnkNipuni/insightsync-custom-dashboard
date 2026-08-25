import "server-only";

import { BigQuery, type BigQueryDate, type BigQueryTimestamp } from "@google-cloud/bigquery";

import { analyticsConfig } from "./config";

export type ChannelLatestRecord = {
  channelId: string;
  channelTitle: string;
  country: string | null;
  publishedAt: string | null;
  ingestionDate: string | null;
  ingestionTsUtc: string | null;
  subscriberCount: number;
  viewCount: number;
  videoCount: number;
};

type ChannelLatestRow = {
  channel_id: string;
  channel_title: string;
  country: string | null;
  published_at: BigQueryTimestamp | Date | string | null;
  ingestion_date: BigQueryDate | string | null;
  ingestion_ts_utc: BigQueryTimestamp | Date | string | null;
  subscriber_count: number | string | null;
  view_count: number | string | null;
  video_count: number | string | null;
};

const bigquery = new BigQuery({
  projectId: analyticsConfig.projectId,
});

export async function getChannelLatestRecords(): Promise<
  ChannelLatestRecord[]
> {
  const query = `
    SELECT
      channel_id,
      channel_title,
      country,
      published_at,
      ingestion_date,
      ingestion_ts_utc,
      subscriber_count,
      view_count,
      video_count
    FROM \`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.${analyticsConfig.channelLatestView}\`
    ORDER BY channel_title
  `;

  const [rows] = await bigquery.query({
    query,
    location: analyticsConfig.location,
  });

  return (rows as ChannelLatestRow[]).map((row) => ({
    channelId: row.channel_id,
    channelTitle: row.channel_title,
    country: row.country,
    publishedAt: formatBigQueryValue(row.published_at),
    ingestionDate: formatBigQueryValue(row.ingestion_date),
    ingestionTsUtc: formatBigQueryValue(row.ingestion_ts_utc),
    subscriberCount: toNumber(row.subscriber_count),
    viewCount: toNumber(row.view_count),
    videoCount: toNumber(row.video_count),
  }));
}

function toNumber(value: number | string | null): number {
  if (value === null) {
    return 0;
  }

  return Number(value);
}

function formatBigQueryValue(
  value: BigQueryDate | BigQueryTimestamp | Date | string | null,
): string | null {
  if (value === null) {
    return null;
  }

  if (typeof value === "string") {
    return value;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if ("value" in value) {
    return value.value;
  }

  return String(value);
}
