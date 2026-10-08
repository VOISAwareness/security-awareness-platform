import React from "react";

import {
  ResponsiveContainer,
  FunnelChart,
  Funnel,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import dashboardData from './dashboardData.json';

const {
  trainingKpiCards: TRAINING_KPI_CARDS,
  funnelData: FUNNEL_DATA,
  evaluationData: EVALUATION_DATA,
  departmentData: DEPARTMENT_DATA,
  leaderboardData: LEADERBOARD_DATA,
  trainingPrograms: TRAINING_PROGRAMS,

} = dashboardData;

// ============================================================
// CHART TOOLTIP
// ============================================================

const EvaluationTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div
      className={`rounded-lg border px-3 py-2 shadow-lg ${
        isDark
          ? "border-white/10 bg-[#202127] text-white"
          : "border-slate-200 bg-white text-slate-800"
      }`}
    >
      <p className="mb-1 text-[9px] font-bold">{label}</p>

      {payload.map((item) => (
        <div
          key={item.dataKey}
          className="flex items-center justify-between gap-5 text-[8px]"
        >
          <span>{item.name}</span>

          <span className="font-bold">
            {item.value}%
          </span>
        </div>
      ))}
    </div>
  );
};

// ============================================================
// DASHBOARD FILTER
// ============================================================

const DashboardFilter = ({
  children,
  isDark,
  className = "",
}) => {
    const backColorDarkMode = 'bg-[#1C1E24]';
  const backColorLightMode = 'bg-white';
  return (
    <div className={`relative ${className}`}>
      <select
        defaultValue={children}
        className={`
          h-[28px]
          w-full
          appearance-none
          rounded-[4px]
          border
          px-2.5
          pr-7
          text-[8px]
          font-medium
          outline-none
          transition

          ${
            isDark
              ? "border-white/10 bg-[#1C1E24] text-slate-200"
              : "border-[#D7DEE9] bg-white text-[#475569]"
          }
        `}
      >
        <option>{children}</option>

        {children === "Monthly" && (
          <>
            <option>Quarterly</option>
            <option>Half-Yearly</option>
            <option>Yearly</option>
          </>
        )}

        {children === "All Departments" && (
          <>
            <option>Finance</option>
            <option>Technology</option>
            <option>Human Resources</option>
            <option>Operations</option>
            <option>Sales & Marketing</option>
            <option>Legal</option>
          </>
        )}

        {children === "All Countries" && (
          <>
            <option>India</option>
            <option>USA</option>
            <option>UK</option>
            <option>Germany</option>
          </>
        )}

        {children === "All Trainings" && (
          <>
            <option>Phishing Awareness</option>
            <option>Password Security</option>
            <option>Data Privacy</option>
            <option>Social Engineering</option>
          </>
        )}
      </select>

      <span
        className={`
          pointer-events-none
          absolute
          right-2
          top-1/2
          -translate-y-1/2
          text-[7px]

          ${
            isDark
              ? "text-slate-400"
              : "text-slate-500"
          }
        `}
      >
        ▾
      </span>
    </div>
  );
};

// ============================================================
// KPI CARD
// ============================================================

const KpiCard = ({ item, isDark }) => {
    const backColorDarkMode = 'bg-[#1C1E24]';
  const backColorLightMode = 'bg-white';
  return (
    

    <div
             className={`
                relative
                border
                rounded-2xl
                h-[60px]
                px-2.5
                py-2
                shadow-sm
                overflow-hidden
                ${
                isDark
                  ? `${backColorDarkMode}/80 border-white/0`
                  : `${backColorLightMode} border-slate-200/0`
              }
              `}
            >

              {/* COLOR CIRCLE */}

              <div
                className="
                  absolute
                  top-[9px]
                  left-[9px]
                  w-[17px]
                  h-[17px]
                  rounded-full
                "
                style={{
                  backgroundColor: item.color,
                  opacity: 0.22,
                }}
              />


              {/* CONTENT */}

              <div className="pl-[25px]">

                <p
                  className={`
                    text-[10px]
                    font-semibold
                    truncate
                    leading-none

                    ${
                      isDark
                        ? "text-white"
                        : "text-slate-900"
                    }
                  `}
                >
                  {item.title}
                </p>


                <h3
                  className={`
                    text-[15px]
                    leading-none
                    font-voda
                    font-bold
                    mt-[5px]

                    ${
                      isDark
                        ? "text-white"
                        : "text-slate-900"
                    }
                  `}
                >
                  {item.value}
                </h3>


                <p
                  className={`
                    text-[9px]
                    font-medium
                    mt-[3px]

                    ${
                      item.growth?.includes("↓")
                        ? "text-red-500"
                        : "text-green-500"
                    }
                  `}
                >
                  {item.growth}
                </p>

              </div>

            </div>
  );
};

