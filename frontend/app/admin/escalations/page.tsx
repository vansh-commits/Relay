"use client";

import { useState } from "react";
import useSWR from "swr";
import { formatDistanceToNow } from "date-fns";
import { api } from "@/lib/api";
import type { Escalation } from "@/lib/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";

const fetcher = (url: string) => api.get<{ escalations: Escalation[]; total: number }>(url);

const STATUS_FILTERS = ["all", "pending", "assigned", "resolved"] as const;
type Filter = (typeof STATUS_FILTERS)[number];

function statusBadge(status: Escalation["status"]) {
  const map: Record<string, "amber" | "blue" | "green"> = { pending: "amber", assigned: "blue", resolved: "green" };
  return <Badge variant={map[status]}>{status}</Badge>;
}

const REASON_LABELS: Record<string, string> = {
  low_confidence: "Low confidence",
  out_of_scope:   "Out of scope",
  user_request:   "User request",
};

const inputCls = "bg-bg-base border border-border rounded-lg px-3 py-1.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/20 transition-colors";

export default function EscalationsPage() {
  const [filter, setFilter] = useState<Filter>("pending");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [agentName, setAgentName] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");

  const url = filter === "all" ? "/api/v1/escalations?limit=50" : `/api/v1/escalations?status=${filter}&limit=50`;
  const { data, mutate, isLoading } = useSWR(url, fetcher, { refreshInterval: 10000 });

  async function assign(id: string) {
    await api.put(`/api/v1/escalations/${id}/assign`, { agent_name: agentName.trim() || "Agent" });
    mutate();
  }

  async function resolve(id: string) {
    await api.put(`/api/v1/escalations/${id}/resolve`, { resolution_notes: resolutionNotes.trim() || "Resolved by agent" });
    setExpanded(null); setResolutionNotes(""); mutate();
  }

  return (
    <div className="px-8 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">Escalation Queue</h1>
        <p className="text-sm text-text-secondary mt-0.5">Queries that need human attention</p>
      </div>

      <div className="flex items-center gap-1 bg-bg-surface border border-border rounded-lg p-1 mb-5 w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md capitalize transition-colors ${
              filter === f ? "bg-bg-elevated text-text-primary" : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Spinner className="w-5 h-5 text-text-muted" /></div>
      ) : !data?.escalations.length ? (
        <div className="bg-bg-surface border border-border rounded-xl py-12 text-center">
          <p className="text-sm text-text-muted">No {filter !== "all" ? filter : ""} escalations</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.escalations.map((esc) => (
            <div key={esc.id} className="bg-bg-surface border border-border rounded-xl overflow-hidden">
              <div
                className="px-5 py-4 flex items-start gap-4 cursor-pointer hover:bg-bg-hover/40 transition-colors"
                onClick={() => setExpanded(expanded === esc.id ? null : esc.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    {statusBadge(esc.status)}
                    <span className="text-xs text-text-muted">{REASON_LABELS[esc.reason] ?? esc.reason}</span>
                    {esc.confidence_score != null && (
                      <span className="text-xs text-text-muted">· {(esc.confidence_score * 100).toFixed(0)}% confidence</span>
                    )}
                    <span className="text-xs text-text-muted ml-auto">
                      {formatDistanceToNow(new Date(esc.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  {esc.handoff_summary && (
                    <p className="text-sm text-text-secondary leading-relaxed line-clamp-2">{esc.handoff_summary}</p>
                  )}
                  {esc.assigned_agent && (
                    <p className="text-xs text-text-muted mt-1">Assigned to {esc.assigned_agent}</p>
                  )}
                </div>
                <svg
                  className={`w-4 h-4 text-text-muted flex-shrink-0 mt-0.5 transition-transform ${expanded === esc.id ? "rotate-180" : ""}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {expanded === esc.id && (
                <div className="border-t border-border px-5 py-4 space-y-4 bg-bg-base">
                  {esc.handoff_summary && (
                    <div>
                      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1.5">Handoff summary</p>
                      <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">{esc.handoff_summary}</p>
                    </div>
                  )}
                  {esc.status === "pending" && (
                    <div className="flex items-center gap-2">
                      <input value={agentName} onChange={(e) => setAgentName(e.target.value)} placeholder="Your name (optional)" className={`${inputCls} flex-1`} />
                      <Button size="sm" onClick={() => assign(esc.id)}>Assign to me</Button>
                    </div>
                  )}
                  {esc.status !== "resolved" && (
                    <div className="flex items-start gap-2">
                      <textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Resolution notes…"
                        rows={2}
                        className={`${inputCls} flex-1 resize-none`}
                      />
                      <Button variant="secondary" size="sm" onClick={() => resolve(esc.id)}>Mark resolved</Button>
                    </div>
                  )}
                  {esc.resolution_notes && (
                    <div>
                      <p className="text-xs font-medium text-text-muted uppercase tracking-wide mb-1">Resolution notes</p>
                      <p className="text-sm text-text-secondary">{esc.resolution_notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
