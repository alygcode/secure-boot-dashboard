import type {
  Device,
  DeviceDetail,
  SecureBootInfo,
  TpmInfo,
  ComplianceMetrics,
  RemediationTask,
  CertDistribution,
  ComplianceTrend,
} from '../types';

// ---------------------------------------------------------------------------
// Helper data pools
// ---------------------------------------------------------------------------

const departments = [
  'Finance',
  'HR',
  'Engineering',
  'Marketing',
  'Sales',
  'IT',
  'Operations',
  'Legal',
] as const;

const deptPrefixes: Record<string, string> = {
  Finance: 'FIN',
  HR: 'HR',
  Engineering: 'ENG',
  Marketing: 'MKT',
  Sales: 'SLS',
  IT: 'IT',
  Operations: 'OPS',
  Legal: 'LGL',
};

const formFactors = ['DESK', 'LAPTOP'] as const;

const models = [
  { model: 'Dell Latitude 5540', manufacturer: 'Dell Inc.', biosVendor: 'Dell Inc.' },
  { model: 'Dell Latitude 5550', manufacturer: 'Dell Inc.', biosVendor: 'Dell Inc.' },
  { model: 'Dell OptiPlex 7010', manufacturer: 'Dell Inc.', biosVendor: 'Dell Inc.' },
  { model: 'Dell OptiPlex 5000', manufacturer: 'Dell Inc.', biosVendor: 'Dell Inc.' },
  { model: 'Lenovo ThinkPad T14 Gen 4', manufacturer: 'Lenovo', biosVendor: 'Lenovo Ltd.' },
  { model: 'Lenovo ThinkPad T16 Gen 2', manufacturer: 'Lenovo', biosVendor: 'Lenovo Ltd.' },
  { model: 'Lenovo ThinkCentre M70q Gen 4', manufacturer: 'Lenovo', biosVendor: 'Lenovo Ltd.' },
  { model: 'HP EliteBook 840 G10', manufacturer: 'HP Inc.', biosVendor: 'HP' },
  { model: 'HP EliteBook 860 G10', manufacturer: 'HP Inc.', biosVendor: 'HP' },
  { model: 'HP EliteDesk 800 G9', manufacturer: 'HP Inc.', biosVendor: 'HP' },
  { model: 'HP ProDesk 400 G9', manufacturer: 'HP Inc.', biosVendor: 'HP' },
  { model: 'Microsoft Surface Pro 9', manufacturer: 'Microsoft Corporation', biosVendor: 'Microsoft Corporation' },
  { model: 'Microsoft Surface Laptop 5', manufacturer: 'Microsoft Corporation', biosVendor: 'Microsoft Corporation' },
];

const firstNames = [
  'James', 'Mary', 'Robert', 'Patricia', 'John', 'Jennifer', 'Michael', 'Linda',
  'David', 'Elizabeth', 'William', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica',
  'Thomas', 'Sarah', 'Christopher', 'Karen', 'Charles', 'Lisa', 'Daniel', 'Nancy',
  'Matthew', 'Betty', 'Anthony', 'Margaret', 'Mark', 'Sandra', 'Donald', 'Ashley',
  'Steven', 'Kimberly', 'Paul', 'Emily', 'Andrew', 'Donna', 'Joshua', 'Michelle',
  'Kenneth', 'Carol', 'Kevin', 'Amanda', 'Brian', 'Dorothy', 'George', 'Melissa',
  'Timothy', 'Deborah',
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell',
  'Carter', 'Roberts',
];

const osVariants = [
  { os: 'Windows 11 23H2', osBuild: '22631.3007' },
  { os: 'Windows 11 23H2', osBuild: '22631.2861' },
  { os: 'Windows 11 22H2', osBuild: '22621.3007' },
  { os: 'Windows 10 22H2', osBuild: '19045.3930' },
  { os: 'Windows 10 22H2', osBuild: '19045.3803' },
  { os: 'Windows 10 21H2', osBuild: '19044.3930' },
];


