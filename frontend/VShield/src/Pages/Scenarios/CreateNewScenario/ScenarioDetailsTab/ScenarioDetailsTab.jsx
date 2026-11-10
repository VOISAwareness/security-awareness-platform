import { useUserType } from "../../../../UserTypeContext/UserTypeContext";
import { typeOptions } from "../../../../services/campaignTypes";

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
        className={`w-full h-7 px-2.5 mb-2 rounded-xl flex items-center shadow-2xs relative ${
          disabled
            ? "bg-slate-100 text-slate-500 cursor-not-allowed"
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
                placeholder="SC-001"
                disabled={Boolean(idLockedHint)}
                hint={idLockedHint}
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
              <FormSelect
                label="Type"
                value={formData.type}
                onChange={(e) => updateField("type", e.target.value)}
                options={typeOptions(formData.type)}
              />

              <FormSelect
                label="Target Audience"
                value={formData.targetAudience}
                onChange={(e) => updateField("targetAudience", e.target.value)}
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
                onChange={(e) => updateField("motivator", e.target.value)}
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
