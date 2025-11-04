"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  Activity,
  Clock,
  DollarSign,
  Download,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface UsageStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
  avgResponseTime: number;
  totalTokens: number;
}

interface UsageOverTime {
  date: string;
  calls: number;
  successful: number;
  failed: number;
}

interface ResponseTimeDistribution {
  range: string;
  count: number;
}

interface EndpointPopularity {
  endpoint: string;
  count: number;
  avgTime: number;
}

interface AnalyticsData {
  stats: UsageStats;
  usageOverTime: UsageOverTime[];
  responseTimeDistribution: ResponseTimeDistribution[];
  endpointPopularity: EndpointPopularity[];
}

const COLORS = {
  primary: "hsl(var(--primary))",
  success: "#10b981",
  error: "#ef4444",
  warning: "#f59e0b",
  info: "#3b82f6",
};

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState<string>("7");

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["analytics", dateRange],
    queryFn: async () => {
      const response = await api.get(`/usage/analytics?days=${dateRange}`);
      return response.data;
    },
  });

  // Calculate success rate
  const successRate = analytics?.stats
    ? ((analytics.stats.successfulCalls / analytics.stats.totalCalls) * 100).toFixed(1)
    : "0";

  // Prepare pie chart data
  const pieData = analytics?.stats
    ? [
        { name: "Successful", value: analytics.stats.successfulCalls, color: COLORS.success },
        { name: "Failed", value: analytics.stats.failedCalls, color: COLORS.error },
      ]
    : [];

  // Handle export to CSV
  const handleExportCSV = () => {
    if (!analytics) return;

    // Create CSV content
    let csv = "Date,Total Calls,Successful,Failed\n";
    analytics.usageOverTime.forEach((item) => {
      csv += `${item.date},${item.calls},${item.successful},${item.failed}\n`;
    });

    // Create blob and download
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    toast.success("Analytics data exported successfully");
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Calculate cost savings (₹22L/month external vs ₹2L/month self-hosted)
  const monthlySavings = 2200000 - 200000; // ₹20L per month
  const annualSavings = monthlySavings * 12; // ₹2.4 Crore per year
  const roi = ((monthlySavings / 200000) * 100).toFixed(0); // 1000% ROI

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor API usage, performance, and cost savings
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={handleExportCSV} variant="outline" disabled={!analytics}>
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total API Calls
            </CardTitle>
            <Activity className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.stats.totalCalls.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Last {dateRange} days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Success Rate
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{successRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {analytics?.stats.successfulCalls.toLocaleString() || "0"} successful calls
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Avg Response Time
            </CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.stats.avgResponseTime.toFixed(0) || "0"}ms
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all endpoints
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tokens
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analytics?.stats.totalTokens.toLocaleString() || "0"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              AI model usage
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* API Usage Over Time - Line Chart */}
        <Card>
          <CardHeader>
            <CardTitle>API Usage Over Time</CardTitle>
            <CardDescription>
              Daily API call volume and success rate
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-muted-foreground">Loading chart...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={analytics?.usageOverTime || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12 }}
                    tickFormatter={(value) => format(new Date(value), "MMM dd")}
                  />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="calls"
                    stroke={COLORS.primary}
                    strokeWidth={2}
                    name="Total Calls"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="successful"
                    stroke={COLORS.success}
                    strokeWidth={2}
                    name="Successful"
                    dot={{ r: 4 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="failed"
                    stroke={COLORS.error}
                    strokeWidth={2}
                    name="Failed"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Success Rate - Pie Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Success Rate Distribution</CardTitle>
            <CardDescription>
              Ratio of successful vs failed API calls
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-muted-foreground">Loading chart...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Response Time Distribution - Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Response Time Distribution</CardTitle>
            <CardDescription>
              Breakdown of API response times
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-muted-foreground">Loading chart...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={analytics?.responseTimeDistribution || []}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill={COLORS.info} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Endpoint Popularity - Horizontal Bar */}
        <Card>
          <CardHeader>
            <CardTitle>Most Used Endpoints</CardTitle>
            <CardDescription>
              Top 10 API endpoints by call volume
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-80 flex items-center justify-center">
                <div className="text-muted-foreground">Loading chart...</div>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={320}>
                <BarChart
                  data={analytics?.endpointPopularity.slice(0, 10) || []}
                  layout="vertical"
                  margin={{ left: 100 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                  <XAxis type="number" tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="endpoint"
                    tick={{ fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--background))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cost Savings Calculator */}
      <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900 dark:text-green-100">
            <DollarSign className="w-5 h-5" />
            Cost Savings Analysis
          </CardTitle>
          <CardDescription className="text-green-700 dark:text-green-300">
            Self-hosted platform vs external API services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                Monthly Savings
              </p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(monthlySavings)}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="bg-green-100 dark:bg-green-900">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  {roi}% ROI
                </Badge>
              </div>
            </div>
            <div>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                Annual Savings
              </p>
              <p className="text-3xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(annualSavings)}
              </p>
              <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                ₹2.4 Crore per year
              </p>
            </div>
            <div>
              <p className="text-sm text-green-700 dark:text-green-300 mb-2">
                Cost Breakdown
              </p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-700 dark:text-green-300">
                    External APIs:
                  </span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    ₹22L/month
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-green-700 dark:text-green-300">
                    Self-hosted:
                  </span>
                  <span className="font-medium text-green-900 dark:text-green-100">
                    ₹2L/month
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-green-300 dark:border-green-700">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    You save:
                  </span>
                  <span className="font-bold text-green-900 dark:text-green-100">
                    93%
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-green-100 dark:bg-green-900/30 rounded-lg border border-green-300 dark:border-green-700">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Break-even:</strong> The self-hosted platform pays for itself in less
              than 1 month compared to external API costs. That&apos;s a{" "}
              <strong>{roi}% return on investment</strong>!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
