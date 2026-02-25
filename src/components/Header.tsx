import { Search, Bell, RefreshCw } from "lucide-react";
import type { TabId } from "./Sidebar";

interface HeaderProps {
  activeTab: TabId;
}

const pageTitles: Record<TabId, string> = {
  dashboard: "Dashboard",
  devices: "Devices",
  certificates: "Certificates",
  compliance: "Compliance",
  workflows: "Workflows",
  settings: "Settings",
};

export default function Header({ activeTab }: HeaderProps) {
  return (
    <header className="flex items-center justify-between bg-white border-b border-slate-200 py-4 px-6">
      {/* ---- Page Title ---- */}
      <h1 className="text-xl font-semibold text-slate-900">
        {pageTitles[activeTab]}
      </h1>

      {/* ---- Right Section ---- */}
      <div className="flex items-center gap-5">
        {/* Search */}
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
          />
          <input
            type="text"
            placeholder="Search..."
            className="w-64 rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 transition-colors"
          />
        </div>

        {/* Last Sync */}
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <RefreshCw size={14} className="text-slate-400" />
          <span>Last sync: 5 min ago</span>
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
        >
          <Bell size={20} />
          <span className="absolute -top-0.5 -right-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
            3
          </span>
        </button>

        {/* User Avatar */}
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-600 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          JD
        </button>
      </div>
    </header>
  );
}
