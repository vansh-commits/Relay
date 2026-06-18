"use client";

import useSWR from "swr";
import { api } from "@/lib/api";
import type { SummaryStats } from "@/lib/types";

const fetcher = <T>(url: string) => api.get<T>(url);

export function useSummaryStats(period = "7d") {
  return useSWR<SummaryStats>(`/api/v1/analytics/summary?period=${period}`, fetcher<SummaryStats>, { refreshInterval: 30000 });
}

export function useQueryVolume(period = "7d", granularity = "day") {
  return useSWR<{ data: { timestamp: string; count: number }[] }>(
    `/api/v1/analytics/query-volume?period=${period}&granularity=${granularity}`,
    fetcher<{ data: { timestamp: string; count: number }[] }>,
    { refreshInterval: 30000 }
  );
}

export function useResolutionRate(period = "7d") {
  return useSWR<{ data: { date: string; total: number; resolved: number; rate: number }[] }>(
    `/api/v1/analytics/resolution-rate?period=${period}`,
    fetcher<{ data: { date: string; total: number; resolved: number; rate: number }[] }>,
    { refreshInterval: 30000 }
  );
}

export function useTopQuestions(period = "7d") {
  return useSWR<{ questions: { content: string; confidence_score: number }[] }>(
    `/api/v1/analytics/top-questions?period=${period}&limit=10`,
    fetcher<{ questions: { content: string; confidence_score: number }[] }>,
    { refreshInterval: 60000 }
  );
}

export function useEscalationFrequency(period = "7d") {
  return useSWR<{ data: { reason: string; count: number; avg_confidence: number }[] }>(
    `/api/v1/analytics/escalation-frequency?period=${period}`,
    fetcher<{ data: { reason: string; count: number; avg_confidence: number }[] }>,
    { refreshInterval: 30000 }
  );
}
