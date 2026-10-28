import React, { useMemo, useState, useEffect } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  SlidersHorizontal,
  Pencil,
  Copy,
  Trash2,
  Check,
  X,
  ExternalLink,
  Eye,
  ArrowRight,
  NotebookPen,
  ArrowLeft,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { useUserType } from "../../UserTypeContext/UserTypeContext";
import AnnouncamentScenariosJsonData from '../Announcement/AnnouncementData.json';

// =========================================================================
// 🖼️ IMAGE RESOLVER — eagerly import every asset once, then look up by filename
// (adjust the glob path if your assets folder sits somewhere else relative
// to this file — it currently matches the ../../assets pattern used
// elsewhere in this project)
// =========================================================================
const scenarioImageModules = import.meta.glob('../../assets/*.{png,jpg,jpeg,svg}', {
  eager: true,
  import: 'default'
});

const S3_BUCKET_BASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_S3_SCENARIOS_BUCKET_URL) || '';

const getScenarioImage = (coverImageId) => {
  if (!coverImageId) return '';

  if (coverImageId.startsWith('http://') || coverImageId.startsWith('https://')) {
    return coverImageId;
  }

  if (S3_BUCKET_BASE_URL) {
    const cleanBase = S3_BUCKET_BASE_URL.replace(/\/+$/, '');
    const cleanId = coverImageId.replace(/^\/+/, '');
    return `${cleanBase}/${cleanId}`;
  }

  try {
    return new URL(`../Announcement/`+coverImageId, import.meta.url).href;
  } catch (e) {
    return `/assets/Scenarios/${coverImageId}`;
  }
};

// Order the themes rotate through by card position, so neighboring cards
// never land on the same background even if they share an intensityColor
const THEME_CYCLE = ['Low', 'Medium', 'High'];

// Intensity dot color map (for the small dot on the card, independent of the theme)
const INTENSITY_COLORS = {
  yellow: '#f5b942',
  red: '#e60000',
  green: '#22c55e'
};

// =========================================================================
// 🎛️ SCALE CONTROL VARIABLES
// =========================================================================
const VarMySpaceScale = 0.975;
const VarStartCampaignScale = 0.94;
const VarOverallRoundednessScale = 0.5;

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
  
  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Vodafone', 'Montserrat', 'Plus Jakarta Sans', sans-serif;
    font-weight: 900;
  }

  .rounded-3xl { border-radius: ${Math.round(28 * VarOverallRoundednessScale)}px !important; }
  .rounded-2xl { border-radius: ${Math.round(20 * VarOverallRoundednessScale)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(14 * VarOverallRoundednessScale)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(10 * VarOverallRoundednessScale)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallRoundednessScale)}px !important; }
