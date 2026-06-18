"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
  data: { date: string; total: number; resolved: number; rate: number }[];
}

export function ResolutionRateChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
        <Tooltip
          formatter={(v: number) => [`${v}%`, "Resolution Rate"]}
          contentStyle={{ fontSize: 12, background: "#212121", border: "1px solid #333", borderRadius: 8, color: "#ececec" }}
          labelStyle={{ color: "#a0a0a0" }}
        />
        <Line type="monotone" dataKey="rate" name="Rate" stroke="#4caf7d" strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
