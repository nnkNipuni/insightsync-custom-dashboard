import "server-only";

import { BigQuery } from "@google-cloud/bigquery";

import { analyticsConfig } from "./config";
import type {
  ProgrammeRankingRow,
  ProgrammeSummary,
  SelectOption,
} from "./types";

type ProgrammeOptionRow = {
  playlist_id: string;
  teledrama_title: string;
};

type ProgrammeSummaryRow = {
  programmes_tracked: number | string | null;
  episodes_tracked: number | string | null;
  combined_views: number | string | null;
  likes: number | string | null;
  comments: number | string | null;
  engagement_rate: number | string | null;
};

type ProgrammeRankingQueryRow = {
  rank: number | string;
  programme_id: string;
  programme_title: string;
  channel_title: string | null;
  episodes: number | string | null;
  views: number | string | null;
  likes: number | string | null;
  comments: number | string | null;
  engagement_rate: number | string | null;
};

const bigquery = new BigQuery({
  projectId: analyticsConfig.projectId,
});

const programmeSource = `\`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.vw_All-TeleDramas-Views_bronze_prod\``;
const videoSource = `\`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.wh_video_bronze_prod\``;
const channelSource = `\`${analyticsConfig.projectId}.${analyticsConfig.youtubeRawDataset}.${analyticsConfig.channelLatestView}\``;

export async function getProgrammeOptions(): Promise<SelectOption[]> {
  const [rows] = await bigquery.query({
    query: programmeOptionsQuery,
    location: analyticsConfig.location,
  });

  return [
    { id: "all", label: "All programmes" },
    ...(rows as ProgrammeOptionRow[]).map((row) => ({
      id: row.playlist_id,
      label: row.teledrama_title,
    })),
  ];
}

export async function getProgrammeSummary({
  channelId,
  endDate,
  programmeId,
  startDate,
}: {
  channelId: string;
  endDate: string;
  programmeId: string;
  startDate: string;
}): Promise<ProgrammeSummary> {
  const [rows] = await bigquery.query({
    query: programmeSummaryQuery,
    params: {
      channelId,
      endDate,
      programmeId,
      startDate,
    },
    location: analyticsConfig.location,
  });
  const [row] = rows as ProgrammeSummaryRow[];

  return {
    programmesTracked: toNumber(row?.programmes_tracked ?? 0),
    episodesTracked: toNumber(row?.episodes_tracked ?? 0),
    combinedViews: toNumber(row?.combined_views ?? 0),
    likes: toNumber(row?.likes ?? 0),
    comments: toNumber(row?.comments ?? 0),
    engagementRate:
      row?.engagement_rate === null || row?.engagement_rate === undefined
        ? null
        : Number(row.engagement_rate),
  };
}

export async function getProgrammeRankings({
  channelId,
  endDate,
  limit = 20,
  programmeId,
  startDate,
}: {
  channelId: string;
  endDate: string;
  limit?: number;
  programmeId: string;
  startDate: string;
}): Promise<ProgrammeRankingRow[]> {
  const [rows] = await bigquery.query({
    query: programmeRankingsQuery,
    params: {
      channelId,
      endDate,
      limit,
      programmeId,
      startDate,
    },
    location: analyticsConfig.location,
  });

  return (rows as ProgrammeRankingQueryRow[]).map((row) => ({
    rank: toNumber(row.rank),
    programmeId: row.programme_id,
    programmeTitle: row.programme_title,
    channelTitle: row.channel_title ?? "Unknown channel",
    episodes: toNumber(row.episodes),
    views: toNumber(row.views),
    likes: toNumber(row.likes),
    comments: toNumber(row.comments),
    engagementRate:
      row.engagement_rate === null ? null : Number(row.engagement_rate),
  }));
}

const programmeOptionsQuery = `
  SELECT
    playlist_id,
    ANY_VALUE(teledrama_title) AS teledrama_title
  FROM ${programmeSource}
  WHERE playlist_id IS NOT NULL
  GROUP BY playlist_id
  ORDER BY LOWER(teledrama_title), playlist_id
`;

const filteredProgrammesCte = `
  WITH filtered_episodes AS (
    SELECT
      programme.playlist_id,
      programme.teledrama_title,
      programme.channel_id,
      COALESCE(channel.channel_title, programme.channel_id) AS channel_title,
      programme.video_id,
      programme.episode_view_count_latest AS view_count,
      COALESCE(video.like_count, 0) AS like_count,
      COALESCE(video.comment_count, 0) AS comment_count
    FROM ${programmeSource} AS programme
    LEFT JOIN ${videoSource} AS video
      ON video.video_id = programme.video_id
      AND video.ingestion_ts_utc = programme.last_ingested_at
    LEFT JOIN ${channelSource} AS channel
      ON channel.channel_id = programme.channel_id
    WHERE programme.episode_date >= DATE(@startDate)
      AND programme.episode_date <= DATE(@endDate)
      AND (@channelId = 'all' OR programme.channel_id = @channelId)
      AND (@programmeId = 'all' OR programme.playlist_id = @programmeId)
  )
`;

const programmeSummaryQuery = `
  ${filteredProgrammesCte}
  SELECT
    COUNT(DISTINCT playlist_id) AS programmes_tracked,
    COUNT(DISTINCT video_id) AS episodes_tracked,
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
  FROM filtered_episodes
`;

const programmeRankingsQuery = `
  ${filteredProgrammesCte},
  programme_totals AS (
    SELECT
      playlist_id AS programme_id,
      ANY_VALUE(teledrama_title) AS programme_title,
      STRING_AGG(DISTINCT channel_title, ', ' ORDER BY channel_title) AS channel_title,
      COUNT(DISTINCT video_id) AS episodes,
      SUM(COALESCE(view_count, 0)) AS views,
      SUM(COALESCE(like_count, 0)) AS likes,
      SUM(COALESCE(comment_count, 0)) AS comments,
      SAFE_MULTIPLY(
        SAFE_DIVIDE(
          SUM(COALESCE(like_count, 0)) + SUM(COALESCE(comment_count, 0)),
          NULLIF(SUM(COALESCE(view_count, 0)), 0)
        ),
        100
      ) AS engagement_rate
    FROM filtered_episodes
    GROUP BY playlist_id
  )
  SELECT
    DENSE_RANK() OVER (ORDER BY views DESC) AS rank,
    programme_id,
    programme_title,
    channel_title,
    episodes,
    views,
    likes,
    comments,
    engagement_rate
  FROM programme_totals
  ORDER BY views DESC, programme_title, programme_id
  LIMIT @limit
`;

function toNumber(value: number | string | null): number {
  if (value === null) {
    return 0;
  }

  return Number(value);
}