// ============================================================
// CARD WRAPPER
// ============================================================

const DashboardCard = ({
  title,
  subtitle,
  children,
  isDark,
  className = "",
}) => {
  return (
    <section
      className={`
        overflow-hidden
        rounded-2xl
        
        shadow-[0_1px_3px_rgba(15,23,42,0.04)]

        ${
          isDark
        ? "border-white/5 bg-[#1C1E24]"
        : "border-slate-200 bg-white"
        }

        ${className}
      `}
    >
      <div className="p-2">
        <h2
          className={`
            text-[12px]
            font-bold
            leading-tight

            ${
              isDark
                ? "text-white"
                : "text-[#172033]"
            }
          `}
        >
          {title}
        </h2>

        {subtitle && (
          <p
            className={`
              mt-[2px]
              text-[9px]
              leading-tight
                font-semibold
              ${
                isDark
                  ? "text-slate-500"
                  : "text-[#8993A4]"
              }
            `}
          >
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </section>
  );
};

// ============================================================
// ASSIGNMENT FUNNEL
// ============================================================

const AssignmentStatusFunnel = ({ isDark }) => {
  return (
    <DashboardCard
      title="Assignment Status Funnel"
      subtitle="Training lifecycle"
      isDark={isDark}
      className="h-[190px]"
    >
      <div className="mt-1 flex h-[100px] items-center px-3">

        {/* LEFT LABELS */}
        <div className="flex h-[108px] w-[58px] flex-col justify-between">
          {FUNNEL_DATA.map((item) => (
            <span
              key={item.name}
              className={`
                text-[9px]
                font-semibold
                ${
                  isDark
                    ? "text-slate-300"
                    : "text-[#475569]"
                }
              `}
            >
              {item.name}
            </span>
          ))}
        </div>

        {/* CENTER FUNNEL */}
        <div className="h-[125px] flex-1 flex justify-center">
          <ResponsiveContainer
            width="50%"
            height="100%"
          >
            <FunnelChart>
              <Funnel
                dataKey="value"
                data={FUNNEL_DATA}
                isAnimationActive={false}
                stroke="none"
                width={145}
              >
                {FUNNEL_DATA.map((item, index) => (
                  <Cell
                    key={`funnel-${index}`}
                    fill={item.color}
                  />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </div>

        {/* VALUES */}
        <div className="flex h-[108px] w-[43px] flex-col justify-between text-right">
          {FUNNEL_DATA.map((item) => (
            <div key={item.name}>
              <p
                className={`
                  text-[9px]
                  font-bold
                  ${
                    isDark
                      ? "text-white"
                      : "text-[#172033]"
                  }
                `}
              >
                {item.value.toLocaleString()}
              </p>

              <p
                className={`
                  text-[9px]
                  ${
                    isDark
                      ? "text-slate-500"
                      : "text-[#7A8495]"
                  }
                `}
              >
                {item.percentage}
              </p>
            </div>
          ))}
        </div>

      </div>
    </DashboardCard>
  );
};

// ============================================================
// EVALUATION VS REPORTING CHART
// ============================================================

const EvaluationReportingChart = ({ isDark }) => {
  return (
    <DashboardCard
      title="Evaluation % vs Reporting %"
      subtitle="Last 12 months"
      isDark={isDark}
      className="h-[190px]"
    >
      <div className="h-[143px] px-2 pb-1 pt-2">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <LineChart
            data={EVALUATION_DATA}
            margin={{
              top: 8,
              right: 5,
              left: 5,
              bottom: 8,
            }}
          >
            <CartesianGrid
              vertical={false}
              horizontal={false}
              stroke={
                isDark
                  ? "#334155"
                  : "#E5EAF1"
              }
            />

            <XAxis
              dataKey="month"
              hide
            />

            <YAxis
              domain={[0, 100]}
              hide
            />

            <Tooltip
              content={
                <EvaluationTooltip
                  isDark={isDark}
                />
              }
            />

            <Line
              type="monotone"
              dataKey="evaluation"
              name="Evaluation"
              stroke="#2563EB"
              strokeWidth={1.6}
              dot={false}
              activeDot={{
                r: 3,
              }}
            />

            <Line
              type="monotone"
              dataKey="reporting"
              name="Reporting"
              stroke="#00A878"
              strokeWidth={1.6}
              dot={false}
              activeDot={{
                r: 3,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </DashboardCard>
  );
};

// ============================================================
// DEPARTMENT LEARNING PERFORMANCE
// ============================================================

const DepartmentLearningPerformance = ({
  isDark,
}) => {
  return (
    <DashboardCard
      title="Department Learning Performance"
      subtitle="Completion and average score"
      isDark={isDark}
      className="h-[195px]"
    >
      {/* LEGEND */}
      <div className="flex items-center justify-end gap-4 px-3 pt-1">
        <div className="flex items-center gap-1">
          <span className="h-[5px] w-[5px] rounded-full bg-[#2563EB]" />

          <span
            className={`
              text-[6px]

              ${
                isDark
                  ? "text-slate-400"
                  : "text-slate-500"
              }
            `}
          >
            Completion %
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="h-[5px] w-[5px] rounded-full bg-[#18B5A4]" />

          <span
            className={`
              text-[6px]

              ${
                isDark
                  ? "text-slate-400"
                  : "text-slate-500"
              }
            `}
          >
            Avg Quiz Score
          </span>
        </div>
      </div>

      <div className="space-y-3 px-3 pt-1
      max-h-[130px]
      overflow-y-auto
       
      [&::-webkit-scrollbar]:w-1.5
      [&::-webkit-scrollbar-track]:bg-transparent
      [&::-webkit-scrollbar-thumb]:bg-slate-300
      dark:[&::-webkit-scrollbar-thumb]:bg-white/10
      [&::-webkit-scrollbar-thumb]:rounded-md
      hover:[&::-webkit-scrollbar-thumb]:bg-slate-400
      ">
        {DEPARTMENT_DATA.map((item) => (
          <div
            key={item.name}
            className="grid grid-cols-[64px_minmax(0,1fr)_23px_minmax(0,1fr)_23px] items-center gap-1.5"
          >
            {/* NAME */}
            <span
              className={`
                truncate
                text-[9px]
                font-semibold

                ${
                  isDark
                    ? "text-slate-300"
                    : "text-[#475569]"
                }
              `}
            >
              {item.name}
            </span>

            {/* COMPLETION BAR */}
            <div
              className={`
                h-[9px]
                overflow-hidden
                rounded-full

                ${
                  isDark
                    ? "bg-slate-700"
                    : "bg-[#E5EAF1]"
                }
              `}
            >
              <div
                className="h-full rounded-full bg-[#2563EB]"
                style={{
                  width: `${item.completion}%`,
                }}
              />
            </div>

            <span
              className={`
                text-right
                text-[9px]
                font-semibold

                ${
                  isDark
                    ? "text-slate-300"
                    : "text-[#475569]"
                }
              `}
            >
              {item.completion}%
            </span>

            {/* QUIZ BAR */}
            <div
              className={`
                h-[9px]
                overflow-hidden
                rounded-full

                ${
                  isDark
                    ? "bg-slate-700"
                    : "bg-[#E5EAF1]"
                }
              `}
            >
              <div
                className="h-full rounded-full bg-[#18B5A4]"
                style={{
                  width: `${item.quizScore}%`,
                }}
              />
            </div>

            <span
              className={`
                text-right
                text-[9px]
                font-semibold

                ${
                  isDark
                    ? "text-slate-300"
                    : "text-[#475569]"
                }
              `}
            >
              {item.quizScore}
            </span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
};

// ============================================================
// LEADERBOARD
// ============================================================

const Leaderboard = ({ isDark }) => {
  return (
    <DashboardCard
      title="🏆  Leaderboard"
      isDark={isDark}
      className="h-[195px]"
    >
      <div className="px-2.5">

        {/* TABLE HEADER */}
        <div
          className={`
            grid
            grid-cols-[23px_1.4fr_.7fr_.8fr_.7fr_.8fr]
            items-center
            border
            px-1.5
            py-1
            text-[10px]
            font-bold

            ${
              isDark
                ? "border-white/5 bg-[#202127] text-slate-300"
                : "border-[#DCE3EC] bg-[#E8EDF5] text-[#475569]"
            }
          `}
        >
          <span>Rank</span>
          <span>User Group</span>
          <span>Avg Points</span>
          <span>Points</span>
          <span>Badges</span>
          <span>Participants</span>
        </div>

        {/* TABLE ROWS */}
        {LEADERBOARD_DATA.map((item) => (
          <div
            key={item.rank}
            className={`
              grid
              grid-cols-[23px_1.4fr_.7fr_.8fr_.7fr_.8fr]
              items-center

              border
              rounded-[2px]
              mb-1.5

              px-1.5
              py-1
              text-[8px]
              font-semibold

              ${
                isDark
                  ? "border-white/5 bg-[#1C1E24] text-slate-300"
                  : "border-[#DCE3EC] bg-white text-[#475569]"
              }
            `}
          >
            <span>
              {item.rank}
            </span>

            <span className="truncate">
              {item.group}
            </span>

            <span>
              {item.avgPoints}
            </span>

            <span>
              {item.points}
            </span>

            <span>
              {item.badges}
            </span>

            <span>
              {item.participants}
            </span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
};

// ============================================================
// STATUS BADGE
// ============================================================

const StatusBadge = ({ status }) => {
  const statusClasses = {
    Good: "bg-[#DFF7EC] text-[#25845E]",
    Average: "bg-[#FFF0D6] text-[#C48725]",
    "Needs Work": "bg-[#FFE4E4] text-[#E06464]",
  };

  return (
    <span
      className={`
        inline-flex
        min-w-[45px]
        justify-center
        rounded-[5px]
        px-1.5
        py-[4px]
        text-[7px]
        font-semibold

        ${statusClasses[status]}
      `}
    >
      {status}
    </span>
  );
};

// ============================================================
// TRAINING PROGRAM PERFORMANCE
// ============================================================

const TrainingProgramPerformance = ({
  isDark,
}) => {
  return (
    <DashboardCard
      title="Training Program Performance"
      subtitle="Completion, score and pass rate"
      isDark={isDark}
      className="h-full min-h-[377px]"
    >
      <div className="px-2.5 pb-2
       max-h-[340px]
    overflow-y-auto
    pr-1
     
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:bg-slate-300
    dark:[&::-webkit-scrollbar-thumb]:bg-white/10
    [&::-webkit-scrollbar-thumb]:rounded-md
    hover:[&::-webkit-scrollbar-thumb]:bg-slate-400
      ">

        {/* TABLE HEADER */}
        <div
          className={`
            grid
            grid-cols-[2.4fr_.65fr_.55fr_.6fr_.55fr_.7fr]
            items-center
            rounded-t-[2px]
            px-2
            py-2
            text-[10px]
            font-bold

            ${
              isDark
                ? "bg-[#202127] text-slate-300"
                : "bg-[#E7ECF4] text-[#475569]"
            }
          `}
        >
          <span>Training Program</span>
          <span>Completion</span>
          <span>Score</span>
          <span>Pass</span>
          <span>Avg Days</span>
          <span>Status</span>
        </div>

        {/* TABLE ROWS */}
        {TRAINING_PROGRAMS.map((item) => (
          <div
            key={item.program}
            className={`
              grid
              grid-cols-[2.4fr_.65fr_.55fr_.6fr_.55fr_.7fr]
              items-center

              border
              rounded-[2px]

              mb-1.5

              px-2
              py-[6px]
              text-[9px]
              font-semibold

              ${
                isDark
                  ? "border-white/5 bg-[#1C1E24] text-slate-300"
                  : "border-[#DCE3EC] bg-white text-[#475569]"
              }
            `}
          >
            <span
              className="truncate pr-1"
              title={item.program}
            >
              {item.program}
            </span>

            <span className="font-semibold text-[#2563EB]">
              {item.completion}%
            </span>

            <span>
              {item.score}
            </span>

            <span
              className={
                item.pass >= 70
                  ? "font-semibold text-[#16A66A]"
                  : "font-semibold text-[#E06464]"
              }
            >
              {item.pass}%
            </span>

            <span>
              {item.avgDays}
            </span>

            <span>
              <StatusBadge
                status={item.status}
              />
            </span>
          </div>
        ))}
      </div>
    </DashboardCard>
  );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const TrainingLearningTab = ({ isDark = false }) => {
    const backColorDarkMode = 'bg-[#1C1E24]';
  const backColorLightMode = 'bg-white';
  return (
    <div
      className={`
        space-y-3
      `}
    >
      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex justify-between items-start">
        {/* TITLE */}
        <div className="pt-0.5 min-w-[230px]">
          
        </div>

         <div className="flex gap-3">

          {/* MONTHLY */}

          <select
            className={`
              outline-none
              min-w-[155px]
              h-[30px]
              border
              rounded-lg
              px-3
              py-2
              text-[9px]

              ${
                isDark
                  ? `${backColorDarkMode} text-white border-white/10`
                  : `${backColorLightMode} text-slate-700 border-slate-200`
              }
            `}
          >
            <option>
              Monthly
            </option>
            <option value="3 Month">
              Quarterly
            </option>
            <option value="6 Month">
              Half-Yearly
            </option>
            <option value="12 Month">
              Yearly
            </option>
          </select>


          {/* DEPARTMENT */}

          <select
            className={`
              outline-none
              min-w-[155px]
              h-[30px]
              border
              rounded-lg
              px-3
              py-2
              text-[9px]

              ${
                isDark
                  ? `${backColorDarkMode} text-white border-white/10`
                  : `${backColorLightMode} text-slate-700 border-slate-200`
              }
            `}
          >
            <option>
              All Departments
            </option>
            <option value="Finance">
              Finance
            </option>
            <option value="Human Resources">
              Human Resources
            </option>
            <option value="Operations">
              Operations
            </option>
            <option value="Technology">
              Technology
            </option>
            <option value="Sales & Marketing">
              Sales & Marketing
            </option>
          </select>


          {/* COUNTRY */}

          <select
            className={`
              outline-none
              min-w-[155px]
              h-[30px]
              border
              rounded-lg
              px-3
              py-2
              text-[9px]

              ${
                isDark
                  ? `${backColorDarkMode} text-white border-white/10`
                  : `${backColorLightMode} text-slate-700 border-slate-200`
              }
            `}
          >
            <option>
              All Countries
            </option>
            <option value="India">
              India
            </option>
            <option value="USA">
              USA
            </option>
            <option value="UK">
              UK
            </option>
            <option value="Germany">
              Germany
            </option>
           
          </select>


          {/* CAMPAIGN */}

          <select
            className={`
              outline-none
              min-w-[155px]
              h-[30px]
              border
              rounded-lg
              px-3
              py-2
              text-[9px]

              ${
                isDark
                  ? `${backColorDarkMode} text-white border-white/10`
                  : `${backColorLightMode} text-slate-700 border-slate-200`
              }
            `}
          >
            <option>
              All Campaigns
            </option>
            <option value="Campain-1">
              Campain 1
            </option>
            <option value="Campain-2">
              Campain 2
            </option>
          </select>

        </div>
      </div>

      {/* ======================================================
          KPI CARDS
      ====================================================== */}

      <div
        className="
          grid
          grid-cols-2
          sm:grid-cols-4
          lg:grid-cols-7
          gap-3
        "
      >
        {TRAINING_KPI_CARDS.map((item) => (
          <KpiCard
            key={item.title}
            item={item}
            isDark={isDark}
          />
        ))}
      </div>

      {/* ======================================================
          MAIN ANALYTICS GRID
      ====================================================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-3
          lg:grid-cols-[1fr_1fr_1.2fr]
        "
      >
        {/* ====================================================
            LEFT COLUMN
        ==================================================== */}

        <div className="flex min-w-0 flex-col gap-3">
          {/* ASSIGNMENT FUNNEL */}
          <AssignmentStatusFunnel
            isDark={isDark}
          />

          {/* DEPARTMENT PERFORMANCE */}
          <DepartmentLearningPerformance
            isDark={isDark}
          />
        </div>

        {/* ====================================================
            MIDDLE COLUMN
        ==================================================== */}

        <div className="flex min-w-0 flex-col gap-3">
          {/* EVALUATION VS REPORTING */}
          <EvaluationReportingChart
            isDark={isDark}
          />

          {/* LEADERBOARD */}
          <Leaderboard
            isDark={isDark}
          />
        </div>

        {/* ====================================================
            RIGHT COLUMN
        ==================================================== */}

        <div className="min-w-0">
          <TrainingProgramPerformance
            isDark={isDark}
          />
        </div>
      </div>
    </div>
  );
};

export default TrainingLearningTab;