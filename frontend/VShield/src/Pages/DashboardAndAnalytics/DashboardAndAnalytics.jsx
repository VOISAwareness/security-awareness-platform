import React, { useState } from 'react';

import { useUserType } from '../../UserTypeContext/UserTypeContext';

import { useNavigate } from 'react-router-dom';

import ExecutiveOverviewTab from './ExecutiveOverviewTab';
import EmailPerformanceTab from './EmailPerformanceTab';
import TrainingLearningTab from './TrainingLearningTab';




// ============================================================
// SCALE / DESIGN VARIABLES
// ============================================================

const VarScenarioScale = 0.975;

const VarOverallScenarioRoundednessScale = 0.75;


// ============================================================
// VODAFONE FONT STYLE
// ============================================================

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');

  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Vodafone', 'Montserrat', 'Plus Jakarta Sans', sans-serif;
    font-weight: 900;
  }

  .rounded-2xl {
    border-radius: ${Math.round(
  16 * VarOverallScenarioRoundednessScale
)}px !important;
  }

  .rounded-xl {
    border-radius: ${Math.round(
  12 * VarOverallScenarioRoundednessScale
)}px !important;
  }

  .rounded-lg {
    border-radius: ${Math.round(
  8 * VarOverallScenarioRoundednessScale
)}px !important;
  }

  .rounded-md {
    border-radius: ${Math.round(
  6 * VarOverallScenarioRoundednessScale
)}px !important;
  }

  .dashboard-line {
    fill: none;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
`;


// ============================================================
// ANALYTICS TABS
// ============================================================

const AnalyticsTabs = ({
  activeTab,
  onTabChange,
}) => {

  const {
    isDark,
  } = useUserType?.() || {
    isDark: false,
  };

  const tabs = [
    {
      id: 0,
      label: 'Executive Overview'
    },
    {
      id: 1,
      label: 'Campaign & Email Performance'
    },
    {
      id: 2,
      label: 'Training & Learning'
    },
  ];

  return (
    <div className="flex gap-4 flex-wrap">

      {tabs.map(
        (tab) => (

          <button
            key={tab.id}
            onClick={() =>
              onTabChange(tab.id)
            }
            className={`
              min-w-[210px]
              h-[27px]
              px-5
              rounded-xl
              border
              transition-all
              item-center
              justify-between
              text-[10.5px]
              font-bold

              ${activeTab === tab.id

                ? isDark
                  ? "bg-white text-black border-white"
                  : "bg-[#06080D] text-white border-[#06080D]"

                : isDark
                  ? "bg-[#1A1A1A] text-white border-white/20"
                  : "bg-white text-slate-700 border-slate-300"
              }
            `}
          >
            {tab.label}
          </button>

        )
      )}

    </div>
  );
};


// ============================================================
// MAIN COMPONENT
// ============================================================

const DashboardAndAnalytics = () => {

  const {
    isDark,
  } = useUserType?.() || {
    isDark: false,
  };


  const [activeTab, setActiveTab] =
    useState(0);


  const [errorMsg, setErrorMsg] =
    useState('');


  const navigate =
    useNavigate();


  const [isPublishing, setIsPublishing] =
    useState(false);


  const [publishSuccessModal, setPublishSuccessModal] =
    useState(false);


  return (
    <>
      {/* =====================================================
          FONT STYLE
      ===================================================== */}

      <style>
        {VODAFONE_FONT_STYLE}
      </style>


      <div
        style={{
          zoom: VarScenarioScale,
        }}
        className="
          w-full
          max-w-[1780px]
          mx-auto
          p-3
          sm:p-3.5
          -mt-2
          select-none
          font-sans
          flex
          flex-col
          gap-2.5
          overflow-hidden
        "
      >

        {/* ===================================================
            PAGE HEADER
        =================================================== */}

        <div
        className={`w-full h-[40px] py-2.5 px-6 -mt-2 rounded-2xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${
          isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
        }`}
      >
        <div className="flex items-center gap-3">
          <h1 className="text-[13.5px] font-bold tracking-tight uppercase">
              DASHBOARD & ANALYTICS
            </h1>

          </div>

        </div>


        {/* ===================================================
            TABS
        =================================================== */}

        <div className="mb-0">

          
          <AnalyticsTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
          

        </div>


        {/* ===================================================
            CONTENT SHELL
        =================================================== */}

        <div
          className={`
            w-full
            min-h-[400px]
            h-[calc(100vh-90px)]
            rounded-3xl
            
            

            ${isDark
              ? 'border-white/5 '
              : 'border-slate-200 text-slate-900 '
            }
          `}
        >

          {/* =================================================
              TAB 1
          ================================================= */}

          {activeTab === 0 && (
            <ExecutiveOverviewTab
              isDark={isDark}
            />
          )}


          {/* =================================================
              TAB 2
          ================================================= */}

          {activeTab === 1 && (
            <EmailPerformanceTab isDark={isDark} />
          )}


          {/* =================================================
              TAB 3
          ================================================= */}

          {activeTab === 2 && (
            <TrainingLearningTab isDark={isDark} />
          )}

        </div>

      </div>

    </>
  );
};


export default DashboardAndAnalytics;