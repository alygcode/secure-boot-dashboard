import {
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { CertDistribution, ComplianceTrend } from "../types";

// ---------------------------------------------------------------------------
// Shared card wrapper
// ---------------------------------------------------------------------------
function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-sm font-semibold text-slate-700 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// 1. CertificateDistributionChart  (Donut / Pie)
// ---------------------------------------------------------------------------
interface CertificateDistributionChartProps {
  data: CertDistribution[];
}

export function CertificateDistributionChart({
  data,
}: CertificateDistributionChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0);

  return (
    <ChartCard title="Certificate Distribution">
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="45%"
            innerRadius={70}
            outerRadius={100}
            paddingAngle={3}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>

          {/* Center label showing total */}
          <text
            x="50%"
            y="42%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-900"
            style={{ fontSize: 28, fontWeight: 700 }}
          >
            {total}
          </text>
          <text
            x="50%"
            y="52%"
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-slate-500"
            style={{ fontSize: 12 }}
          >
            Total Devices
          </text>

          <Tooltip
            formatter={(value?: number, name?: string) => [`${value ?? 0} devices`, name ?? '']}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
        </PieChart>
      </ResponsiveContainer>

      {/* Custom legend */}
      <div className="flex items-center justify-center gap-5 mt-2">
        {data.map((entry) => (
          <div key={entry.name} className="flex items-center gap-1.5 text-xs text-slate-600">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span>
              {entry.name}{" "}
              <span className="font-semibold text-slate-800">{entry.value}</span>
            </span>
          </div>
        ))}
      </div>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// 2. ComplianceTrendChart  (Stacked Area)
// ---------------------------------------------------------------------------
interface ComplianceTrendChartProps {
  data: ComplianceTrend[];
}

export function ComplianceTrendChart({ data }: ComplianceTrendChartProps) {
  return (
    <ChartCard title="Compliance Trend (12 Months)">
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="gradCompliant" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#22c55e" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradAtRisk" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id="gradNonCompliant" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          />

          <Area
            type="monotone"
            dataKey="compliant"
            name="Compliant"
            stackId="1"
            stroke="#22c55e"
            fill="url(#gradCompliant)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="atRisk"
            name="At Risk"
            stackId="1"
            stroke="#f59e0b"
            fill="url(#gradAtRisk)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="nonCompliant"
            name="Non-Compliant"
            stackId="1"
            stroke="#ef4444"
            fill="url(#gradNonCompliant)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// 3. BootModeChart  (Horizontal stacked bar)
// ---------------------------------------------------------------------------
interface BootModeChartProps {
  uefi: number;
  legacy: number;
}

export function BootModeChart({ uefi, legacy }: BootModeChartProps) {
  const total = uefi + legacy;
  const uefiPct = total > 0 ? ((uefi / total) * 100).toFixed(1) : "0";
  const legacyPct = total > 0 ? ((legacy / total) * 100).toFixed(1) : "0";

  const chartData = [{ name: "Boot Mode", uefi, legacy }];

  return (
    <ChartCard title="Boot Mode Distribution">
      {/* Percentage summary */}
      <div className="flex items-center justify-between mb-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span className="text-slate-600">
            UEFI{" "}
            <span className="font-semibold text-slate-800">{uefiPct}%</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-400" />
          <span className="text-slate-600">
            Legacy{" "}
            <span className="font-semibold text-slate-800">{legacyPct}%</span>
          </span>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={60}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
          barSize={28}
        >
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" hide />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
            formatter={(value?: number, name?: string) => [
              `${value ?? 0} devices`,
              name === "uefi" ? "UEFI" : "Legacy",
            ]}
          />
          <Bar
            dataKey="uefi"
            name="UEFI"
            stackId="a"
            fill="#3b82f6"
            radius={[6, 0, 0, 6]}
          />
          <Bar
            dataKey="legacy"
            name="Legacy"
            stackId="a"
            fill="#94a3b8"
            radius={[0, 6, 6, 0]}
          />
        </BarChart>
      </ResponsiveContainer>

      {/* Device count labels */}
      <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
        <span>{uefi} devices</span>
        <span>{legacy} devices</span>
      </div>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// 4. ModelDistributionChart  (Horizontal bar chart)
// ---------------------------------------------------------------------------
interface ModelDistributionChartProps {
  data: { name: string; count: number }[];
}

export function ModelDistributionChart({ data }: ModelDistributionChartProps) {
  return (
    <ChartCard title="Devices by Hardware Model">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={130}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
            formatter={(value: number | undefined) => [`${value ?? 0} devices`, "Count"]}
          />
          <Bar
            dataKey="count"
            name="Devices"
            fill="#3b82f6"
            radius={[0, 4, 4, 0]}
            barSize={20}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

// ---------------------------------------------------------------------------
// 5. DepartmentComplianceChart  (Vertical stacked bar)
// ---------------------------------------------------------------------------
interface DepartmentComplianceChartProps {
  data: {
    department: string;
    compliant: number;
    atRisk: number;
    nonCompliant: number;
  }[];
}

export function DepartmentComplianceChart({
  data,
}: DepartmentComplianceChartProps) {
  return (
    <ChartCard title="Compliance by Department">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="department"
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            tick={{ fontSize: 12, fill: "#64748b" }}
            tickLine={false}
            axisLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              fontSize: 13,
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
          />

          <Bar
            dataKey="compliant"
            name="Compliant"
            stackId="dept"
            fill="#22c55e"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="atRisk"
            name="At Risk"
            stackId="dept"
            fill="#f59e0b"
            radius={[0, 0, 0, 0]}
          />
          <Bar
            dataKey="nonCompliant"
            name="Non-Compliant"
            stackId="dept"
            fill="#ef4444"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}
