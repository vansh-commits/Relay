"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { reason: string; count: number; avg_confidence: number }[];
}

const REASON_LABELS: Record<string, string> = {
  low_confidence: "Low confidence",
  out_of_scope: "Out of scope",
  user_request: "User request",
};

export function EscalationChart({ data }: Props) {
  const formatted = data.map((d) => ({ ...d, label: REASON_LABELS[d.reason] ?? d.reason }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
        />
        <Bar dataKey="count" name="Escalations" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  );
}
