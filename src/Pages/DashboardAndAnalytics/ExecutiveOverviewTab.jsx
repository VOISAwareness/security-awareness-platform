import React from 'react';

import dashboardData from './dashboardData.json';

import {
  TrendChart,
  ClickVsReportChart,
  RiskDistributionChart,
  ProgressList,
  AnalyticsCard,
  TopRiskDepartments,
  HighRiskUsers,
  RiskDriversTable,
} from './AnalyticsComponents';


// ============================================================
// DATA
// ============================================================

const {
  kpiCards: KPI_CARDS,
  topRiskDepartments: TOP_RISK_DEPARTMENTS,
  highRiskUsers: HIGH_RISK_USERS,
} = dashboardData;


// ============================================================
// DESKTOP L-SHAPE ANALYTICS
// ============================================================

const DesktopLShapeAnalytics = ({ isDark }) => {

  const lCardBg = isDark
    ? '#1C1E24'
    : 'white';

  const panelClass = isDark
    ? 'bg-[#15161A] text-white border-white/5'
    : 'text-slate-900';

  const backColorDarkMode = 'bg-[#1C1E24]';
  const backColorLightMode = 'bg-white';

  const TOP_HEIGHT = 250;
  const BOTTOM_HEIGHT = 255;

  return (
    <div className="hidden lg:block w-full">

      <div
        className="relative w-full"
        style={{
          height: `${TOP_HEIGHT + BOTTOM_HEIGHT}px`,
        }}
      >
        {/* ===================================================
            CONTENT GRID
        =================================================== */}

        <div
          className="
            relative
            z-10
            grid
            grid-cols-3
            gap-x-3
            gap-y-0
            w-full
          "
          style={{
            gridTemplateRows: `200px ${BOTTOM_HEIGHT}px`,
          }}
        >

          {/* =================================================
              1. RISK SCORE
          ================================================= */}

          <div
            className={`
              col-start-1
              row-start-1
              min-w-0
              rounded-2xl
              overflow-hidden
            ${
                isDark
                  ? `${backColorDarkMode}`
                  : `${backColorLightMode}`
            }
              `}
            style={{
              height: '190px',
            }}
          >

            <AnalyticsCard
              title="Risk Score Trend"
              subtitle="Monthly average risk score"
              isDark={isDark}
              className={`
                w-full
                h-full
                ${panelClass}
              `}
            >

              <div className="w-full h-[150px]">

                <TrendChart
                  isDark={isDark}
                />

              </div>

            </AnalyticsCard>

          </div>


          {/* =================================================
              2. CLICK VS REPORT
          ================================================= */}

          <div
            className={`
              col-start-2
              row-start-1
              min-w-0
              rounded-2xl
              overflow-hidden
            ${
                isDark
                  ? `${backColorDarkMode}`
                  : `${backColorLightMode}`
            }
              `}
            style={{
              height: '190px',
            }}
          >

            <AnalyticsCard
              title="Click vs Report Rate"
              subtitle="Last 12 months"
              isDark={isDark}
              className={`
                w-full
                h-full
                ${panelClass}
              `}
            >

              <div className="w-full h-[150px]">

                <ClickVsReportChart
                  isDark={isDark}
                />

              </div>

            </AnalyticsCard>

          </div>


          {/* =================================================
              3. RISK DISTRIBUTION
          ================================================= */}

          <div
            className={`
              col-start-3
              row-start-1
              min-w-0
              overflow-hidden
            rounded-2xl
              ${
                isDark
                  ? `${backColorDarkMode}`
                  : `${backColorLightMode}`
            }
              `}
            style={{
              height: '190px',
            }}
          >

            <AnalyticsCard
              title="Risk Distribution"
              subtitle="Users by risk band"
              isDark={isDark}
              className={`
                w-full
                h-full
                ${panelClass}
              `}
            >

              <div className="w-full h-[150px]">

                <RiskDistributionChart
                  isDark={isDark}
                />

              </div>

            </AnalyticsCard>

          </div>


          {/* =================================================
              4. TOP RISK DEPARTMENTS
          ================================================= */}

          <div
            className={`
              col-start-1
              row-start-2
              min-w-0
              rounded-2xl
              overflow-hidden
            ${
                isDark
                  ? `${backColorDarkMode}`
                  : `${backColorLightMode}`
            }
              `}
            style={{
              height: `200px`,
            }}
          >

            <AnalyticsCard
              title="Top Risk Departments"
              subtitle="Ranked by average risk"
              isDark={isDark}
              className={`
                w-full
                h-full
                ${panelClass}
              `}
            >

              <TopRiskDepartments
                isDark={isDark}
              />

            </AnalyticsCard>

          </div>


          {/* =================================================
              5. HIGH-RISK USERS
          ================================================= */}

          <div
            className={`
              col-start-2
              row-start-2
              min-w-0
              rounded-2xl
              overflow-hidden
            ${
                isDark
                  ? `${backColorDarkMode}`
                  : `${backColorLightMode}`
            }
              `}

            
            style={{
              height: `200px`,
            }}
          >

            <AnalyticsCard
              title="High-Risk Users by Department"
              subtitle="Actionable population"
              isDark={isDark}
              className={`
                w-full
                h-full
                ${panelClass}
              `}
            >

              <HighRiskUsers
                isDark={isDark}
              />

            </AnalyticsCard>

          </div>


          {/* =================================================
              6. RISK DRIVERS
          ================================================= */}

          <div
            className={`
              col-start-3
              row-start-2
              min-w-0
              rounded-2xl
              overflow-hidden
            ${
                isDark
                  ? `${backColorDarkMode}`
                  : `${backColorLightMode}`
            }
              `}
            
            style={{
              height: `200px`,
            }}
          >

            <AnalyticsCard
              title="Risk Drivers"
              subtitle="Users and risk impact"
              isDark={isDark}
              className={`
                w-full
                h-full
                ${panelClass}
              `}
            >

              <RiskDriversTable
                isDark={isDark}
              />

            </AnalyticsCard>

          </div>

        </div>

      </div>

    </div>
  );
};


