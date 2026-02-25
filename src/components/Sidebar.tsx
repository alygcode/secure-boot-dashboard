import {
  Shield,
  LayoutDashboard,
  Monitor,
  ShieldCheck,
  ClipboardCheck,
  ListTodo,
  Settings,
} from "lucide-react";

export type TabId =
  | "dashboard"
  | "devices"
  | "certificates"
  | "compliance"
  | "workflows"
  | "settings";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement> & { size?: number | string }>;
}

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "devices", label: "Devices", icon: Monitor },
  { id: "certificates", label: "Certificates", icon: ShieldCheck },
  { id: "compliance", label: "Compliance", icon: ClipboardCheck },
  { id: "workflows", label: "Workflows", icon: ListTodo },
  { id: "settings", label: "Settings", icon: Settings },
];

export default function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="flex flex-col w-64 min-h-screen bg-slate-900 text-slate-300">
      {/* ---- Logo ---- */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-700/60">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary-600 text-white">
          <Shield size={20} />
        </div>
        <span className="text-lg font-semibold tracking-tight text-white">
          SecureBoot Monitor
        </span>
      </div>

      {/* ---- Navigation ---- */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`flex items-center gap-3 w-full rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${
                  isActive
                    ? "bg-primary-600 text-white shadow-sm"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
            >
              <Icon size={18} />
              {label}
            </button>
          );
        })}
      </nav>

      {/* ---- Fleet Status Badge ---- */}
      <div className="px-4 py-4 border-t border-slate-700/60">
        <div className="flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-3">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
          </span>
          <span className="text-xs font-medium text-slate-300">
            Fleet Status:
          </span>
          <span className="text-xs font-semibold text-green-400">Active</span>
        </div>
      </div>
    </aside>
  );
}
