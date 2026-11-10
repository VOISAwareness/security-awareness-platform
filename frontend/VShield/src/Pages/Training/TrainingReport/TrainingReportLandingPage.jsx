import { useState, useMemo, useEffect } from "react";
import {
  Clock,
  AlertTriangle,
  Play,
  Search,
  TrendingUp,
  UserCheck
} from 'lucide-react';

import { api } from '../../../services/api';
import { dayText, legacyAllocation } from '../../../services/myTraining';

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
          fullName: a.UserName || '',
          department: a.department || '',
          completedOn: dayText(a.completedAt),
        }));
        setState({ trainings, loading: false, error: null });
      })
      .catch((error) => {
        console.error('Could not load training assignments', error);
        if (active) setState({ trainings: [], loading: false, error });
      });
    return () => {
      active = false;
    };
  }, []);
  return state;
};

const LearningProgress = ({ isDark }) => {
  const { trainings: assignmentRows, loading: assignmentsLoading, error: assignmentsError } = useAllAssignments();
  const myTrainingData = useMemo(() => ({ trainings: assignmentRows }), [assignmentRows]);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // KPIs and the directory, from everyone's training assignments
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
    const rate = total > 0 ? ((completed / total) * 100).toFixed(2) : "0.00";

    return {
      rate: `${rate}%`,
      completed,
      ongoing,
      notStarted,
      overdue
    };
  }, [myTrainingData]);

  const kpis = [
    {
      title: 'Completion Rate',
      value: stats.rate,
      sub: 'AIDA Target: 85%',
      icon: TrendingUp,
      color: 'text-violet-500 bg-violet-500/10 border-violet-500/20'
    },
    {
      title: 'Total Completed',
      value: String(stats.completed),
      sub: 'Verified Certifications',
      icon: UserCheck,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'Total In Progress',
      value: String(stats.ongoing),
      sub: 'Active Learning Sessions',
      icon: Clock,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20'
    },
    {
      title: 'Total Not Started',
      value: String(stats.notStarted),
      sub: 'Awaiting Initiation',
      icon: Play,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    },
    {
      title: 'Total Overdue',
      value: String(stats.overdue),
      sub: 'Requires Immediate Action',
      icon: AlertTriangle,
      color: 'text-rose-500 bg-rose-500/10 border-rose-500/20 animate-pulse'
    }
  ];

  const rawRecords = useMemo(() => {
    if (myTrainingData && myTrainingData.trainings) {
      return myTrainingData.trainings.map((t) => {
        const email = String(t.userEmailId || '').toLowerCase().trim();
        const name = t.fullName || email.split('@')[0].split('.').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        const isCompleted = t.evalutionStatus === "passed";
        // Progress through the path: passed 100; failed, the quiz score;
        // started, half way; not started, 0.
        const pct = isCompleted
          ? 100
          : t.evalutionStatus === "failed"
            ? Math.min(99, parseInt(t.currentScore) || 0)
            : t.evalutionStatus === "in_progress"
              ? 50
              : 0;

        return {
          fullName: name,
          department: t.department || "—",
          startDate: t.assignedDate,
          completionDate: isCompleted ? (t.completedOn || "—") : "—",
          completionPercentage: pct,
          enrollments: t.attemptCount || 1
        };
      });
    }
    return [];
  }, [myTrainingData]);

  // Departments list for filtering: the departments in the data
  const departments = useMemo(
    () => ['All', ...[...new Set(rawRecords.map((r) => r.department).filter((d) => d && d !== "—"))].sort()],
    [rawRecords]
  );

  // Filter records
  const filteredRecords = useMemo(() => {
    return rawRecords.filter(r => {
      const matchSearch = r.fullName.toLowerCase().includes(searchTerm.trim().toLowerCase()) ||
        r.department.toLowerCase().includes(searchTerm.trim().toLowerCase());

      const matchDept = deptFilter === 'All' || r.department.toLowerCase().includes(deptFilter.toLowerCase());

      let matchStatus = true;
      if (statusFilter === 'Completed') matchStatus = r.completionPercentage === 100;
      else if (statusFilter === 'In Progress') matchStatus = r.completionPercentage > 0 && r.completionPercentage < 100;
      else if (statusFilter === 'Not Started') matchStatus = r.completionPercentage === 0;

      return matchSearch && matchDept && matchStatus;
    });
  }, [rawRecords, searchTerm, deptFilter, statusFilter]);

  return (
    <div className="w-full select-none font-sans flex flex-col gap-6 text-left">

      {/* ── 5 KPI CARDS ROW ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const IconComponent = kpi.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-2xl border flex flex-col justify-between h-[115px] transition-all duration-300 hover:scale-[1.02] shadow-xs select-none ${
                isDark
                  ? 'bg-[#1C1E24] border-white/10 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-800'
              }`}
            >
              <div className="flex items-start justify-between w-full">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  {kpi.title}
                </span>
                <div className={`p-1.5 rounded-lg border ${kpi.color}`}>
                  <IconComponent className="w-4 h-4" />
                </div>
              </div>

              <div className="flex flex-col mt-2">
                <span className="text-2xl font-black font-voda-exb leading-none tracking-tight">
                  {kpi.value}
                </span>
                <span className="text-[9px] font-medium text-slate-500 dark:text-slate-400 mt-1">
                  {kpi.sub}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
        {/* Search Input */}
        <div className={`flex items-center h-[38px] rounded-xl border shadow-xs transition-colors px-3 gap-2 w-full sm:w-80 ${
          isDark ? "bg-[#1C1E24] border-white/10" : "bg-white border-slate-200"
        }`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by student name or dept..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`flex-1 min-w-0 text-xs font-semibold bg-transparent outline-none ${
              isDark ? "text-white placeholder:text-white/30" : "text-slate-800 placeholder:text-slate-400"
            }`}
          />
        </div>

        {/* Category Dropdowns */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Dept:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className={`h-[34px] px-2.5 rounded-lg text-xs font-bold border cursor-pointer outline-none ${
                isDark ? "bg-[#1C1E24] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              {departments.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-400">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`h-[34px] px-2.5 rounded-lg text-xs font-bold border cursor-pointer outline-none ${
                isDark ? "bg-[#1C1E24] border-white/10 text-white" : "bg-white border-slate-200 text-slate-800"
              }`}
            >
              <option value="All">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="Not Started">Not Started</option>
            </select>
          </div>
        </div>
      </div>

      {/* ── LEARNING PROGRESS DETAILS TABLE ── */}
      <div className={`w-full rounded-2xl border overflow-hidden shadow-md flex flex-col ${
        isDark ? 'bg-[#1C1E24] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'
      }`}>
        <div className="px-5 py-4 border-b border-black/5 dark:border-white/5 flex items-center justify-between">
          <h3 className="text-[13px] font-voda font-bold tracking-tight uppercase">
            Detailed Progress Directory ({filteredRecords.length} Records)
          </h3>
        </div>

        {/* Responsive Table Wrapper */}
        <div className="w-full overflow-x-auto custom-light-scrollbar">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className={`text-[10px] font-extrabold uppercase tracking-wider border-b ${
                isDark ? 'bg-[#12141A]/50 border-white/5 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'
              }`}>
                <th className="px-5 py-3">Full Name</th>
                <th className="px-5 py-3">Department</th>
                <th className="px-5 py-3">Start Date</th>
                <th className="px-5 py-3">Completion Date</th>
                <th className="px-5 py-3">Completion Percentage</th>
                <th className="px-5 py-3 text-center">Enrollments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5 text-xs font-semibold text-slate-700 dark:text-slate-200">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-400 font-bold">
                    {assignmentsLoading
                      ? "Loading training records…"
                      : assignmentsError
                        ? "Couldn't load training records from the server."
                        : "No learning records matching the active filters found."}
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      isDark ? 'hover:bg-white/[0.02]' : 'hover:bg-slate-50'
                    }`}
                  >
                    {/* Full Name */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#E60000] to-[#990099] flex items-center justify-center text-white font-black text-[9px] shadow-sm flex-shrink-0">
                          {r.fullName.charAt(0)}
                        </div>
                        <span className="font-extrabold text-slate-900 dark:text-white">{r.fullName}</span>
                      </div>
                    </td>

                    {/* Department */}
                    <td className="px-5 py-4 max-w-[240px] truncate" title={r.department}>
                      {r.department}
                    </td>

                    {/* Start Date */}
                    <td className="px-5 py-4 font-mono-tech text-[11px]">
                      {r.startDate}
                    </td>

                    {/* Completion Date */}
                    <td className="px-5 py-4 font-mono-tech text-[11px]">
                      {r.completionDate}
                    </td>

                    {/* Completion Percentage */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-20 bg-slate-200 dark:bg-white/10 h-1.5 rounded-full overflow-hidden flex-shrink-0">
                          <div
                            style={{ width: `${r.completionPercentage}%` }}
                            className={`h-full rounded-full ${
                              r.completionPercentage === 100
                                ? 'bg-emerald-500'
                                : r.completionPercentage > 0
                                ? 'bg-blue-500'
                                : 'bg-slate-400'
                            }`}
                          />
                        </div>
                        <span className={`text-[11px] font-black font-mono-tech ${
                          r.completionPercentage === 100
                            ? 'text-emerald-500 dark:text-emerald-400'
                            : r.completionPercentage > 0
                            ? 'text-blue-500 dark:text-blue-400'
                            : 'text-slate-400'
                        }`}>
                          {r.completionPercentage}% Complete
                        </span>
                      </div>
                    </td>

                    {/* Enrollments count */}
                    <td className="px-5 py-4 text-center font-mono-tech">
                      {r.enrollments}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default LearningProgress;