// ---------------------------------------------------------------------------
// Deterministic pseudo-random from seed (simple LCG)
// ---------------------------------------------------------------------------

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const rand = seededRandom(7);

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

function pickIndex(length: number): number {
  return Math.floor(rand() * length);
}

// ---------------------------------------------------------------------------
// Generate 50 DeviceDetails
// ---------------------------------------------------------------------------

function generateDeviceDetails(): DeviceDetail[] {
  const result: DeviceDetail[] = [];
  const deptCounters: Record<string, number> = {};

  for (let i = 0; i < 50; i++) {
    const dept = departments[i % departments.length];
    deptCounters[dept] = (deptCounters[dept] || 0) + 1;
    const counter = String(deptCounters[dept]).padStart(3, '0');
    const formFactor = pick(formFactors);
    const hostname = `${formFactor}-${deptPrefixes[dept]}-${counter}`;

    const hw = models[pickIndex(models.length)];
    const firstName = firstNames[i % firstNames.length];
    const lastName = lastNames[i % lastNames.length];

    const osVariant = osVariants[pickIndex(osVariants.length)];

    // Determine status distribution: ~60% compliant, ~25% at-risk, ~15% non-compliant
    let status: Device['status'];
    const statusRoll = rand();
    if (statusRoll < 0.60) {
      status = 'compliant';
    } else if (statusRoll < 0.85) {
      status = 'at-risk';
    } else {
      status = 'non-compliant';
    }

    // Certificate version distribution: 45% 2023, 40% 2011, 15% unknown
    let certVersion: SecureBootInfo['certificateVersion'];
    const certRoll = rand();
    if (certRoll < 0.45) {
      certVersion = '2023';
    } else if (certRoll < 0.85) {
      certVersion = '2011';
    } else {
      certVersion = 'Unknown';
    }

    // UEFI vs Legacy: 80/20
    const isUefi = rand() < 0.80;
    const mode: SecureBootInfo['mode'] = isUefi ? 'UEFI' : 'Legacy';

    // Secure boot enabled correlates with compliance
    const sbEnabled = status === 'non-compliant' ? (rand() < 0.2) : (rand() < 0.92);

    // Certificate status derives from version and enabled
    let certStatus: SecureBootInfo['certificateStatus'];
    if (!sbEnabled) {
      certStatus = 'missing';
    } else if (certVersion === '2023') {
      certStatus = 'current';
    } else if (certVersion === '2011') {
      certStatus = 'outdated';
    } else {
      certStatus = 'missing';
    }

    // TPM distribution: 75% 2.0, 15% 1.2, 10% None
    let tpmVersion: TpmInfo['version'];
    const tpmRoll = rand();
    if (tpmRoll < 0.75) {
      tpmVersion = '2.0';
    } else if (tpmRoll < 0.90) {
      tpmVersion = '1.2';
    } else {
      tpmVersion = 'None';
    }

    const tpmPresent = tpmVersion !== 'None';
    const tpmEnabled = tpmPresent && (status !== 'non-compliant' || rand() < 0.3);
    const tpmReady = tpmEnabled && rand() < 0.95;

    // DBX version — newer for 2023 certs
    const dbxVersions = certVersion === '2023'
      ? ['DBX-2024-01', 'DBX-2023-10', 'DBX-2023-07']
      : certVersion === '2011'
        ? ['DBX-2022-08', 'DBX-2021-01', 'DBX-2020-10']
        : ['DBX-2019-05', 'DBX-2018-04'];
    const dbxVersion = pick(dbxVersions);

    // Certificate expiry
    const certExpiry = certVersion === '2023'
      ? '2033-06-15'
      : certVersion === '2011'
        ? '2026-10-31'
        : '';

    // BIOS versions by vendor
    const biosVersionMap: Record<string, string[]> = {
      'Dell Inc.': ['1.22.0', '1.20.1', '1.18.0', '1.15.2', '1.12.0'],
      'Lenovo Ltd.': ['1.54', '1.51', '1.48', '1.42', '1.38'],
      'HP': ['01.11.00', '01.09.02', '01.07.00', '01.05.01', '01.03.00'],
      'Microsoft Corporation': ['16.101.140', '16.100.139', '15.99.130'],
    };
    const vendorBiosVersions = biosVersionMap[hw.biosVendor] || ['1.0.0'];
    const biosVersionIdx = pickIndex(vendorBiosVersions.length);
    const biosVersion = vendorBiosVersions[biosVersionIdx];
    const isLatestBios = biosVersionIdx === 0;

    // BIOS release dates (newer versions = later dates)
    const biosReleaseDates = ['2025-11-15', '2025-08-22', '2025-04-10', '2024-11-30', '2024-06-18'];
    const biosReleaseDate = biosReleaseDates[Math.min(biosVersionIdx, biosReleaseDates.length - 1)];

    // Last seen — most within last few days, some older
    const daysAgo = rand() < 0.8 ? Math.floor(rand() * 3) : Math.floor(rand() * 30);
    const lastSeenDate = new Date('2026-02-25');
    lastSeenDate.setDate(lastSeenDate.getDate() - daysAgo);
    const lastSeen = lastSeenDate.toISOString();

    // Warranty expiry — spread across past and future
    const warrantyOffset = Math.floor(rand() * 1460) - 365; // -1yr to +3yr from now
    const warrantyDate = new Date('2026-02-25');
    warrantyDate.setDate(warrantyDate.getDate() + warrantyOffset);
    const warrantyExpiry = warrantyDate.toISOString().split('T')[0];

    // Serial number
    const serialChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let serialNumber = '';
    for (let s = 0; s < 10; s++) {
      serialNumber += serialChars[Math.floor(rand() * serialChars.length)];
    }

    const device: DeviceDetail = {
      id: `dev-${String(i + 1).padStart(4, '0')}`,
      hostname,
      model: hw.model,
      manufacturer: hw.manufacturer,
      serialNumber,
      os: osVariant.os,
      osBuild: osVariant.osBuild,
      lastSeen,
      department: dept,
      assignedUser: `${firstName} ${lastName}`,
      status,
      secureBoot: {
        enabled: sbEnabled,
        mode,
        certificateVersion: certVersion,
        certificateExpiry: certExpiry,
        dbxVersion,
        certificateStatus: certStatus,
      },
      tpm: {
        present: tpmPresent,
        version: tpmVersion,
        enabled: tpmEnabled,
        ready: tpmReady,
      },
      bios: {
        vendor: hw.biosVendor,
        version: biosVersion,
        releaseDate: biosReleaseDate,
        isLatest: isLatestBios,
      },
      warrantyExpiry,
    };

    result.push(device);
  }

  return result;
}

