import { useState, useMemo } from "react";
import {
  Search,
  Download,
  CheckCircle2,
  XCircle,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import type { DeviceDetail } from "../types";

interface DeviceTableProps {
  devices: DeviceDetail[];
  onDeviceSelect: (device: DeviceDetail) => void;
  selectedDeviceId?: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Turn an ISO-8601 date string into a human-friendly relative label. */
function formatRelativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return "just now";

  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);

  if (seconds < 60) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  if (weeks < 52) return `${weeks}w ago`;
  return `${Math.floor(days / 365)}y ago`;
}

type StatusFilter = "all" | "compliant" | "at-risk" | "non-compliant";
type CertFilter = "all" | "2023" | "2011" | "Unknown";
type BootModeFilter = "all" | "UEFI" | "Legacy";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DeviceTable({
  devices,
  onDeviceSelect,
  selectedDeviceId,
}: DeviceTableProps) {
  // -- filter state ---------------------------------------------------------
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [certFilter, setCertFilter] = useState<CertFilter>("all");
  const [bootModeFilter, setBootModeFilter] = useState<BootModeFilter>("all");

  // -- derived list ---------------------------------------------------------
  const filteredDevices = useMemo(() => {
    const q = search.toLowerCase().trim();

    return devices.filter((d) => {
      // text search
      if (
        q &&
        !d.hostname.toLowerCase().includes(q) &&
        !d.assignedUser.toLowerCase().includes(q) &&
        !d.model.toLowerCase().includes(q)
      ) {
        return false;
      }

      // status
      if (statusFilter !== "all" && d.status !== statusFilter) return false;

      // certificate version
      if (
        certFilter !== "all" &&
        d.secureBoot.certificateVersion !== certFilter
      )
        return false;

      // boot mode
      if (bootModeFilter !== "all" && d.secureBoot.mode !== bootModeFilter)
        return false;

      return true;
    });
  }, [devices, search, statusFilter, certFilter, bootModeFilter]);

  // -- status dot colors ----------------------------------------------------
  const statusDot = (status: DeviceDetail["status"]) => {
    const colors: Record<DeviceDetail["status"], string> = {
      compliant: "bg-green-500",
      "at-risk": "bg-amber-500",
      "non-compliant": "bg-red-500",
    };
    return colors[status];
  };

  const statusLabel = (status: DeviceDetail["status"]) => {
    const labels: Record<DeviceDetail["status"], string> = {
      compliant: "Compliant",
      "at-risk": "At Risk",
      "non-compliant": "Non-Compliant",
    };
    return labels[status];
  };

  // -- cert badge colors ----------------------------------------------------
  const certBadge = (version: DeviceDetail["secureBoot"]["certificateVersion"]) => {
    const map: Record<typeof version, string> = {
      "2023": "bg-green-100 text-green-700",
      "2011": "bg-amber-100 text-amber-700",
      Unknown: "bg-red-100 text-red-700",
    };
    return map[version];
  };

  // -- tpm badge ------------------------------------------------------------
  const tpmBadge = (version: DeviceDetail["tpm"]["version"]) => {
    const map: Record<typeof version, string> = {
      "2.0": "bg-green-100 text-green-700",
      "1.2": "bg-amber-100 text-amber-700",
      None: "bg-red-100 text-red-700",
    };
    return map[version];
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      {/* ---- Filter Bar ---- */}
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-200">
        {/* Search */}
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search hostname, user, model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        </div>

        {/* Status filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="compliant">Compliant</option>
            <option value="at-risk">At Risk</option>
            <option value="non-compliant">Non-Compliant</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Certificate filter */}
        <div className="relative">
          <select
            value={certFilter}
            onChange={(e) => setCertFilter(e.target.value as CertFilter)}
            className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Certs</option>
            <option value="2023">2023</option>
            <option value="2011">2011</option>
            <option value="Unknown">Unknown</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Boot mode filter */}
        <div className="relative">
          <select
            value={bootModeFilter}
            onChange={(e) =>
              setBootModeFilter(e.target.value as BootModeFilter)
            }
            className="appearance-none rounded-lg border border-slate-300 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Boot Mode</option>
            <option value="UEFI">UEFI</option>
            <option value="Legacy">Legacy</option>
          </select>
          <ChevronDown
            size={14}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
        </div>

        {/* Export */}
        <button className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
          <Download size={15} />
          Export
        </button>
      </div>

      {/* ---- Results count ---- */}
      <div className="px-4 py-2.5 text-xs text-slate-500 border-b border-slate-100">
        Showing{" "}
        <span className="font-semibold text-slate-700">
          {filteredDevices.length}
        </span>{" "}
        of{" "}
        <span className="font-semibold text-slate-700">{devices.length}</span>{" "}
        devices
      </div>

      {/* ---- Table ---- */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left">
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Status
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Hostname
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Model
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                User
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Department
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Secure Boot
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Certificate
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                TPM
              </th>
              <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                Last Seen
              </th>
              <th className="px-4 py-3">
                <span className="sr-only">Details</span>
              </th>
            </tr>
          </thead>

          <tbody>
            {filteredDevices.map((device) => {
              const isSelected = device.id === selectedDeviceId;

              return (
                <tr
                  key={device.id}
                  onClick={() => onDeviceSelect(device)}
                  className={`cursor-pointer border-b border-slate-100 transition-colors ${
                    isSelected
                      ? "bg-primary-50 border-l-2 border-l-primary-500"
                      : "hover:bg-slate-50"
                  }`}
                >
                  {/* Status dot */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className={`inline-block h-2.5 w-2.5 rounded-full ${statusDot(device.status)}`}
                        title={statusLabel(device.status)}
                      />
                    </span>
                  </td>

                  {/* Hostname */}
                  <td className="px-4 py-3">
                    <span className="font-semibold font-mono text-slate-900">
                      {device.hostname}
                    </span>
                  </td>

                  {/* Model */}
                  <td className="px-4 py-3 text-slate-600">{device.model}</td>

                  {/* User */}
                  <td className="px-4 py-3 text-slate-600">
                    {device.assignedUser}
                  </td>

                  {/* Department */}
                  <td className="px-4 py-3 text-slate-600">
                    {device.department}
                  </td>

                  {/* Secure Boot */}
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5">
                      {device.secureBoot.enabled ? (
                        <CheckCircle2
                          size={15}
                          className="text-green-500 shrink-0"
                        />
                      ) : (
                        <XCircle
                          size={15}
                          className="text-red-500 shrink-0"
                        />
                      )}
                      <span
                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                          device.secureBoot.mode === "UEFI"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {device.secureBoot.mode}
                      </span>
                    </span>
                  </td>

                  {/* Certificate */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${certBadge(device.secureBoot.certificateVersion)}`}
                    >
                      {device.secureBoot.certificateVersion}
                    </span>
                  </td>

                  {/* TPM */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-medium ${tpmBadge(device.tpm.version)}`}
                    >
                      {device.tpm.version === "None"
                        ? "None"
                        : `v${device.tpm.version}`}
                    </span>
                  </td>

                  {/* Last Seen */}
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatRelativeTime(device.lastSeen)}
                  </td>

                  {/* Arrow */}
                  <td className="px-4 py-3 text-slate-400">
                    <ChevronRight size={16} />
                  </td>
                </tr>
              );
            })}

            {/* Empty state */}
            {filteredDevices.length === 0 && (
              <tr>
                <td
                  colSpan={10}
                  className="px-4 py-12 text-center text-slate-400"
                >
                  No devices match the current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
