"use client";

import useSWR from "swr";
import { api } from "@/lib/api";

interface HealthResponse {
  status: string;
  db: string;
  chroma: string;
}

const fetcher = () => api.get<HealthResponse>("/health");

function Dot({ ok }: { ok: boolean }) {
  return (
    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${ok ? "bg-success animate-pulse-dot" : "bg-danger"}`} />
  );
}

export function HealthStatus() {
  const { data, error, isLoading } = useSWR("/health", fetcher, {
    refreshInterval: 15000,
    shouldRetryOnError: true,
  });

  const apiOk    = !error && data?.status === "ok";
  const dbOk     = !error && data?.db === "connected";
  const chromaOk = !error && data?.chroma === "connected";

  return (
    <div className="bg-bg-surface border border-border rounded-xl p-4 mb-5">
      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-3">System Health</p>
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "API Server", ok: apiOk },
          { label: "PostgreSQL", ok: dbOk },
          { label: "ChromaDB",   ok: chromaOk },
        ].map(({ label, ok }) => (
          <div key={label} className="flex items-center gap-2.5 bg-bg-base rounded-lg px-3 py-2.5">
            {isLoading ? (
              <span className="w-2 h-2 rounded-full bg-text-muted animate-pulse flex-shrink-0" />
            ) : (
              <Dot ok={ok} />
            )}
            <div>
              <p className="text-xs font-medium text-text-primary">{label}</p>
              <p className={`text-xs ${isLoading ? "text-text-muted" : ok ? "text-success" : "text-danger"}`}>
                {isLoading ? "checking…" : ok ? "operational" : "unreachable"}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