// ---------------------------------------------------------------------------
// Generate all data
// ---------------------------------------------------------------------------

export const deviceDetails: DeviceDetail[] = generateDeviceDetails();

// Flat device list (without extended detail fields)
export const devices: Device[] = deviceDetails.map(
  ({ secureBoot: _sb, tpm: _tpm, bios: _bios, warrantyExpiry: _we, ...device }) => device,
);

// ---------------------------------------------------------------------------
// Compliance metrics — computed from actual device data
// ---------------------------------------------------------------------------

export const complianceMetrics: ComplianceMetrics = deviceDetails.reduce<ComplianceMetrics>(
  (m, d) => {
    m.totalDevices++;
    if (d.status === 'compliant') m.compliant++;
    else if (d.status === 'at-risk') m.atRisk++;
    else m.nonCompliant++;

    if (d.secureBoot.enabled) m.secureBootEnabled++;
    else m.secureBootDisabled++;

    if (d.secureBoot.certificateVersion === '2023') m.cert2023++;
    else if (d.secureBoot.certificateVersion === '2011') m.cert2011++;
    else m.certUnknown++;

    if (d.tpm.version === '2.0') m.tpm20++;
    else if (d.tpm.version === '1.2') m.tpm12++;
    else m.tpmNone++;

    if (d.secureBoot.mode === 'UEFI') m.uefiMode++;
    else m.legacyMode++;

    return m;
  },
  {
    totalDevices: 0,
    compliant: 0,
    atRisk: 0,
    nonCompliant: 0,
    secureBootEnabled: 0,
    secureBootDisabled: 0,
    cert2023: 0,
    cert2011: 0,
    certUnknown: 0,
    tpm20: 0,
    tpm12: 0,
    tpmNone: 0,
    uefiMode: 0,
    legacyMode: 0,
  },
);

