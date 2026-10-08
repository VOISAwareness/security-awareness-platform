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
} from "recharts";


// ============================================================
// DATA
// ============================================================

const {
  engagementTrend: ENGAGEMENT_TREND,
  scenarioEffectiveness: SCENARIO_EFFECTIVENESS,
  motivatorEffectiveness: MOTIVATOR_EFFECTIVENESS,
  campaignPerformance: CAMPAIGN_PERFORMANCE,
  departmentEngagement: DEPARTMENT_ENGAGEMENT,
  emailKpiCards: EMAIL_KPI_CARDS,
} = dashboardData;

 const backColorDarkMode = 'bg-[#1C1E24]';
  const backColorLightMode = 'bg-white';

const ChartTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className={`min-w-[130px] rounded-lg border px-3 py-2 text-[11px] shadow-lg ${
        isDark
          ? "border-white/10 bg-[#202127] text-white"
          : "border-slate-200 bg-white text-slate-800"
      }`}
    >
      <p className="mb-1 font-semibold">{label}</p>
      {payload.map((item) => (
        <div key={item.dataKey} className="flex items-center justify-between gap-5">
          <div className="flex items-center gap-1.5">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span>{item.name}</span>
          </div>
          <span className="font-semibold">{item.value}%</span>
        </div>
      ))}
    </div>
  );
};

const AnalyticsCard = ({
  title,
  subtitle,
  isDark,
  children,
  className = "",
  legend,
}) => (
  <section
    className={`rounded-2xl p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
      isDark
        ? "border-white/5 bg-[#1C1E24]"
        : "border-slate-200 bg-white"
    } h-[190px]`}
  >
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2
          className={`text-[12px] font-bold leading-tight ${
            isDark ? "text-white" : "text-[#111827]"
          }`}
        >
          {title}
        </h2>
        <p
          className={`mt-1 text-[9px] leading-tight ${
            isDark ? "text-slate-400" : "font-semibold text-slate-500"
          }`}
        >
          {subtitle}
        </p>
      </div>
      {legend}
    </div>
    {children}
  </section>
);

const DashboardFilter = ({
  name,
  value,
  onChange,
  children,
  isDark,
  icon,
  ariaLabel,
}) => (
  <div className="relative min-w-0">
    {icon && (
      <span
        className={`pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[10px] ${
          isDark ? "text-slate-400" : "text-slate-500"
        }`}
      >
        {icon}
      </span>
    )}

    <select
      name={name}
      value={value}
      onChange={onChange}
      aria-label={ariaLabel}
      className={`h-[36px] w-full appearance-none rounded-lg border pr-8 text-[10px] outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 ${
        icon ? "pl-8" : "pl-3"
      } ${
        isDark
          ? "border-white/10 bg-[#1C1E24] text-slate-200"
          : "border-slate-200 bg-white text-slate-600"
      }`}
    >
      {children}
    </select>

    <span
      className={`pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[8px] ${
        isDark ? "text-slate-400" : "text-slate-500"
      }`}
    >
      ▼
    </span>
  </div>
);

