import React, { useState, useRef, useEffect } from 'react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import ReviewPublishDashboard from './ReviewPublishDashboard';
import imageCatalogue from "./imageCatalogue.json";
import { api } from "../../services/api";
import { catalogueCoverName, landingPageChoice, toEditFormData, toStoredScenario } from "../../services/scenarioMapper";
import { formFingerprint, fromDraft, reusableCoverKey, withUniqueCoverName } from "../../services/scenarioDraft";
import { scenarioEditorOpening } from "../../services/scenarioDraftList";
import { loadScenarioEditorOpening, openingNeedsServer } from "../../services/scenarioDraftSync";
import { makeCoverThumbnail, useScenarioDraft } from "../../services/useScenarioDraft";
import { currentActor } from "../../services/identity";
import {
  canOpenForEdit,
  conflictMessage,
  editContext,
  editNote,
  existingVersionId,
  idLockHint,
  refreshEdit,
  refreshNotice,
  rowToEdit,
  savedAudience,
  toSavePayload,
} from "../../services/scenarioOwnership";
import DraftDialog from '../../GlobalComponents/DraftDialog';
import SaveDraftButton from '../../GlobalComponents/SaveDraftButton';
import PageLoading from '../../GlobalComponents/PageLoading';
import initialLandingCatalogues from '../LandingPageCatalogue/LandingPageCatalogues.json';
import trainingPathsJson from '../Training/TrainingPath.json';
import trainingQuizzesJson from '../Training/TrainingQuiz.json';
import RenderEditorWorkspace from './RenderEditorWorkspace';
import { DEFAULT_EMAIL_BODY, SCENARIO_DRAFT_DEFAULTS } from "./scenarioDraftDefaults";
import AttachOutcomesTab from "./AttachOutcomes";
import EmailDetailsTab from "./EmailDetailsTab";
import { createPortal } from 'react-dom';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';

import {
  ChevronRight,
  ChevronLeft,
  Check,
  FileText,
  Link2,
  Image as ImageIcon,
  Send,
  X,
  Eye,
  CheckCircle2,
  Search,
  Plus,
  Clock3,
  Video,
  CircleHelp,
  Award,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Info,
} from 'lucide-react';

// ============================================================
// SCALE / DESIGN VARIABLES
// ============================================================
const VarScenarioScale = 0.975;

const VarOverallScenarioRoundednessScale = 0.75;

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');

  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Vodafone', 'Montserrat', 'Plus Jakarta Sans', sans-serif;
    font-weight: 900;
  }

  .rounded-2xl {
    border-radius: ${Math.round(16 * VarOverallScenarioRoundednessScale)}px !important;
  }

  .rounded-xl {
    border-radius: ${Math.round(12 * VarOverallScenarioRoundednessScale)}px !important;
  }

  .rounded-lg {
    border-radius: ${Math.round(8 * VarOverallScenarioRoundednessScale)}px !important;
  }

  .rounded-md {
    border-radius: ${Math.round(6 * VarOverallScenarioRoundednessScale)}px !important;
  }