// ---------------------------------------------------------------------------
// Remediation tasks
// ---------------------------------------------------------------------------

export const remediationTasks: RemediationTask[] = [
  {
    id: 'task-001',
    title: 'Update Secure Boot certificates to 2023',
    description:
      'Devices running the deprecated 2011 Secure Boot certificate authority need to be updated to the 2023 CA to maintain protection against known bootkits and ensure continued Windows security update compatibility.',
    priority: 'critical',
    status: 'in-progress',
    affectedDevices: complianceMetrics.cert2011,
    createdAt: '2025-12-10T09:00:00Z',
    assignee: 'Alex Chen',
  },
  {
    id: 'task-002',
    title: 'Enable Secure Boot on Legacy devices',
    description:
      'Several devices are still running in Legacy BIOS mode with Secure Boot disabled. These need to be converted to UEFI mode and have Secure Boot enabled to meet organizational security policy.',
    priority: 'critical',
    status: 'pending',
    affectedDevices: complianceMetrics.legacyMode,
    createdAt: '2025-12-15T14:30:00Z',
    assignee: 'Priya Patel',
  },
  {
    id: 'task-003',
    title: 'Upgrade TPM firmware to 2.0',
    description:
      'Devices with TPM 1.2 modules need firmware upgrades to TPM 2.0 where hardware supports it. TPM 2.0 is required for Windows 11 compatibility and enhanced security features like credential isolation.',
    priority: 'high',
    status: 'in-progress',
    affectedDevices: complianceMetrics.tpm12,
    createdAt: '2026-01-05T10:15:00Z',
    assignee: 'Marcus Johnson',
  },
  {
    id: 'task-004',
    title: 'Install TPM modules on unsupported devices',
    description:
      'A subset of devices lack any TPM hardware. Evaluate whether discrete TPM modules can be added or whether these devices need to be replaced to meet compliance requirements.',
    priority: 'high',
    status: 'pending',
    affectedDevices: complianceMetrics.tpmNone,
    createdAt: '2026-01-08T08:45:00Z',
    assignee: 'Sofia Rodriguez',
  },
  {
    id: 'task-005',
    title: 'Apply latest BIOS/UEFI firmware updates',
    description:
      'Multiple devices are running outdated BIOS firmware versions that may contain known vulnerabilities. Coordinate with hardware vendors to deploy the latest firmware through enterprise management tools.',
    priority: 'medium',
    status: 'in-progress',
    affectedDevices: deviceDetails.filter((d) => !d.bios.isLatest).length,
    createdAt: '2026-01-12T11:00:00Z',
    assignee: 'Tomas Eriksson',
  },
  {
    id: 'task-006',
    title: 'Update DBX revocation list to latest version',
    description:
      'The Secure Boot Forbidden Signature Database (DBX) must be updated to the latest version to block known-vulnerable bootloaders. Outdated DBX entries leave devices exposed to BlackLotus and similar UEFI threats.',
    priority: 'high',
    status: 'pending',
    affectedDevices: deviceDetails.filter(
      (d) => d.secureBoot.dbxVersion < 'DBX-2023',
    ).length,
    createdAt: '2026-01-20T13:30:00Z',
    assignee: 'Alex Chen',
  },
  {
    id: 'task-007',
    title: 'Migrate remaining Windows 10 devices to Windows 11',
    description:
      'Windows 10 reaches end of support in October 2025. Remaining devices need to be evaluated for Windows 11 hardware compatibility and upgraded. Devices that cannot be upgraded should be scheduled for hardware refresh.',
    priority: 'medium',
    status: 'in-progress',
    affectedDevices: deviceDetails.filter((d) => d.os.startsWith('Windows 10')).length,
    createdAt: '2026-01-25T09:00:00Z',
    assignee: 'Priya Patel',
  },
  {
    id: 'task-008',
    title: 'Remediate non-compliant devices in Legal department',
    description:
      'The Legal department has the highest concentration of non-compliant devices handling sensitive data. Prioritize these devices for immediate Secure Boot enablement and certificate updates to meet regulatory requirements.',
    priority: 'critical',
    status: 'pending',
    affectedDevices: deviceDetails.filter(
      (d) => d.department === 'Legal' && d.status === 'non-compliant',
    ).length,
    createdAt: '2026-02-01T15:00:00Z',
    assignee: 'Marcus Johnson',
  },
];