const KpiCard = ({ item, isDark }) => {
  const isNegative = item.growth.includes("↓");

  return (
    <article
      className={`relative min-w-0 overflow-hidden rounded-xl border px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
        isDark
          ? "border-white/5 bg-[#1C1E24]"
          : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className="mt-[1px] h-[18px] w-[18px] shrink-0 rounded-full"
          style={{ backgroundColor: item.color, opacity: 0.25 }}
        />
        <div className="min-w-0">
          <p
            className={`truncate text-[9px] font-semibold leading-tight ${
              isDark ? "text-slate-200" : "text-slate-700"
            }`}
          >
            {item.title}
          </p>
          <p
            className={`mt-1 text-[20px] font-bold leading-none ${
              isDark ? "text-white" : "text-[#111827]"
            }`}
          >
            {item.value}
          </p>
          <p
            className={`mt-2 truncate text-[8px] font-semibold ${
              isNegative ? "text-rose-500" : "text-emerald-500"
            }`}
          >
            {item.growth}
          </p>
        </div>
      </div>
    </article>
  );
};

const EngagementTrendChart = ({ isDark }) => {
  const axisColor = isDark ? "#64748B" : "#94A3B8";
  const gridColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <div className="h-[150px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={ENGAGEMENT_TREND}
          margin={{ top: 8, right: 8, left: -25, bottom: 0 }}
        >
          <CartesianGrid
            stroke={gridColor}
            vertical={false}
            opacity={0.35}
          />
          <XAxis
            dataKey="month"
            hide
            axisLine={{ stroke: axisColor }}
            tickLine={false}
          />
          <YAxis
            hide
            domain={[0, 100]}
            axisLine={{ stroke: axisColor }}
            tickLine={false}
          />
          <Tooltip content={<ChartTooltip isDark={isDark} />} />
          <Line
            type="monotone"
            dataKey="openRate"
            name="Open Rate"
            stroke="#A600A6"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="reportRate"
            name="Report Rate"
            stroke="#2DD4BF"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="clickRate"
            name="Click Rate"
            stroke="#FF6B6B"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

const ScenarioEffectiveness = ({ isDark }) => (
  <div className="space-y-3 pt-3
    max-h-[140px]
    overflow-y-auto
    pr-1
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:bg-slate-300
    dark:[&::-webkit-scrollbar-thumb]:bg-white/10
    [&::-webkit-scrollbar-thumb]:rounded-md
    hover:[&::-webkit-scrollbar-thumb]:bg-slate-400
  ">
    {SCENARIO_EFFECTIVENESS.map((item) => (
      <div
        key={item.label}
        className="grid grid-cols-[100px_52px_minmax(100px,1fr)_38px] items-center gap-3"
      >
        <span
          className={`truncate text-[9px] font-semibold ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {item.label}
        </span>
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#A600A6]" />
          <span
            className={`text-[8px] font-semibold ${
              isDark ? "text-slate-200" : "text-slate-700"
            }`}
          >
            {item.clickValue}%
          </span>
        </div>
        <div
          className={`h-[11px] overflow-hidden rounded-full ${
            isDark ? "bg-slate-700" : "bg-[#E6EDF6]"
          }`}
        >
          <div
            className="h-full rounded-full bg-[#43D2B4]"
            style={{ width: `${item.reportValue}%` }}
          />
        </div>
        <span className="text-right text-[9px] font-semibold text-[#10BFA0]">
          {item.reportValue}%
        </span>
      </div>
    ))}
  </div>
);

