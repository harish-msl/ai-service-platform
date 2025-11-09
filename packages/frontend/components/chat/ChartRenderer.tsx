"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ChartConfig {
  type: "line" | "bar" | "pie" | "area";
  data: any[];
  config?: {
    xKey?: string;
    yKey?: string;
    dataKey?: string;
    nameKey?: string;
    title?: string;
    colors?: string[];
  };
}

const COLORS = [
  "hsl(217, 91%, 60%)", // Primary blue
  "hsl(250, 95%, 65%)", // AI accent purple
  "hsl(142, 71%, 45%)", // Green
  "hsl(38, 92%, 50%)", // Orange
  "hsl(0, 84%, 60%)", // Red
  "hsl(199, 89%, 48%)", // Cyan
];

export function ChartRenderer({ code }: { code: string }) {
  const chartConfig = useMemo<ChartConfig | null>(() => {
    try {
      // Try to parse as JSON
      const parsed = JSON.parse(code);
      return parsed;
    } catch (e) {
      // If not valid JSON, try to extract from code
      console.error("Failed to parse chart config:", e);
      return null;
    }
  }, [code]);

  if (!chartConfig) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
        <p className="text-sm text-destructive">Invalid chart configuration</p>
      </div>
    );
  }

  const { type, data, config = {} } = chartConfig;
  const { xKey = "name", yKey = "value", dataKey = "value", nameKey = "name", title, colors = COLORS } = config;

  if (!data || data.length === 0) {
    return (
      <div className="p-4 bg-muted border border-border rounded-lg">
        <p className="text-sm text-muted-foreground">No data available for chart</p>
      </div>
    );
  }

  return (
    <div className="my-4 p-4 bg-card border border-border rounded-lg">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-center">{title}</h3>
      )}
      <ResponsiveContainer width="100%" height={300}>
        <>
          {type === "line" && (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Line
                type="monotone"
                dataKey={yKey}
                stroke="hsl(217, 91%, 60%)"
                strokeWidth={2}
                dot={{ fill: "hsl(217, 91%, 60%)" }}
              />
            </LineChart>
          )}

          {type === "bar" && (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Bar dataKey={yKey} fill="hsl(217, 91%, 60%)" radius={[8, 8, 0, 0]} />
            </BarChart>
          )}

          {type === "area" && (
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey={xKey} stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke="hsl(217, 91%, 60%)"
                fill="hsl(217, 91%, 60%)"
                fillOpacity={0.3}
              />
            </AreaChart>
          )}

          {type === "pie" && (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="hsl(217, 91%, 60%)"
                dataKey={dataKey}
                nameKey={nameKey}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          )}
        </>
      </ResponsiveContainer>
    </div>
  );
}
