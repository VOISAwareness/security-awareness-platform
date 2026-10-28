import React, { useState, useRef, useEffect } from 'react';
import { useUserType } from '../../../UserTypeContext/UserTypeContext';
import AnnouncementReviewPublishDashboard from './AnnouncementReviewPublishDashboard';
import announcamentScenariosJsonData from '../../Announcement/AnnouncementData.json';
import AnnouncementEmailDetailsTab from "./AnnouncementEmailDetailsTab";
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';

import {
  Check,
  Image as ImageIcon,
  X,
  CheckCircle2,
  AlertTriangle,
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
const FormInput = ({ label, value, onChange, placeholder = 'Type here', disabled = false }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[12.5px] mb-2 font-bold text-slate-900 dark:text-white leading-none">
        {label} <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
      </label>
      <div className="w-full h-7 px-2.5 mb-2 rounded-xl flex items-center shadow-2xs relative bg-white text-slate-900">
            <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="
          w-full bg-transparent text-[10.5px] font-medium outline-none placeholder-slate-400
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

        {options.map((option) => (
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
          h-[180px]
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
const TemplateTabs = ({ activeTab, onTabChange }) => {
  const { isDark } = useUserType?.() || { isDark: false };

  const steps = [
    { id: 0, titleLine1: 'Announcement', titleLine2: 'Template Details' },
    { id: 1, titleLine1: 'Announcement', titleLine2: 'Email Details' },
    { id: 2, titleLine1: 'Announcement', titleLine2: 'Review & Publish' },
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
}) => {
  const { isDark } = useUserType?.() || { isDark: false };

  const subjectInputRef = useRef(null);
  const subjectFxRef = useRef(null);
  const editorFxRef = useRef(null);
  const userListDropdownRef = useRef(null);
  const singleUserDropdownRef = useRef(null);

  const [showSubjectFxMenu, setShowSubjectFxMenu] = useState(false);
  const [showEditorFxMenu, setShowEditorFxMenu] = useState(false);

  const [draft, setDraft] = useState(() => {
    try {
      const stored = localStorage.getItem(
        "voisshield_active_announcement_draft"
      );

      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const matchedScenario =
    (announcamentScenariosJsonData?.announcement || []).find(
      (s) => s.announcementScenarioId === draft.announcementScenarioId
    ) || announcamentScenariosJsonData?.announcement?.[0];

  const availableSenderEmails = Array.from(
    new Set(
      (announcamentScenariosJsonData?.announcement || [])
        .map((s) => s.announcementSenderEmailId)
        .filter(Boolean)
    )
  );

  const [senderEmailId, setSenderEmailId] = useState(
    draft.announcementSenderEmailId ||
      matchedScenario?.announcementSenderEmailId ||
      availableSenderEmails[0] ||
      ""
  );

  const [announcementEmailSubject, setAnnouncementEmailSubject] = useState(
    draft.announcementEmailSubject ||
      matchedScenario?.announcementEmailSubject ||
      ""
  );

  // =========================================================
  // SAVE CHANGES TO LOCAL STORAGE
  // =========================================================
  const persistChanges = (fields) => {
    try {
      const current = localStorage.getItem(
        "voisshield_active_announcement_draft"
      );

      const updated = {
        ...(current ? JSON.parse(current) : {}),
        ...fields,
      };

      localStorage.setItem(
        "voisshield_active_announcement_draft",
        JSON.stringify(updated)
      );
    } catch (e) {
      console.error(e);
    }
  };

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
              Template
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
            Template details
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
                label="Template ID"
                value={formData.announcementScenarioId}
                onChange={(e) =>
                  updateField(
                    "announcementScenarioId",
                    e.target.value
                  )
                }
                placeholder="ANC-XXX"
              />

              <FormInput
  label="Template Name"
  value={formData.announcementScenarioName}
  onChange={(e) => {
    updateField(
      "announcementScenarioName",
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
                value={formData.announcementCampaignType}
                onChange={(e) =>
                  updateField(
                    "announcementCampaignType",
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
                value={formData.announcementTargetAudience}
                onChange={(e) =>
                  updateField(
                    "announcementTargetAudience",
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
  

  {/* DESCRIPTION - SEPARATE */}
  <div className="w-full">
    <FormTextarea
      label="Description"
      value={formData.announcementDescription}
      onChange={(e) =>
        updateField("announcementDescription", e.target.value)
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
// MAIN COMPONENT
// ============================================================
const AnnouncementScenarioDetails = () => {
  const { isDark } = useUserType?.() || {
    isDark: false,
  };

  const [activeTab, setActiveTab] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
 const navigate = useNavigate();
   const [isPublishing, setIsPublishing] = useState(false);
  const [publishSuccessModal, setPublishSuccessModal] = useState(false);

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
  const [formData, setFormData] = useState({

    // --------------------------------------------------------
    // Scenario Details
    // --------------------------------------------------------
    announcementScenarioId: '',
    announcementScenarioName: '',
    announcementDescription: '',
    announcementCampaignType: '',
    announcementTargetAudience: '',

    // --------------------------------------------------------
    // Email Details
    // --------------------------------------------------------
    announcementSenderEmailId: '',
    announcementSenderName: '',
    announcementEmailSubject: '',
    announcementEmailBody:
  announcamentScenariosJsonData?.announcement?.find(
    (scenario) => scenario.announcementScenarioId === 'ANC-001'
  )?.announcementEmailBody || '',

    // --------------------------------------------------------
    // Outcome Details
    // --------------------------------------------------------
    primaryOutcome: '',
    expectedBehaviour: '',
    outcomeDescription: '',
    outcomeRichText: '',
    outcomeSource: '',
  });

  // ==========================================================
// TAB NAVIGATION + VALIDATION
// ==========================================================
const goNext = () => {
  // ========================================================
  // TAB 0 - SCENARIO DETAILS VALIDATION
  // ========================================================
  if (activeTab === 0) {
    if (!formData.announcementScenarioName.trim()) {
      setErrorMsg('Please specify a Scenario Name');
      return;
    }

     if (!formData.announcementScenarioId.trim()) {
      setErrorMsg('Please specify a Scenario Id');
      return;
    }

    if (!formData.announcementDescription.trim()) {
      setErrorMsg('Please enter a Scenario Description');
      return;
    }

    if (!formData.announcementCampaignType.trim()) {
      setErrorMsg('Please enter a Scenario Type');
      return;
    }

    if (!formData.announcementTargetAudience.trim()) {
      setErrorMsg('Please enter a Scenario Target Audience');
      return;
    }

    // ==============================
  // TAB 2 - EMAIL DETAILS
  // ==============================
  
  }
  if (activeTab === 1) {
    if (!formData.announcementSenderEmailId?.trim()) {
      setErrorMsg('Please select an Email ID');
      return;
    }

    

    if (!formData.announcementEmailSubject?.trim()) {
      setErrorMsg('Please specify an Email Subject');
      return;
    }

    if (!formData.announcementEmailBody?.trim()) {
      setErrorMsg('Please specify an Email Body');
      return;
    }
  }

  // Clear any previous validation error
  setErrorMsg('');

  // Move to next tab
  setActiveTab((previous) => {
    if (previous < 2) {
      return previous + 1;
    }

    handlePublishCampaign();
    return previous;
  });
};

  const goBack = () => {
    if (activeTab > 0) {
      setActiveTab((previous) => previous - 1);
    }
  };

  // ==========================================================
  // PUBLISH
  // ==========================================================
  // ==========================================================
// PUBLISH SCENARIO
// Same functionality as ReviewAndPublishCampaign
// ==========================================================
const handlePublishCampaign = () => {
  setIsPublishing(true);

  setTimeout(() => {
    try {
      const publishedCampaigns = JSON.parse(
        localStorage.getItem(
          'voisshield_published_campaigns'
        ) || '[]'
      );

      const newCampaign = {
        ...formData,

        campaignId: `CAMP-${Date.now()
          .toString()
          .slice(-5)}`,

        publishedAt: new Date().toISOString(),

        status: 'Active',

        stats: {
          sent: formData.totalUsers || 100,
          opened: 0,
          clicked: 0,
          compromised: 0,
          reported: 0,
        },
      };

      publishedCampaigns.unshift(newCampaign);

      localStorage.setItem(
        'voisshield_published_campaigns',
        JSON.stringify(publishedCampaigns)
      );

      console.log(
        'Published Campaign:',
        newCampaign
      );
    } catch (error) {
      console.error(
        'Failed to publish campaign:',
        error
      );
    }

    setIsPublishing(false);
    setPublishSuccessModal(true);
  }, 600);
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
            Template Launched!
          </h3>

          <p className="
            text-xs
            text-slate-600
            dark:text-slate-300
            mt-1
            leading-relaxed
          ">
            Your phishing simulation announcement template
            <strong>
              {" "}
              "{formData.announcementScenarioName || 'New Scenario'}"
            </strong>
            {" "}
            has been successfully scheduled and published.
          </p>
        </div>

        {/* Return Button */}
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(
              'voisshield_active_announcement_draft'
            );

            setPublishSuccessModal(false);

            navigate('/announcements');
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
          Return to Announcement Page
        </button>

      </div>
    </div>,
    document.body
  )}
      <style>{VODAFONE_FONT_STYLE}</style>
      {/* ====================================================
    TOP-RIGHT VALIDATION TOAST
==================================================== */}
{errorMsg &&
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
          Input Required
        </span>

        <span className="text-[9.5px] font-medium text-slate-700 mt-0.5">
          {errorMsg}
        </span>
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={() => setErrorMsg('')}
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
        className={`w-full h-[38px] py-2.5 px-6 -mt-2 rounded-2xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${
          isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
        }`}
      >
          <span className="text-[14px] font-voda font-bold tracking-tight text-white dark:text-black uppercase">
            CREATE NEW ANNOUNCEMENT TEMPLATE
          </span>

          <span className="text-[9px] font-bold opacity-60 uppercase">
            Template Creation
          </span>
        </div>


        {/* ====================================================
            TABS + CONTENT — unified white/dark shell
            (matches DetailsAndSettings.jsx's single continuous card:
            docked stepper strip at top, content padded below,
            same background throughout, no seam/double border)
        ==================================================== */}
        <div
          className={`
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
          <TemplateTabs
            activeTab={activeTab}
            onTabChange={setActiveTab}
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
              />
            )}

            {/* Email Details */}
            {activeTab === 1 && (
              <AnnouncementEmailDetailsTab
                formData={formData}
                setFormData={setFormData}
                goNext={goNext}
                goBack={goBack}
                setErrorMsg={setErrorMsg}
              />
            )}

            {/* Review & Publish */}
            {activeTab === 2 && (
              <AnnouncementReviewPublishDashboard
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
  {/* BACK */}
  <button
    type="button"
    onClick={goBack}
    disabled={activeTab === 0}
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

      ${
        activeTab === 0
          ? `
            bg-[#000000]
            dark:bg-[#ffffff]
            text-white
            dark:text-black
            opacity-40
            cursor-not-allowed
          `
          : `
            bg-[#000000]
            dark:bg-[#ffffff]
            hover:bg-black/80
            dark:hover:bg-white/80
            text-white
            dark:text-black
            cursor-pointer
          `
      }
    `}
  >
    BACK
  </button>

  {/* NEXT / PUBLISH */}
<button
  type="button"
  onClick={goNext}
  disabled={activeTab === 2 && isPublishing}
  className="
    w-[90px]
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
  "
>
  {activeTab === 2
    ? isPublishing
      ? 'PUBLISHING...'
      : 'PUBLISH'
    : 'NEXT'}
</button>
</div>
          </div>
        </div>


        {/* ====================================================
            NAVIGATION BUTTONS
        ==================================================== */}
        
      </div>
    </>
  );
};

export default AnnouncementScenarioDetails;
