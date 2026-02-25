import type { ReactNode } from "react";
import Sidebar from "./Sidebar";
import type { TabId } from "./Sidebar";
import Header from "./Header";

interface LayoutProps {
  children: ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

export default function Layout({ children, activeTab, onTabChange }: LayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Fixed Sidebar */}
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />

      {/* Main content area */}
      <div className="flex flex-1 flex-col min-h-screen">
        <Header activeTab={activeTab} />

        <main className="flex-1 overflow-y-auto bg-slate-50 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

export type { TabId };