// ============================================================
// MOBILE ANALYTICS
// ============================================================

const MobileAnalytics = ({ isDark }) => {

  const cardClass = isDark
    ? 'bg-[#202127] border-white/5'
    : 'bg-[#F1F5F7] border-slate-200';

  return (
    <div
      className="
        grid
        grid-cols-1
        md:grid-cols-2
        gap-3
        lg:hidden
      "
    >

      {/* RISK SCORE */}

      <AnalyticsCard
        title="Risk Score Trend"
        subtitle="Monthly average risk score"
        isDark={isDark}
        className={`
          h-[240px]
          rounded-xl
          border
          ${cardClass}
        `}
      >

        <div className="h-[180px] mt-2">

          <TrendChart
            isDark={isDark}
          />

        </div>

      </AnalyticsCard>


      {/* CLICK VS REPORT */}

      <AnalyticsCard
        title="Click vs Report Rate"
        subtitle="Last 12 months"
        isDark={isDark}
        className={`
          h-[240px]
          rounded-xl
          border
          ${cardClass}
        `}
      >

        <div className="h-[180px] mt-2">

          <ClickVsReportChart
            isDark={isDark}
          />

        </div>

      </AnalyticsCard>


      {/* RISK DISTRIBUTION */}

      <AnalyticsCard
        title="Risk Distribution"
        subtitle="Users by risk band"
        isDark={isDark}
        className={`
          h-[240px]
          rounded-xl
          border
          ${cardClass}
        `}
      >

        <div className="h-[180px] mt-1">

          <RiskDistributionChart
            isDark={isDark}
          />

        </div>

      </AnalyticsCard>


      {/* TOP RISK DEPARTMENTS */}

      <AnalyticsCard
        title="Top Risk Departments"
        subtitle="Ranked by average risk"
        isDark={isDark}
        className={`
          min-h-[250px]
          rounded-xl
          border
          ${cardClass}
        `}
      >

        <ProgressList
          data={TOP_RISK_DEPARTMENTS}
          isDark={isDark}
          color="#2563EB"
        />

      </AnalyticsCard>


      {/* HIGH-RISK USERS */}

      <AnalyticsCard
        title="High-Risk Users by Department"
        subtitle="Actionable population"
        isDark={isDark}
        className={`
          min-h-[250px]
          rounded-xl
          border
          ${cardClass}
        `}
      >

        <ProgressList
          data={HIGH_RISK_USERS}
          isDark={isDark}
          color="#FB7185"
          withUsers
        />

      </AnalyticsCard>


      {/* RISK DRIVERS */}

      <AnalyticsCard
        title="Risk Drivers"
        subtitle="Users and risk impact"
        isDark={isDark}
        className={`
          min-h-[250px]
          rounded-xl
          border
          ${cardClass}
        `}
      >

        <RiskDriversTable
          isDark={isDark}
        />

      </AnalyticsCard>

    </div>
  );
};


// ============================================================
// EXECUTIVE OVERVIEW TAB
// ============================================================

const ExecutiveOverviewTab = ({ isDark }) => {
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

        {KPI_CARDS.map(
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


      {/* =====================================================
          DESKTOP ANALYTICS
      ===================================================== */}

      <DesktopLShapeAnalytics
        isDark={isDark}
      />


      {/* =====================================================
          MOBILE ANALYTICS
      ===================================================== */}

      <MobileAnalytics
        isDark={isDark}
      />

    </div>
  );
};


export default ExecutiveOverviewTab;