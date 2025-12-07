"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Severity Distribution Pie Chart
export function SeverityChart({ data }: { data: any }) {
  const chartData = [
    {
      name: "Critical",
      value: data.critical || 0,
      color: "#DC2626",
    },
    {
      name: "High",
      value: data.high || 0,
      color: "#F59E0B",
    },
    {
      name: "Medium",
      value: data.medium || 0,
      color: "#EAB308",
    },
    {
      name: "Low",
      value: data.low || 0,
      color: "#10B981",
    },
  ].filter((item) => item.value > 0);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No threats detected
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name}: ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Status Code Distribution Bar Chart
export function StatusCodeChart({
  statusCodes,
}: {
  statusCodes: Record<string, number>;
}) {
  const chartData = Object.entries(statusCodes)
    .map(([code, count]) => ({
      code: `${code}`,
      count,
      fill: getStatusColor(parseInt(code)),
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="code" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="count" name="Requests" radius={[8, 8, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// Top IPs Bar Chart
export function TopIPsChart({
  topSources,
}: {
  topSources: Array<{ ip: string; count: number }>;
}) {
  const chartData = topSources.slice(0, 10).map((source) => ({
    ip: source.ip,
    requests: source.count,
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="ip" type="category" width={120} />
        <Tooltip />
        <Legend />
        <Bar dataKey="requests" fill="#3B82F6" name="Requests" />
      </BarChart>
    </ResponsiveContainer>
  );
}

// HTTP Methods Distribution
export function MethodsChart({ methods }: { methods: Record<string, number> }) {
  const chartData = Object.entries(methods).map(([method, count]) => ({
    method,
    count,
    fill: getMethodColor(method),
  }));

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No data available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ method, percent }) =>
            `${method}: ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={70}
          fill="#8884d8"
          dataKey="count"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Helper functions
function getStatusColor(code: number): string {
  if (code >= 200 && code < 300) return "#10B981"; // Green - Success
  if (code >= 300 && code < 400) return "#3B82F6"; // Blue - Redirect
  if (code >= 400 && code < 500) return "#F59E0B"; // Orange - Client Error
  if (code >= 500) return "#EF4444"; // Red - Server Error
  return "#6B7280"; // Gray - Unknown
}

function getMethodColor(method: string): string {
  const colors: Record<string, string> = {
    GET: "#3B82F6",
    POST: "#10B981",
    PUT: "#F59E0B",
    DELETE: "#EF4444",
    PATCH: "#8B5CF6",
    HEAD: "#6B7280",
    OPTIONS: "#EC4899",
  };
  return colors[method] || "#6B7280";
}
