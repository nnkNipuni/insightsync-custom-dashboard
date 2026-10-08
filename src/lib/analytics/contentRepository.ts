import "server-only";

import {
  BigQuery,
  type BigQueryDate,
  type BigQueryTimestamp,
} from "@google-cloud/bigquery";

import { analyticsConfig } from "./config";
import type { ChannelOption, ContentRankingRow, ContentSummary } from "./types";

type ContentChannelRow = {
  channel_id: string;
  channel_title: string;
};

type ContentRankingQueryRow = {
  rank: number | string;
  video_id: string;
  title: string;
  channel_id: string;
  channel_title: string;
  published_date: BigQueryDate | string;
  view_count: number | string | null;
  like_count: number | string | null;
  comment_count: number | string | null;
  engagement_rate: number | string | null;
};

type ContentSummaryRow = {
  videos_published: number | string | null;
  combined_views: number | string | null;
  likes: number | string | null;
  comments: number | string | null;
  engagement_rate: number | string | null;
};

type ContentAvailabilityRow = {
  earliest_published_date: BigQueryDate | string | null;
};

type ContentFreshnessRow = {
  latest_ingestion_ts_utc: BigQueryTimestamp | Date | string | null;
};

const bigquery = new BigQuery({
  projectId: analyticsConfig.projectId,
});

export async function getContentChannels(): Promise<ChannelOption[]> {
  const [rows] = await bigquery.query({
    query: contentChannelsQuery,
    location: analyticsConfig.location,
  });

  return [
    { id: "all", label: "All channels" },
    ...(rows as ContentChannelRow[]).map((row) => ({
      id: row.channel_id,
      label: row.channel_title,
    })),
  ];
}

export async function getContentEarliestPublishedDate(
  channelId: string,
): Promise<string | null> {
  const [rows] = await bigquery.query({
    query: contentAvailabilityQuery,
    params: { channelId },
    location: analyticsConfig.location,
  });
  const [row] = rows as ContentAvailabilityRow[];

  if (!row?.earliest_published_date) {
    return null;
  }

  return formatDate(row.earliest_published_date);
}

export async function getContentRankings({
  channelId,
  endDate,
  limit = 20,
  startDate,
}: {
  channelId: string;
  endDate: string;
  limit?: number;
  startDate: string;
}): Promise<ContentRankingRow[]> {
  const [rows] = await bigquery.query({
    query: contentRankingsQuery,
    params: {
      channelId,
      endDate,
      limit,
      startDate,
    },
    location: analyticsConfig.location,
  });

  return (rows as ContentRankingQueryRow[]).map((row) => ({
    rank: toNumber(row.rank),
    videoId: row.video_id,
    title: row.title,
    channelId: row.channel_id,
    channelTitle: row.channel_title,
    publishedDate: formatDate(row.published_date),
    views: toNumber(row.view_count),
    likes: toNumber(row.like_count),
    comments: toNumber(row.comment_count),
    engagementRate:
      row.engagement_rate === null ? null : Number(row.engagement_rate),
  }));
}

export async function getContentSummary({
  channelId,
  endDate,
  startDate,
}: {
  channelId: string;
  endDate: string;
  startDate: string;
}): Promise<ContentSummary> {
  const [rows] = await bigquery.query({
    query: contentSummaryQuery,
    params: {
      channelId,
      endDate,
      startDate,
    },
    location: analyticsConfig.location,
  });
  const [row] = rows as ContentSummaryRow[];

  return {
    videosPublished: toNumber(row?.videos_published ?? 0),
    combinedViews: toNumber(row?.combined_views ?? 0),
    likes: toNumber(row?.likes ?? 0),
    comments: toNumber(row?.comments ?? 0),
    engagementRate:
      row?.engagement_rate === null || row?.engagement_rate === undefined
        ? null
        : Number(row.engagement_rate),
  };
}

export async function getContentFreshness(): Promise<string | null> {
  const [rows] = await bigquery.query({
    query: contentFreshnessQuery,
    location: analyticsConfig.location,
  });
  const [row] = rows as ContentFreshnessRow[];

  return formatBigQueryValue(row?.latest_ingestion_ts_utc ?? null);
}

const sourceName = `\`${analyticsConfig.projectId}.${analyticsConfig.youtubeSemanticDataset}.${analyticsConfig.youtubeContentLatestView}\``;

const contentChannelsQuery = `
  SELECT
    channel_id,
    ARRAY_AGG(channel_title ORDER BY ingestion_ts_utc DESC LIMIT 1)[OFFSET(0)] AS channel_title
  FROM ${sourceName}
  WHERE channel_id IS NOT NULL
  GROUP BY channel_id
  ORDER BY channel_title
`;

const contentAvailabilityQuery = `
  SELECT
    MIN(published_date) AS earliest_published_date
  FROM ${sourceName}
  WHERE channel_id = @channelId
`;

const contentRankingsQuery = `
  WITH channel_titles AS (
    SELECT
      channel_id,
      ARRAY_AGG(channel_title ORDER BY ingestion_ts_utc DESC LIMIT 1)[OFFSET(0)] AS channel_title
    FROM ${sourceName}
    WHERE channel_id IS NOT NULL
    GROUP BY channel_id
  )
  SELECT
    ROW_NUMBER() OVER (ORDER BY content.view_count DESC, content.published_date DESC, content.video_id) AS rank,
    content.video_id,
    content.title,
    content.channel_id,
    channel_titles.channel_title,
    content.published_date,
    content.view_count,
    content.like_count,
    content.comment_count,
    content.engagement_rate
  FROM ${sourceName} AS content
  LEFT JOIN channel_titles
    ON content.channel_id = channel_titles.channel_id
  WHERE content.published_date >= DATE(@startDate)
    AND content.published_date <= DATE(@endDate)
    AND (@channelId = 'all' OR content.channel_id = @channelId)
  ORDER BY content.view_count DESC, content.published_date DESC, content.video_id
  LIMIT @limit
`;

const contentSummaryQuery = `
  SELECT
    COUNT(*) AS videos_published,
    SUM(COALESCE(view_count, 0)) AS combined_views,
    SUM(COALESCE(like_count, 0)) AS likes,
    SUM(COALESCE(comment_count, 0)) AS comments,
    SAFE_MULTIPLY(
      SAFE_DIVIDE(
        SUM(COALESCE(like_count, 0)) + SUM(COALESCE(comment_count, 0)),
        NULLIF(SUM(COALESCE(view_count, 0)), 0)
      ),
      100
    ) AS engagement_rate
  FROM ${sourceName}
  WHERE published_date >= DATE(@startDate)
    AND published_date <= DATE(@endDate)
    AND (@channelId = 'all' OR channel_id = @channelId)
`;

const contentFreshnessQuery = `
  SELECT
    MAX(ingestion_ts_utc) AS latest_ingestion_ts_utc
  FROM ${sourceName}
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

function formatBigQueryValue(
  value: BigQueryTimestamp | Date | string | null,
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
