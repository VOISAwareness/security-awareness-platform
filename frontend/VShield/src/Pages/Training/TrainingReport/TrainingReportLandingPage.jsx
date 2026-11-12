import { useState, useMemo, useEffect, useCallback } from "react";
import {
  Clock,
  AlertTriangle,
  Play,
  Search,
  TrendingUp,
  UserCheck,
  Download,
  ChevronLeft,
  ChevronRight,
  X,
  Users,
  BarChart3,
  RotateCcw
} from "lucide-react";

import { api } from "../../../services/api";
import { dayText, legacyAllocation } from "../../../services/myTraining";
import { INK, themeVars, num } from "../../Insights/insightsUi";
import { TargetBar } from "../../Insights/InsightsTargets";

// Everyone's training assignments, from the backend (GET /training/assignments),
// in the shape the report reads, with each person's name and department.
const useAllAssignments = () => {
  const [state, setState] = useState({ trainings: [], loading: true, error: null });
  useEffect(() => {
    let active = true;
    api.myTraining
      .assignments()
      .then((rows) => {
        if (!active) return;
        const trainings = (Array.isArray(rows) ? rows : []).map((a) => ({
          ...legacyAllocation(a),
          fullName: a.UserName || "",
          department: a.department || "",
          completedOn: dayText(a.completedAt),
        }));
        setState({ trainings, loading: false, error: null });
      })
      .catch((error) => {
        console.error("Could not load training assignments", error);
        if (active) setState({ trainings: [], loading: false, error });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
};

// Sleek proportional bar for non-target KPIs
function ProportionBar({ value, total, color, bg }) {
  const pct = total > 0 ? Math.min(100, Math.max(0, (value / total) * 100)) : 0;
  return (
    <span
      aria-hidden
      style={{
        position: "relative",
        display: "block",
        width: "100%",
        height: 10,
        borderRadius: 999,
        overflow: "hidden",
        background: bg || "var(--tick)"
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: 0,
          width: `${pct}%`,
          background: color,
          borderRadius: "0 999px 999px 0",
          transition: "width 0.4s cubic-bezier(0.22, 1, 0.36, 1)"
        }}
      />
    </span>
  );
}

const LearningProgress = ({ isDark }) => {
  const { trainings: assignmentRows, loading: assignmentsLoading, error: assignmentsError } = useAllAssignments();
  const myTrainingData = useMemo(() => ({ trainings: assignmentRows }), [assignmentRows]);

  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Insights Theme variables & inks
  const vars = useMemo(() => themeVars(isDark), [isDark]);
  const ink = isDark ? INK.dark : INK.light;

  // KPIs and metrics summary from everyone's training assignments
  const stats = useMemo(() => {
    let completed = 0;
    let ongoing = 0;
    let notStarted = 0;
    let overdue = 0;

    if (myTrainingData && myTrainingData.trainings) {
      myTrainingData.trainings.forEach((t) => {
        if (t.evalutionStatus === "passed" || t.trainingStatus === "evaluted" || t.trainingStatus === "evalutad") {
          completed += 1;
        } else if (t.evalutionStatus === "in_progress" || t.trainingStatus === "ongoing") {
          ongoing += 1;
        } else if (t.evalutionStatus === "failed" || t.trainingStatus === "failed") {
          overdue += 1;
        } else {
          notStarted += 1;
        }
      });
    }

    const total = completed + ongoing + notStarted + overdue;
    const numericRate = total > 0 ? (completed / total) * 100 : 0;
    const rate = numericRate.toFixed(1);

    return {
      rate: `${rate}%`,
      numericRate,
      total,
      completed,
      ongoing,
      notStarted,
      overdue
    };
  }, [myTrainingData]);

  // Transform raw records with status tag
  const rawRecords = useMemo(() => {
    if (myTrainingData && myTrainingData.trainings) {
      return myTrainingData.trainings.map((t) => {
        const email = String(t.userEmailId || "").toLowerCase().trim();
        const name =
          t.fullName ||
          email
            .split("@")[0]
            .split(".")
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");

        const isCompleted =
          t.evalutionStatus === "passed" || t.trainingStatus === "evaluted" || t.trainingStatus === "evalutad";
        const isOngoing = t.evalutionStatus === "in_progress" || t.trainingStatus === "ongoing";
        const isOverdue = t.evalutionStatus === "failed" || t.trainingStatus === "failed";

        const status = isCompleted
          ? "Completed"
          : isOngoing
          ? "In Progress"
          : isOverdue
          ? "Overdue"
          : "Not Started";

        // Progress through the path: passed 100; failed, quiz score; in_progress, 50; not started, 0
        const pct = isCompleted
          ? 100
          : isOverdue
          ? Math.min(99, parseInt(t.currentScore) || 0)
          : isOngoing
          ? 50
          : 0;

        return {
          fullName: name,
          email: t.userEmailId || "",
          department: t.department || "—",
          startDate: t.assignedDate || "—",
          completionDate: isCompleted ? t.completedOn || "—" : "—",
          completionPercentage: pct,
          status,
          enrollments: t.attemptCount || 1
        };
      });
    }
    return [];
  }, [myTrainingData]);

  // Department aggregate statistics
  const departmentStats = useMemo(() => {
    const map = {};
    rawRecords.forEach((r) => {
      const dept = r.department || "Unassigned";
      if (!map[dept]) {
        map[dept] = { name: dept, total: 0, completed: 0, ongoing: 0, overdue: 0, notStarted: 0 };
      }
      map[dept].total += 1;
      if (r.status === "Completed") map[dept].completed += 1;
      else if (r.status === "In Progress") map[dept].ongoing += 1;
      else if (r.status === "Overdue") map[dept].overdue += 1;
      else map[dept].notStarted += 1;
    });

    return Object.values(map)
      .map((d) => ({
        ...d,
        completionRate: d.total > 0 ? Math.round((d.completed / d.total) * 100) : 0
      }))
      .filter((d) => d.name !== "—")
      .sort((a, b) => b.total - a.total);
  }, [rawRecords]);

  // Departments list for dropdown filter
  const departments = useMemo(
    () => ["All", ...[...new Set(rawRecords.map((r) => r.department).filter((d) => d && d !== "—"))].sort()],
    [rawRecords]
  );

  // Filter records
  const filteredRecords = useMemo(() => {
    return rawRecords.filter((r) => {
      const query = searchTerm.trim().toLowerCase();
      const matchSearch =
        !query ||
        r.fullName.toLowerCase().includes(query) ||
        r.department.toLowerCase().includes(query) ||
        r.email.toLowerCase().includes(query);

      const matchDept = deptFilter === "All" || r.department.toLowerCase() === deptFilter.toLowerCase();

      let matchStatus = true;
      if (statusFilter === "Completed") matchStatus = r.status === "Completed";
      else if (statusFilter === "In Progress") matchStatus = r.status === "In Progress";
      else if (statusFilter === "Not Started") matchStatus = r.status === "Not Started";
      else if (statusFilter === "Overdue") matchStatus = r.status === "Overdue";

      return matchSearch && matchDept && matchStatus;
    });
  }, [rawRecords, searchTerm, deptFilter, statusFilter]);

  // Paginated records
  const totalPages = pageSize === "All" ? 1 : Math.ceil(filteredRecords.length / pageSize) || 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const displayedRecords = useMemo(() => {
    if (pageSize === "All") return filteredRecords;
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, currentPage, pageSize]);

  // KPI card selection handler (toggle status filter)
  const handleKpiClick = useCallback((targetStatus) => {
    setStatusFilter((prev) => (prev === targetStatus ? "All" : targetStatus));
    setPage(1);
  }, []);

  // CSV Export
  const handleExportCsv = useCallback(() => {
    const headers = ["Full Name", "Email", "Department", "Start Date", "Completion Date", "Progress", "Status", "Enrollments"];
    const rows = filteredRecords.map((r) => [
      `"${r.fullName.replace(/"/g, '""')}"`,
      `"${r.email.replace(/"/g, '""')}"`,
      `"${r.department.replace(/"/g, '""')}"`,
      `"${r.startDate}"`,
      `"${r.completionDate}"`,
      `"${r.completionPercentage}%"`,
      `"${r.status}"`,
      r.enrollments
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `training-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredRecords]);

  // Reset all filters
  const handleResetFilters = useCallback(() => {
    setSearchTerm("");
    setDeptFilter("All");
    setStatusFilter("All");
    setPage(1);
  }, []);

  const hasActiveFilters = searchTerm !== "" || deptFilter !== "All" || statusFilter !== "All";

  // Share calculation helpers
  const shareOf = (val) => (stats.total > 0 ? Math.round((val / stats.total) * 100) : 0);

  return (
    <div
      style={{ ...vars }}
      className="w-full select-none font-sans flex flex-col gap-5 text-left transition-colors duration-200 pb-12"
    >
      {/* ── TOP SCOPE BAR (Insights Header Style) ── */}
      <div
        className="w-full rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border shadow-xs"
        style={{
          background: "var(--sheet)",
          borderColor: "var(--sheet-edge)",
          color: "var(--text)"
        }}
      >
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base sm:text-lg font-bold tracking-tight" style={{ color: "var(--text)" }}>
            Learning Progress & Analytics Dashboard
          </h2>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          <div
            className="flex items-center gap-2 px-3 py-1 rounded-lg border text-xs font-semibold"
            style={{
              background: "var(--plate)",
              borderColor: "var(--card-edge)",
              color: "var(--muted)"
            }}
          >
            <Users className="w-3.5 h-3.5" style={{ color: ink.measure }} />
            <span>
              <strong style={{ color: "var(--text)" }}>{num(rawRecords.length)}</strong> learners
            </span>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="h-8 px-3.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs hover:brightness-105 active:scale-98 text-white"
            style={{
              background: "var(--brand-fill)"
            }}
            title="Download CSV export of active records"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ── 5 TARGET KPI TILES (Insights TargetKpi Style) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* KPI 1: Completion Rate */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleKpiClick("Completed")}
          className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[118px] transition-all cursor-pointer select-none group ${
            statusFilter === "Completed" ? "ring-2 ring-violet-500/50" : ""
          }`}
          style={{
            background: "var(--plate)",
            borderColor: statusFilter === "Completed" ? ink.brand : "var(--card-edge)",
            color: "var(--text)",
            boxShadow: "var(--l-shadow)"
          }}
        >
          <div className="flex items-center justify-between w-full">
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted)"
              }}
            >
              Completion Rate
            </span>
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{
                background: isDark ? "rgba(139,92,246,0.18)" : "rgba(139,92,246,0.12)",
                color: "#8B5CF6"
              }}
            >
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-1.5">
            <span
              className="text-2xl sm:text-[28px] font-black font-voda-exb leading-none tracking-tight tabular-nums"
              style={{ color: "var(--text)" }}
            >
              {stats.rate}
            </span>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <TargetBar
              value={stats.numericRate}
              target={{ target: 85, max: 100, better: "up" }}
              ink={ink}
            />
            <div className="flex items-center justify-between text-[10px] font-semibold mt-0.5">
              <span style={{ color: "var(--muted)" }}>Target 85%</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Total Completed */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleKpiClick("Completed")}
          className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[118px] transition-all cursor-pointer select-none group ${
            statusFilter === "Completed" ? "ring-2 ring-emerald-500/50" : ""
          }`}
          style={{
            background: "var(--plate)",
            borderColor: statusFilter === "Completed" ? ink.good : "var(--card-edge)",
            color: "var(--text)",
            boxShadow: "var(--l-shadow)"
          }}
        >
          <div className="flex items-center justify-between w-full">
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted)"
              }}
            >
              Total Completed
            </span>
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{
                background: isDark ? "rgba(0,139,95,0.18)" : "rgba(58,175,118,0.12)",
                color: ink.good
              }}
            >
              <UserCheck className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-1.5">
            <span
              className="text-2xl sm:text-[28px] font-black font-voda-exb leading-none tracking-tight tabular-nums"
              style={{ color: "var(--text)" }}
            >
              {num(stats.completed)}
            </span>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <ProportionBar value={stats.completed} total={stats.total} color={ink.good} />
            <div className="flex items-center justify-between text-[10px] font-semibold mt-0.5">
              <span style={{ color: "var(--muted)" }}>{shareOf(stats.completed)}% of all</span>
              <span style={{ color: ink.good, fontWeight: 700 }}>Verified</span>
            </div>
          </div>
        </div>

        {/* KPI 3: In Progress */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleKpiClick("In Progress")}
          className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[118px] transition-all cursor-pointer select-none group ${
            statusFilter === "In Progress" ? "ring-2 ring-blue-500/50" : ""
          }`}
          style={{
            background: "var(--plate)",
            borderColor: statusFilter === "In Progress" ? "#3B82F6" : "var(--card-edge)",
            color: "var(--text)",
            boxShadow: "var(--l-shadow)"
          }}
        >
          <div className="flex items-center justify-between w-full">
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted)"
              }}
            >
              In Progress
            </span>
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{
                background: isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.12)",
                color: "#3B82F6"
              }}
            >
              <Clock className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-1.5">
            <span
              className="text-2xl sm:text-[28px] font-black font-voda-exb leading-none tracking-tight tabular-nums"
              style={{ color: "var(--text)" }}
            >
              {num(stats.ongoing)}
            </span>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <ProportionBar value={stats.ongoing} total={stats.total} color="#3B82F6" />
            <div className="flex items-center justify-between text-[10px] font-semibold mt-0.5">
              <span style={{ color: "var(--muted)" }}>{shareOf(stats.ongoing)}% of all</span>
              <span style={{ color: "#3B82F6", fontWeight: 700 }}>Active</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Not Started */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleKpiClick("Not Started")}
          className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[118px] transition-all cursor-pointer select-none group ${
            statusFilter === "Not Started" ? "ring-2 ring-amber-500/50" : ""
          }`}
          style={{
            background: "var(--plate)",
            borderColor: statusFilter === "Not Started" ? ink.caution : "var(--card-edge)",
            color: "var(--text)",
            boxShadow: "var(--l-shadow)"
          }}
        >
          <div className="flex items-center justify-between w-full">
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted)"
              }}
            >
              Not Started
            </span>
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{
                background: isDark ? "rgba(201,131,1,0.18)" : "rgba(232,163,40,0.12)",
                color: ink.caution
              }}
            >
              <Play className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-1.5">
            <span
              className="text-2xl sm:text-[28px] font-black font-voda-exb leading-none tracking-tight tabular-nums"
              style={{ color: "var(--text)" }}
            >
              {num(stats.notStarted)}
            </span>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <ProportionBar value={stats.notStarted} total={stats.total} color={ink.caution} />
            <div className="flex items-center justify-between text-[10px] font-semibold mt-0.5">
              <span style={{ color: "var(--muted)" }}>{shareOf(stats.notStarted)}% of all</span>
              <span style={{ color: ink.caution, fontWeight: 700 }}>Pending</span>
            </div>
          </div>
        </div>

        {/* KPI 5: Overdue */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleKpiClick("Overdue")}
          className={`p-3.5 rounded-xl border flex flex-col justify-between min-h-[118px] transition-all cursor-pointer select-none group ${
            statusFilter === "Overdue" ? "ring-2 ring-rose-500/50" : ""
          }`}
          style={{
            background: "var(--plate)",
            borderColor: statusFilter === "Overdue" ? ink.bad : "var(--card-edge)",
            color: "var(--text)",
            boxShadow: "var(--l-shadow)"
          }}
        >
          <div className="flex items-center justify-between w-full">
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "var(--muted)"
              }}
            >
              Overdue / Failed
            </span>
            <div
              className="w-6 h-6 rounded-md flex items-center justify-center"
              style={{
                background: isDark ? "rgba(222,70,86,0.18)" : "rgba(208,64,82,0.12)",
                color: ink.bad
              }}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
            </div>
          </div>

          <div className="my-1.5">
            <span
              className="text-2xl sm:text-[28px] font-black font-voda-exb leading-none tracking-tight tabular-nums"
              style={{ color: "var(--text)" }}
            >
              {num(stats.overdue)}
            </span>
          </div>

          <div className="flex flex-col gap-1 w-full">
            <ProportionBar value={stats.overdue} total={stats.total} color={ink.bad} />
            <div className="flex items-center justify-between text-[10px] font-semibold mt-0.5">
              <span style={{ color: "var(--muted)" }}>{shareOf(stats.overdue)}% of all</span>
              <span style={{ color: ink.bad, fontWeight: 700 }}>Action needed</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── BENTO ANALYTICS ROW: DISTRIBUTION & DEPARTMENT HEALTH ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5">
        {/* Left: Overall Training Distribution Breakdown */}
        <div
          className="lg:col-span-7 p-4 rounded-xl border flex flex-col justify-between gap-3 shadow-xs"
          style={{
            background: "var(--sheet)",
            borderColor: "var(--card-edge)",
            color: "var(--text)"
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
                Progress Distribution
              </h3>
            </div>
          </div>

          {/* Segmented Progress Track */}
          <div className="w-full">
            <div
              className="w-full h-3.5 rounded-full overflow-hidden flex"
              style={{ background: "var(--track)" }}
            >
              {stats.total > 0 && (
                <>
                  <div
                    title={`Completed: ${num(stats.completed)} (${shareOf(stats.completed)}%)`}
                    style={{
                      width: `${(stats.completed / stats.total) * 100}%`,
                      background: ink.good
                    }}
                    className="h-full transition-all duration-300"
                  />
                  <div
                    title={`In Progress: ${num(stats.ongoing)} (${shareOf(stats.ongoing)}%)`}
                    style={{
                      width: `${(stats.ongoing / stats.total) * 100}%`,
                      background: "#3B82F6"
                    }}
                    className="h-full transition-all duration-300"
                  />
                  <div
                    title={`Not Started: ${num(stats.notStarted)} (${shareOf(stats.notStarted)}%)`}
                    style={{
                      width: `${(stats.notStarted / stats.total) * 100}%`,
                      background: ink.caution
                    }}
                    className="h-full transition-all duration-300"
                  />
                  <div
                    title={`Overdue: ${num(stats.overdue)} (${shareOf(stats.overdue)}%)`}
                    style={{
                      width: `${(stats.overdue / stats.total) * 100}%`,
                      background: ink.bad
                    }}
                    className="h-full transition-all duration-300"
                  />
                </>
              )}
            </div>
          </div>

          {/* Legend / Interactive filter tags */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 border-t" style={{ borderColor: "var(--hair)" }}>
            <button
              type="button"
              onClick={() => handleKpiClick("Completed")}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                statusFilter === "Completed" ? "ring-1 ring-emerald-500" : "hover:brightness-105"
              }`}
              style={{ background: "var(--plate)", borderColor: "var(--card-edge)" }}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "var(--muted)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ink.good }} />
                <span>Completed</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>
                  {num(stats.completed)}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: ink.good }}>
                  {shareOf(stats.completed)}%
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleKpiClick("In Progress")}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                statusFilter === "In Progress" ? "ring-1 ring-blue-500" : "hover:brightness-105"
              }`}
              style={{ background: "var(--plate)", borderColor: "var(--card-edge)" }}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "var(--muted)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: "#3B82F6" }} />
                <span>In Progress</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>
                  {num(stats.ongoing)}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: "#3B82F6" }}>
                  {shareOf(stats.ongoing)}%
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleKpiClick("Not Started")}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                statusFilter === "Not Started" ? "ring-1 ring-amber-500" : "hover:brightness-105"
              }`}
              style={{ background: "var(--plate)", borderColor: "var(--card-edge)" }}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "var(--muted)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ink.caution }} />
                <span>Not Started</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>
                  {num(stats.notStarted)}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: ink.caution }}>
                  {shareOf(stats.notStarted)}%
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleKpiClick("Overdue")}
              className={`p-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col gap-0.5 ${
                statusFilter === "Overdue" ? "ring-1 ring-rose-500" : "hover:brightness-105"
              }`}
              style={{ background: "var(--plate)", borderColor: "var(--card-edge)" }}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-bold" style={{ color: "var(--muted)" }}>
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: ink.bad }} />
                <span>Overdue</span>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold tabular-nums" style={{ color: "var(--text)" }}>
                  {num(stats.overdue)}
                </span>
                <span className="text-[10px] font-semibold" style={{ color: ink.bad }}>
                  {shareOf(stats.overdue)}%
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Right: Top Departments Progress (Insights Department style) */}
        <div
          className="lg:col-span-5 p-4 rounded-xl border flex flex-col justify-between gap-2.5 shadow-xs"
          style={{
            background: "var(--sheet)",
            borderColor: "var(--card-edge)",
            color: "var(--text)"
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
                Department Completion
              </h3>
            </div>
            {deptFilter !== "All" && (
              <button
                type="button"
                onClick={() => {
                  setDeptFilter("All");
                  setPage(1);
                }}
                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 text-rose-500 hover:underline cursor-pointer"
              >
                Clear filter <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>

          <div className="flex flex-col gap-2 max-h-[135px] overflow-y-auto pr-1 custom-light-scrollbar">
            {departmentStats.length === 0 ? (
              <span className="text-xs text-slate-400 py-3 text-center">No department metrics available</span>
            ) : (
              departmentStats.slice(0, 5).map((dept) => {
                const isSelected = deptFilter.toLowerCase() === dept.name.toLowerCase();
                const rateColor =
                  dept.completionRate >= 85 ? ink.good : dept.completionRate >= 60 ? ink.caution : ink.bad;

                return (
                  <button
                    key={dept.name}
                    type="button"
                    onClick={() => {
                      setDeptFilter((prev) => (prev.toLowerCase() === dept.name.toLowerCase() ? "All" : dept.name));
                      setPage(1);
                    }}
                    className={`w-full p-2 rounded-lg border flex items-center justify-between gap-3 text-left transition-all cursor-pointer ${
                      isSelected ? "ring-1 ring-violet-500 bg-violet-500/10" : "hover:brightness-105"
                    }`}
                    style={{
                      background: isSelected ? undefined : "var(--plate)",
                      borderColor: isSelected ? ink.brand : "var(--card-edge)"
                    }}
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold truncate" style={{ color: "var(--text)" }}>
                          {dept.name}
                        </span>
                        <span className="text-[11px] font-bold tabular-nums" style={{ color: rateColor }}>
                          {dept.completionRate}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full overflow-hidden mt-1" style={{ background: "var(--tick)" }}>
                        <div
                          style={{ width: `${dept.completionRate}%`, background: rateColor }}
                          className="h-full rounded-full transition-all duration-300"
                        />
                      </div>
                    </div>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded-md flex-shrink-0"
                      style={{ background: "var(--card-edge)", color: "var(--muted)" }}
                    >
                      {dept.total} users
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── FILTER & SEARCH TOOLBAR ── */}
      <div
        className="w-full p-3.5 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-xs"
        style={{
          background: "var(--sheet)",
          borderColor: "var(--sheet-edge)",
          color: "var(--text)"
        }}
      >
        {/* Search Input */}
        <div
          className="flex items-center h-9 rounded-lg border px-3 gap-2 flex-1 max-w-md transition-colors"
          style={{
            background: "var(--plate)",
            borderColor: "var(--card-edge)"
          }}
        >
          <Search className="w-4 h-4 flex-shrink-0" style={{ color: "var(--muted)" }} />
          <input
            type="text"
            placeholder="Search learner name, email, department..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
            className="flex-1 min-w-0 text-xs font-semibold bg-transparent outline-none"
            style={{ color: "var(--text)" }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setPage(1);
              }}
              className="p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 text-slate-400"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2.5 flex-wrap justify-between md:justify-end">
          {/* Department Select */}
          <div className="flex items-center gap-1.5">
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--muted)"
              }}
            >
              Dept:
            </span>
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 rounded-lg text-xs font-bold border cursor-pointer outline-none transition-colors"
              style={{
                background: "var(--plate)",
                borderColor: "var(--card-edge)",
                color: "var(--text)"
              }}
            >
              {departments.map((d) => (
                <option key={d} value={d} className={isDark ? "bg-[#141824] text-white" : "bg-white text-slate-900"}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Status Select Pills */}
          <div className="flex items-center gap-1.5">
            <span
              style={{
                fontSize: "10px",
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                color: "var(--muted)"
              }}
            >
              Status:
            </span>
            <div
              className="inline-flex gap-1 p-1 rounded-lg border"
              style={{ background: "var(--track)", borderColor: "var(--card-edge)" }}
            >
              {["All", "Completed", "In Progress", "Not Started", "Overdue"].map((st) => {
                const active = statusFilter === st;
                return (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setStatusFilter(st);
                      setPage(1);
                    }}
                    className="h-6 px-2.5 rounded-md text-[11px] font-bold transition-all cursor-pointer"
                    style={{
                      background: active ? "var(--base)" : "transparent",
                      color: active ? "var(--text)" : "var(--muted)",
                      boxShadow: active ? "0 1px 3px rgba(0,0,0,0.12)" : "none"
                    }}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-8 px-2.5 rounded-lg text-xs font-bold border flex items-center gap-1 text-rose-500 hover:bg-rose-500/10 cursor-pointer transition-colors"
              style={{ borderColor: "rgba(222,70,86,0.3)" }}
              title="Reset all active filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* ── LEARNING PROGRESS DETAILS DIRECTORY (Table) ── */}
      <div
        className="w-full rounded-2xl border overflow-hidden shadow-xs flex flex-col"
        style={{
          background: "var(--sheet)",
          borderColor: "var(--sheet-edge)",
          color: "var(--text)"
        }}
      >
        <div
          className="px-5 py-3.5 border-b flex items-center justify-between"
          style={{ borderColor: "var(--hair)" }}
        >
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-tight" style={{ color: "var(--text)" }}>
              Detailed Progress Directory
            </h3>
          </div>

          {/* Page size picker */}
          <div className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--muted)" }}>
            <span>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(e.target.value === "All" ? "All" : Number(e.target.value));
                setPage(1);
              }}
              className="h-7 px-2 rounded-md text-xs font-bold border outline-none cursor-pointer"
              style={{
                background: "var(--plate)",
                borderColor: "var(--card-edge)",
                color: "var(--text)"
              }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value="All">All</option>
            </select>
          </div>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="w-full overflow-x-auto custom-light-scrollbar">
          <table className="w-full text-left border-collapse min-w-[760px]">
            <thead>
              <tr
                className="text-[10px] font-bold uppercase tracking-wider border-b"
                style={{
                  background: "var(--plate)",
                  borderColor: "var(--hair)",
                  color: "var(--muted)"
                }}
              >
                <th className="px-5 py-3.5">Learner</th>
                <th className="px-5 py-3.5">Department</th>
                <th className="px-5 py-3.5">Assigned Date</th>
                <th className="px-5 py-3.5">Completed Date</th>
                <th className="px-5 py-3.5">Progress & Status</th>
                <th className="px-5 py-3.5 text-center">Attempts</th>
              </tr>
            </thead>
            <tbody className="divide-y text-xs font-semibold" style={{ borderColor: "var(--hair)" }}>
              {displayedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center" style={{ color: "var(--muted)" }}>
                    <div className="flex flex-col items-center justify-center gap-2">
                      <BarChart3 className="w-8 h-8 opacity-30" />
                      <span className="font-bold text-sm">
                        {assignmentsLoading
                          ? "Loading training assignments from server…"
                          : assignmentsError
                          ? "Could not load training assignments. Check network or server connection."
                          : "No learning records matching the active filters."}
                      </span>
                      {hasActiveFilters && (
                        <button
                          type="button"
                          onClick={handleResetFilters}
                          className="mt-1 text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                        >
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                displayedRecords.map((r, idx) => {
                  const statusConfig = {
                    Completed: {
                      color: ink.good,
                      bg: isDark ? "rgba(0,139,95,0.18)" : "rgba(58,175,118,0.12)",
                      border: isDark ? "rgba(0,139,95,0.3)" : "rgba(58,175,118,0.25)"
                    },
                    "In Progress": {
                      color: "#3B82F6",
                      bg: isDark ? "rgba(59,130,246,0.18)" : "rgba(59,130,246,0.12)",
                      border: isDark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.25)"
                    },
                    "Not Started": {
                      color: "var(--muted)",
                      bg: "var(--plate)",
                      border: "var(--card-edge)"
                    },
                    Overdue: {
                      color: ink.bad,
                      bg: isDark ? "rgba(222,70,86,0.18)" : "rgba(208,64,82,0.12)",
                      border: isDark ? "rgba(222,70,86,0.3)" : "rgba(208,64,82,0.25)"
                    }
                  }[r.status] || { color: "var(--muted)", bg: "var(--plate)", border: "var(--card-edge)" };

                  return (
                    <tr
                      key={idx}
                      className="transition-colors"
                      style={{
                        backgroundColor: "transparent"
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = "var(--plate)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      {/* Full Name & Avatar */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-extrabold text-[10px] shadow-xs flex-shrink-0"
                            style={{
                              background: "linear-gradient(135deg, #E60000 0%, #8B5CF6 100%)"
                            }}
                          >
                            {r.fullName.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold truncate" style={{ color: "var(--text)" }}>
                              {r.fullName}
                            </span>
                            {r.email && (
                              <span className="text-[10px] truncate" style={{ color: "var(--muted)" }}>
                                {r.email}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Department */}
                      <td className="px-5 py-3.5">
                        <span
                          className="px-2 py-0.5 rounded-md text-[11px] font-semibold"
                          style={{
                            background: "var(--plate)",
                            color: "var(--muted)"
                          }}
                        >
                          {r.department}
                        </span>
                      </td>

                      {/* Start Date */}
                      <td className="px-5 py-3.5 font-mono-tech text-[11px]" style={{ color: "var(--muted)" }}>
                        {r.startDate}
                      </td>

                      {/* Completion Date */}
                      <td className="px-5 py-3.5 font-mono-tech text-[11px]" style={{ color: "var(--muted)" }}>
                        {r.completionDate}
                      </td>

                      {/* Completion Percentage & Status Tag */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-20 h-1.5 rounded-full overflow-hidden flex-shrink-0"
                            style={{ background: "var(--tick)" }}
                          >
                            <div
                              style={{
                                width: `${r.completionPercentage}%`,
                                background: statusConfig.color
                              }}
                              className="h-full rounded-full transition-all duration-300"
                            />
                          </div>

                          <span
                            className="text-[11px] font-bold font-mono-tech tabular-nums min-w-[36px]"
                            style={{ color: statusConfig.color }}
                          >
                            {r.completionPercentage}%
                          </span>

                          <span
                            className="px-2 py-0.5 rounded-md text-[10px] font-bold border"
                            style={{
                              background: statusConfig.bg,
                              borderColor: statusConfig.border,
                              color: statusConfig.color
                            }}
                          >
                            {r.status}
                          </span>
                        </div>
                      </td>

                      {/* Enrollments count */}
                      <td className="px-5 py-3.5 text-center font-mono-tech">
                        <span
                          className="px-2 py-0.5 rounded-full text-[11px] font-bold"
                          style={{ background: "var(--plate)", color: "var(--text)" }}
                        >
                          {r.enrollments}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION CONTROLS ── */}
        {pageSize !== "All" && totalPages > 1 && (
          <div
            className="px-5 py-3 border-t flex items-center justify-between text-xs font-semibold"
            style={{
              borderColor: "var(--hair)",
              background: "var(--plate)",
              color: "var(--muted)"
            }}
          >
            <span>
              Showing {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, filteredRecords.length)} of {filteredRecords.length} records
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-7 px-2.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--base)",
                  borderColor: "var(--card-edge)",
                  color: "var(--text)"
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Previous
              </button>

              <span className="px-2 font-bold tabular-nums" style={{ color: "var(--text)" }}>
                {currentPage} / {totalPages}
              </span>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="h-7 px-2.5 rounded-md border flex items-center gap-1 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background: "var(--base)",
                  borderColor: "var(--card-edge)",
                  color: "var(--text)"
                }}
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LearningProgress;
