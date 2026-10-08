import React from 'react';
import dashboardData from './dashboardData.json';

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

// ============================================================
// DATA
// ============================================================

const {
  topRiskDepartments: TOP_RISK_DEPARTMENTS,
  highRiskUsers: HIGH_RISK_USERS,
  riskDrivers: RISK_DRIVERS,
  riskDistribution: RISK_DISTRIBUTION,
  riskScoreData: RISK_SCORE_DATA,
  clickReportData: CLICK_REPORT_DATA,
} = dashboardData;

// ============================================================
// COMMON STYLES
// ============================================================

const getChartColors = (isDark) => ({
  grid: isDark ? '#2A2D33' : '#E5E7EB',
  axis: isDark ? '#667085' : '#94A3B8',
  text: isDark ? '#CBD5E1' : '#475569',
  tooltipBg: isDark ? '#1C1E24' : '#FFFFFF',
  tooltipBorder: isDark ? '#343840' : '#DCE3EC',
});


// ============================================================
// CUSTOM TOOLTIP
// ============================================================

const ChartTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload || !payload.length) {
    return null;
  }

  const colors = getChartColors(isDark);

  return (
    <div
      className="rounded-md border px-2.5 py-2 shadow-lg"
      style={{
        backgroundColor: colors.tooltipBg,
        borderColor: colors.tooltipBorder,
      }}
    >
      <div
        className="mb-1 text-[9px] font-semibold"
        style={{ color: colors.text }}
      >
        {label}
      </div>

      {payload.map((item) => (
        <div
          key={item.dataKey}
          className="flex items-center justify-between gap-3 text-[9px]"
        >
          <div className="flex items-center gap-1.5">
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: item.color }}
            />

            <span style={{ color: colors.text }}>
              {item.name}
            </span>
          </div>

          <span
            className="font-semibold"
            style={{ color: colors.text }}
          >
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};


// ============================================================
// TREND CHART
// ============================================================

export const TrendChart = ({
  isDark,
  twoLines = false,
}) => {
  const colors = getChartColors(isDark);

  const data = twoLines
    ? CLICK_REPORT_DATA
    : RISK_SCORE_DATA;

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
    >
      <LineChart
        data={data}
        margin={{
          top: 8,
          right: 8,
          left: 0,
          bottom: 4,
        }}
      >
        <CartesianGrid
          stroke={colors.grid}
          strokeDasharray="3 5"
          vertical={false}
        />

        <XAxis
          dataKey="month"
          tick={{
            fill: colors.axis,
            fontSize: 8,
          }}
          tickLine={false}
          axisLine={{
            stroke: colors.axis,
          }}
          interval={1}
        />

        <YAxis
          domain={[0, 100]}
          tick={false}
          tickLine={false}
          axisLine={{
            stroke: colors.axis,
          }}
          width={24}
        />

        <Tooltip
          content={
            <ChartTooltip
              isDark={isDark}
            />
          }
          cursor={{
            stroke: colors.grid,
            strokeDasharray: '3 3',
          }}
        />

        {!twoLines && (
          <Line
            type="monotone"
            dataKey="score"
            name="Risk Score"
            stroke="#2563EB"
            strokeWidth={2.5}
            dot={false}
            activeDot={{
              r: 4,
              strokeWidth: 0,
            }}
          />
        )}

        {twoLines && (
          <>
            <Line
              type="monotone"
              dataKey="click"
              name="Click Rate"
              stroke="#2563EB"
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 0,
              }}
            />

            <Line
              type="monotone"
              dataKey="report"
              name="Report Rate"
              stroke="#20B486"
              strokeWidth={2.5}
              dot={false}
              activeDot={{
                r: 4,
                strokeWidth: 0,
              }}
            />
          </>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};


// ============================================================
// CLICK VS REPORT CHART
// ============================================================

export const ClickVsReportChart = ({
  isDark,
}) => {
  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-1 flex items-center justify-end gap-3 pr-1">
        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#2563EB]" />
          <span
            className={`text-[8px] ${
              isDark
                ? 'text-slate-400'
                : 'text-slate-500'
            }`}
          >
            Click
          </span>
        </div>

        <div className="flex items-center gap-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#20B486]" />
          <span
            className={`text-[8px] ${
              isDark
                ? 'text-slate-400'
                : 'text-slate-500'
            }`}
          >
            Report
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <TrendChart
          isDark={isDark}
          twoLines
        />
      </div>
    </div>
  );
};


// ============================================================
// RISK DISTRIBUTION CHART
// ============================================================

