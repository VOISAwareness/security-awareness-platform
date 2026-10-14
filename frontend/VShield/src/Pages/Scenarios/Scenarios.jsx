import React, { useMemo, useState, useEffect, useRef } from "react";
import {
  Plus,
  Search,
  ChevronDown,
  SlidersHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  Check,
  X,
  ExternalLink,
  Eye,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { useUserType } from "../../UserTypeContext/UserTypeContext";
import scenarioData from "./ScenariosData.json";
import { api } from "../../services/api";
import { currentActor } from "../../services/identity";
import { DELETE_KINDS, cardActions, scenariosForViewer } from "../../services/scenarioOwnership";
import { DEMO_USER } from '../../appConfig';
import DraftDialog from '../../GlobalComponents/DraftDialog';
import { setActiveScenarioDraftId } from '../../services/scenarioDraftList';
import {
  canSyncDrafts,
  deleteScenarioDraftEverywhere,
  editedScenarioIds,
  inProgressAmong,
  keptScenarioDrafts,
  loadScenarioDraftsTab,
  removeEditDraftsEverywhere,
  resolveInProgress,
  scenarioDraftsUnavailable,
} from '../../services/scenarioDraftSync';
import { markAsked, markDeferred, wasAsked } from '../../services/resumePrompt';
import DraftCards from '../../GlobalComponents/DraftCards';
import draftArt from '../../assets/CreateNewOneStartNewCampaign.png';
import ViewTabs from '../../GlobalComponents/ViewTabs';
import { SCENARIO_DRAFT_DEFAULTS } from './scenarioDraftDefaults';
import PageLoading from '../../GlobalComponents/PageLoading';

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
    return new URL(`../Scenarios/`+coverImageId, import.meta.url).href;
  } catch (e) {
    return `/assets/Scenarios/${coverImageId}`;
  }
};

