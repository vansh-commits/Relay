"use client";

import { useState } from "react";
import { useEscalationFrequency, useQueryVolume, useResolutionRate, useSummaryStats, useTopQuestions } from "@/hooks/useAnalytics";
import { QueryVolumeChart } from "@/components/admin/charts/QueryVolumeChart";
import { ResolutionRateChart } from "@/components/admin/charts/ResolutionRateChart";
import { EscalationChart } from "@/components/admin/charts/EscalationChart";
import { TopQuestionsTable } from "@/components/admin/charts/TopQuestionsTable";
import { Spinner } from "@/components/ui/Spinner";

const PERIODS = ["1d", "7d", "30d"] as const;
type Period = (typeof PERIODS)[number];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, isLoading }: { title: string; children: React.ReactNode; isLoading?: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-border p-5">
      <p className="text-sm font-semibold text-gray-800 mb-4">{title}</p>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <Spinner className="w-5 h-5 text-gray-300" />
        </div>
      ) : (
        children
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const { data: stats } = useSummaryStats(period);
  const { data: volume, isLoading: volLoading } = useQueryVolume(period, period === "1d" ? "hour" : "day");
  const { data: resolution, isLoading: resLoading } = useResolutionRate(period);
  const { data: topQ } = useTopQuestions(period);
  const { data: escFreq, isLoading: escLoading } = useEscalationFrequency(period);

  return (
    <div className="px-8 py-6 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500 mt-0.5">Support performance overview</p>
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        <StatCard label="Total queries" value={stats?.total_queries ?? "—"} />
        <StatCard label="Resolution rate" value={stats ? `${stats.resolution_rate}%` : "—"} />
        <StatCard label="Avg confidence" value={stats ? `${(stats.avg_confidence * 100).toFixed(0)}%` : "—"} />
        <StatCard label="Low confidence" value={stats?.low_confidence_count ?? "—"} sub="responses" />
        <StatCard label="Pending escalations" value={stats?.pending_escalations ?? "—"} />
        <StatCard label="Responses sent" value={stats?.total_responses ?? "—"} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        <ChartCard title="Query volume" isLoading={volLoading}>
          {volume?.data && <QueryVolumeChart data={volume.data} />}
        </ChartCard>
        <ChartCard title="Resolution rate" isLoading={resLoading}>
          {resolution?.data && <ResolutionRateChart data={resolution.data} />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ChartCard title="Escalation frequency by reason" isLoading={escLoading}>
          {escFreq?.data && <EscalationChart data={escFreq.data} />}
        </ChartCard>
        <ChartCard title="Top unresolved questions">
          <TopQuestionsTable questions={topQ?.questions ?? []} />
        </ChartCard>
      </div>
    </div>
  );
}