`;

// -----------------------------------------------------
// Filter Data
// -----------------------------------------------------

const campaignTypes = [
  "Data Entry",
  "Click",
  "Credential theft",
  "Helpdesk impersonation",
  "Reward scam",
  "Travel scam",
];

const emotions = [
  "Urgency",
  "Fear",
  "Inconvenience",
  "Authority",
  "Routine authority",
];

const targetAudiences = [
  "All users",
  "Remote",
  "Employees",
  "Finance",
];

// =====================================================
// FILTER ROW — dot + label + count, expands on click to
// reveal its checkbox options (used inside the L-foot)
// =====================================================

const FilterRow = ({
  title,
  options,
  selected,
  onChange,
  isOpen,
  onToggle,
  accent = "#e60000",
  isDark,
}) => {
  return (
    <div
      className={`
        rounded-md
        overflow-hidden
        border
        ${
          isDark
            ? "bg-[#15161a]/60 border-white/5"
            : "bg-white/80 border-black/5 shadow-2xs"
        }
      `}
    >
      {/* =========================================
          ROW HEADER
      ========================================= */}
      <button
        type="button"
        onClick={onToggle}
        className={`
          w-full
          flex
          items-center
          justify-between
          px-3
          py-2.5
          text-left
          transition-colors
          cursor-pointer
          ${isDark ? "text-white" : "text-[#0B1121]"}
        `}
      >
        <div className="flex items-center gap-2">
          <span
            className="w-[7px] h-[7px] rounded-full flex-shrink-0"
            style={{
              backgroundColor:
                selected.length > 0 ? accent : isDark ? "#64748b" : "#94a3b8",
            }}
          />
          <span className="text-[10.5px] font-bold">{title}</span>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`
              min-w-[20px]
              h-[18px]
              px-1.5
              rounded-full
              flex
              items-center
              justify-center
              text-[9px]
              font-extrabold
              ${
                selected.length > 0
                  ? "text-white"
                  : isDark
                  ? "bg-white/10 text-white/60"
                  : "bg-slate-100 text-slate-500"
              }
            `}
            style={
              selected.length > 0 ? { backgroundColor: accent } : undefined
            }
          >
            {selected.length}
          </span>

          <ChevronDown
            className={`
              w-3.5
              h-3.5
              transition-transform
              duration-200
              ${isOpen ? "rotate-180" : "rotate-0"}
              ${isDark ? "text-white/50" : "text-slate-400"}
            `}
          />
        </div>
      </button>

      {/* =========================================
          CHECKBOX OPTIONS
      ========================================= */}
      {isOpen && (
        <div className="px-2 pb-2.5 space-y-1">
          {options.map((option) => {
            const checked = selected.includes(option);

            return (
              <label
                key={option}
                className={`
                  flex
                  items-center
                  gap-2.5
                  px-2
                  py-1.5
                  rounded-md
                  cursor-pointer
                  transition-colors
                  ${isDark ? "hover:bg-white/[0.05]" : "hover:bg-slate-50"}
                `}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => onChange(option)}
                  className="sr-only"
                />

                <span
                  className={`
                    w-[14px]
                    h-[14px]
                    rounded-[3px]
                    border
                    flex
                    items-center
                    justify-center
                    flex-shrink-0
                    transition-all
                    ${
                      checked
                        ? "border-transparent"
                        : isDark
                        ? "border-white/30 bg-white/[0.03]"
                        : "border-slate-300 bg-white"
                    }
                  `}
                  style={
                    checked
                      ? { backgroundColor: accent, borderColor: accent }
                      : undefined
                  }
                >
                  {checked && (
                    <Check className="w-[10px] h-[10px] text-white" strokeWidth={3} />
                  )}
                </span>

                <span
                  className={`
                    text-[10px]
                    font-semibold
                    leading-tight
                    ${
                      checked
                        ? isDark
                          ? "text-white"
                          : "text-slate-900"
                        : isDark
                        ? "text-slate-400"
                        : "text-slate-600"
                    }
                  `}
                >
                  {option}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =====================================================
// SCENARIO FILTERS — L-SHAPE LAYOUT
// (top-left isolated title box + top-right L-head icon/
// clear-all, then a full-width L-foot holding the filter
// rows — same technique as the Security Bulletins card)
// =====================================================

const AnnouncementScenarioFilters = ({
  selectedCampaignTypes,
  setSelectedCampaignTypes,

  selectedEmotions,
  setSelectedEmotions,

  selectedAudiences,
  setSelectedAudiences,

  isDark,
}) => {

  // Only ONE accordion open at a time
  const [openSection, setOpenSection] = useState("campaign");

  // Toggle checkbox value
  const toggleValue = (value, selected, setter) => {
    setter(
      selected.includes(value)
        ? selected.filter((item) => item !== value)
        : [...selected, value]
    );
  };

  // Active filter count
  const activeCount =
    selectedCampaignTypes.length +
    selectedEmotions.length +
    selectedAudiences.length;

  // Clear all
  const clearAll = () => {
    setSelectedCampaignTypes([]);
    setSelectedEmotions([]);
    setSelectedAudiences([]);
  };

  // Accordion toggle
  const handleSectionToggle = (section) => {
    setOpenSection(openSection === section ? null : section);
  };

   // Base background for L-shapes
  const lCardBg = isDark ? '#1C1E24' : '#F1F5F7';

  return (
    <aside className="flex-shrink-0 w-full lg:w-[250px] xl:w-[270px] flex flex-col min-w-0 justify-between">

      {/* ================================================= */}
      {/* TOP SECTION — isolated title box + L-head          */}
      {/* ================================================= */}
      <div className="flex items-end justify-between w-full relative">

        {/* ---------------------------------------------
            TOP-LEFT ISOLATED BOX — FILTER TITLE
        --------------------------------------------- */}
        <div
          style={{
            backgroundColor: isDark ? "#241C3D" : "#E9E4FF",
          }}
          className="w-[calc(50%-4px)] h-[120px] p-3.5 rounded-2xl flex flex-col justify-between shadow-xs z-20 justify-start items-start text-left transition-colors mb-2"
        >
          <div>
            <h3
            className="text-[14px] -mt-1 font-voda font-bold tracking-normal leading-tight"
          >
            APPLY
            <br />
            FILTERS
          </h3>
          </div>
          <p
            className="text-[9.5px] leading-[1.3] font-medium opacity-75 mt-1"
          >
            Filter scenarios by type, emotion and audience.
          </p>
        </div>

        <div className="absolute top-[112px] left-[113px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
                  </svg>
                </div>

        {/* ---------------------------------------------
            TOP-RIGHT L-HEAD — FILTER ICON + CLEAR ALL
        --------------------------------------------- */}
        <div
          className={`w-[calc(50%-4px)] h-[128px] rounded-t-xl flex-2 px-3 py-3 flex flex-col justify-center gap-2.5 transition-colors relative z-10 ${
            isDark ? "bg-[#202127]" : "bg-[#f1f3f7]"
          }`}
        >
          <div className="flex items-center gap-1.5">
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#e60000] flex-shrink-0" />
            <span
              className={`text-[12px] font-bold ${
                isDark ? "text-slate-200" : "text-slate-800"
              }`}
            >
              Filters
            </span>

            {activeCount > 0 && (
              <span
                className="min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[8px] font-extrabold text-white flex-shrink-0"
                style={{ backgroundColor: "#e60000" }}
              >
                {activeCount}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={clearAll}
            disabled={activeCount === 0}
            className={`w-full h-[20px] rounded-lg flex items-center justify-center gap-1.5 text-[9px] font-extrabold uppercase tracking-wide transition-all ${
              activeCount > 0
                ? "bg-[#e60000] text-white hover:bg-[#c40000] cursor-pointer shadow-sm"
                : isDark
                ? "bg-white/5 text-white/25 cursor-not-allowed"
                : "bg-white text-slate-300 border border-slate-200 cursor-not-allowed"
            }`}
          >
            <X className="w-3 h-3" strokeWidth={3} />
            Clear All
          </button>
        </div>
      </div>

      {/* ================================================= */}
      {/* BOTTOM L-FOOT — FILTER OPTIONS                     */}
      {/* ================================================= */}
      <div
        className={`flex-1 w-full p-2.5 rounded-b-xl rounded-tl-xl flex flex-col gap-1.5 transition-colors -mt-px relative z-10 ${
          isDark ? "bg-[#202127]" : "bg-[#f1f5f7]"
        }`}
      >
        <FilterRow
          title="Campaign Type"
          options={campaignTypes}
          selected={selectedCampaignTypes}
          onChange={(value) =>
            toggleValue(value, selectedCampaignTypes, setSelectedCampaignTypes)
          }
          isOpen={openSection === "campaign"}
          onToggle={() => handleSectionToggle("campaign")}
          accent="#e60000"
          isDark={isDark}
        />

        <FilterRow
          title="Emotion"
          options={emotions}
          selected={selectedEmotions}
          onChange={(value) =>
            toggleValue(value, selectedEmotions, setSelectedEmotions)
          }
          isOpen={openSection === "emotion"}
          onToggle={() => handleSectionToggle("emotion")}
          accent="#7C3AED"
          isDark={isDark}
        />

        <FilterRow
          title="Target Audience"
          options={targetAudiences}
          selected={selectedAudiences}
          onChange={(value) =>
            toggleValue(value, selectedAudiences, setSelectedAudiences)
          }
          isOpen={openSection === "audience"}
          onToggle={() => handleSectionToggle("audience")}
          accent="#16A34A"
          isDark={isDark}
        />
      </div>
    </aside>
  );
};



const CARD_BACKGROUND_THEMES = [
  {
    bgLight: "#F4D5D2",
    borderLight: "#D99A95",
    bgDark: "#382124",
    borderDark: "#78434A",
  },
  {
    bgLight: "#E5E7EB",
    borderLight: "#C4C8CF",
    bgDark: "#25272D",
    borderDark: "#484C55",
  },
];

// =====================================================
// Main Scenario Page
// =====================================================

const Announcement = () => {
  const [search, setSearch] = useState("");
  // Difficulty colors exact to canvas design
const DIFFICULTY_THEMES = {
  Low: {
    bgLight: '#CEFBEA',
    bgDark: '#0D271E',
    border: '#A8F5D8',
    borderDark: '#174A37',
    btnBg: 'bg-[#B6F5DC] hover:bg-[#A0EFCF] dark:bg-[#12382A]',
    btnBorder: 'border-[#73D8B0] dark:border-[#1F5C44]',
    btnText: 'text-slate-900 dark:text-emerald-100',
    diffTextColor: 'text-[#16A34A] dark:text-[#4ADE80]'
  },
  Medium: {
    bgLight: '#FFEFCE',
    bgDark: '#2E200C',
    border: '#FFE19C',
    borderDark: '#4A3414',
    btnBg: 'bg-[#FFE4AC] hover:bg-[#FEDC94] dark:bg-[#402D12]',
    btnBorder: 'border-[#F8C86A] dark:border-[#5C411A]',
    btnText: 'text-slate-900 dark:text-amber-100',
    diffTextColor: 'text-amber-600 dark:text-amber-400'
  },
  High: {
    bgLight: '#ECE8FF',
    bgDark: '#22193E',
    border: '#D8D0FF',
    borderDark: '#392C63',
    btnBg: 'bg-[#DDD5FF] hover:bg-[#CDC1FF] dark:bg-[#322359]',
    btnBorder: 'border-[#B8A7FF] dark:border-[#4B3B7A]',
    btnText: 'text-slate-900 dark:text-purple-100',
    diffTextColor: 'text-purple-600 dark:text-purple-400'
  }
};
  const [selectedCampaignTypes, setSelectedCampaignTypes] = useState(["Data Entry"]);
  const [selectedEmotions, setSelectedEmotions] = useState(["Urgency"]);
  const [selectedAudiences, setSelectedAudiences] = useState(["All users"]);

  // Selected State
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [previewEmailHtml, setPreviewEmailHtml] = useState(null);
  const navigate = useNavigate();
  const userContext = useUserType?.() || {};
  const modalTheme = DIFFICULTY_THEMES[detailModalItem?.announcementDifficulty] || DIFFICULTY_THEMES.Low;

  // Theme check
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || !!userContext.isDark;
    }
    return !!userContext.isDark;
  });

  useEffect(() => {
    if (typeof userContext.isDark === 'boolean') {
      setIsDark(userContext.isDark);
    }
  }, [userContext.isDark]);

  useEffect(() => {
    const checkDark = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass || !!userContext.isDark);
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [userContext.isDark]);

  // Read scenarios from scenarioData.json, keep original index for a stable key
  // (two entries currently share id "PH-001", so id alone isn't unique)
  const scenariosList = (AnnouncamentScenariosJsonData?.announcement || []).map((s, idx) => ({
    ...s,
    _key: `${s.id}-${idx}`,
    announcementDifficulty: s.announcementDifficulty || 'Medium',
    announcementCreatedOn: s.announcementCreatedOn || s.createdDate || '2-Jan-26',
    announcementCoverImageID: s.announcementCoverImageID || `CovImg-${String(idx + 1).padStart(3, '0')}.png`
  }));

  const [selectedScenarioId, setSelectedScenarioId] = useState(() => {
      try {
        const draft = localStorage.getItem('voisshield_active_announcement_draft');
        return draft ? JSON.parse(draft)?.announcementScenarioId || scenariosList[0]?.announcementScenarioId : scenariosList[0]?.announcementScenarioId;
      } catch {
        return scenariosList[0]?.announcementScenarioId;
      }
    });

  // ---------------------------------------------------
  // Search (matches id, title, or type)
  // ---------------------------------------------------
  const filteredScenarios = useMemo(() => {
    if (!search.trim()) return scenariosList;

    const searchText = search.toLowerCase();

    return scenariosList.filter(
      (scenario) =>
        scenario.title?.toLowerCase().includes(searchText) ||
        scenario.announcementScenarioId?.toLowerCase().includes(searchText) ||
        scenario.type?.toLowerCase().includes(searchText) ||
        scenario.description?.toLowerCase().includes(searchText) ||
        scenario.announcementCampaignType?.toLowerCase().includes(searchText) ||
        scenario.intensityColor?.toLowerCase().includes(searchText) ||
        scenario.announcementCreatedOn?.toLowerCase().includes(searchText) ||
        scenario.announcementCoverImageID?.toLowerCase().includes(searchText)
    );
  }, [search, scenariosList]);

  

  // ---------------------------------------------------
  // Use announcement scenario
  // ---------------------------------------------------
  const handleUseScenario = (scenario) => {
    setSelectedScenarioId(scenario.announcementScenarioId);

    try {
      const existingDraft = localStorage.getItem('voisshield_active_announcement_draft');
      const draftObj = existingDraft ? JSON.parse(existingDraft) : {};

      const updatedDraft = {
        ...draftObj,
        isStartFresh: false,
        announcementScenarioId: scenario.announcementScenarioId,
        announcementScenarioName: scenario.announcementScenarioName,
        announcementCampaignTitle: draftObj.announcementCampaignTitle || scenario.announcementScenarioName,
        announcementCampaignDescription: draftObj.announcementCampaignDescription || scenario.announcementCampaignDescription,
        announcementCampaignType: scenario.announcementCampaignType,
        announcementTargetAudience: scenario.announcementTargetAudience,
        announcementDifficulty: scenario.announcementDifficulty,
        announcementSenderEmailId: scenario.announcementSenderEmailId,
        announcementSenderName: scenario.announcementSenderName,
        announcementEmailSubject: scenario.announcementEmailSubject,
        announcementEmailBody: scenario.announcementEmailBody || '',
        announcementCoverImageID: scenario.announcementCoverImageID
      };

      localStorage.setItem('voisshield_active_announcement_draft', JSON.stringify(updatedDraft));
    } catch (e) {
      console.error(e);
    }

    if (detailModalItem) setDetailModalItem(null);
    navigate('/announcements/details');
  };

  // ---------------------------------------------------
  // Card actions — wire these up to your real edit/clone/delete flows
  // ---------------------------------------------------
  const handleEdit = (scenario) => {
    // TODO: navigate to your scenario editor, e.g.
    // navigate(`/scenarios/${scenario.id}/edit`);
    console.log('Edit', scenario);
  };

  const handleClone = (scenario) => {
    // TODO: duplicate this scenario in your data source
    console.log('Clone', scenario);
  };

  const handleDelete = (scenario) => {
    // TODO: confirm + delete this scenario from your data source
    console.log('Delete', scenario);
  };

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>
      <div
        style={{ zoom: VarMySpaceScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 h-[calc(104vh-0px)] overflow-hidden"
      >
        {/* ================================================= */}
        {/* PAGE HEADER */}
        {/* ================================================= */}
        <div
        className={`w-full h-[38px] py-2.5 px-6 -mt-2 rounded-2xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${
          isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
        }`}
      >
          <div className="flex items-center gap-3">
            <h1 className="text-[14px] font-voda font-bold tracking-tight text-white dark:text-black uppercase">
              Announcement Template
            </h1>
          </div>
        </div>

        {/* ================================================= */}
        {/* UNIFIED CONTENT SHELL — one continuous white/dark
            background starting at the toolbar and wrapping
            the grid + filter panel together (previously the
            grid's <main> carried its own separate background) */}
        {/* ================================================= */}
        <div
          className={`w-full flex-1 min-h-0 rounded-xl border transition-colors duration-300 overflow-hidden p-4 sm:p-5 flex flex-col gap-3 ${
            isDark ? 'bg-[#15161a] border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >

        {/* ================================================= */}
        {/* TOOLBAR */}
        {/* ================================================= */}
        <div className="flex items-center justify-end gap-2.5 flex-shrink-0">
          
          <Link to="#">
            <button
              type="button"
              className={`
              h-[30px]
              pl-3
              pr-2.5
              rounded-lg
              text-[10px]
              font-voda
              font-bold
              uppercase
              tracking-wider
              flex
              items-center
              justify-center
              gap-2
              shadow-sm
              transition-all
              cursor-pointer
              ${
                isDark
                  ? "bg-white text-[#0B1121] hover:bg-slate-200"
                  : "bg-[#A83D43] text-white hover:bg-800"
              }
            `}
            >
              Announcement History
              <span
              className={`
                w-[18px]
                h-[18px]
                rounded-md
                flex
                items-center
                justify-center
                ${isDark ? "bg-[#0B1121]/10" : "bg-white/15"}
              `}
            >
              <NotebookPen className="w-3 h-3" strokeWidth={3} />
            </span>
              
            </button>
          </Link>
          
          <Link to="/new-announcement-details">
            <button
              type="button"
              className={`
              h-[30px]
              pl-3
              pr-2.5
              rounded-lg
              text-[10px]
              font-voda
              font-bold
              uppercase
              tracking-wider
              flex
              items-center
              justify-center
              gap-2
              shadow-sm
              transition-all
              cursor-pointer
              ${
                isDark
                  ? "bg-white text-[#0B1121] hover:bg-slate-200"
                  : "bg-[#06080D] text-white hover:bg-slate-800"
              }
            `}
            >
              CREATE NEW TEMPLATE
              <span
              className={`
                w-[18px]
                h-[18px]
                rounded-md
                flex
                items-center
                justify-center
                ${isDark ? "bg-[#0B1121]/10" : "bg-white/15"}
              `}
            >
              <Plus className="w-3 h-3" strokeWidth={3} />
            </span>
              
            </button>
          </Link>          

          <div className={`
              flex
              items-stretch
              h-[30px]
              rounded-lg
              overflow-hidden
              border
              shadow-sm
              transition-colors
              ${
                isDark
                  ? "bg-[#15161a] border-white/10"
                  : "bg-white border-slate-200"
              }
            `}>
            <input
              type="text"
              placeholder="Type here"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`
          flex-1
          min-w-0
          px-2
          text-[10px]
          font-medium
          bg-transparent
          outline-none
          ${
            isDark
              ? "text-white placeholder:text-white/30"
              : "text-slate-800 placeholder:text-slate-400"
          }
        `}
            />

            <button
              type="button"
              className={`
        w-[78px]
        flex-shrink-0
        flex
        items-center
        justify-center
        gap-1
        text-[8px]
        font-bold
        uppercase
        tracking-wide
        border-l
        transition-colors
        cursor-pointer
        ${
          isDark
            ? "border-white/10 bg-white/[0.04] text-white/60 hover:bg-white/[0.08] hover:text-white"
            : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-[#e60000]"
        }
      `}
            >
              <span className="leading-tight text-center">
                Search By
                <br />
                Name
              </span>
            </button>
          </div>
        </div>

        {/* ================================================= */}
        {/* CONTENT + FILTER */}
        {/* ================================================= */}
        <div className="flex flex-col lg:flex-row items-stretch gap-3.5 w-full flex-1 min-h-0">
          {/* ================================================= */}
          {/* SCENARIO GRID (card design lifted from ChooseAScenario, no stepper) */}
          {/* ================================================= */}
          <div className="flex-1 min-w-0 flex flex-col">
            <main className="relative flex-1 rounded-[8px] overflow-hidden flex flex-col">
              {filteredScenarios.length === 0 ? (
                <div
                  className={`h-[250px] flex items-center justify-center font-bold text-sm ${
                    isDark ? "text-white" : "text-[#0B1121]"
                  }`}
                >
                  No scenarios found.
                </div>
              ) : (
                <div className="flex-1 min-h-0 overflow-y-auto pr-3 items-start flex flex-wrap gap-4 content-start [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md">
                  {filteredScenarios.map((scenario, cardIndex) => {
                    
const dotColor =
  INTENSITY_COLORS[scenario.intensityColor] ||
  INTENSITY_COLORS.yellow;

// Six background colors, rotating by visible card position.
const cardBackgroundTheme =
  CARD_BACKGROUND_THEMES[
    cardIndex % CARD_BACKGROUND_THEMES.length
  ];

  const isOddCard = cardIndex % 2 === 0;

// Button colors follow the alternating card background.
const cardButtonTheme = isOddCard
  ? {
      // Muted red cards
      lightBg: "#A83D43",
      lightHover: "#8F3036",
      lightText: "#7E292F",
      lightBorder: "#A83D43",

      darkBg: "#C65A60",
      darkHover: "#D66B70",
      darkText: "#F2B7BA",
      darkBorder: "#C65A60",
    }
  : {
      // Cool grey cards
      lightBg: "#414854",
      lightHover: "#303640",
      lightText: "#30343B",
      lightBorder: "#414854",

      darkBg: "#596273",
      darkHover: "#687488",
      darkText: "#D6DAE1",
      darkBorder: "#788396",
    };

// Keep the existing difficulty theme for action buttons.
const difficultyKey = scenario.announcementDifficulty || "Medium";

const theme =
  DIFFICULTY_THEMES[difficultyKey] || DIFFICULTY_THEMES.Medium;

const resolvedImageSrc = getScenarioImage(
  scenario.announcementCoverImageID
);
                    

                    return (
  <div
    key={scenario._key}
    
style={{
  backgroundColor: isDark
    ? cardBackgroundTheme.bgDark
    : cardBackgroundTheme.bgLight,

  borderColor: isDark
    ? cardBackgroundTheme.borderDark
    : cardBackgroundTheme.borderLight,
}}
    className="
      relative
      rounded-3xl
      border
      transition-all
      duration-150
      overflow-hidden
      select-none
      w-full
      sm:w-[calc(50%-8px)]
      md:w-[calc(33.333%-11px)]
      lg:w-[calc(25%-12px)]
      min-w-[230px]
      max-w-[320px]
      h-[270px]
      shadow-2xs
      hover:shadow-md
      hover:-translate-y-0.5
      p-4
    "
  >
    {/* ================================================= */}
    {/* TOP ROW — ID LEFT + CLONE RIGHT */}
    {/* ================================================= */}
    <div className="flex items-center justify-between mb-1.5 z-10">

      {/* Scenario ID */}
      <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-white/80 dark:bg-black/50 shadow-2xs text-slate-900 dark:text-white">
        <span
          className="w-1.5 h-1.5 rounded-full flex-shrink-0"
          style={{ backgroundColor: dotColor }}
        />
        <span>{scenario.announcementScenarioId}</span>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            <span>Created on: {scenario.announcementCreatedOn}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDetailModalItem(scenario);
                              }}
                              className="p-1 rounded-md hover:bg-black/10 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                              title="View Full Scenario Details"
                            >
                              <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                            </button>
                          </div>
    </div>

    {/* ================================================= */}
    {/* CONTENT */}
    {/* ================================================= */}
    <div className="flex flex-col gap-1.5 text-left z-10 max-w-[70%]">

      {/* Title */}
      <h3 className="text-[13.5px] font-black text-slate-950 dark:text-white leading-tight tracking-tight">
        {scenario.announcementScenarioName}
      </h3>

      {/* Description */}
      {scenario.announcementDescription && (
        <p className="mt-2 text-[9.5px] leading-[1.25] text-slate-700 dark:text-white/70">
          <span className="font-bold">Description:</span>{" "}
          {scenario.announcementDescription}
        </p>
      )}

      <div className="text-[9.5px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      Type: {scenario.announcementCampaignType}
                    </div>

    </div>

    {/* ================================================= */}
    {/* IMAGE — BOTTOM RIGHT */}
    {/* ================================================= */}
    {resolvedImageSrc && (
      <div className="absolute -right-[10%] -bottom-[10%] w-[130px] h-[130px] pointer-events-none select-none flex items-center justify-center overflow-hidden">
        <img
          src={resolvedImageSrc}
          alt={scenario.announcementScenarioName}
          className="w-full h-full object-contain object-bottom-right"
          loading="eager"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
    )}

    {/* ================================================= */}
    {/* BOTTOM ACTIONS — EDIT + DELETE */}
    {/* ================================================= */}
    <div className="absolute left-2 bottom-4 flex items-center gap-1.5 z-20">

      {/* Edit */}
      {/* Edit */}
<button
  type="button"
  onClick={() => handleEdit(scenario)}
  className={`
    h-[26px]
    px-2
    rounded-xl
    text-[9.5px]
    font-bold
    flex
    items-center
    justify-center
    gap-1
    border
    transition-colors
    cursor-pointer
    ${
      isDark
        ? "bg-white/5 hover:bg-white/10"
        : "bg-white/60 hover:bg-white/90"
    }
  `}
  style={{
    color: isDark
      ? cardButtonTheme.darkText
      : cardButtonTheme.lightText,
    borderColor: isDark
      ? cardButtonTheme.darkBorder
      : cardButtonTheme.lightBorder,
  }}
>
  <Pencil className="w-3 h-3" />
</button>

      {/* Delete */}
      <button
        type="button"
        onClick={() => handleDelete(scenario)}
        className="
          h-[26px]
          px-2
          rounded-xl
          bg-[#e60000]
          hover:bg-[#ff2020]
          text-white
          text-[9.5px]
          font-bold
          flex
          items-center
          justify-center
          gap-1
          transition-colors
          cursor-pointer
        "
      >
        <Trash2 className="w-3 h-3" />
        
      </button>
     <button
  type="button"
  onClick={(e) => {
    e.stopPropagation();
    handleUseScenario(scenario);
  }}
  className={`
    h-[26px]
    px-1
    rounded-xl
    border
    text-[10px]
    font-bold
    transition-all
    cursor-pointer
    flex
    items-center
    gap-2
    shadow-2xs
    hover:scale-105
    active:scale-95
    z-10
  `}
  style={{
    backgroundColor: isDark
      ? cardButtonTheme.darkBg
      : cardButtonTheme.lightBg,
    borderColor: isDark
      ? cardButtonTheme.darkBorder
      : cardButtonTheme.lightBorder,
    color: "#FFFFFF",
  }}
>
  <span>Use This</span>
  <ArrowRight className="w-3 h-4 stroke-[2.5]" />
</button>

    </div>
  </div>
);
                  })}
                </div>
              )}
            </main>
          </div>
{/* ========================================================================= */}
        {/* ── 🌟 FULL SCENARIO SPECIFICATIONS MODAL                                 */}
        {/* ========================================================================= */}
        {detailModalItem && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            {(() => {
              const modalTheme = DIFFICULTY_THEMES[detailModalItem.difficulty] || DIFFICULTY_THEMES.Low;
              const modalImgSrc = getScenarioImage(detailModalItem.CoverImageID);

              return (
                <div
                  style={{
                    backgroundColor: isDark ? modalTheme.bgDark : modalTheme.bgLight,
                    borderColor: isDark ? modalTheme.borderDark : modalTheme.border
                  }}
                  className="w-full max-w-3xl rounded-[18px] border-2 p-6 sm:p-7 relative overflow-hidden shadow-2xl flex flex-col gap-4 text-slate-900 dark:text-white animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* Top Bar: Pill Badge (Left) + Go Back Button (Right) */}
                  <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-white/90 dark:bg-black/60 shadow-2xs text-slate-900 dark:text-white">
                      <span className="w-2 h-2 rounded-full bg-[#E60000]" />
                      <span>{detailModalItem.scenarioId}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setDetailModalItem(null)}
                      className="px-4 py-1.5 rounded-xl bg-slate-500/80 hover:bg-slate-600 text-white font-bold text-xs uppercase cursor-pointer transition-colors"
                    >
                      Go Back
                    </button>
                  </div>

                  {/* Title & Description */}
                  <div className="flex flex-col gap-1">
                    <h3 className="text-xl font-black tracking-tight text-slate-950 dark:text-white">
                      {detailModalItem.scenarioName}
                    </h3>
                    <p className="text-[12px] font-medium text-slate-700 dark:text-slate-300 leading-relaxed">
                      <strong>Description: </strong>
                      {detailModalItem.description}
                    </p>
                    <div className="text-[11px] font-bold text-slate-800 dark:text-slate-300 mt-0.5">
                      Created on: {detailModalItem.CreatedOn}
                    </div>
                  </div>

                  <div className="w-full h-px bg-slate-400/30 dark:bg-white/10" />

                  {/* 2x2 Specifications Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-6 text-[12px] font-medium text-slate-800 dark:text-slate-200">
                    <div>
                      <strong>Campaign Type: </strong>
                      <span>{detailModalItem.campaignType}</span>
                    </div>
                    <div>
                      <strong>Motivator: </strong>
                      <span>{detailModalItem.motivator || 'Security / Urgency'}</span>
                    </div>
                    <div>
                      <strong>Target Audience: </strong>
                      <span>{detailModalItem.targetAudience}</span>
                    </div>
                    <div>
                      <strong>Difficulty: </strong>
                      <span className={`font-bold ${modalTheme.diffTextColor}`}>
                        {detailModalItem.difficulty}
                      </span>
                    </div>
                  </div>

                  {/* Email & Target Users Information Box */}
                  <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/40 border border-black/5 dark:border-white/10 flex flex-col gap-2 relative z-10">
                    <h4 className="text-[13px] font-bold underline text-slate-900 dark:text-white">
                      Email & Target Users Information
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6 text-[11.5px] text-slate-700 dark:text-slate-300 font-medium">
                      <div>
                        <strong>Sender Email Id: </strong>
                        <span className="font-mono-tech">{detailModalItem.senderEmailId}</span>
                      </div>
                      <div>
                        <strong>Landing Page Id: </strong>
                        <span className="font-mono-tech">{detailModalItem.landingPageId || 'LP-001'}</span>
                      </div>
                      <div>
                        <strong>Sender Name: </strong>
                        <span>{detailModalItem.senderName}</span>
                      </div>
                      <div>
                        <strong>Training Id: </strong>
                        <span className="font-mono-tech">{detailModalItem.trainingId || 'TP-005'}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <strong>Email Subject: </strong>
                        <span>{detailModalItem.emailSubject}</span>
                      </div>
                    </div>

                    {/* Preview Email Body Button */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setPreviewEmailHtml(detailModalItem.emailBody)}
                        className="px-3 py-1 rounded-lg bg-white/90 dark:bg-black/60 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-white/15 text-[10.5px] font-bold flex items-center gap-1.5 hover:bg-white shadow-2xs cursor-pointer"
                      >
                        <span>Preview Email Body</span>
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  
                  
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
                {/* ── 🌟 SIMULATED EMAIL BODY PREVIEW POPUP MODAL                            */}
                {/* ========================================================================= */}
                {previewEmailHtml && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="w-full max-w-2xl bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-white/20 flex flex-col">
                      <div className="px-5 py-3 border-b border-slate-200 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-[#121418]">
                        <span className="text-xs font-bold text-slate-900 dark:text-white uppercase">
                          Simulated Email Payload Preview
                        </span>
                        <button
                          type="button"
                          onClick={() => setPreviewEmailHtml(null)}
                          className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="p-4 overflow-y-auto max-h-[60vh] bg-slate-50 dark:bg-black/50">
                        <div
                          className="bg-white p-5 rounded-xl shadow-xs border border-slate-200"
                          dangerouslySetInnerHTML={{
                            __html: previewEmailHtml
                              .replace(/{{userName}}/g, 'Abhay H S')
                              .replace(/{{email}}/g, 'abhay.hs1@vodafone.com')
                              .replace(/{{department}}/g, 'AI & Data Analytics')
                              .replace(/{{phishLink}}/g, '#training')
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
          {/* ================================================= */}
          {/* FILTER PANEL */}
          {/* ================================================= */}
          <AnnouncementScenarioFilters
            selectedCampaignTypes={selectedCampaignTypes}
            setSelectedCampaignTypes={setSelectedCampaignTypes}
            selectedEmotions={selectedEmotions}
            setSelectedEmotions={setSelectedEmotions}
            selectedAudiences={selectedAudiences}
            setSelectedAudiences={setSelectedAudiences}
            isDark={isDark}
          />
        </div>
        </div>
      </div>
    </>
  );
};

export default Announcement;
