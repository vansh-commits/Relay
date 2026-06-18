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
          <linearGradient id="qGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#c96442" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#c96442" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#666" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip
          contentStyle={{ fontSize: 12, background: "#212121", border: "1px solid #333", borderRadius: 8, color: "#ececec" }}
          labelStyle={{ color: "#a0a0a0" }}
        />
        <Area type="monotone" dataKey="count" name="Queries" stroke="#c96442" strokeWidth={1.5} fill="url(#qGrad)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
