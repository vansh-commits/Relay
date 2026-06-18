"use client";

import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format } from "date-fns";

interface Props {
  data: { timestamp: string; count: number }[];
}

export function QueryVolumeChart({ data }: Props) {
  const formatted = data.map((d) => ({
    ...d,
    label: format(new Date(d.timestamp), "MMM d HH:mm"),
  }));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={formatted} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="queryGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#1a1a2e" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#1a1a2e" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f3f4" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 2px 8px rgba(0,0,0,0.06)" }}
          labelStyle={{ color: "#374151", fontWeight: 500 }}
        />
        <Area type="monotone" dataKey="count" name="Queries" stroke="#1a1a2e" strokeWidth={1.5} fill="url(#queryGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