// Same palette used in ChooseAScenario
const DIFFICULTY_THEMES = {
  Low: {
    bgLight: '#CEFBEA',
    bgDark: '#0D271E',
    border: '#A8F5D8',
    borderDark: '#174A37',
    btnBg: 'bg-[#B6F5DC] hover:bg-[#A0EFCF] dark:bg-[#12382A]',
    btnBorder: 'border-[#73D8B0] dark:border-[#1F5C44]',
    btnText: 'text-slate-900 dark:text-emerald-100',
    accent: '#16A34A'
  },
  Medium: {
    bgLight: '#FFEFCE',
    bgDark: '#2E200C',
    border: '#FFE19C',
    borderDark: '#4A3414',
    btnBg: 'bg-[#FFE4AC] hover:bg-[#FEDC94] dark:bg-[#402D12]',
    btnBorder: 'border-[#F8C86A] dark:border-[#5C411A]',
    btnText: 'text-slate-900 dark:text-amber-100',
    accent: '#D97706'
  },
  High: {
    bgLight: '#ECE8FF',
    bgDark: '#22193E',
    border: '#D8D0FF',
    borderDark: '#392C63',
    btnBg: 'bg-[#DDD5FF] hover:bg-[#CDC1FF] dark:bg-[#322359]',
    btnBorder: 'border-[#B8A7FF] dark:border-[#4B3B7A]',
    btnText: 'text-slate-900 dark:text-purple-100',
    accent: '#7C3AED'
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

// The ownership badge's dot (scenarioOwnership.js cardActions().badge).
const OWNERSHIP_DOT = {
  shared: '#22C55E',
  mine: '#64748B',
  myCopy: '#8B5CF6',
  myRevision: '#F59E0B',
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

const ScenarioFilters = ({
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

// =====================================================
// Main Scenario Page
// =====================================================

const Scenarios = () => {
  const [search, setSearch] = useState("");

  const [selectedCampaignTypes, setSelectedCampaignTypes] = useState(["Data Entry"]);
  const [selectedEmotions, setSelectedEmotions] = useState(["Urgency"]);
  const [selectedAudiences, setSelectedAudiences] = useState(["All users"]);
  const [detailModalItem, setDetailModalItem] = useState(null);
  const [previewEmailHtml, setPreviewEmailHtml] = useState(null);
  const navigate = useNavigate();

  // Who is looking: the list holds what they may see (their own copies and
  // pending edits standing in for what they replace), and Edit / Delete act as
  // them. Client-asserted until sign-in exists (identity.js).
  const [viewer] = useState(() => currentActor());

  // ---------------------------------------------------
  // Drafts: the author's unpublished scenarios (saved by the editor as they
  // work, on the server, so they are listed in any browser; see
  // scenarioDraftSync.js). Coming back here with one in progress asks, like
  // Start New Campaign, whether to pick it up or start a new one; either way it
  // stays under Drafts. It is asked once per draft: Continue or Start new
  // answers it, and only a change to it since then asks again. Closing it is
  // "not now": not asked again here, but asked once more when a new scenario
  // is started (resumePrompt.js). Which one is in progress, and what was
  // asked, is remembered in this browser.
  // ---------------------------------------------------
  // Coming back from the editor (its Back button) lands on the tab it was
  // opened from, without asking about the scenario just left.
  const location = useLocation();
  const [arrival] = useState(() => location.state || {});
  const [view, setView] = useState(arrival.view === 'drafts' ? 'drafts' : 'all'); // 'all' | 'drafts'
  // "Save as draft" in the editor lands here on Drafts, saying so.
  const [savedNotice, setSavedNotice] = useState(arrival.savedDraft || '');
  useEffect(() => {
    if (!savedNotice) return undefined;
    const timer = setTimeout(() => setSavedNotice(''), 6000);
    return () => clearTimeout(timer);
  }, [savedNotice]);
  // Used once: a reload of this page is an ordinary visit again.
  useEffect(() => {
    if (location.state) navigate(location.pathname, { replace: true, state: null });
  }, [location.state, location.pathname, navigate]);
  // The drafts kept in this browser show at once; the server's list (read
  // once a visit) is merged in when it arrives, and anything still waiting in
  // this browser is then sent. Without the server, this browser's drafts are
  // what is listed.
  const [drafts, setDrafts] = useState(() => keptScenarioDrafts(viewer, SCENARIO_DRAFT_DEFAULTS));
  const [draftsLoading, setDraftsLoading] = useState(() => canSyncDrafts(viewer) && !scenarioDraftsUnavailable());
  // The server's list was read on this visit (so Edit need not read it again).
  const [draftsListed, setDraftsListed] = useState(false);
  // The one in progress: { id, summary, version } (version: its content, as
  // "Continue your scenario?" remembers it).
  const [inProgress, setInProgress] = useState(() => inProgressAmong(drafts, viewer, SCENARIO_DRAFT_DEFAULTS));
  const notAskedYet = (found) => Boolean(found?.version) && !wasAsked('scenario', found.id, found.version);
  const [resumePromptOpen, setResumePromptOpen] = useState(() => !arrival.fromEditor && notAskedYet(inProgress));
  // Asked about on arrival only: decided once, from this browser's drafts when
  // the one in progress is among them, else once the server's list is in.
  const promptDecidedRef = useRef(Boolean(arrival.fromEditor || inProgress));
  useEffect(() => {
    let active = true;
    const apply = async ({ items, ok }) => {
      const found = await resolveInProgress(items, viewer, api, SCENARIO_DRAFT_DEFAULTS);
      if (!active) return;
      setDrafts(items);
      setInProgress(found);
      setDraftsLoading(false);
      setDraftsListed(ok);
      if (!promptDecidedRef.current) {
        promptDecidedRef.current = true;
        if (notAskedYet(found)) setResumePromptOpen(true);
      }
    };
    const { listed, sent } = loadScenarioDraftsTab({ api, actor: viewer, defaults: SCENARIO_DRAFT_DEFAULTS });
    listed.then(apply).then(() => sent).then(apply);
    return () => {
      active = false;
    };
  }, [viewer]);
  const inProgressInfo = inProgress ? inProgress.summary : null;
  // Whatever the answer, this draft (as it is now) has been asked about.
  const answerResumePrompt = () => {
    if (inProgress) markAsked('scenario', inProgress.id, inProgress.version);
    setResumePromptOpen(false);
  };
  // Closed without an answer ("not now"): not asked again on the way back
  // here, but the editor asks again once a new scenario is started.
  const notNowResumePrompt = () => {
    if (inProgress) markDeferred('scenario', inProgress.id, inProgress.version);
    setResumePromptOpen(false);
  };

  const continueDraft = (id, from = 'drafts') =>
    navigate(`/new-scenario?draft=${encodeURIComponent(id)}`, { state: { from } });
  // "Start new" files the scenario in progress under Drafts for good: it is no
  // longer the one in progress, so coming back here does not ask about it again.
  const startNewScenario = () => {
    setActiveScenarioDraftId('');
    navigate('/new-scenario', { state: { startFresh: true } });
  };
  // Gone at once here; the server is told now, or at the next visit.
  const deleteDraft = (id) => {
    const item = drafts.find((d) => d.id === id);
    deleteScenarioDraftEverywhere(api, id, viewer, { listed: Boolean(item?.listed) });
    setDrafts((list) => list.filter((d) => d.id !== id));
    if (inProgress?.id === id) setInProgress(null);
  };
  // Drafts take the same rotating card colours as the templates, and show
  // their cover: catalogue art in the corner, an uploaded photo framed, and
  // the "new design" art while no cover has been picked yet.
  const draftItems = drafts.map((d, i) => {
    const info = d.summary;
    const uploaded = info.coverSource === 'upload';
    return {
      ...info,
      id: d.id,
      code: info.scenarioId,
      // An unfinished edit is named by the scenario it edits.
      title: info.editing ? `Editing: ${info.editing.name}` : info.name,
      inProgress: d.id === inProgress?.id,
      theme: DIFFICULTY_THEMES[THEME_CYCLE[i % THEME_CYCLE.length]],
      image: uploaded ? '' : info.cover || draftArt,
      photo: uploaded ? info.cover : '',
    };
  });
  const searchText = search.trim().toLowerCase();
  const visibleDrafts = searchText
    ? draftItems.filter((d) => [d.title, d.code, d.description].some((v) => v.toLowerCase().includes(searchText)))
    : draftItems;
  const userContext = useUserType?.() || {};

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

  const [rawScenarios, setRawScenarios] = useState([]);
  const [scenariosLoading, setScenariosLoading] = useState(true);
  // Bumped after a delete, to read the list again.
  const [listVersion, setListVersion] = useState(0);
  // Card actions in flight, keyed by scenarioId (never by list position: the
  // list reloads after every delete, and a position may then hold another
  // scenario). An open "Yes / No" confirmation, the deletes under way, and a
  // refused one's message.
  const [confirmId, setConfirmId] = useState(null);
  const [busyIds, setBusyIds] = useState({});
  const [cardError, setCardError] = useState(null); // { id, message }

  useEffect(() => {
    let active = true;
    const apply = (rows) => {
      if (!active) return;
      setScenariosLoading(false);
      // An older API sends every row, unannotated: keep what this person may see.
      const visible = scenariosForViewer(rows, viewer);
      // A DynamoDB scan is unordered and the cover fallback below is
      // index-based, so pin the order before it reaches the grid.
      setRawScenarios(
        [...visible].sort((a, b) =>
          String(a.scenarioId || '').localeCompare(String(b.scenarioId || ''))
        )
      );
      // A confirmation or message about a scenario no longer listed goes with it.
      const listed = (id) => visible.some((row) => String(row?.scenarioId) === id);
      setConfirmId((id) => (id && listed(id) ? id : null));
      setCardError((error) => (error && listed(error.id) ? error : null));
    };
    api.scenarios
      .list({ viewer })
      .then(apply)
      // Falling back to the bundled data keeps the screen usable if the API is
      // unreachable, which is also how ChooseAScenario behaves.
      .catch((e) => {
        console.error('Failed to load scenarios', e);
        apply(scenarioData?.scenarios || []);
      });
    return () => {
      active = false;
    };
  }, [viewer, listVersion]);

  // Cards are keyed by scenarioId (the table's key), so a card, and anything
  // open on it, stays with its scenario when the list reloads; the index only
  // stands in for a row without one (bundled fallback data). `_row` is the row
  // as the API sent it, for the editor (the display defaults below must never
  // be saved back).
  const scenariosList = rawScenarios.map((s, idx) => ({
    ...s,
    _row: s,
    _key: s.scenarioId ? `sc:${s.scenarioId}` : `row:${idx}`,
    difficulty: s.difficulty || 'Medium',
    CreatedOn: s.CreatedOn || s.createdDate || '2-Jan-26',
    CoverImageID: s.CoverImageID || `CovImg-${String(idx + 1).padStart(3, '0')}.png`
  }));

  // ---------------------------------------------------
  // Search (matches id, title, or type)
  // ---------------------------------------------------
  // One of the person's own scenarios with unsaved changes shows in one place
  // only: under Drafts as "Editing: <name>", not also here. It is back in this
  // list once the edit is saved or its draft deleted. A template (or someone
  // else's shared scenario) always stays here: its edit is a new version.
  const editingIds = useMemo(() => editedScenarioIds(drafts), [drafts]);

  const filteredScenarios = useMemo(() => {
    const listed = scenariosList.filter((scenario) => !editingIds.has(String(scenario.scenarioId)));
    if (!search.trim()) return listed;

    const searchText = search.toLowerCase();

    return listed.filter(
      (scenario) =>
        scenario.title?.toLowerCase().includes(searchText) ||
        scenario.id?.toLowerCase().includes(searchText) ||
        scenario.type?.toLowerCase().includes(searchText) ||
        scenario.description?.toLowerCase().includes(searchText) ||
        scenario.campaignType?.toLowerCase().includes(searchText) ||
        scenario.intensityColor?.toLowerCase().includes(searchText) ||
        scenario.CreatedOn?.toLowerCase().includes(searchText) ||
        scenario.CoverImageID?.toLowerCase().includes(searchText)
    );
  }, [search, scenariosList, editingIds]);

  

  // ---------------------------------------------------
  // Card actions, per who owns the scenario (scenarioOwnership.js):
  // Edit opens the editor on it (a template or someone else's shared scenario
  // is saved as the viewer's own copy; their own shared one as a pending edit);
  // Delete / Reset to original / Discard changes remove the viewer's own row
  // after an inline "Yes / No".
  // ---------------------------------------------------
  // An unfinished edit of this scenario, if any, is reopened by the editor.
  // A scenario with one on the server is listed under Drafts instead, so when
  // the server's list was read here, the editor need not look for one there.
  // A template stays listed while an edit of it is unfinished, so Edit on it
  // reopens that draft (the newest, should there be two) rather than start
  // another. Otherwise a new edit: takenIds is what an edited version of a
  // template must not be called (every scenario listed here, and the
  // drafts'), so the editor can give it a new ID at once; editChecked says
  // the drafts were read here and hold no unfinished edit of it.
  const handleEdit = (scenario) => {
    const sid = String(scenario.scenarioId);
    const unfinished = drafts
      .filter((d) => String(d.summary?.editing?.scenarioId || '') === sid)
      .sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)))[0];
    if (unfinished) {
      continueDraft(unfinished.id, 'all');
      return;
    }
    const takenIds = [
      ...rawScenarios.map((row) => row?.scenarioId),
      ...drafts.map((d) => d.summary?.scenarioId),
    ].filter(Boolean).map(String);
    navigate(`/new-scenario?edit=${encodeURIComponent(sid)}`, {
      state: { row: scenario._row, from: 'all', editChecked: draftsListed, takenIds },
    });
  };

  const handleDelete = async (scenario) => {
    const id = String(scenario.scenarioId);
    setConfirmId(null);
    setCardError(null);
    setBusyIds((busy) => ({ ...busy, [id]: true }));
    try {
      await api.scenarios.remove(id, viewer);
      // An unfinished edit of it has nothing left to save onto: deleted here
      // and on the server (which keeps no link between the two).
      removeEditDraftsEverywhere(api, id, drafts, viewer);
      const editsIt = (d) => String(d.summary?.editing?.scenarioId || '') === id;
      setDrafts((list) => list.filter((d) => !editsIt(d)));
      if (inProgress && drafts.some((d) => d.id === inProgress.id && editsIt(d))) setInProgress(null);
      setListVersion((v) => v + 1);
    } catch (error) {
      setCardError({ id, message: error?.message || "Couldn't remove this scenario." });
    } finally {
      setBusyIds((busy) => {
        const rest = { ...busy };
        delete rest[id];
        return rest;
      });
    }
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
          <h1 className="text-[13.5px] font-bold tracking-tight uppercase">
              Scenario
            </h1>
          </div>
          {/* All scenarios | Drafts */}
          <ViewTabs
            variant="header"
            ariaLabel="Scenarios view"
            isDark={isDark}
            value={view}
            onChange={setView}
            tabs={[
              { id: 'all', label: 'All scenarios' },
              { id: 'drafts', label: 'Drafts', count: drafts.length },
            ]}
          />
        </div>

        {/* ================================================= */}
        {/* UNIFIED CONTENT SHELL — one continuous white/dark
            background starting at the toolbar and wrapping
            the grid + filter panel together (previously the
            grid's <main> carried its own separate background) */}
        {/* ================================================= */}
        <div
          className={`relative w-full flex-1 min-h-0 rounded-xl border transition-colors duration-300 overflow-hidden p-4 sm:p-5 flex flex-col gap-3 ${
            isDark ? 'bg-[#15161a] border-white/10 shadow-xl' : 'bg-white border-slate-200 shadow-sm'
          }`}
        >
        {/* The scenarios, or the drafts, are on their way from the server
            (a scenario with an unfinished edit is listed under Drafts only, so
            the scenarios wait for the drafts too). */}
        <PageLoading show={view === 'all' ? scenariosLoading || draftsLoading : draftsLoading} isDark={isDark} />

        {/* ================================================= */}
        {/* TOOLBAR */}
        {/* ================================================= */}
        <div className="flex items-center justify-end gap-2.5 flex-shrink-0">
          <Link to="/new-scenario">
            <button
              type="button"
              className={`
              h-[30px]
              pl-3
              pr-2.5
              -mt-2
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
              CREATE NEW
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
              -mt-2
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
              {view === 'drafts' ? (
                <>
                {savedNotice && (
                  <span
                    role="status"
                    className="mx-4 mt-3 self-start px-3 py-1.5 rounded-lg text-[10.5px] font-bold bg-[#8ED973]/15 text-[#2F7A17] dark:text-[#A6E88E]"
                  >
                    Saved to Drafts: {savedNotice}. Continue it any time from its card.
                  </span>
                )}
                <DraftCards
                  items={visibleDrafts}
                  isDark={isDark}
                  onContinue={(id) => continueDraft(id)}
                  onDelete={deleteDraft}
                  emptyText="A scenario you start and leave before publishing is kept here."
                />
                </>
              ) : filteredScenarios.length === 0 ? (
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
                    const dotColor = INTENSITY_COLORS[scenario.intensityColor] || INTENSITY_COLORS.yellow;
                    const themeKey = THEME_CYCLE[cardIndex % THEME_CYCLE.length];
                    const theme = DIFFICULTY_THEMES[themeKey];
                    const resolvedImageSrc = getScenarioImage(scenario.CoverImageID);
                    const actions = cardActions(scenario._row, viewer);
                    const removal = actions.deleteKind ? DELETE_KINDS[actions.deleteKind] : null;
                    const confirming = confirmId === scenario.scenarioId;
                    const error = cardError?.id === scenario.scenarioId ? cardError.message : '';

                    return (
  <div
    key={scenario._key}
    data-scenario-id={scenario.scenarioId}
    data-ownership={actions.ownership}
    style={{
      backgroundColor: isDark ? theme.bgDark : theme.bgLight,
      borderColor: isDark ? theme.borderDark : theme.border,
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
        <span>{scenario.scenarioId}</span>
      </div>

      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-700 dark:text-slate-300">
                            <span>Created on: {scenario.CreatedOn}</span>
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

      {/* Whose it is, for this viewer (none on a template) */}
      {actions.badge && (
        <span
          title={actions.badgeHint}
          className="self-start inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wide bg-white/70 dark:bg-black/40 text-slate-700 dark:text-slate-300 cursor-help"
        >
          <span
            className="w-1.5 h-1.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: OWNERSHIP_DOT[actions.ownership] || OWNERSHIP_DOT.mine }}
          />
          {actions.badge}
        </span>
      )}

      {/* Title */}
      <h3 className="text-[13.5px] font-black text-slate-950 dark:text-white leading-tight tracking-tight">
        {scenario.scenarioName}
      </h3>

      {/* Description */}
      {scenario.description && (
        <p className="mt-2 text-[9.5px] leading-[1.25] text-slate-700 dark:text-white/70">
          <span className="font-bold">Description:</span>{" "}
          {scenario.description}
        </p>
      )}

      <div className="text-[9.5px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      Type: {scenario.campaignType}
                    </div>

    </div>

    {/* ================================================= */}
    {/* IMAGE — BOTTOM RIGHT */}
    {/* ================================================= */}
    {resolvedImageSrc && (
      <div className="absolute -right-[10%] -bottom-[10%] w-[135px] h-[135px] pointer-events-none select-none flex items-center justify-center overflow-hidden">
        <img
          src={resolvedImageSrc}
          alt={scenario.scenarioName}
          className="w-full h-full object-contain object-bottom-right"
          loading="eager"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      </div>
    )}

    {/* ================================================= */}
    {/* BOTTOM ACTIONS — EDIT + DELETE (per ownership)    */}
    {/* ================================================= */}
    {/* Deleting a shared scenario takes it away from everyone: say so first. */}
    {confirming && removal?.warning && !error && (
      <div
        role="note"
        className="absolute left-4 right-4 bottom-[46px] z-20 px-2 py-1 rounded-lg bg-amber-50 dark:bg-[#2B2210] text-[9.5px] font-bold leading-snug text-amber-800 dark:text-amber-200 shadow-2xs"
      >
        {removal.warning}
      </div>
    )}
    {error && (
      <div
        role="alert"
        className="absolute left-4 right-4 bottom-[46px] z-20 flex items-start gap-1.5 px-2 py-1 rounded-lg bg-white/90 dark:bg-black/60 text-[9.5px] font-bold text-[#E60000] dark:text-[#FF8A8A] shadow-2xs"
      >
        <span className="flex-1 leading-snug">{error}</span>
        <button
          type="button"
          onClick={() => setCardError(null)}
          aria-label="Dismiss"
          className="flex-shrink-0 cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    )}
    {/* Wraps rather than run past the card on a narrow one (the card clips). */}
    <div className="absolute left-4 right-4 bottom-4 flex flex-wrap items-center gap-1.5 z-20 text-[9.5px] font-bold pointer-events-none [&>*]:pointer-events-auto">
      {busyIds[scenario.scenarioId] ? (
        <span className="h-[26px] flex items-center text-slate-700 dark:text-slate-300">Working…</span>
      ) : confirming && removal ? (
        <>
          <span className="text-slate-800 dark:text-slate-200">{removal.confirm}</span>
          <button
            type="button"
            onClick={() => handleDelete(scenario)}
            className="h-[26px] px-2 rounded-lg bg-[#e60000] hover:bg-[#ff2020] text-white cursor-pointer shadow-2xs whitespace-nowrap"
          >
            {removal.yes}
          </button>
          <button
            type="button"
            onClick={() => setConfirmId(null)}
            className="h-[26px] px-2 rounded-lg border bg-white/90 dark:bg-black/40 border-black/10 dark:border-white/15 text-slate-800 dark:text-slate-200 cursor-pointer"
          >
            No
          </button>
        </>
      ) : (
        <>
      {/* Edit */}
      <button
        type="button"
        onClick={() => handleEdit(scenario)}
        title={actions.editMode === 'copy' ? 'Edit your own copy (only you see it)' : undefined}
        className={`
          h-[26px]
          px-2
          rounded-lg
          text-[9.5px]
          font-bold
          flex
          items-center
          justify-center
          gap-1
          border
          transition-colors
          cursor-pointer
          ${theme.btnBg}
          ${theme.btnBorder}
          ${theme.btnText}
        `}
      >
        <Pencil className="w-3 h-3" />
        Edit
      </button>

      {/* Delete / Reset to original / Discard changes — own rows only */}
      {removal && (
        <button
          type="button"
          onClick={() => {
            setCardError(null);
            setConfirmId(scenario.scenarioId);
          }}
          className="
            h-[26px]
            px-2
            rounded-lg
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
            whitespace-nowrap
          "
        >
          {actions.deleteKind === 'delete' || actions.deleteKind === 'deleteShared' ? (
            <Trash2 className="w-3 h-3" />
          ) : (
            <RotateCcw className="w-3 h-3" />
          )}
          {removal.label}
        </button>
      )}

        </>
      )}
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
                              .replace(/{{userName}}/g, DEMO_USER.name)
                              .replace(/{{email}}/g, DEMO_USER.email)
                              .replace(/{{department}}/g, 'AI & Data Analytics')
                              .replace(/{{phishLink}}/g, '#training')
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}
          {/* ================================================= */}
          {/* FILTER PANEL (templates only) */}
          {/* ================================================= */}
          {view === 'all' && (
            <ScenarioFilters
              selectedCampaignTypes={selectedCampaignTypes}
              setSelectedCampaignTypes={setSelectedCampaignTypes}
              selectedEmotions={selectedEmotions}
              setSelectedEmotions={setSelectedEmotions}
              selectedAudiences={selectedAudiences}
              setSelectedAudiences={setSelectedAudiences}
              isDark={isDark}
            />
          )}
        </div>
        </div>
      </div>

      {/* A scenario in progress: pick it up, or start a new one. The ✕, Esc
          or a click outside closes it for now: the draft stays under Drafts,
          and the question comes back when a new scenario is started. */}
      <DraftDialog
        open={resumePromptOpen && Boolean(inProgressInfo)}
        isDark={isDark}
        title={inProgressInfo?.editing ? `Continue editing ${inProgressInfo.editing.name}?` : 'Continue your scenario?'}
        body={`${
          inProgressInfo?.editing
            ? 'You have unsaved changes to this scenario. Pick up where you left off, or start a new scenario. Your changes stay under Scenarios → Drafts either way.'
            : 'You have a scenario in progress. Pick up where you left off, or start a new one. Your saved scenario stays under Scenarios → Drafts either way.'
        }${
          inProgressInfo?.needsCoverReattach
            ? ' Its uploaded cover image could not be kept and will need to be attached again.'
            : ''
        }`}
        detail={
          inProgressInfo ? (
            <>
              <span className="block">{inProgressInfo.name}</span>
              <span className="block mt-0.5 font-medium opacity-80">
                Saved at step {inProgressInfo.step} of {inProgressInfo.stepCount}: {inProgressInfo.stepName}
              </span>
            </>
          ) : null
        }
        primaryLabel="Continue"
        onPrimary={() => {
          answerResumePrompt();
          continueDraft(inProgress.id, 'all');
        }}
        secondaryLabel="Start new"
        onSecondary={() => {
          answerResumePrompt();
          startNewScenario();
        }}
        onClose={notNowResumePrompt}
        onDismiss={notNowResumePrompt}
      />
    </>
  );
};

export default Scenarios;
