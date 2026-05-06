"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function GrowthChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div className="grid h-64 place-items-center text-sm text-gray-400">
        제출 기록이 쌓이면 여기에 성장 그래프가 표시됩니다.
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 12 }}
            formatter={(v) => [`${v}점`, "점수"]}
          />
          <Line
            type="monotone"
            dataKey="score"
            stroke="#2a55c8"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#2a55c8" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