const MotivatorEffectiveness = ({ isDark }) => (
  <div className="space-y-3 pt-3
    max-h-[140px]
    overflow-y-auto
    pr-1
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:bg-slate-300
    dark:[&::-webkit-scrollbar-thumb]:bg-white/10
    [&::-webkit-scrollbar-thumb]:rounded-md
    hover:[&::-webkit-scrollbar-thumb]:bg-slate-400
  ">
    {MOTIVATOR_EFFECTIVENESS.map((item) => (
      <div
        key={item.label}
        className="grid grid-cols-[80px_minmax(120px,1fr)_38px] items-center gap-4"
      >
        <span
          className={`truncate text-[9px] font-semibold ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}
        >
          {item.label}
        </span>
        <div
          className={`h-[11px] overflow-hidden rounded-full ${
            isDark ? "bg-slate-700" : "bg-[#E6EDF6]"
          }`}
        >
          <div
            className="h-full rounded-full bg-[#A600A6]"
            style={{ width: `${Math.min(item.value * 2.2, 100)}%` }}
          />
        </div>
        <span className="text-right text-[9px] font-semibold text-[#A600A6]">
          {item.value}%
        </span>
      </div>
    ))}
  </div>
);

const RateLegend = ({ isDark }) => (
  <div
    className={`flex flex-wrap items-center justify-end gap-x-5 gap-y-1 ${
      isDark ? "text-slate-400" : "text-slate-500"
    }`}
  >
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-[#FF6B6B]" />
      <span className="text-[7px]">Click Rate (%)</span>
    </div>
    <div className="flex items-center gap-1.5">
      <span className="h-2 w-2 rounded-full bg-[#43D2B4]" />
      <span className="text-[7px]">Report Rate (%)</span>
    </div>
  </div>
);

const PerformanceComparison = ({ data, isDark }) => (
  <div className="space-y-3 pt-3
    max-h-[140px]
    overflow-y-auto
    pr-1
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:bg-slate-300
    dark:[&::-webkit-scrollbar-thumb]:bg-white/10
    [&::-webkit-scrollbar-thumb]:rounded-md
    hover:[&::-webkit-scrollbar-thumb]:bg-slate-400
  ">
    {data.map((item) => (
      <div
        key={item.label}
        className="grid grid-cols-[minmax(105px,145px)_minmax(55px,1fr)_38px_minmax(55px,1fr)_38px] items-center gap-2 sm:gap-3"
      >
        <p
          className={`truncate text-[9px] font-semibold ${
            isDark ? "text-slate-300" : "text-slate-600"
          }`}
          title={item.label}
        >
          {item.label}
        </p>
        <div
          className={`h-[10px] overflow-hidden rounded-full ${
            isDark ? "bg-slate-700" : "bg-transparent"
          }`}
        >
          <div
            className="h-full rounded-full bg-[#FF6B6B]"
            style={{ width: `${Math.min(item.clickRate * 4.2, 100)}%` }}
          />
        </div>
        <p className="text-right text-[9px] font-semibold text-[#FF6B6B]">
          {item.clickRate}%
        </p>
        <div
          className={`h-[10px] overflow-hidden rounded-full ${
            isDark ? "bg-slate-700" : "bg-transparent"
          }`}
        >
          <div
            className="h-full rounded-full bg-[#43D2B4]"
            style={{ width: `${Math.min(item.reportRate * 3.2, 100)}%` }}
          />
        </div>
        <p className="text-right text-[8px] font-bold text-[#10BFA0]">
          {item.reportRate}%
        </p>
      </div>
    ))}
  </div>
);


// ============================================================
// EXECUTIVE OVERVIEW TAB
// ============================================================

const EmailPerformanceTab = ({ isDark }) => {
const backColorDarkMode = 'bg-[#1C1E24]';
  const backColorLightMode = 'bg-white';
  return (
    <div className="space-y-3">

      {/* =====================================================
          HEADER + FILTERS
      ===================================================== */}

      <div className="flex justify-between items-start">

        <div className="pt-0.5 min-w-[230px]" />

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


      {/* =====================================================
          KPI CARDS
      ===================================================== */}

      <div
        className="
          grid
          grid-cols-2
          sm:grid-cols-4
          lg:grid-cols-8
          gap-3
        "
      >

        {EMAIL_KPI_CARDS.map(
          (item, index) => (

            <div
              key={index}
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

          )
        )}

      </div>


      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <AnalyticsCard
            title="Engagement Trend"
            subtitle="Open, click and report rates"
            isDark={isDark}
            className="min-h-[285px]"
          >
            <EngagementTrendChart isDark={isDark} />
          </AnalyticsCard>

          <AnalyticsCard
            title="Scenario Effectiveness"
            subtitle="Report rate by scenario"
            isDark={isDark}
            className="min-h-[285px]"
          >
            <ScenarioEffectiveness isDark={isDark} />
          </AnalyticsCard>

          <AnalyticsCard
            title="Motivator Effectiveness"
            subtitle="Report rate % by behavioural motivator"
            isDark={isDark}
            className="min-h-[285px]"
          >
            <MotivatorEffectiveness isDark={isDark} />
          </AnalyticsCard>
        </div>

        <div className="grid grid-cols-1 gap-4 grid-cols-2">
          <AnalyticsCard
            title="Campaign Performance"
            subtitle="Top campaigns by report rate"
            isDark={isDark}
            className="min-h-[310px] overflow-x-auto"
            legend={<RateLegend isDark={isDark} />}
          >
            <div className="min-w-[520px]">
              <PerformanceComparison data={CAMPAIGN_PERFORMANCE} isDark={isDark} />
            </div>
          </AnalyticsCard>

          <AnalyticsCard
            title="Department Engagement"
            subtitle="Report rate compared with click rate"
            isDark={isDark}
            className="min-h-[310px] overflow-x-auto"
            legend={<RateLegend isDark={isDark} />}
          >
            <div className="min-w-[520px]">
              <PerformanceComparison data={DEPARTMENT_ENGAGEMENT} isDark={isDark} />
            </div>
          </AnalyticsCard>
        </div>

    </div>
  );
};


export default EmailPerformanceTab;