export const RiskDistributionChart = ({
  isDark,
}) => {
  const totalUsers = 14528;

  const colors = getChartColors(isDark);

  return (
    <div className="grid h-full w-full grid-cols-[145px_1fr] items-center gap-3">
      
      {/* DONUT */}
      <div className="relative h-[145px] w-[145px] shrink-0">
        <ResponsiveContainer
          width="100%"
          height="100%"
        >
          <PieChart>
            <Pie
              data={RISK_DISTRIBUTION}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={37}
              outerRadius={51}
              paddingAngle={1}
              stroke="none"
              isAnimationActive={false}
            >
              {RISK_DISTRIBUTION.map(
                (item, index) => (
                  <Cell
                    key={`risk-cell-${index}`}
                    fill={item.color}
                  />
                )
              )}
            </Pie>

            <Tooltip
              content={
                <ChartTooltip
                  isDark={isDark}
                />
              }
            />
          </PieChart>
        </ResponsiveContainer>

        {/* CENTER CONTENT */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div
            className={`text-[8px] ${
              isDark
                ? 'text-slate-500'
                : 'text-slate-400'
            }`}
          >
            Total Users
          </div>

          <div
            className={`text-[17px] font-bold leading-tight ${
              isDark
                ? 'text-white'
                : 'text-slate-800'
            }`}
          >
            {totalUsers.toLocaleString()}
          </div>
        </div>
      </div>


      {/* LEGEND */}
      <div className="min-w-0 space-y-1">
        {RISK_DISTRIBUTION.map(
          (item) => (
            <div
              key={item.label}
              className="flex items-center gap-2"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{
                  backgroundColor:
                    item.color,
                }}
              />

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span
                    className={`truncate text-[9px] ${
                      isDark
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {item.label}
                  </span>

                  <span
                    className={`ml-2 text-[9px] font-semibold ${
                      isDark
                        ? 'text-slate-200'
                        : 'text-slate-700'
                    }`}
                  >
                    {item.value}%
                  </span>
                </div>

                <div
                  className={`h-[3px] w-full overflow-hidden rounded-full ${
                    isDark
                      ? 'bg-[#292C32]'
                      : 'bg-[#E9EDF2]'
                  }`}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${item.value}%`,
                      backgroundColor:
                        item.color,
                    }}
                  />
                </div>
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
};


// ============================================================
// ANALYTICS CARD
// ============================================================

export const AnalyticsCard = ({
  title,
  subtitle,
  children,
  isDark,
  className = '',
}) => {
  return (
    <div
      className={`flex min-h-0 flex-col rounded-md p-3 ${
        isDark
          ? 'border-white/5 bg-[#1C1E24]'
          : 'bg-white'
      } ${className}`}
    >
      <div className="mb-1 shrink-0">
        <div
          className={`text-[12px] font-bold 
            ${isDark ? 'text-white' : 'text-[#182033]'}
         `}
        >
          {title}
        </div>

        {subtitle && (
          <div
            className={`mt-1 text-[9px] leading-tight font-semibold ${
              isDark
                ? 'text-slate-500'
                : 'text-slate-500'
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1">
        {children}
      </div>
    </div>
  );
};


// ============================================================
// PROGRESS LIST
// ============================================================

export const ProgressList = ({
  items = [],
  isDark,
}) => {
  return (
    <div className="space-y-2.5">
      {items.map((item) => (
        <div key={item.name}>
          <div className="mb-1 flex items-center justify-between">
            <span
              className={`text-[9px] ${
                isDark
                  ? 'text-slate-300'
                  : 'text-slate-600'
              }`}
            >
              {item.name}
            </span>

            <span
              className={`text-[9px] font-semibold ${
                isDark
                  ? 'text-slate-200'
                  : 'text-slate-700'
              }`}
            >
              {item.value}%
            </span>
          </div>

          <div
            className={`h-[5px] overflow-hidden rounded-full ${
              isDark
                ? 'bg-[#292C32]'
                : 'bg-[#E9EDF2]'
            }`}
          >
            <div
              className="h-full rounded-full bg-[#2563EB]"
              style={{
                width: `${item.value}%`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
};


// ============================================================
// TOP RISK DEPARTMENTS
// ============================================================

export const TopRiskDepartments = ({
  isDark,
}) => {
  return (
    <div
      className={`flex h-full flex-col ${
        isDark
          ? 'text-slate-200'
          : 'text-slate-700'
      }`}
    >
      <div className="mt-3 max-h-[138px] overflow-y-auto pr-1 scrollbar-thin
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:bg-slate-300
    dark:[&::-webkit-scrollbar-thumb]:bg-white/10
    [&::-webkit-scrollbar-thumb]:rounded-md
    hover:[&::-webkit-scrollbar-thumb]:bg-slate-400
      ">
        <div className="space-y-[15px] pb-2">
          {TOP_RISK_DEPARTMENTS.map(
            (item) => (
              <div
                key={item.department}
                className="flex items-center gap-2"
              >
                <div className="w-[72px] shrink-0">
                  <div
                    className={`truncate text-[9px] font-semibold ${
                      isDark
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {item.name}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={`h-[8px] overflow-hidden rounded-full ${
                      isDark
                        ? 'bg-[#292C32]'
                        : 'bg-[#E9EDF2]'
                    }`}
                  >
                    <div
                      className="h-full text-[9px] font-bold rounded-full bg-[#EF4444]"
                      style={{
                        width: `${item.score}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="w-[25px] text-right text-[8px] font-semibold">
                  {item.score}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};


// ============================================================
// HIGH RISK USERS
// ============================================================

export const HighRiskUsers = ({
  isDark,
}) => {
  return (
    <div
      className={`flex h-full flex-col ${
        isDark
          ? 'text-slate-200'
          : 'text-slate-700'
      }`}
    >
      <div className="mt-3 max-h-[138px] overflow-y-auto pr-1 scrollbar-thin
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:bg-slate-300
    dark:[&::-webkit-scrollbar-thumb]:bg-white/10
    [&::-webkit-scrollbar-thumb]:rounded-md
    hover:[&::-webkit-scrollbar-thumb]:bg-slate-400">
        <div className="space-y-[15px] pb-2">
          {HIGH_RISK_USERS.map(
            (item) => (
              <div
                key={item.department}
                className="flex items-center gap-2"
              >
                <div className="w-[72px] shrink-0">
                  <div
                    className={`truncate text-[9px] font-semibold ${
                      isDark
                        ? 'text-slate-300'
                        : 'text-slate-600'
                    }`}
                  >
                    {item.department}
                  </div>
                </div>

                <div className="min-w-0 flex-1">
                  <div
                    className={`h-[8px] overflow-hidden rounded-full ${
                      isDark
                        ? 'bg-[#292C32]'
                        : 'bg-[#E9EDF2]'
                    }`}
                  >
                    <div
                      className="h-full text-[9px] font-bold rounded-full bg-[#F97316]"
                      style={{
                        width: `${item.highRiskUsers}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="w-[25px] text-right text-[8px] font-semibold">
                  {item.totalUsers}
                </div>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};


// ============================================================
// RISK DRIVERS TABLE
// ============================================================

export const RiskDriversTable = ({ isDark }) => (
  <div className=" overflow-hidden">

    <table
      className="
        w-full
        min-w-[260px]
        
        border-separate
        border-spacing-x-0
        border-spacing-y-1.5
        
      "
    >

      {/* ================= HEADER ================= */}
      <thead>
        <tr
          className={
            isDark
              ? "bg-[#30323A]"
              : "bg-slate-200"
          }
        >
          <th
            className="
              px-2
              py-2
              text-left
              font-bold
              text-[9px]
            "
          >
            Risk Driver
          </th>

          <th
            className="
              px-2
              py-2
              text-center
              font-bold
              text-[9px]
            "
          >
            Users
          </th>

          <th
            className="
              px-2
              py-2
              text-center
              font-bold
              text-[9px]
            "
          >
            Impact
          </th>
        </tr>
      </thead>

      {/* ================= BODY ================= */}
      <tbody>

        {RISK_DRIVERS.map(
          ({
            driver,
            users,
            impact,
          }) => (

            <tr key={driver}>

              {/* Risk Driver */}
              <td
                className={`
                  px-2
                  py-1
                  border-y
                  border-l
                  rounded-l-sm
                  text-[8px]
                  ${
                    isDark
                      ? "border-white/10 bg-[#1C1E24]"
                      : "border-slate-200 bg-white"
                  }
                `}
              >
                {driver}
              </td>

              {/* Users */}
              <td
                className={`
                  px-2
                  py-1
                  text-center
                  border-y
                  text-[8px]
                  ${
                    isDark
                      ? "border-white/10 bg-[#1C1E24]"
                      : "border-slate-200 bg-white"
                  }
                `}
              >
                {users}
              </td>

              {/* Impact */}
              <td
                className={`
                  px-2
                  py-1
                  text-center
                  font-bold
                  text-red-500
                  border-y
                  border-r
                  rounded-r-sm
                  text-[8px]
                  ${
                    isDark
                      ? "border-white/10 bg-[#1C1E24]"
                      : "border-slate-200 bg-white"
                  }
                `}
              >
                {impact}
              </td>

            </tr>

          )
        )}

      </tbody>

    </table>

  </div>
);