import {
  Monitor,
  ShieldCheck,
  AlertTriangle,
  ShieldOff,
  Shield,
  Key,
  Cpu,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import type { ComplianceMetrics } from '../types';

interface MetricsCardsProps {
  metrics: ComplianceMetrics;
}

// ---------- helper ----------
function pct(part: number, total: number): string {
  if (total === 0) return '0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

// ---------- Top-row card ----------
interface StatCardProps {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  accentBg: string;   // e.g. "bg-primary-50"
  accentText: string;  // e.g. "text-primary-500"
  change?: string;     // e.g. "+2.4%"
  changePositive?: boolean;
  children?: React.ReactNode;
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  accentBg,
  accentText,
  change,
  changePositive,
  children,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-4">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className={`${accentBg} ${accentText} rounded-full p-2.5`}>
          {icon}
        </div>
        {change && (
          <span
            className={`inline-flex items-center gap-1 text-xs font-semibold ${
              changePositive ? 'text-success-600' : 'text-danger-600'
            }`}
          >
            {changePositive ? (
              <TrendingUp className="w-3.5 h-3.5" />
            ) : (
              <TrendingDown className="w-3.5 h-3.5" />
            )}
            {change}
          </span>
        )}
      </div>

      {/* Value */}
      <div>
        <p className="text-3xl font-bold text-slate-900">{value}</p>
        <p className="text-sm text-slate-500 font-medium mt-1">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>

      {/* Optional extra content (e.g. breakdown bar) */}
      {children}
    </div>
  );
}

// ---------- Compliance breakdown bar ----------
function ComplianceBar({
  compliant,
  atRisk,
  nonCompliant,
  total,
}: {
  compliant: number;
  atRisk: number;
  nonCompliant: number;
  total: number;
}) {
  if (total === 0) return null;
  const compliantW = (compliant / total) * 100;
  const atRiskW = (atRisk / total) * 100;
  const nonCompliantW = (nonCompliant / total) * 100;

  return (
    <div className="mt-1">
      <div className="flex h-2 w-full rounded-full overflow-hidden bg-slate-100">
        <div
          className="bg-success-500 transition-all"
          style={{ width: `${compliantW}%` }}
        />
        <div
          className="bg-warning-500 transition-all"
          style={{ width: `${atRiskW}%` }}
        />
        <div
          className="bg-danger-500 transition-all"
          style={{ width: `${nonCompliantW}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-success-500" />
          Compliant
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-warning-500" />
          At Risk
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-danger-500" />
          Non-Compliant
        </span>
      </div>
    </div>
  );
}

// ---------- Mini progress bar ----------
function MiniProgress({
  value,
  max,
  barColor,
  trackColor = 'bg-slate-100',
}: {
  value: number;
  max: number;
  barColor: string;
  trackColor?: string;
}) {
  const widthPct = max === 0 ? 0 : (value / max) * 100;
  return (
    <div className={`h-2 w-full rounded-full overflow-hidden ${trackColor}`}>
      <div
        className={`${barColor} h-full rounded-full transition-all`}
        style={{ width: `${widthPct}%` }}
      />
    </div>
  );
}

// ---------- Second-row detail card wrapper ----------
interface DetailCardProps {
  icon: React.ReactNode;
  accentBg: string;
  accentText: string;
  title: string;
  children: React.ReactNode;
}

function DetailCard({ icon, accentBg, accentText, title, children }: DetailCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className={`${accentBg} ${accentText} rounded-full p-2.5`}>
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      </div>
      {children}
    </div>
  );
}

// ---------- Main component ----------
export default function MetricsCards({ metrics }: MetricsCardsProps) {
  const {
    totalDevices,
    compliant,
    atRisk,
    nonCompliant,
    secureBootEnabled,
    secureBootDisabled,
    cert2023,
    cert2011,
    certUnknown,
    tpm20,
    tpm12,
    tpmNone,
  } = metrics;

  return (
    <div className="flex flex-col gap-6">
      {/* ===== Row 1 — Primary KPI cards ===== */}
      <div className="grid grid-cols-4 gap-6">
        {/* Total Devices */}
        <StatCard
          icon={<Monitor className="w-5 h-5" />}
          title="Total Devices"
          value={totalDevices.toLocaleString()}
          subtitle="Managed endpoints"
          accentBg="bg-primary-50"
          accentText="text-primary-500"
          change="+2.4%"
          changePositive={true}
        />

        {/* Compliant */}
        <StatCard
          icon={<ShieldCheck className="w-5 h-5" />}
          title="Compliant"
          value={compliant.toLocaleString()}
          subtitle={`${pct(compliant, totalDevices)} of total`}
          accentBg="bg-success-50"
          accentText="text-success-500"
          change="+3.1%"
          changePositive={true}
        >
          <ComplianceBar
            compliant={compliant}
            atRisk={atRisk}
            nonCompliant={nonCompliant}
            total={totalDevices}
          />
        </StatCard>

        {/* At Risk */}
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          title="At Risk"
          value={atRisk.toLocaleString()}
          subtitle={`${pct(atRisk, totalDevices)} of total`}
          accentBg="bg-warning-50"
          accentText="text-warning-500"
          change="-1.2%"
          changePositive={false}
        />

        {/* Non-Compliant */}
        <StatCard
          icon={<ShieldOff className="w-5 h-5" />}
          title="Non-Compliant"
          value={nonCompliant.toLocaleString()}
          subtitle={`${pct(nonCompliant, totalDevices)} of total`}
          accentBg="bg-danger-50"
          accentText="text-danger-500"
          change="+0.8%"
          changePositive={false}
        />
      </div>

      {/* ===== Row 2 — Detail cards ===== */}
      <div className="grid grid-cols-3 gap-6">
        {/* Secure Boot */}
        <DetailCard
          icon={<Shield className="w-5 h-5" />}
          accentBg="bg-primary-50"
          accentText="text-primary-500"
          title="Secure Boot"
        >
          <p className="text-2xl font-bold text-slate-900">
            {secureBootEnabled.toLocaleString()}
            <span className="text-sm font-normal text-slate-400">
              {' '}/ {totalDevices.toLocaleString()} Enabled
            </span>
          </p>
          <MiniProgress
            value={secureBootEnabled}
            max={totalDevices}
            barColor="bg-primary-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>
              Enabled:{' '}
              <span className="font-semibold text-primary-600">
                {secureBootEnabled.toLocaleString()}
              </span>
            </span>
            <span>
              Disabled:{' '}
              <span className="font-semibold text-slate-700">
                {secureBootDisabled.toLocaleString()}
              </span>
            </span>
          </div>
        </DetailCard>

        {/* Certificate Status */}
        <DetailCard
          icon={<Key className="w-5 h-5" />}
          accentBg="bg-success-50"
          accentText="text-success-500"
          title="Certificate Status"
        >
          <p className="text-2xl font-bold text-slate-900">
            {cert2023.toLocaleString()}
            <span className="text-sm font-normal text-slate-400">
              {' '}Updated (2023)
            </span>
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center rounded-full bg-warning-50 px-2.5 py-0.5 text-xs font-medium text-warning-600">
              2011: {cert2011.toLocaleString()}
            </span>
            <span className="inline-flex items-center rounded-full bg-danger-50 px-2.5 py-0.5 text-xs font-medium text-danger-600">
              Unknown: {certUnknown.toLocaleString()}
            </span>
          </div>
        </DetailCard>

        {/* TPM Status */}
        <DetailCard
          icon={<Cpu className="w-5 h-5" />}
          accentBg="bg-primary-50"
          accentText="text-primary-500"
          title="TPM Status"
        >
          <p className="text-2xl font-bold text-slate-900">
            {tpm20.toLocaleString()}
            <span className="text-sm font-normal text-slate-400">
              {' '}TPM 2.0
            </span>
          </p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-warning-500" />
              TPM 1.2:{' '}
              <span className="font-semibold text-warning-600">
                {tpm12.toLocaleString()}
              </span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-danger-500" />
              None:{' '}
              <span className="font-semibold text-danger-600">
                {tpmNone.toLocaleString()}
              </span>
            </span>
          </div>
        </DetailCard>
      </div>
    </div>
  );
}