`;

const FX_PARAMETERS = [
  { label: '@UserName', code: '{{userName}}', desc: 'Target user full name' },
  { label: '@UserEmailID', code: '{{email}}', desc: 'Target user email address' },
  { label: '@UserDepartment', code: '{{department}}', desc: 'Target user department' },
  { label: '@UserCountry', code: '{{country}}', desc: 'Target user work location' },
  { label: '@PhishLink', code: '{{phishLink}}', desc: 'Simulation trackable landing link' },
  { label: '@ManagerName', code: '{{managerName}}', desc: 'Target direct reporting manager' },
  { label: '@EmployeeID', code: '{{employeeId}}', desc: 'Corporate employee badge number' },
  { label: '@CurrentDate', code: '{{currentDate}}', desc: 'Simulation execution timestamp' }
];


// ============================================================
// REUSABLE INPUT (dark bg updated for contrast against tinted L-shape)
// ============================================================
// `disabled` shows the value read-only (the scenario ID while editing), with
// `hint` saying why on hover.
const FormInput = ({ label, value, onChange, placeholder = 'Type here', disabled = false, hint = '' }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[12.5px] mb-2 font-bold text-slate-900 dark:text-white leading-none">
        {label} <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
      </label>
      <div
        title={hint || undefined}
        className={`w-full h-7 px-2.5 mb-2 rounded-xl flex items-center shadow-2xs relative ${
          disabled ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-white text-slate-900'
        }`}
      >
            <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={disabled}
        aria-readonly={disabled || undefined}
        className="
          w-full bg-transparent text-[10.5px] font-medium outline-none placeholder-slate-400 disabled:cursor-not-allowed
        "
      />
           </div>
      
    </div>
  );
};

// ============================================================
// REUSABLE SELECT
// ============================================================
const FormSelect = ({
  label,
  value,
  onChange,
  options = [],
}) => {
  // A stored scenario can carry a value these options don't offer ("Credential
  // theft"); it is listed too, so editing shows it instead of "Select".
  const shown =
    value && !options.some((option) => option.value === value)
      ? [...options, { value, label: value }]
      : options;
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[12.5px] mb-2 font-bold text-slate-900 dark:text-white leading-none">
        {label} <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
      </label>
     <div className="w-full bg-transparent text-[10.5px] font-medium outline-none cursor-pointer appearance-none">
      <select
        value={value}
        onChange={onChange}
        className="
          w-full h-7 px-2.5 mb-2 rounded-xl flex items-center shadow-2xs relative bg-white text-slate-900
          dark:bg-[#202127]
          dark:border-white/10
          dark:text-white
          dark:focus:border-[#F8B2C0]
        "
      >
        <option value="">Select</option>

        {shown.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
     </div>
      
    </div>
  );
};

// ============================================================
// REUSABLE TEXTAREA
// ============================================================
const FormTextarea = ({
  label,
  value,
  onChange,
  placeholder = 'Type here',
  rows = 5,
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[12.5px] py-2.5 mt-2 font-bold text-slate-900 dark:text-white leading-none">
        {label} <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
      </label>

      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="
          w-full
          px-3
          py-2.5
          rounded-lg
          border
          bg-white
          border-slate-200
          text-slate-800
          placeholder:text-slate-400
          text-[10px]
          font-semibold
          outline-none
          resize-none
          transition-all
          focus:border-[#990099]
          focus:ring-2
          focus:ring-[#990099]/10
          dark:bg-[#202127]
          dark:border-white/10
          dark:text-white
          dark:placeholder:text-slate-500
          dark:focus:border-[#F8B2C0]
        "
      />
    </div>
  );
};

// ============================================================
// TAB HEADER (Docked Stepper Strip style — matches ChooseAScenario.jsx)
// NOTE: This now renders *inside* the shared white/dark shell in
// NewScenario's main return, so it no longer carries its own
// border/rounded-corner/background — only a bottom divider.
// ============================================================
const ScenarioTabs = ({ activeTab, onTabChange, editing = false }) => {
  const { isDark } = useUserType?.() || { isDark: false };

  const steps = [
    { id: 0, titleLine1: 'Scenario', titleLine2: 'Details' },
    { id: 1, titleLine1: 'Email', titleLine2: 'Details' },
    { id: 2, titleLine1: 'Attach', titleLine2: 'Outcomes' },
    { id: 3, titleLine1: 'Review &', titleLine2: editing ? 'Save' : 'Publish' },
  ];

  return (
    <div
      className="
        w-full
        h-12
        flex
        items-stretch
        border-slate-200
        dark:border-white/10
        select-none
      "
    >
      {steps.map((step) => {
        const isCurrent = activeTab === step.id;
        const isCompleted = activeTab > step.id;

        return (
          <button
            key={step.id}
            type="button"
            disabled={!isCurrent}
            onClick={() => {
              // Prevent changing tabs by clicking
              // Navigation is controlled only by BACK and NEXT
              if (isCurrent) {
                onTabChange(step.id);
              }
            }}
            className={`
              flex-1
              flex
              items-center
              justify-center
              gap-3
              px-4
              py-3
              transition-all

              ${
                isCurrent
                  ? `
                    bg-[#06080D]
                    dark:bg-white
                    text-white
                    dark:text-black
                    shadow-sm
                    cursor-default
                  `
                  : `
                    cursor-not-allowed
                    ${
                      isCompleted
                        ? 'bg-[#06080D] text-[#8ED973] dark:text-[#74D054]'
                        : ''
                    }
                  `
              }
            `}
          >
            <div
              className={`
                w-6
                h-6
                rounded-full
                flex
                items-center
                justify-center
                text-[11px]
                font-black
                flex-shrink-0
                transition-colors

                ${
                  isCurrent
                    ? 'bg-white dark:bg-black text-black dark:text-white'
                    : isCompleted
                      ? 'bg-[#22c55e] text-white'
                      : 'bg-slate-900 text-white dark:bg-white dark:text-black'
                }
              `}
            >
              {isCompleted && !isCurrent ? (
                <Check className="w-3 h-3 stroke-[3]" />
              ) : (
                step.id + 1
              )}
            </div>

            <div className="flex flex-col text-left leading-tight text-[11px] font-voda font-bold tracking-tight">
              <span>{step.titleLine1}</span>
              <span>{step.titleLine2}</span>
            </div>
          </button>
        );
      })}
    </div>
  );
};

// ============================================================
// SCENARIO DETAILS TAB — TRUE L-SHAPE (matches DetailsAndSettings.jsx)
// Field order: Scenario ID/Name (top arm) → Type/Target Audience
// → Motivator/Difficulty → Description (bottom base).
// Email side: Email ID/Sender (top arm) → Email Subject → Email Body.
// ============================================================
const ScenarioDetailsTab = ({
  formData,
  setFormData,
  goNext,
  goBack,
  setErrorMsg,
  // While editing, the scenario's ID can't change; this says why.
  idLockedHint = '',
}) => {
  const { isDark } = useUserType?.() || { isDark: false };

  const subjectFxRef = useRef(null);
  const editorFxRef = useRef(null);
  const userListDropdownRef = useRef(null);
  const singleUserDropdownRef = useRef(null);

  const [showSubjectFxMenu, setShowSubjectFxMenu] = useState(false);
  const [showEditorFxMenu, setShowEditorFxMenu] = useState(false);

  // =========================================================
  // UPDATE FORM FIELD
  // =========================================================
  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  // =========================================================
  // CLICK OUTSIDE
  // =========================================================
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        editorFxRef.current &&
        !editorFxRef.current.contains(e.target)
      ) {
        setShowEditorFxMenu(false);
      }

      if (
        subjectFxRef.current &&
        !subjectFxRef.current.contains(e.target)
      ) {
        setShowSubjectFxMenu(false);
      }

      if (
        userListDropdownRef.current &&
        !userListDropdownRef.current.contains(e.target)
      ) {
        if (typeof setIsDropdownOpen === "function") {
          setIsDropdownOpen(false);
        }
      }

      if (
        singleUserDropdownRef.current &&
        !singleUserDropdownRef.current.contains(e.target)
      ) {
        if (
          typeof setIsSingleUserDropdownOpen === "function"
        ) {
          setIsSingleUserDropdownOpen(false);
        }
      }
    };

    document.addEventListener(
      "mousedown",
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClickOutside
      );
    };
  }, []);

  const shellBg = isDark
    ? "#1C1E24"
    : "#F1F5F7";

    const lCardBg = isDark ? '#1C1E24' : '#F1F5F7';

  return (
    <div className="w-full">

      {/* ====================================================
          L-SHAPED SCENARIO DETAILS CONTAINER
      ==================================================== */}
      <div className="relative flex flex-col w-full min-h-[420px]">

        {/* ==================================================
            LEFT TOP CAPSULE
        ================================================== */}
        <div
                  className={`absolute top-0 left-0 w-[164px] h-[122px] p-3.5 rounded-2xl flex flex-col justify-between shadow-xs z-20 ${
                    isDark ? 'bg-[#ECE8FF] text-slate-900' : 'bg-[#ECE8FF] text-slate-900'
                  }`}
                >
          <div>
            <h3
              className="
                text-[14px]
                -mt-1
                font-voda
                font-bold
                tracking-normal
                leading-tight
              "
            >
              Scenario
              <br />
              Details
            </h3>
          </div>

          <p
            className={`
              text-[9.5px]
              font-medium
              leading-tight
              opacity-75
              mt-1
              ${
                isDark
                  ? "text-slate-300"
                  : "text-slate-600"
              }
            `}
          >
            Fill in the required
            <br />
            scenario details
            <br />
            here
          </p>
        </div>

        {/* ==================================================
            INNER CONCAVE CORNER
        ================================================== */}
        <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
                  </svg>
                </div>

        {/* ==================================================
            TOP RIGHT ARM

            LEFT:
            Scenario ID
            Scenario Name

            RIGHT:
            Type
            Target Audience
        ================================================== */}
        <div
          style={{
            backgroundColor: shellBg,
          }}
          className="
            w-[calc(100%-170px)]
            ml-auto
            h-[129px]
            rounded-t-xl
            px-4
            py-3
            z-10
          "
        >
          <div
            className="
              grid
              grid-cols-1
              lg:grid-cols-2
              gap-x-6
              h-full
            "
          >

            {/* ==============================================
                LEFT COLUMN
                SCENARIO ID + SCENARIO NAME
            =============================================== */}
            <div
              className="
                flex
                flex-col
                justify-center
                min-w-0
                gap-1.5
              "
            >
              <FormInput
                label="Scenario ID"
                value={formData.scenarioId}
                onChange={(e) =>
                  updateField(
                    "scenarioId",
                    e.target.value
                  )
                }
                placeholder="SC-001"
                disabled={Boolean(idLockedHint)}
                hint={idLockedHint}
              />

              <FormInput
  label="Scenario Name"
  value={formData.scenarioName}
  onChange={(e) => {
    updateField(
      "scenarioName",
      e.target.value
    );
    setErrorMsg('');
  }}
  placeholder="Type here"
/>
            </div>

            {/* ==============================================
                RIGHT COLUMN
                TYPE + TARGET AUDIENCE
            =============================================== */}
            <div
              className="
                flex
                flex-col
                justify-center
                min-w-0
                lg:border-l
                lg:border-slate-200
                dark:lg:border-white/10
                lg:pl-6
                gap-1.5
              "
            >
              <FormSelect
                label="Type"
                value={formData.type}
                onChange={(e) =>
                  updateField(
                    "type",
                    e.target.value
                  )
                }
                options={[
                  {
                    value: "data-entry",
                    label: "Data Entry",
                  },
                  {
                    value: "phishing",
                    label: "Phishing Simulation",
                  },
                  {
                    value: "social-engineering",
                    label: "Social Engineering",
                  },
                ]}
              />

              <FormSelect
                label="Target Audience"
                value={formData.targetAudience}
                onChange={(e) =>
                  updateField(
                    "targetAudience",
                    e.target.value
                  )
                }
                options={[
                  {
                    value: "remote-hybrid",
                    label: "Remote / Hybrid users",
                  },
                  {
                    value: "office",
                    label: "Office users",
                  },
                  {
                    value: "executives",
                    label: "Executives",
                  },
                  {
                    value: "all",
                    label: "All Employees",
                  },
                ]}
              />
            </div>
          </div>
        </div>

        {/* ==================================================
            FULL WIDTH BOTTOM CONTAINER

            LEFT:
            Motivator

            RIGHT:
            Difficulty

            BELOW:
            Description
        ================================================== */}
        <div
  style={{
    backgroundColor: shellBg,
  }}
  className="w-full flex-1 rounded-tl-xl rounded-b-xl p-4 sm:p-5 z-10"
>
  {/* Motivator + Difficulty */}
  <div className="grid grid-cols-1 lg:grid-cols-[55.7%_76.2%] gap-x-6 gap-y-3.5">

    {/* MOTIVATOR */}
    <div className="min-w-0">
      <FormSelect
        label="Motivator"
        value={formData.motivator}
        onChange={(e) =>
          updateField("motivator", e.target.value)
        }
        options={[
          {
            value: "fear-feedback-curiosity",
            label: "Fear, Feedback, Curiosity",
          },
          {
            value: "urgency",
            label: "Urgency",
          },
          {
            value: "authority",
            label: "Authority",
          },
          {
            value: "reward",
            label: "Reward",
          },
        ]}
      />
    </div>

    {/* DIFFICULTY */}
    <div
      className="
        min-w-0
        lg:border-l
        lg:border-slate-200
        dark:lg:border-white/10
        lg:pl-6
      "
    >
      {/* Reduce only Difficulty width */}
      <div className="w-[55%]">
        <FormSelect
          label="Difficulty"
          value={formData.difficulty}
          onChange={(e) =>
            updateField("difficulty", e.target.value)
          }
          options={[
            {
              value: "low",
              label: "Low",
            },
            {
              value: "medium",
              label: "Medium",
            },
            {
              value: "high",
              label: "High",
            },
          ]}
        />
      </div>
    </div>
  </div>

  {/* DESCRIPTION - SEPARATE */}
  <div className="w-full">
    <FormTextarea
      label="Description"
      value={formData.description}
      onChange={(e) =>
        updateField("description", e.target.value)
      }
      placeholder="Type here"
      rows={4}
    />
  </div>
</div>
      </div>
    </div>
  );
};

// ============================================================
// SHARED DESIGN PIECES FOR ATTACH OUTCOMES TAB
// ============================================================
const OUTCOME_SECTION_THEMES = {
  coverImage: { bgLight: '#ECE8FF', bgDark: '#22193E' },
  landingPage: { bgLight: '#FFEFCE', bgDark: '#2E200C' },
  training: { bgLight: '#CEFBEA', bgDark: '#0D271E' },
};

const SectionLabelHeader = ({ icon: Icon, title, description, theme, isDark }) => (
  <div
    style={{ backgroundColor: isDark ? theme.bgDark : theme.bgLight }}
    className="rounded-xl p-3.5 mb-3 flex items-start gap-2.5"
  >
    <div
      className={`
        w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0
        ${isDark ? 'bg-black/30' : 'bg-white/60'}
      `}
    >
      <Icon className={`w-3.5 h-3.5 ${isDark ? 'text-white' : 'text-slate-900'}`} />
    </div>
    <div>
      <h3 className={`text-[11px] font-voda-exb uppercase tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
        {title}
      </h3>
      <p className={`text-[7.5px] leading-[1.35] mt-1 font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
        {description}
      </p>
    </div>
  </div>
);







 


// ============================================================
// REUSABLE COLOR FIELD
// ============================================================
const ColorField = ({
  label,
  value,
  onChange,
}) => {
  return (
    <div>
      <label
        className="
          block
          mb-1.5
          text-[8px]
          font-voda-exb
          uppercase
          text-slate-600
          dark:text-slate-300
        "
      >
        {label}
      </label>

      <div
        className="
          h-[36px]
          px-2
          rounded-lg
          border
          border-slate-200
          dark:border-white/10
          flex
          items-center
          gap-2
          bg-white
          dark:bg-[#202127]
        "
      >
        <input
          type="color"
          value={value}
          onChange={(event) =>
            onChange(event.target.value)
          }
          className="
            w-6
            h-6
            rounded
            border-0
            bg-transparent
            cursor-pointer
          "
        />

        <span className="text-[8px] font-semibold uppercase text-slate-600 dark:text-slate-300">
          {value}
        </span>
      </div>
    </div>
  );
};

// ============================================================
// EDITING A SAVED SCENARIO
// ============================================================
// The wizard's form for a stored scenario, with the cover, landing page and
// training path picked again from the catalogues the wizard offers.
const editPrefill = (row) =>
  toEditFormData(row, {
    coverImages: imageCatalogue,
    landingPages: initialLandingCatalogues?.landingPages || [],
    trainingPaths: trainingPathsJson,
    trainingQuizzes: trainingQuizzesJson,
  });

// Opened by address (a reload before the first change, or a link): the row as
// this person's list holds it, annotated with its ownership. When they have
// their own version of it (a copy, or a pending edit, stands in for it), that
// version is what they edit, never the original again. Only a row their list
// doesn't hold at all is read directly, and only opened if they could see it.
async function loadScenarioToEdit(scenarioId, viewer) {
  const rows = await api.scenarios.list({ viewer }).catch(() => null);
  const listed = rowToEdit(rows, scenarioId, viewer);
  if (listed) return listed;
  const row = await api.scenarios.get(scenarioId);
  if (!canOpenForEdit(row, viewer)) throw new Error("it isn't one of the scenarios you can see");
  return row;
}

// An edit checked against the person's list as it is now (an edit draft can
// be days old; see refreshEdit), or null when the list can't be read, in which
// case the edit is saved as it stands.
async function checkEditTarget(edit, viewer) {
  if (!edit) return null;
  const rows = await api.scenarios.list({ viewer }).catch(() => null);
  return Array.isArray(rows) ? refreshEdit(edit, rows, viewer) : null;
}

// ============================================================
// MAIN COMPONENT
// ============================================================
// `opening`: which draft this editor works on (scenarioEditorOpening's
// result), resolved before its first render so the form can start from it
// (see ScenarioDeatils below).
const ScenarioEditor = ({ opening }) => {
  const { isDark } = useUserType?.() || {
    isDark: false,
  };

  // ?draft=<id> (Scenarios → Drafts) opens that draft; ?edit=<scenarioId>
  // (Scenarios → Edit) opens the unfinished edit of that scenario, or starts
  // one; otherwise a new one, with the scenario in progress offered back first
  // unless the author just chose "Start new" or was already asked about it.
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewer] = useState(() => currentActor());
  const [draftOpening] = useState(opening);
  const [openedDraft] = useState(() =>
    draftOpening.resume ? fromDraft(draftOpening.resume) : null
  );
  // A new edit (nothing saved for it yet): the scenario to edit, handed over by
  // the Scenarios list, or fetched below when the editor was reloaded or linked.
  const [editRequest] = useState(() => {
    const scenarioId = searchParams.get('edit') || '';
    if (!scenarioId || draftOpening.resume) return null;
    const row = location.state?.row;
    return { scenarioId, row: row && String(row.scenarioId) === scenarioId ? row : null };
  });
  // Which Scenarios tab opened the editor, for BACK on the first step. Read
  // before the address is rewritten (below), which drops the history state.
  const [openedFrom] = useState(() => (location.state?.from === 'drafts' ? 'drafts' : 'all'));

  const [activeTab, setActiveTab] = useState(openedDraft?.activeTab ?? 0);
  const [errorMsg, setErrorMsg] = useState('');
  // Kept separate from errorMsg on purpose. A validation hint is transient and
  // self-dismisses; a failed save means nothing was written, so it has to stay
  // on screen until the author dismisses it.
  const [saveError, setSaveError] = useState('');
 const navigate = useNavigate();
   const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessModal, setPublishSuccessModal] = useState(false);
  // Saved, but the new cover of a copy / revision could not be added after it.
  const [coverWarning, setCoverWarning] = useState('');

  // ==========================================================
// AUTO DISMISS VALIDATION TOAST
// ==========================================================
useEffect(() => {
  if (!errorMsg) {
    return;
  }

  const timer = setTimeout(() => {
    setErrorMsg('');
  }, 4000);

  return () => clearTimeout(timer);
}, [errorMsg]);

  // ==========================================================
  // FORM DATA
  // ==========================================================
  const [formData, setFormData] = useState(() => ({

    // --------------------------------------------------------
    // Scenario Details
    // --------------------------------------------------------
    scenarioId: '',
    scenarioName: '',
    description: '',
    type: '',
    targetAudience: '',
    motivator: '',
    difficulty: '',

    // --------------------------------------------------------
    // Email Details
    // --------------------------------------------------------
    emailId: '',
    senderName: '',
    emailSubject: '',
    emailBody: DEFAULT_EMAIL_BODY,

    // Attachments
    coverImageSource: '',
    coverImage: null,
    coverImageName: '',
    coverImagePreview: '',
    coverLandingPagePreview: '',
    landingPageSource: '',

    // --------------------------------------------------------
    // Cover Image
    // --------------------------------------------------------
    coverImageSource: '',
    coverImage: null,
    coverImageName: '',
    coverImagePreview: '',
    // An upload goes to storage as soon as it is chosen (the File itself can't
    // be kept in a saved draft). Its key, the scenario id it was uploaded for,
    // and a small data-URL thumbnail are what the draft keeps instead.
    coverImageKey: '',
    coverImageKeyScenarioId: '',
    coverImageThumbnail: '',
    // Set on resume when an upload never reached storage: the file's name, so
    // the Attach Outcomes step can ask for it again.
    coverImageReattach: '',

    // --------------------------------------------------------
    // Landing Page
    // --------------------------------------------------------
    landingPageSource: '',
    landingPageContent: null,
    landingPagePreviewImage: '',

    coverLandingImageName: '',
    coverLandingPagePreview: '',
    selectedLandingCatalogueImageId: null,



    // Training Path
    trainingSource: '',
    trainingPathId: null,
    trainingPathCode: '',
    trainingPathName: '',
    trainingPathVideos: 0,
    trainingPathDuration: '',
    trainingPathQuestions: 0,
    trainingPathCertificate: false,
    individualTraining: {
      videos: [],
      quiz: null,
      certificate: null,
    },
    selectedTrainingPath: null,
    // --------------------------------------------------------
    // Outcome Details
    // --------------------------------------------------------
    primaryOutcome: '',
    expectedBehaviour: '',
    outcomeDescription: '',
    outcomeRichText: '',
    outcomeSource: '',
    // A draft opened from Scenarios → Drafts.
    ...(openedDraft?.formData || {}),
    // Or the scenario being edited, as the Scenarios list handed it over.
    ...(editRequest?.row ? editPrefill(editRequest.row) : {}),
  }));

  // ==========================================================
  // EDIT MODE (Scenarios → Edit)
  // `edit` = { scenarioId, mode, name, ownership, baseline }: what is being
  // edited and how Save stores it (scenarioOwnership.js) — a copy of a template
  // or of someone else's shared scenario, a pending revision of the author's
  // own shared one, or an update of their own. Null for a new scenario.
  // baseline fingerprints the form as it opened, so the edit only becomes a
  // draft (Scenarios → Drafts) once something in it changes.
  // ==========================================================
  const [edit, setEdit] = useState(() => {
    if (openedDraft?.edit) return openedDraft.edit;
    if (!editRequest?.row) return null;
    return { ...editContext(editRequest.row, viewer), baseline: formFingerprint(formData) };
  });
  const [editLoading, setEditLoading] = useState(() => Boolean(editRequest && !editRequest.row));
  // Set when the scenario can't be opened for editing: the editor then shows
  // only that, never a blank "Create new" form a Publish could save as new.
  const [openError, setOpenError] = useState('');
  // What changed about the scenario since this edit began (shared meanwhile,
  // replaced by the person's own version, gone), from refreshEdit.
  const [editNotice, setEditNotice] = useState('');

  // The blank form, kept to lay a fetched scenario over (the form is covered
  // while it loads, so nothing typed can be lost).
  const [blankForm] = useState(formData);
  useEffect(() => {
    if (!editRequest || editRequest.row) return undefined;
    let active = true;
    loadScenarioToEdit(editRequest.scenarioId, viewer)
      .then((row) => {
        if (!active) return;
        const next = { ...blankForm, ...editPrefill(row) };
        setFormData(next);
        setEdit({ ...editContext(row, viewer), baseline: formFingerprint(next) });
      })
      .catch((error) => {
        if (active) setOpenError(`${editRequest.scenarioId}: ${error?.message || 'not found'}.`);
      })
      .finally(() => {
        if (active) setEditLoading(false);
      });
    return () => {
      active = false;
    };
  }, [editRequest, blankForm, viewer]);

  // An edit draft reopened is checked against the list as it is now, so Save
  // uses the right mode (a scenario shared meanwhile takes a pending revision)
  // and the author hears what changed.
  useEffect(() => {
    if (!openedDraft?.edit) return undefined;
    let active = true;
    checkEditTarget(openedDraft.edit, viewer).then((checked) => {
      if (!active || !checked) return;
      setEdit(checked.edit);
      setEditNotice(refreshNotice(checked));
    });
    return () => {
      active = false;
    };
  }, [openedDraft, viewer]);

  // ==========================================================
  // DRAFT SAVE / RESUME
  // The form above is saved per user as the author works, so leaving the page
  // (or the browser dropping the tab) no longer loses it. On the next visit a
  // saved draft is offered back before anything is overwritten.
  // ==========================================================
  // The form as this editor opened (blank for a new scenario): what "not now"
  // goes back to when the question came back at the author's first change.
  const [openingForm] = useState(() => formData);
  const scenarioDraft = useScenarioDraft({
    formData,
    activeTab,
    defaults: SCENARIO_DRAFT_DEFAULTS,
    opening: draftOpening,
    edit,
  });

  // Keep the draft in the address (?draft=<id>), so a reload reopens the same
  // scenario. Replacing the history entry also drops a "Start new" flag. An
  // edit keeps ?edit=<scenarioId> too, for a reload before its first change.
  const editingDraftId = scenarioDraft.offer ? '' : scenarioDraft.draftId;
  const editingScenarioId = edit?.scenarioId || editRequest?.scenarioId || '';
  useEffect(() => {
    if (!editingDraftId) return;
    if (
      searchParams.get('draft') === editingDraftId &&
      (searchParams.get('edit') || '') === editingScenarioId
    ) {
      return;
    }
    setSearchParams(
      editingScenarioId ? { edit: editingScenarioId, draft: editingDraftId } : { draft: editingDraftId },
      { replace: true, state: null }
    );
  }, [editingDraftId, editingScenarioId, searchParams, setSearchParams]);

  const handleContinueDraft = () => {
    const restored = scenarioDraft.resume();
    if (!restored) {
      return;
    }
    setFormData((previous) => ({
      ...previous,
      ...restored.formData,
    }));
    setActiveTab(restored.activeTab);
    // The scenario in progress may be an unfinished edit: checked as above.
    setEdit(restored.edit || null);
    checkEditTarget(restored.edit, viewer).then((checked) => {
      if (!checked) return;
      setEdit(checked.edit);
      setEditNotice(refreshNotice(checked));
    });
  };

  // "Start new" keeps the saved draft (Scenarios → Drafts) and carries on with a
  // new one. Closing the dialog (✕, Esc or a click outside) is "not now": the
  // draft stays as it is and the editor shows a blank form; the question comes
  // back at the first change, and closing it then also undoes that change.
  const { startNew: handleStartNewDraft } = scenarioDraft;
  const handleNotNow = () => {
    if (scenarioDraft.offerOnChange) setFormData(openingForm);
    scenarioDraft.notNow();
  };

  const draftOffer = scenarioDraft.offer;
  const offeredEdit = draftOffer?.editing || null;
  const draftSavedAt = draftOffer?.savedAt
    ? new Date(draftOffer.savedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : '';

  // ==========================================================
  // COVER IMAGE UPLOAD (as soon as it is chosen)
  // A File cannot be saved in a draft, so upload it now and keep only the
  // returned key. If this fails (offline, no scenario id yet) the File stays in
  // memory and Publish uploads it exactly as before.
  // ==========================================================
  const coverUploadRef = useRef(null);
  // The landing page created from the author's own design at publish, kept so a
  // retried publish (say the scenario ID was taken) links it instead of adding
  // a duplicate page to the catalogue.
  const createdLandingRef = useRef(null);

  const handleCoverFileChosen = (file) => {
    if (!file) {
      return;
    }

    // Results are applied only if this file is still the chosen cover.
    makeCoverThumbnail(file).then((thumbnail) => {
      if (thumbnail) {
        setFormData((previous) =>
          previous.coverImage === file
            ? { ...previous, coverImageThumbnail: thumbnail }
            : previous
        );
      }
    });

    // The same id Publish will send, so the key's folder matches the scenario.
    const scenarioId = formData.scenarioId;
    if (!scenarioId?.trim()) {
      coverUploadRef.current = null;
      return;
    }

    // A copy or revision is saved as a NEW scenario, whose id the API assigns.
    // Its cover is uploaded under that id after Save creates it, never into the
    // folder of the scenario it was made from (the id shown here).
    if (edit && edit.mode !== 'update') {
      coverUploadRef.current = null;
      return;
    }

    const promise = api.scenarios.uploadCover({
      scenarioId,
      file: withUniqueCoverName(file),
    });
    coverUploadRef.current = { file, scenarioId, promise };

    promise
      .then((key) => {
        setFormData((previous) =>
          previous.coverImage === file
            ? {
                ...previous,
                coverImageKey: key || '',
                coverImageKeyScenarioId: key ? scenarioId : '',
              }
            : previous
        );
      })
      .catch((error) => {
        console.warn('Cover upload deferred to publish:', error?.message || error);
      });
  };

  // Publish reuses an earlier upload when it was made for this scenario id,
  // waits for one still in flight, and only otherwise uploads the File now.
  const resolveUploadedCoverKey = async () => {
    const reusable = reusableCoverKey(formData);
    if (reusable) {
      return reusable;
    }

    const pending = coverUploadRef.current;
    if (
      pending &&
      formData.coverImage &&
      pending.file === formData.coverImage &&
      pending.scenarioId === formData.scenarioId
    ) {
      const key = await pending.promise.catch(() => '');
      if (key) {
        return key;
      }
    }

    if (formData.coverImage) {
      return api.scenarios.uploadCover({
        scenarioId: formData.scenarioId,
        file: withUniqueCoverName(formData.coverImage),
      });
    }

    // Resumed draft whose scenario id changed since the upload: the File is
    // gone, so keep the earlier key rather than drop the cover.
    return formData.coverImageKey || '';
  };

  // ==========================================================
// TAB NAVIGATION + VALIDATION
// ==========================================================
const goNext = () => {
  // ========================================================
  // TAB 0 - SCENARIO DETAILS VALIDATION
  // ========================================================
  if (activeTab === 0) {
    if (!formData.scenarioName.trim()) {
      setErrorMsg('Please specify a Scenario Name');
      return;
    }

     if (!formData.scenarioId.trim()) {
      setErrorMsg('Please specify a Scenario Id');
      return;
    }

    if (!formData.description.trim()) {
      setErrorMsg('Please enter a Scenario Description');
      return;
    }

    if (!formData.description.trim()) {
      setErrorMsg('Please enter a Scenario Description');
      return;
    }

    if (!formData.type.trim()) {
      setErrorMsg('Please enter a Scenario Type');
      return;
    }

    if (!formData.targetAudience.trim()) {
      setErrorMsg('Please enter a Scenario Target Audience');
      return;
    }

    if (!formData.motivator.trim()) {
      setErrorMsg('Please enter a Scenario Motivator');
      return;
    }

     if (!formData.difficulty.trim()) {
      setErrorMsg('Please enter a Scenario Difficulty');
      return;
    }

    // ==============================
  // TAB 2 - EMAIL DETAILS
  // ==============================
  
  }
  if (activeTab === 1) {
    if (!formData.emailId?.trim()) {
      setErrorMsg('Please select an Email ID');
      return;
    }

    if (!formData.senderName?.trim()) {
      setErrorMsg('Please specify a Sender Name');
      return;
    }

    if (!formData.emailSubject?.trim()) {
      setErrorMsg('Please specify an Email Subject');
      return;
    }

    if (!formData.emailBody?.trim()) {
      setErrorMsg('Please specify an Email Body');
      return;
    }
  }

  // Clear any previous validation error
  setErrorMsg('');

  // Publishing is a side effect, so it must not run inside a state updater.
  // React invokes updaters twice under StrictMode, which sent two POSTs: the
  // first saved the scenario and the second came back 409 as a duplicate id,
  // so a successful publish reported itself as a failure.
  if (activeTab >= 3) {
    handlePublishScenario();
    return;
  }

  setActiveTab((previous) => previous + 1);
};

  // "Save as draft": keep the work under Scenarios → Drafts, no longer in
  // progress, and go there.
  const handleSaveAsDraft = () => {
    const parked = scenarioDraft.saveAndPark();
    if (!parked) return;
    const name = parked.editing ? `Editing: ${parked.editing.name}` : parked.name;
    navigate('/create-scenario', { state: { view: 'drafts', fromEditor: true, savedDraft: name } });
  };

  // BACK on the first step leaves the editor for the Scenarios tab it was
  // opened from. Work so far is already saved (the draft flushes on unmount)
  // and stays under Scenarios → Drafts, so arriving there asks nothing.
  const goBack = () => {
    if (activeTab > 0) {
      setActiveTab((previous) => previous - 1);
      return;
    }
    navigate('/create-scenario', { state: { view: openedFrom, fromEditor: true } });
  };

  // ==========================================================
  // PUBLISH
  // ==========================================================
  // ==========================================================
// PUBLISH SCENARIO
// Same functionality as ReviewAndPublishCampaign
// ==========================================================
const handlePublishScenario = async () => {
  setIsPublishing(true);
  setErrorMsg('');
  setSaveError('');
  setCoverWarning('');

  try {
    // Link the landing page the author attached. A catalogue pick is linked by
    // its id and never edited (it is a shared template); a page they designed
    // or built is saved as a NEW landing page, rather than discarding their work.
    const landing = landingPageChoice(formData);
    let landingPageId = landing.id || '';
    if (landing.kind === 'custom') {
      if (createdLandingRef.current?.html === landing.html) {
        landingPageId = createdLandingRef.current.id;
      } else {
        const page = await api.landingPages.create({
          LandingPageName: `${formData.scenarioName || formData.scenarioId} landing page`,
          LandingPageDescription: `Created with scenario ${formData.scenarioId}.`,
          LandingPageContent: landing.html,
        });
        landingPageId = page?.LandingPageID || '';
        if (landingPageId) createdLandingRef.current = { html: landing.html, id: landingPageId };
      }
    }

    if (edit) {
      await saveEdit(landingPageId);
      return;
    }

    let coverImageId = '';
    if (formData.coverImageSource === 'upload') {
      coverImageId = await resolveUploadedCoverKey();
    } else if (formData.selectedCatalogueImageId) {
      const chosen = imageCatalogue.find(
        (img) => img.id === formData.selectedCatalogueImageId
      );
      coverImageId = catalogueCoverName(chosen?.image);
    }

    // A new scenario is its author's: private to them until a campaign using
    // it is sent (client-asserted until sign-in exists; see identity.js).
    await api.scenarios.create({
      ...toStoredScenario(formData, { coverImageId, landingPageId }),
      createdBy: viewer,
    });
    // Published: the saved draft is done with. Cleared now rather than on
    // "Return to Dashboard", so closing the tab here can't offer it back.
    scenarioDraft.clear();
    setPublishSuccessModal(true);
  } catch (error) {
    // Never show the success modal on failure — the author would leave
    // believing the scenario was saved when nothing was written.
    console.error(edit ? 'Failed to save scenario changes:' : 'Failed to publish scenario:', error);
    setSaveError(
      error?.message ||
        (edit ? 'Could not save your changes. Please try again.' : 'Could not publish the scenario. Please try again.')
    );
  } finally {
    setIsPublishing(false);
  }
};

  // ==========================================================
  // SAVE CHANGES (edit mode)
  // copy / revision: POST a new scenario the API names (copyOf / revisionOf);
  // update: PUT the author's own row. A new cover for a copy or revision is
  // uploaded under the new row's id once it exists, then saved onto it.
  // ==========================================================
  // The request for `target` ({ scenarioId, mode }), and a new cover still to
  // upload once a copy / revision exists.
  const planEditSave = async (target, landingPageId) => {
    let coverImageId; // undefined keeps the cover the scenario already has
    let newCover = null;
    if (formData.coverImageSource === 'upload') {
      if (target.mode === 'update') {
        coverImageId = (await resolveUploadedCoverKey()) || undefined;
      } else if (formData.coverImage) {
        newCover = formData.coverImage;
      } else if (formData.coverImageKey) {
        coverImageId = formData.coverImageKey;
      }
    } else if (formData.selectedCatalogueImageId) {
      const chosen = imageCatalogue.find(
        (img) => img.id === formData.selectedCatalogueImageId
      );
      coverImageId = catalogueCoverName(chosen?.image) || undefined;
    }
    const request = toSavePayload(formData, {
      mode: target.mode,
      row: { scenarioId: target.scenarioId },
      viewer,
      coverImageId,
      landingPageId,
    });
    return { request, newCover };
  };

  const sendEditRequest = (request) =>
    request.method === 'PUT'
      ? api.scenarios.update(request.id, request.body, viewer)
      : api.scenarios.create(request.body);

  // The edit, as the list now has it; null when the list can't be read.
  const recheckEdit = async (target) => {
    const checked = await checkEditTarget(target, viewer);
    if (checked) {
      setEdit(checked.edit);
      setEditNotice(refreshNotice(checked));
    }
    return checked;
  };

  const saveEdit = async (landingPageId) => {
    // The scenario may have changed since this edit began: shared by a sent
    // campaign (saved as a pending revision now), or replaced by the person's
    // own version made elsewhere, or gone (refused, nothing written).
    let target = edit;
    const checked = await recheckEdit(edit);
    if (checked) {
      if (checked.change === 'replaced' || checked.change === 'gone') {
        throw new Error(refreshNotice(checked));
      }
      target = checked.edit;
    }

    let { request, newCover } = await planEditSave(target, landingPageId);
    let saved;
    try {
      saved = await sendEditRequest(request);
    } catch (error) {
      // They already have their own version of it, which may hold changes of
      // its own: this edit is never written over it.
      const existingId = existingVersionId(request, error);
      if (existingId) {
        setEditNotice(conflictMessage(existingId));
        throw new Error(conflictMessage(existingId), { cause: error });
      }
      // Shared since the check above (a PUT the API refuses with 409): save
      // it as a pending revision instead, and say so.
      if (request.method !== 'PUT' || error?.status !== 409) throw error;
      const again = await recheckEdit(target);
      if (again?.change !== 'nowShared') throw error;
      target = again.edit;
      ({ request, newCover } = await planEditSave(target, landingPageId));
      saved = await sendEditRequest(request);
    }
    // Saved: the edit draft is done with.
    scenarioDraft.clear();

    const savedId = request.method === 'PUT' ? request.id : String(saved?.scenarioId || '');
    if (newCover && savedId) {
      try {
        const key = await api.scenarios.uploadCover({
          scenarioId: savedId,
          file: withUniqueCoverName(newCover),
        });
        await api.scenarios.update(savedId, { CoverImageID: key }, viewer);
      } catch (error) {
        console.error('Saved, but the new cover was not:', error);
        setCoverWarning(
          `The new cover image couldn't be added (${error?.message || 'upload failed'}). Edit your version to add it again.`
        );
      }
    }
    setPublishSuccessModal(true);
  };

  return (
    <>
    {/* ====================================================
    PUBLISH SUCCESS MODAL
==================================================== */}
{publishSuccessModal &&
  typeof document !== 'undefined' &&
  createPortal(
    <div className="
      fixed
      inset-0
      z-[2147483647]
      bg-black/85
      backdrop-blur-md
      flex
      items-center
      justify-center
      p-6
      animate-in
      fade-in
      duration-200
    ">
      <div className="
        w-full
        max-w-md
        bg-white
        dark:bg-[#181A20]
        rounded-3xl
        p-6
        text-center
        flex
        flex-col
        items-center
        gap-4
        shadow-2xl
        border
        border-white/20
        animate-in
        zoom-in-95
        duration-200
      ">

        {/* Success Icon */}
        <div className="
          w-16
          h-16
          rounded-full
          bg-emerald-100
          dark:bg-emerald-950/60
          text-emerald-600
          dark:text-emerald-400
          flex
          items-center
          justify-center
          shadow-inner
        ">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        {/* Message */}
        <div>
          <h3 className="
            text-xl
            font-voda
            font-extrabold
            text-slate-900
            dark:text-white
            tracking-tight
          ">
            {edit ? 'Saved' : 'Campaign Launched!'}
          </h3>

          {edit ? (
            <p className="
              text-xs
              text-slate-600
              dark:text-slate-300
              mt-1
              leading-relaxed
            ">
              Your changes to
              <strong>
                {" "}
                "{formData.scenarioName || edit.name || 'this scenario'}"
              </strong>
              {" "}
              are saved. {savedAudience(edit)}
            </p>
          ) : (
          <p className="
            text-xs
            text-slate-600
            dark:text-slate-300
            mt-1
            leading-relaxed
          ">
            Your phishing simulation campaign
            <strong>
              {" "}
              "{formData.scenarioName || 'New Scenario'}"
            </strong>
            {" "}
            has been successfully scheduled and published.
          </p>
          )}
          {editNotice && (
            <p className="mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300 leading-snug">
              {editNotice}
            </p>
          )}
          {coverWarning && (
            <p role="alert" className="mt-2 text-[11px] font-semibold text-amber-700 dark:text-amber-300 leading-snug">
              {coverWarning}
            </p>
          )}
        </div>

        {/* Return Button */}
        <button
          type="button"
          onClick={() => {
            // The scenario draft was already cleared when the publish succeeded.
            setPublishSuccessModal(false);

            navigate('/create-scenario');
          }}
          className="
            w-full
            py-2.5
            rounded-xl
            bg-[#8ED973]
            hover:bg-[#7ec963]
            text-white
            font-voda
            font-bold
            text-xs
            uppercase
            tracking-wider
            shadow-md
            transition-all
            cursor-pointer
          "
        >
          Return to Dashboard
        </button>

      </div>
    </div>,
    document.body
  )}
      {/* ====================================================
          RESUME A SAVED DRAFT
      ==================================================== */}
      <DraftDialog
        open={Boolean(draftOffer)}
        isDark={isDark}
        title={offeredEdit ? `Continue editing ${offeredEdit.name}?` : 'Continue your scenario?'}
        body={`${
          scenarioDraft.offerOnChange
            ? `You still have ${offeredEdit ? 'unsaved changes to this scenario' : 'a scenario in progress'}. Continue it, or start a new scenario with what you just entered. Your saved work stays under Scenarios → Drafts either way.`
            : offeredEdit
            ? 'You have unsaved changes to this scenario. Pick up where you left off, or start a new scenario. Your changes stay under Scenarios → Drafts either way.'
            : 'You have a scenario in progress. Pick up where you left off, or start a new one. Your saved scenario stays under Scenarios → Drafts either way.'
        }${
          draftOffer?.needsCoverReattach
            ? ' Its uploaded cover image could not be kept and will need to be attached again.'
            : ''
        }`}
        detail={
          draftOffer ? (
            <>
              <span className="block">{draftOffer.name}</span>
              <span className="block mt-0.5 font-medium opacity-80">
                Saved at step {draftOffer.step} of {draftOffer.stepCount}: {draftOffer.stepName}
                {draftSavedAt ? ` · ${draftSavedAt}` : ''}
              </span>
            </>
          ) : null
        }
        primaryLabel="Continue"
        onPrimary={handleContinueDraft}
        secondaryLabel="Start new"
        onSecondary={handleStartNewDraft}
        onClose={handleNotNow}
        onDismiss={handleNotNow}
      />
      <style>{VODAFONE_FONT_STYLE}</style>
      {/* ====================================================
    TOP-RIGHT VALIDATION TOAST
==================================================== */}
{(saveError || errorMsg) &&
  typeof document !== 'undefined' &&
  createPortal(
    <div className="fixed top-5 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-slate-900 border border-red-500/30 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm">

      {/* Error Icon */}
      <div className="w-8 h-8 rounded-full bg-red-100 text-[#E60000] flex items-center justify-center flex-shrink-0">
        <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
      </div>

      {/* Error Message */}
      <div className="flex flex-col text-left leading-tight flex-1">
        <span className="text-[10px] font-voda font-bold text-[#E60000] uppercase tracking-wider">
          {saveError ? 'Scenario Not Saved' : 'Input Required'}
        </span>

        <span className="text-[9.5px] font-medium text-slate-700 mt-0.5">
          {saveError || errorMsg}
        </span>
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={() => { setErrorMsg(''); setSaveError(''); }}
        className="p-1 rounded text-slate-400 hover:text-black cursor-pointer flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>,
    document.body
  )}
      <div
        style={{
          zoom: VarScenarioScale,
        }}
        className="
          w-full
          max-w-[1780px]
          mx-auto
          p-3
          sm:p-3
          -mt-3
          select-none
          font-sans
          flex
          flex-col
          gap-3
        "
      >

        {/* ====================================================
            PAGE HEADER
        ==================================================== */}
        <div
          className={`
            w-full
            h-[38px]
            px-5
            rounded-xl
            border
            flex
            items-center
            justify-between
            transition-colors
            duration-300
            shadow-sm

            ${
              isDark
                ? 'bg-white text-[#0B1121] border-slate-200'
                : 'bg-[#06080D] text-white border-black/10'
            }
          `}
        >
          <span className="text-[13px] font-bold tracking-tight uppercase whitespace-nowrap">
            {edit || editRequest ? 'EDIT SCENARIO' : 'CREATE NEW SCENARIO'}
          </span>
          <div className="flex items-center justify-end gap-2 min-w-0 ml-4">
            {/* What Save will do with this edit (a copy, a pending revision...),
                on the right in its own colour so it is seen. */}
            {edit && (
              <span
                role="note"
                title={`${edit.name ? `${edit.name}: ` : ''}${editNote(edit)}`}
                className="inline-flex items-center gap-1.5 min-w-0 max-w-[620px] px-3 py-1 rounded-full bg-[#FFE19C] text-[#3D2A0A] text-[10.5px] font-semibold normal-case shadow-2xs"
              >
                <Info className="w-3.5 h-3.5 flex-shrink-0" strokeWidth={2.5} />
                <span className="truncate">
                  {edit.name && <strong className="font-extrabold">{edit.name}</strong>}
                  {edit.name ? ' · ' : ''}
                  {editNote(edit)}
                </span>
              </span>
            )}
            {scenarioDraft.saveFailed && (
              <span
                role="status"
                className="text-[10px] font-bold normal-case px-2.5 py-1 rounded-full bg-amber-100 text-amber-900"
              >
                {scenarioDraft.saveFailedMessage ||
                  "This browser's storage is full, so this draft isn't being saved. Delete old ones under Scenarios → Drafts."}
              </span>
            )}
          </div>
        </div>

        {/* This work was kept as a draft of its own: someone else's save of the
            same draft (another window or device) reached the server first. */}
        {scenarioDraft.conflictNotice && (
          <div
            role="status"
            className="w-full flex items-center justify-between gap-3 px-4 py-2 rounded-xl border text-[11px] font-semibold leading-snug bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/25"
          >
            <span>{scenarioDraft.conflictNotice}</span>
            <button
              type="button"
              onClick={scenarioDraft.dismissConflictNotice}
              aria-label="Dismiss"
              className="p-0.5 rounded opacity-70 hover:opacity-100 cursor-pointer flex-shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* What changed about the scenario since this edit began. */}
        {edit && editNotice && (
          <div
            role="status"
            className="w-full px-4 py-2 rounded-xl border text-[11px] font-semibold leading-snug bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-500/10 dark:text-amber-200 dark:border-amber-500/25"
          >
            {editNotice}
          </div>
        )}


        {/* ====================================================
            TABS + CONTENT — unified white/dark shell
            (matches DetailsAndSettings.jsx's single continuous card:
            docked stepper strip at top, content padded below,
            same background throughout, no seam/double border)
        ==================================================== */}
        <div
          className={`
            relative
            w-full
            rounded-2xl
            border
            overflow-hidden
            shadow-xs

            ${
              isDark
                ? 'bg-[#0F1015] border-white/10'
                : 'bg-white border-slate-200'
            }
          `}
        >
          {/* The scenario to edit is on its way from the server. */}
          <PageLoading show={editLoading} isDark={isDark} />

          {openError ? (
            // Not openable: say so, with the way back. The wizard is not
            // shown, so nothing here can be published as a new scenario.
            <div
              role="alert"
              className="w-full min-h-[400px] flex flex-col items-center justify-center gap-2 p-8 text-center"
            >
              <AlertTriangle className="w-8 h-8 text-[#E60000]" strokeWidth={2.2} />
              <h2 className={`text-[15px] font-extrabold tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                This scenario can't be opened for editing
              </h2>
              <p className={`max-w-md text-[11.5px] font-medium ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {openError}
              </p>
              <button
                type="button"
                onClick={() => navigate('/create-scenario', { state: { view: openedFrom, fromEditor: true } })}
                className="mt-2 h-8 px-4 rounded-lg text-[11px] font-bold uppercase tracking-wide cursor-pointer bg-[#06080D] text-white hover:bg-slate-800 dark:bg-white dark:text-black dark:hover:bg-slate-200"
              >
                Back to Scenarios
              </button>
            </div>
          ) : (
          <>
          <ScenarioTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
            editing={Boolean(edit)}
          />

          <div
            className="
              w-full
              min-h-[400px]
              flex
              flex-col
              p-4
              sm:p-5
            "
          >
            {/* Scenario Details */}
            {activeTab === 0 && (
              <ScenarioDetailsTab
                formData={formData}
                setFormData={setFormData}
                goNext={goNext}
                goBack={goBack}
                setErrorMsg={setErrorMsg}
                idLockedHint={edit ? idLockHint(edit) : ''}
              />
            )}

            {/* Email Details */}
            {activeTab === 1 && (
              <EmailDetailsTab
                formData={formData}
                setFormData={setFormData}
                goNext={goNext}
                goBack={goBack}
                setErrorMsg={setErrorMsg}
              />
            )}

            {/* Attach Outcomes */}
            {activeTab === 2 && (
              <AttachOutcomesTab
                formData={formData}
                setFormData={setFormData}
                goNext={goNext}
                goBack={goBack}
                onCoverFileChosen={handleCoverFileChosen}
              />
            )}

            {/* Review & Publish */}
            {activeTab === 3 && (
              <ReviewPublishDashboard
                formData={formData}
                goNext={goNext}
                goBack={goBack}
              />
            )}

            {/* ====================================================
    NAVIGATION BUTTONS
    SAME DESIGN AS DetailsAndSettings
==================================================== */}
<div
  className="
    w-full
    flex
    items-center
    justify-end
    gap-2.5
    mt-auto
    pt-2
    border-black/5
    dark:border-white/10
  "
>
  <SaveDraftButton
    onClick={handleSaveAsDraft}
    disabled={!scenarioDraft.canSave}
    title={scenarioDraft.canSave ? 'Save and finish later from Scenarios → Drafts' : 'Nothing to save yet'}
  />

  {/* BACK */}
  <button
    type="button"
    onClick={goBack}
    title={activeTab === 0 ? 'Back to Scenarios' : 'Previous step'}
    className={`
      w-[90px]
      h-[24px]
      rounded-3xl
      font-voda
      font-bold
      text-[10px]
      uppercase
      transition-all
      shadow-xs
      flex
      items-center
      justify-center

      bg-[#000000]
      dark:bg-[#ffffff]
      hover:bg-black/80
      dark:hover:bg-white/80
      text-white
      dark:text-black
      cursor-pointer
    `}
  >
    BACK
  </button>

  {/* NEXT / PUBLISH */}
<button
  type="button"
  onClick={goNext}
  disabled={activeTab === 3 && isPublishing}
  className={`
    ${edit && activeTab === 3 ? 'min-w-[90px] px-3' : 'w-[90px]'}
    h-[24px]
    rounded-3xl
    bg-[#8ED973]
    hover:bg-[#7ec963]
    text-white
    font-voda
    font-bold
    text-[10px]
    uppercase
    tracking-wider
    shadow-sm
    transition-all
    cursor-pointer
    hover:scale-[1.02]
    active:scale-95
    flex
    items-center
    justify-center
    disabled:opacity-50
    disabled:cursor-not-allowed
  `}
>
  {activeTab === 3
    ? isPublishing
      ? (edit ? 'SAVING...' : 'PUBLISHING...')
      : (edit ? 'SAVE CHANGES' : 'PUBLISH')
    : 'NEXT'}
</button>
</div>
          </div>
          </>
          )}
        </div>


        {/* ====================================================
            NAVIGATION BUTTONS
        ==================================================== */}
        
      </div>
    </>
  );
};

// The editor's frame while the draft it opens on is read from the server.
const OpeningLoading = ({ isDark, editing }) => (
  <div
    style={{ zoom: VarScenarioScale }}
    className="w-full max-w-[1780px] mx-auto p-3 sm:p-3 -mt-3 select-none font-sans flex flex-col gap-3"
  >
    <div
      className={`w-full h-[38px] px-5 rounded-xl border flex items-center shadow-sm ${
        isDark ? 'bg-white text-[#0B1121] border-slate-200' : 'bg-[#06080D] text-white border-black/10'
      }`}
    >
      <span className="text-[13px] font-bold tracking-tight uppercase whitespace-nowrap">
        {editing ? 'EDIT SCENARIO' : 'CREATE NEW SCENARIO'}
      </span>
    </div>
    <div
      className={`relative w-full min-h-[420px] rounded-2xl border overflow-hidden shadow-xs ${
        isDark ? 'bg-[#0F1015] border-white/10' : 'bg-white border-slate-200'
      }`}
    >
      <PageLoading show isDark={isDark} />
    </div>
  </div>
);

// ============================================================
// WHICH DRAFT THE EDITOR OPENS ON
// Drafts are kept on the server (scenarioDraftSync.js), so the draft to open
// may have to be read first. When this browser holds all it takes (a copy of
// the draft, or nothing to offer back) the editor opens at once; otherwise a
// short loading state shows while it is read. Either way the editor starts
// from the resolved opening, as before.
// ============================================================
const ScenarioDeatils = () => {
  const { isDark } = useUserType?.() || {
    isDark: false,
  };
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [request] = useState(() => ({
    requestedId: searchParams.get('draft') || '',
    startFresh: Boolean(location.state?.startFresh),
    editId: searchParams.get('edit') || '',
    editChecked: Boolean(location.state?.editChecked),
    defaults: SCENARIO_DRAFT_DEFAULTS,
  }));
  const [actor] = useState(() => currentActor());
  const [opening, setOpening] = useState(() =>
    openingNeedsServer(request, actor) ? null : scenarioEditorOpening(request, actor)
  );

  useEffect(() => {
    if (opening) return undefined;
    let active = true;
    loadScenarioEditorOpening(request, actor, api).then((resolved) => {
      if (active) setOpening(resolved);
    });
    return () => {
      active = false;
    };
  }, [opening, request, actor]);

  if (!opening) return <OpeningLoading isDark={isDark} editing={Boolean(request.editId)} />;
  return <ScenarioEditor opening={opening} />;
};

export default ScenarioDeatils;
