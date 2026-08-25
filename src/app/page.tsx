import { InsightDashboard } from "@/components/dashboard/InsightDashboard";
import { getDashboardData } from "@/lib/analytics/service";

export const dynamic = "force-dynamic";

export default async function Home() {
  const data = await getDashboardData();

  return <InsightDashboard initialData={data} />;
}
