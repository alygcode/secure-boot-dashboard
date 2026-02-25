// Secure Boot / UEFI Certificate Monitoring Dashboard - Type Definitions

export interface Device {
  id: string;
  hostname: string;
  model: string;
  manufacturer: string;
  serialNumber: string;
  os: string;
  osBuild: string;
  lastSeen: string; // ISO 8601 date string
  department: string;
  assignedUser: string;
  status: 'compliant' | 'at-risk' | 'non-compliant';
}

export interface SecureBootInfo {
  enabled: boolean;
  mode: 'UEFI' | 'Legacy';
  certificateVersion: '2011' | '2023' | 'Unknown';
  certificateExpiry: string;
  dbxVersion: string;
  certificateStatus: 'current' | 'outdated' | 'missing';
}

export interface TpmInfo {
  present: boolean;
  version: '2.0' | '1.2' | 'None';
  enabled: boolean;
  ready: boolean;
}

export interface BiosInfo {
  vendor: string;
  version: string;
  releaseDate: string;
  isLatest: boolean;
}

export interface DeviceDetail extends Device {
  secureBoot: SecureBootInfo;
  tpm: TpmInfo;
  bios: BiosInfo;
  warrantyExpiry: string;
}

export interface ComplianceMetrics {
  totalDevices: number;
  compliant: number;
  atRisk: number;
  nonCompliant: number;
  secureBootEnabled: number;
  secureBootDisabled: number;
  cert2023: number;
  cert2011: number;
  certUnknown: number;
  tpm20: number;
  tpm12: number;
  tpmNone: number;
  uefiMode: number;
  legacyMode: number;
}

export interface RemediationTask {
  id: string;
  title: string;
  description: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  status: 'pending' | 'in-progress' | 'completed';
  affectedDevices: number;
  createdAt: string;
  assignee: string;
}

export interface CertDistribution {
  name: string;
  value: number;
  color: string;
}

export interface ComplianceTrend {
  date: string;
  compliant: number;
  atRisk: number;
  nonCompliant: number;
}
