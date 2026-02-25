import { useState } from "react";
import {
  Plus,
  ChevronRight,
  Monitor,
  User,
  Clock,
  ListTodo,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import type { RemediationTask } from "../types";

interface WorkflowPanelProps {
  tasks: RemediationTask[];
}

type FilterTab = "all" | "pending" | "in-progress" | "completed";

const filterTabs: { id: FilterTab; label: string }[] = [
  { id: "all", label: "All" },
  { id: "pending", label: "Pending" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];

const priorityStyle: Record<RemediationTask["priority"], string> = {
  critical: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  medium: "bg-yellow-100 text-yellow-700",
  low: "bg-blue-100 text-blue-700",
};

const statusStyle: Record<RemediationTask["status"], string> = {
  pending: "bg-slate-100 text-slate-600",
  "in-progress": "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700",
};

const statusLabel: Record<RemediationTask["status"], string> = {
  pending: "Pending",
  "in-progress": "In Progress",
  completed: "Completed",
};

export default function WorkflowPanel({ tasks }: WorkflowPanelProps) {
  const [activeFilter, setActiveFilter] = useState<FilterTab>("all");

  // ---------- derived data ----------

  const pendingCount = tasks.filter((t) => t.status === "pending").length;
  const inProgressCount = tasks.filter((t) => t.status === "in-progress").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  const filteredTasks =
    activeFilter === "all"
      ? tasks
      : tasks.filter((t) => t.status === activeFilter);

  // ---------- helpers ----------

  function Badge({
    className,
    children,
  }: {
    className: string;
    children: React.ReactNode;
  }) {
    return (
      <span
        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}
      >
        {children}
      </span>
    );
  }

  // ---------- render ----------

  return (
    <div className="rounded-xl bg-white shadow-sm">
      {/* ---- Header ---- */}
      <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
        <h2 className="text-lg font-semibold text-slate-900">
          Remediation Workflows
        </h2>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors"
        >
          <Plus size={16} />
          New Task
        </button>
      </div>

      {/* ---- Summary Stats ---- */}
      <div className="grid grid-cols-3 gap-4 px-6 py-4">
        <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-200 text-slate-600">
            <ListTodo size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{pendingCount}</p>
            <p className="text-xs text-slate-500">Pending</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-200 text-blue-700">
            <Loader2 size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{inProgressCount}</p>
            <p className="text-xs text-slate-500">In Progress</p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-200 text-green-700">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{completedCount}</p>
            <p className="text-xs text-slate-500">Completed</p>
          </div>
        </div>
      </div>

      {/* ---- Filter Tabs ---- */}
      <div className="flex gap-1 border-b border-slate-200 px-6">
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveFilter(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeFilter === tab.id
                ? "text-primary-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
            {activeFilter === tab.id && (
              <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-primary-600" />
            )}
          </button>
        ))}
      </div>

      {/* ---- Task List ---- */}
      <div className="divide-y divide-slate-100 px-6">
        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <ListTodo size={32} className="mb-2" />
            <p className="text-sm">No tasks found</p>
          </div>
        )}

        {filteredTasks.map((task) => (
          <div
            key={task.id}
            className="group flex items-start gap-4 py-4 cursor-pointer hover:bg-slate-50 -mx-6 px-6 transition-colors"
          >
            {/* Left content */}
            <div className="flex-1 min-w-0">
              {/* Priority + Status badges */}
              <div className="mb-1.5 flex items-center gap-2">
                <Badge className={priorityStyle[task.priority]}>
                  {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                </Badge>
                <Badge className={statusStyle[task.status]}>
                  {statusLabel[task.status]}
                </Badge>
              </div>

              {/* Title */}
              <h3 className="font-semibold text-slate-800">{task.title}</h3>

              {/* Description - truncated 2 lines */}
              <p className="mt-0.5 text-sm text-slate-500 line-clamp-2">
                {task.description}
              </p>

              {/* Meta row */}
              <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Monitor size={12} className="text-slate-400" />
                  {task.affectedDevices} devices affected
                </span>
                <span className="flex items-center gap-1">
                  <User size={12} className="text-slate-400" />
                  {task.assignee}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={12} className="text-slate-400" />
                  {new Date(task.createdAt).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Right chevron */}
            <ChevronRight
              size={20}
              className="mt-4 shrink-0 text-slate-300 group-hover:text-slate-500 transition-colors"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
