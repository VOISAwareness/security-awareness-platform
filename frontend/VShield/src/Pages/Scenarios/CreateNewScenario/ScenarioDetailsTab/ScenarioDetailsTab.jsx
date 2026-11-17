import { useEffect, useState } from "react";
import { useUserType } from "../../../../UserTypeContext/UserTypeContext";
import { typeOptions } from "../../../../services/campaignTypes";
import { api } from "../../../../services/api";
import { currentActor } from "../../../../services/identity";
import { readScenarioDraftItems } from "../../../../services/scenarioDraftSync";

async function existingScenarioIds(viewer) {
  const [rows, drafts] = await Promise.all([
    api.scenarios.list({ viewer }).catch(() => []),
    readScenarioDraftItems(api, viewer).catch(() => []),
  ]);
  return [
    ...(Array.isArray(rows) ? rows.map((row) => row?.scenarioId) : []),
    ...(Array.isArray(drafts)
      ? drafts.map((item) => item?.summary?.scenarioId)
      : []),
  ]
    .filter(Boolean)
    .map(String);
}

const nextScenarioIdFrom = (existingIds = []) => {
  const numbers = existingIds
    .map((id) => {
      const match = /^sc-(\d+)$/i.exec(String(id ?? "").trim());
      return match ? parseInt(match[1], 10) : null;
    })
    .filter((n) => Number.isInteger(n));
  const next = numbers.length ? Math.max(...numbers) + 1 : 1;
  return `SC-${String(next).padStart(3, "0")}`;
};
// ============================================================
// REUSABLE INPUT (dark bg updated for contrast against tinted L-shape)
// ============================================================
// `disabled` shows the value read-only (the scenario ID while editing), with
// `hint` saying why on hover.
const FormInput = ({
  label,
  value,
  onChange,
  placeholder = "Type here",
  disabled = false,
  hint = "",
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[12.5px] mb-2 font-bold text-slate-900 dark:text-white leading-none">
        {label}{" "}
        <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
      </label>
      <div
        title={hint || undefined}
        className={`w-full h-7 px-2.5 mb-2 rounded-xl flex items-center shadow-2xs relative dark:bg-[#15161A]
          dark:border-white/10
          dark:text-white ${
            disabled
              ? "bg-white bg-slate-100 text-slate-500 cursor-not-allowed"
              : "bg-white text-slate-900"
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
          w-full bg-transparent text-[10.5px] font-medium outline-none placeholder-slate-400 disabled:disabled:cursor-not-allowed
        "
        />
      </div>
    </div>
  );
};

// ============================================================
// REUSABLE SELECT
// ============================================================
const FormSelect = ({ label, value, onChange, options = [] }) => {
  // A stored scenario can carry a value these options don't offer ("Credential
  // theft"); it is listed too, so editing shows it instead of "Select".
  const shown =
    value && !options.some((option) => option.value === value)
      ? [...options, { value, label: value }]
      : options;
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[12.5px] mb-2 font-bold text-slate-900 dark:text-white leading-none">
        {label}{" "}
        <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
      </label>
      <div className="w-full bg-transparent text-[10.5px] font-medium outline-none cursor-pointer appearance-none">
        <select
          value={value}
          onChange={onChange}
          className="
          w-full h-7 px-2.5 mb-2 rounded-xl flex items-center shadow-2xs relative bg-white text-slate-900
          dark:bg-[#15161A]
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
  placeholder = "Type here",
  rows = 5,
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[12.5px] py-2.5 mt-2 font-bold text-slate-900 dark:text-white leading-none">
        {label}{" "}
        <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
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
          dark:bg-[#15161A]
          dark:border-white/10
          dark:text-white
          dark:placeholder:text-slate-500
        "
      />
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
  setErrorMsg,
  // While editing, the scenario's ID can't change; this says why.
  idLockedHint = "",
}) => {
  const { isDark } = useUserType?.() || { isDark: false };

  const [autoFilledId, setAutoFilledId] = useState(false);
  const [customTargetAudience, setCustomTargetAudience] = useState(false);
  const [customCampaignType, setCustomCampaignType] = useState(false);
  const [customCampaignMotivator, setCustomCampaignMotivator] = useState(false);
  useEffect(() => {
    if (idLockedHint) return undefined;
    if (formData.scenarioId?.trim()) return undefined;
    let active = true;
    existingScenarioIds(currentActor()).then((ids) => {
      if (!active) return;
      setFormData((previous) => {
        if (previous.scenarioId?.trim()) return previous;
        setAutoFilledId(true);
        return { ...previous, scenarioId: nextScenarioIdFrom(ids) };
      });
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once on mount
  }, []);
  // =========================================================
  // UPDATE FORM FIELD
  // =========================================================
  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const shellBg = isDark ? "#1C1E24" : "#F1F5F7";

  const lCardBg = isDark ? "#1C1E24" : "#F1F5F7";

  const scenarioIdHint =
    idLockedHint ||
    (autoFilledId
      ? "This ID was generated automatically and can't be changed."
      : "");

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
            isDark
              ? "bg-[#ECE8FF] text-slate-900"
              : "bg-[#ECE8FF] text-slate-900"
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
                onChange={(e) => updateField("scenarioId", e.target.value)}
                disabled={true}
                hint={scenarioIdHint}
              />

              <FormInput
                label="Scenario Name"
                value={formData.scenarioName}
                onChange={(e) => {
                  updateField("scenarioName", e.target.value);
                  setErrorMsg("");
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
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  {customCampaignType ? (
                    <FormInput
                      label="Type"
                      value={formData.type}
                      onChange={(e) =>
                        updateField("type", e.target.value)
                      }
                      placeholder="Enter Scenario Type"
                    />
                  ) : (
                    <FormSelect
                label="Type"
                value={formData.type}
                onChange={(e) => updateField("type", e.target.value)}
                options={typeOptions(formData.type)}
              />
                  )}
                </div>

                <button
                  type="button"
                  title={
                    customCampaignType
                      ? "Use predefined type"
                      : "Add custom type"
                  }
                  onClick={() => {
                    setCustomCampaignType((previous) => !previous);
                    updateField("type", "");
                  }}
                  className="
      mb-2
      w-7
      h-7
      shrink-0
      rounded-lg
      flex
      items-center
      justify-center
      bg-[#000000]
      text-white
      text-[18px]
      font-medium
      leading-none
      transition-all
      duration-200
      hover:bg-[#000000]
      hover:scale-105
      active:scale-95
      dark:bg-[#FFFFFF]
      dark:text-black
      dark:hover:bg-[#FFFFFF]
      dark:hover:text-black
    "
                >
                  {customCampaignType ? "×" : "+"}
                </button>
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  {customTargetAudience ? (
                    <FormInput
                      label="Target Audience"
                      value={formData.targetAudience}
                      onChange={(e) =>
                        updateField("targetAudience", e.target.value)
                      }
                      placeholder="Enter target audience"
                    />
                  ) : (
                    <FormSelect
                      label="Target Audience"
                      value={formData.targetAudience}
                      onChange={(e) =>
                        updateField("targetAudience", e.target.value)
                      }
                      options={[
                        {
                          value: "all",
                          label: "All Employees",
                        },
                        {
                          value: "managers-leaders",
                          label: "Managers / Leaders",
                        },
                        {
                          value: "remote-employees",
                          label: "Remote Employees",
                        },
                        {
                          value: "office-employees",
                          label: "Office Employees",
                        },
                        {
                          value: "hybrid-employees",
                          label: "Hybrid Employees",
                        },
                        {
                          value: "finance-teams",
                          label: "Finance Teams",
                        },
                        {
                          value: "legal-teams",
                          label: "Legal Teams",
                        },
                        {
                          value: "care-teams",
                          label: "CARE Teams",
                        },
                        {
                          value: "business-teams",
                          label: "Business Teams",
                        },
                        {
                          value: "hr",
                          label: "HR",
                        },
                        {
                          value: "senior-leadership",
                          label: "Senior Leadership",
                        },
                        {
                          value: "new-joiners",
                          label: "New Joiners",
                        },
                      ]}
                    />
                  )}
                </div>

                <button
                  type="button"
                  title={
                    customTargetAudience
                      ? "Use predefined target audience"
                      : "Add custom target audience"
                  }
                  onClick={() => {
                    setCustomTargetAudience((previous) => !previous);
                    updateField("targetAudience", "");
                  }}
                  className="
      mb-2
      w-7
      h-7
      shrink-0
      rounded-lg
      flex
      items-center
      justify-center
      bg-[#000000]
      text-white
      text-[18px]
      font-medium
      leading-none
      transition-all
      duration-200
      hover:bg-[#000000]
      hover:scale-105
      active:scale-95
      dark:bg-[#FFFFFF]
      dark:text-black
      dark:hover:bg-[#FFFFFF]
      dark:hover:text-black
    "
                >
                  {customTargetAudience ? "×" : "+"}
                </button>
              </div>
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
              
              <div className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  {customCampaignMotivator ? (
                    <FormInput
                      label="Motivator"
                      value={formData.motivator}
                      onChange={(e) =>
                        updateField("motivator", e.target.value)
                      }
                      placeholder="Enter motivator"
                    />
                  ) : (
                    <FormSelect
                label="Motivator"
                value={formData.motivator}
                onChange={(e) => updateField("motivator", e.target.value)}
                options={[
                  {
                    value: "fear",
                    label: "Fear",
                  },
                  {
                    value: "urgency",
                    label: "Urgency",
                  },
                  {
                    value: "curiosity",
                    label: "Curiosity",
                  },
                  {
                    value: "authority",
                    label: "Authority",
                  },
                  {
                    value: "reward",
                    label: "Reward",
                  },
                  {
                    value: "recognition",
                    label: "Recognition",
                  },
                  {
                    value: "opportunity",
                    label: "Opportunity",
                  },
                  {
                    value: "job-function",
                    label: "Job Function",
                  },
                  {
                    value: "software-update",
                    label: "Software Update",
                  },
                  {
                    value: "security-account-alert",
                    label: "Security / Account Alert",
                  },
                  {
                    value: "financial",
                    label: "Financial",
                  },
                  {
                    value: "social",
                    label: "Social",
                  },
                ]}
              />
                  )}
                </div>

                <button
                  type="button"
                  title={
                    customCampaignMotivator
                      ? "Use predefined motivator"
                      : "Add custom motivator"
                  }
                  onClick={() => {
                    setCustomCampaignMotivator((previous) => !previous);
                    updateField("motivator", "");
                  }}
                  className="
      mb-2
      w-7
      h-7
      shrink-0
      rounded-lg
      flex
      items-center
      justify-center
      bg-[#000000]
      text-white
      text-[18px]
      font-medium
      leading-none
      transition-all
      duration-200
      hover:bg-[#000000]
      hover:scale-105
      active:scale-95
      dark:bg-[#FFFFFF]
      dark:text-black
      dark:hover:bg-[#FFFFFF]
      dark:hover:text-black
    "
                >
                  {customCampaignMotivator ? "×" : "+"}
                </button>
              </div>
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
                  onChange={(e) => updateField("difficulty", e.target.value)}
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
              onChange={(e) => updateField("description", e.target.value)}
              placeholder="Type here"
              rows={4}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenarioDetailsTab;
