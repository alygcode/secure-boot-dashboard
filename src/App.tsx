import { useState } from 'react';
import Layout from './components/Layout';
import type { TabId } from './components/Layout';
import MetricsCards from './components/MetricsCards';
import DeviceTable from './components/DeviceTable';
import DeviceDetailPanel from './components/DeviceDetailPanel';
import WorkflowPanel from './components/WorkflowPanel';
import {
  CertificateDistributionChart,
  ComplianceTrendChart,
  BootModeChart,
  ModelDistributionChart,
  DepartmentComplianceChart,
} from './components/Charts';

import type { DeviceDetail } from './types';
import {
  deviceDetails,
  complianceMetrics,
  remediationTasks,
  certDistribution,
  complianceTrend,
  modelDistribution,
  departmentCompliance,
} from './data/mockData';

function DashboardView({
  onDeviceSelect,
  selectedDevice,
  selectedDeviceId,
}: {
  onDeviceSelect: (d: DeviceDetail) => void;
  selectedDevice: DeviceDetail | null;
  selectedDeviceId?: string;
}) {
  return (
    <div className="space-y-6">
      <MetricsCards metrics={complianceMetrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceTrendChart data={complianceTrend} />
        <CertificateDistributionChart data={certDistribution} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <BootModeChart uefi={complianceMetrics.uefiMode} legacy={complianceMetrics.legacyMode} />
        <ModelDistributionChart data={modelDistribution} />
        <DepartmentComplianceChart data={departmentCompliance} />
      </div>

      <DeviceTable
        devices={deviceDetails}
        onDeviceSelect={onDeviceSelect}
        selectedDeviceId={selectedDeviceId}
      />

      <DeviceDetailPanel
        device={selectedDevice}
        onClose={() => onDeviceSelect(null!)}
      />
    </div>
  );
}

function DevicesView({
  onDeviceSelect,
  selectedDevice,
  selectedDeviceId,
}: {
  onDeviceSelect: (d: DeviceDetail) => void;
  selectedDevice: DeviceDetail | null;
  selectedDeviceId?: string;
}) {
  return (
    <div className="space-y-6">
      <DeviceTable
        devices={deviceDetails}
        onDeviceSelect={onDeviceSelect}
        selectedDeviceId={selectedDeviceId}
      />
      <DeviceDetailPanel
        device={selectedDevice}
        onClose={() => onDeviceSelect(null!)}
      />
    </div>
  );
}

function CertificatesView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CertificateDistributionChart data={certDistribution} />
        <ComplianceTrendChart data={complianceTrend} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BootModeChart uefi={complianceMetrics.uefiMode} legacy={complianceMetrics.legacyMode} />
        <DepartmentComplianceChart data={departmentCompliance} />
      </div>
    </div>
  );
}

function ComplianceView() {
  return (
    <div className="space-y-6">
      <MetricsCards metrics={complianceMetrics} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ComplianceTrendChart data={complianceTrend} />
        <DepartmentComplianceChart data={departmentCompliance} />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ModelDistributionChart data={modelDistribution} />
        <CertificateDistributionChart data={certDistribution} />
      </div>
    </div>
  );
}

function WorkflowsView() {
  return <WorkflowPanel tasks={remediationTasks} />;
}

function SettingsView() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
      <h2 className="text-xl font-semibold text-slate-800 mb-4">Settings</h2>
      <p className="text-slate-500">
        Dashboard settings and configuration options will appear here.
      </p>
      <div className="mt-6 space-y-4">
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <div>
            <div className="font-medium text-slate-700">Auto-refresh interval</div>
            <div className="text-sm text-slate-400">How often to sync device data</div>
          </div>
          <select className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
            <option>5 minutes</option>
            <option>15 minutes</option>
            <option>30 minutes</option>
            <option>1 hour</option>
          </select>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <div>
            <div className="font-medium text-slate-700">Email notifications</div>
            <div className="text-sm text-slate-400">Receive alerts for non-compliant devices</div>
          </div>
          <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-primary-600 transition-colors">
            <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6" />
          </button>
        </div>
        <div className="flex items-center justify-between py-3 border-b border-slate-100">
          <div>
            <div className="font-medium text-slate-700">Compliance threshold</div>
            <div className="text-sm text-slate-400">Minimum compliance percentage target</div>
          </div>
          <span className="text-sm font-medium text-slate-700">95%</span>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [selectedDevice, setSelectedDevice] = useState<DeviceDetail | null>(null);

  const handleDeviceSelect = (device: DeviceDetail | null) => {
    setSelectedDevice(device);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <DashboardView
            onDeviceSelect={handleDeviceSelect}
            selectedDevice={selectedDevice}
            selectedDeviceId={selectedDevice?.id}
          />
        );
      case 'devices':
        return (
          <DevicesView
            onDeviceSelect={handleDeviceSelect}
            selectedDevice={selectedDevice}
            selectedDeviceId={selectedDevice?.id}
          />
        );
      case 'certificates':
        return <CertificatesView />;
      case 'compliance':
        return <ComplianceView />;
      case 'workflows':
        return <WorkflowsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  return (
    <Layout activeTab={activeTab} onTabChange={setActiveTab}>
      {renderContent()}
    </Layout>
  );
}
