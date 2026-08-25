import { NextResponse } from "next/server";

import { getDashboardData } from "@/lib/analytics/service";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  try {
    const data = await getDashboardData({
      channel: searchParams.get("channel") ?? undefined,
      programme: searchParams.get("programme") ?? undefined,
      campaign: searchParams.get("campaign") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
    }, {
      activeModule: searchParams.get("activeModule") ?? undefined,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Dashboard BigQuery request failed", error);

    return NextResponse.json(
      {
        error: "Unable to load dashboard data from BigQuery.",
      },
      { status: 500 },
    );
  }
}
