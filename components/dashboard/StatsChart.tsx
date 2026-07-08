"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Stats } from "@/lib/mock-store";

const COLORS = ["#FF9100", "#1B2755", "#FFBF00", "#7EC8E3", "#F26B63", "#9FE8CC"];

function ChartShell({
  children,
  height = 220,
}: {
  children: ReactNode;
  height?: number;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div style={{ height }} />;
  }

  return <>{children}</>;
}

export function TrendChart({ data }: { data: Stats["monthlyTrend"] }) {
  return (
    <ChartShell>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1B275533" />
          <XAxis dataKey="month" tick={{ fill: "#1B2755", fontSize: 12 }} />
          <YAxis tick={{ fill: "#1B2755", fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Line type="monotone" dataKey="spotted" stroke="#9FE8CC" strokeWidth={2} name="Scams spotted" />
          <Line type="monotone" dataKey="caught" stroke="#F26B63" strokeWidth={2} name="Times caught" />
        </LineChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ScamTypeChart({ data }: { data: Stats["byScamType"] }) {
  const chartData = Object.entries(data)
    .filter(([, v]) => v > 0)
    .map(([name, value]) => ({
      name: name.replace("-", " "),
      value,
    }));

  if (chartData.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-navy/50 text-sm">
        No scams have caught you yet — keep it up!
      </div>
    );
  }

  return (
    <ChartShell>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
          dataKey="value"
        >
            {chartData.map((_, i) => (
              <Cell key={i} fill={COLORS[i % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}

export function ReportBarChart({ data }: { data: Stats["monthlyTrend"] }) {
  return (
    <ChartShell height={200}>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1B275533" />
          <XAxis dataKey="month" tick={{ fill: "#1B2755", fontSize: 12 }} />
          <YAxis tick={{ fill: "#1B2755", fontSize: 12 }} allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="spotted" fill="#9FE8CC" name="Spotted" radius={[4, 4, 0, 0]} />
          <Bar dataKey="caught" fill="#F26B63" name="Caught" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartShell>
  );
}
