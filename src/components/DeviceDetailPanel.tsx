import { useState, useEffect } from "react";
import {
  X,
  ShieldCheck,
  Cpu,
  HardDrive,
  Calendar,
  ClipboardList,
  FileDown,
  Monitor,
  User,
  Building2,
  Hash,
} from "lucide-react";
import type { DeviceDetail } from "../types";

interface DeviceDetailPanelProps {
  device: DeviceDetail | null;
  onClose: () => void;
}

export default function DeviceDetailPanel({
  device,
  onClose,
}: DeviceDetailPanelProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (device) {
      // Trigger enter animation on next frame
      requestAnimationFrame(() => setIsVisible(true));
    } else {
      setIsVisible(false);
    }
  }, [device]);

  if (!device) return null;

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 300);
  };

  // ---------- helpers ----------

  const statusColor: Record<DeviceDetail["status"], string> = {
    compliant: "bg-green-100 text-green-700",
    "at-risk": "bg-amber-100 text-amber-700",
    "non-compliant": "bg-red-100 text-red-700",
  };

  const statusLabel: Record<DeviceDetail["status"], string> = {
    compliant: "Compliant",
    "at-risk": "At Risk",
    "non-compliant": "Non-Compliant",
  };

  const certVersionColor: Record<string, string> = {
    "2023": "bg-green-100 text-green-700",
    "2011": "bg-amber-100 text-amber-700",
    Unknown: "bg-slate-100 text-slate-600",
  };

  const certStatusColor: Record<string, string> = {
    current: "bg-green-100 text-green-700",
    outdated: "bg-amber-100 text-amber-700",
    missing: "bg-red-100 text-red-700",
  };

  const isWarrantyActive =
    new Date(device.warrantyExpiry) > new Date();

  // ---------- section wrapper ----------

  function Section({
    icon: Icon,
    title,
    children,
  }: {
    icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
    title: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white">
        <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
          <Icon size={16} className="text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
        </div>
        <div className="px-4 py-3">{children}</div>
      </div>
    );
  }

  function InfoRow({
    label,
    children,
  }: {
    label: string;
    children: React.ReactNode;
  }) {
    return (
      <div className="flex items-center justify-between py-1.5 text-sm">
        <span className="text-slate-500">{label}</span>
        <span className="font-medium text-slate-800">{children}</span>
      </div>
    );
  }

  function Badge({ className, children }: { className: string; children: React.ReactNode }) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
      >
        {children}
      </span>
    );
  }

  // ---------- render ----------

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-black/30 transition-opacity duration-300 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <aside
        className={`fixed right-0 top-0 z-50 flex h-full w-[480px] flex-col bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          isVisible ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* ---- Header ---- */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-slate-900">
              {device.hostname}
            </h2>
            <Badge className={statusColor[device.status]}>
              {statusLabel[device.status]}
            </Badge>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* ---- Scrollable Content ---- */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {/* Device Info */}
          <Section icon={Monitor} title="Device Information">
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <div>
                <span className="text-slate-500">Model</span>
                <p className="font-medium text-slate-800">{device.model}</p>
              </div>
              <div>
                <span className="text-slate-500">Manufacturer</span>
                <p className="font-medium text-slate-800">{device.manufacturer}</p>
              </div>
              <div>
                <span className="text-slate-500">Serial Number</span>
                <p className="flex items-center gap-1 font-medium text-slate-800">
                  <Hash size={12} className="text-slate-400" />
                  {device.serialNumber}
                </p>
              </div>
              <div>
                <span className="text-slate-500">OS</span>
                <p className="font-medium text-slate-800">
                  {device.os} ({device.osBuild})
                </p>
              </div>
              <div>
                <span className="flex items-center gap-1 text-slate-500">
                  <User size={12} className="text-slate-400" />
                  Assigned User
                </span>
                <p className="font-medium text-slate-800">{device.assignedUser}</p>
              </div>
              <div>
                <span className="flex items-center gap-1 text-slate-500">
                  <Building2 size={12} className="text-slate-400" />
                  Department
                </span>
                <p className="font-medium text-slate-800">{device.department}</p>
              </div>
            </div>
          </Section>

          {/* Secure Boot Status */}
          <Section icon={ShieldCheck} title="Secure Boot Status">
            <div className="space-y-0.5">
              <InfoRow label="Secure Boot">
                <Badge
                  className={
                    device.secureBoot.enabled
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {device.secureBoot.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </InfoRow>
              <InfoRow label="Boot Mode">
                <Badge
                  className={
                    device.secureBoot.mode === "UEFI"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-amber-100 text-amber-700"
                  }
                >
                  {device.secureBoot.mode}
                </Badge>
              </InfoRow>
              <InfoRow label="Certificate Version">
                <Badge
                  className={
                    certVersionColor[device.secureBoot.certificateVersion] ??
                    "bg-slate-100 text-slate-600"
                  }
                >
                  {device.secureBoot.certificateVersion}
                </Badge>
              </InfoRow>
              <InfoRow label="Certificate Expiry">
                {new Date(device.secureBoot.certificateExpiry).toLocaleDateString()}
              </InfoRow>
              <InfoRow label="DBX Version">
                {device.secureBoot.dbxVersion}
              </InfoRow>
              <InfoRow label="Certificate Status">
                <Badge
                  className={
                    certStatusColor[device.secureBoot.certificateStatus] ??
                    "bg-slate-100 text-slate-600"
                  }
                >
                  {device.secureBoot.certificateStatus.charAt(0).toUpperCase() +
                    device.secureBoot.certificateStatus.slice(1)}
                </Badge>
              </InfoRow>
            </div>
          </Section>

          {/* TPM Status */}
          <Section icon={Cpu} title="TPM Status">
            <div className="space-y-0.5">
              <InfoRow label="TPM Present">
                <Badge
                  className={
                    device.tpm.present
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {device.tpm.present ? "Present" : "Not Present"}
                </Badge>
              </InfoRow>
              <InfoRow label="Version">
                <Badge className="bg-slate-100 text-slate-700">
                  {device.tpm.version}
                </Badge>
              </InfoRow>
              <InfoRow label="Enabled">
                <Badge
                  className={
                    device.tpm.enabled
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {device.tpm.enabled ? "Enabled" : "Disabled"}
                </Badge>
              </InfoRow>
              <InfoRow label="Ready">
                <Badge
                  className={
                    device.tpm.ready
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }
                >
                  {device.tpm.ready ? "Ready" : "Not Ready"}
                </Badge>
              </InfoRow>
            </div>
          </Section>

          {/* BIOS/Firmware */}
          <Section icon={HardDrive} title="BIOS / Firmware">
            <div className="space-y-0.5">
              <InfoRow label="Vendor">{device.bios.vendor}</InfoRow>
              <InfoRow label="Version">{device.bios.version}</InfoRow>
              <InfoRow label="Release Date">
                {new Date(device.bios.releaseDate).toLocaleDateString()}
              </InfoRow>
              <InfoRow label="Firmware Status">
                <Badge
                  className={
                    device.bios.isLatest
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }
                >
                  {device.bios.isLatest ? "Latest" : "Update Available"}
                </Badge>
              </InfoRow>
            </div>
          </Section>

          {/* Warranty */}
          <Section icon={Calendar} title="Warranty">
            <div className="space-y-0.5">
              <InfoRow label="Expiry Date">
                {new Date(device.warrantyExpiry).toLocaleDateString()}
              </InfoRow>
              <InfoRow label="Status">
                <Badge
                  className={
                    isWarrantyActive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {isWarrantyActive ? "Active" : "Expired"}
                </Badge>
              </InfoRow>
            </div>
          </Section>
        </div>

        {/* ---- Actions ---- */}
        <div className="flex items-center gap-3 border-t border-slate-200 px-6 py-4">
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
          >
            <ClipboardList size={16} />
            Create Task
          </button>
          <button
            type="button"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <FileDown size={16} />
            Export Report
          </button>
        </div>
      </aside>
    </>
  );
}