// ---------------------------------------------------------------------------
// Certificate distribution (for pie/donut chart)
// ---------------------------------------------------------------------------

export const certDistribution: CertDistribution[] = [
  {
    name: 'Windows UEFI CA 2023',
    value: complianceMetrics.cert2023,
    color: '#10b981',
  },
  {
    name: 'Microsoft UEFI CA 2011',
    value: complianceMetrics.cert2011,
    color: '#f59e0b',
  },
  {
    name: 'Unknown / Missing',
    value: complianceMetrics.certUnknown,
    color: '#ef4444',
  },
];

// ---------------------------------------------------------------------------
// Compliance trend — 12 months of data with gradual improvement
// ---------------------------------------------------------------------------

export const complianceTrend: ComplianceTrend[] = (() => {
  const total = complianceMetrics.totalDevices;
  const data: ComplianceTrend[] = [];

  // Start from 12 months ago with worse numbers and improve towards current
  const startCompliant = Math.round(total * 0.35);
  const startAtRisk = Math.round(total * 0.30);
  const startNonCompliant = total - startCompliant - startAtRisk;

  const endCompliant = complianceMetrics.compliant;
  const endNonCompliant = complianceMetrics.nonCompliant;

  for (let i = 0; i < 12; i++) {
    const t = i / 11; // 0 → 1 over 12 months
    const month = new Date(2025, 2 + i, 1); // March 2025 → February 2026
    const dateStr = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;

    const compliant = Math.round(startCompliant + (endCompliant - startCompliant) * t);
    const nonCompliant = Math.round(
      startNonCompliant + (endNonCompliant - startNonCompliant) * t,
    );
    const atRisk = total - compliant - nonCompliant;

    data.push({ date: dateStr, compliant, atRisk, nonCompliant });
  }

  return data;
})();

// ---------------------------------------------------------------------------
// Model distribution — device count by hardware model (for bar chart)
// ---------------------------------------------------------------------------

export const modelDistribution: { name: string; count: number }[] = (() => {
  const counts: Record<string, number> = {};
  for (const d of deviceDetails) {
    counts[d.model] = (counts[d.model] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
})();

// ---------------------------------------------------------------------------
// Department compliance — compliance breakdown per department (for stacked bar)
// ---------------------------------------------------------------------------

export const departmentCompliance: {
  department: string;
  compliant: number;
  atRisk: number;
  nonCompliant: number;
  total: number;
}[] = (() => {
  const deptMap: Record<
    string,
    { compliant: number; atRisk: number; nonCompliant: number; total: number }
  > = {};

  for (const d of deviceDetails) {
    if (!deptMap[d.department]) {
      deptMap[d.department] = { compliant: 0, atRisk: 0, nonCompliant: 0, total: 0 };
    }
    deptMap[d.department].total++;
    if (d.status === 'compliant') deptMap[d.department].compliant++;
    else if (d.status === 'at-risk') deptMap[d.department].atRisk++;
    else deptMap[d.department].nonCompliant++;
  }

  return Object.entries(deptMap)
    .map(([department, stats]) => ({ department, ...stats }))
    .sort((a, b) => a.department.localeCompare(b.department));
})();
