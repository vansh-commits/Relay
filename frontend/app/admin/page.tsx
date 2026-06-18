"use client";

import { useState } from "react";
import { useEscalationFrequency, useQueryVolume, useResolutionRate, useSummaryStats, useTopQuestions } from "@/hooks/useAnalytics";
import { QueryVolumeChart } from "@/components/admin/charts/QueryVolumeChart";
import { ResolutionRateChart } from "@/components/admin/charts/ResolutionRateChart";
import { EscalationChart } from "@/components/admin/charts/EscalationChart";
import { TopQuestionsTable } from "@/components/admin/charts/TopQuestionsTable";
import { HealthStatus } from "@/components/admin/HealthStatus";
import { Spinner } from "@/components/ui/Spinner";

const PERIODS = ["1d", "7d", "30d"] as const;
type Period = (typeof PERIODS)[number];

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-2">{label}</p>
      <p className="text-2xl font-semibold text-text-primary">{value}</p>
      {sub && <p className="text-xs text-text-muted mt-1">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, isLoading }: { title: string; children: React.ReactNode; isLoading?: boolean }) {
  return (
    <div className="bg-bg-surface border border-border rounded-xl p-5">
      <p className="text-sm font-semibold text-text-primary mb-4">{title}</p>
      {isLoading ? (
        <div className="h-48 flex items-center justify-center">
          <Spinner className="w-5 h-5 text-text-muted" />
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
          <h1 className="text-lg font-semibold text-text-primary">Analytics</h1>
          <p className="text-sm text-text-secondary mt-0.5">Support performance overview</p>
        </div>
        <div className="flex items-center gap-1 bg-bg-surface border border-border rounded-lg p-1">
          {PERIODS.map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                period === p
                  ? "bg-bg-elevated text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      <HealthStatus />

      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 mb-5">
        <StatCard label="Total queries"       value={stats?.total_queries ?? "—"} />
        <StatCard label="Resolution rate"     value={stats ? `${stats.resolution_rate}%` : "—"} />
        <StatCard label="Avg confidence"      value={stats ? `${(stats.avg_confidence * 100).toFixed(0)}%` : "—"} />
        <StatCard label="Low confidence"      value={stats?.low_confidence_count ?? "—"} sub="responses" />
        <StatCard label="Pending escalations" value={stats?.pending_escalations ?? "—"} />
        <StatCard label="Responses sent"      value={stats?.total_responses ?? "—"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
        <ChartCard title="Query volume" isLoading={volLoading}>
          {volume?.data && <QueryVolumeChart data={volume.data} />}
        </ChartCard>
        <ChartCard title="Resolution rate" isLoading={resLoading}>
          {resolution?.data && <ResolutionRateChart data={resolution.data} />}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Escalation frequency" isLoading={escLoading}>
          {escFreq?.data && <EscalationChart data={escFreq.data} />}
        </ChartCard>
        <ChartCard title="Top unresolved questions">
          <TopQuestionsTable questions={topQ?.questions ?? []} />
        </ChartCard>
      </div>
    </div>
  );
}
