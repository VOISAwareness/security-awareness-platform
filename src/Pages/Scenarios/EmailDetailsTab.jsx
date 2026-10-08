import React, { useEffect, useRef, useState } from 'react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { ChevronDown } from 'lucide-react';

import EmailBodyRichTextEditor from './EmailBodyRichTextEditor';
import scenariosJsonData from './ScenariosData.json';

const FX_PARAMETERS = [
  {
    label: '@UserName',
    code: '{{userName}}',
    desc: 'Target user full name',
  },
  {
    label: '@UserEmailID',
    code: '{{email}}',
    desc: 'Target user email address',
  },
  {
    label: '@UserDepartment',
    code: '{{department}}',
    desc: 'Target user department',
  },
  {
    label: '@UserCountry',
    code: '{{country}}',
    desc: 'Target user work location',
  },
  {
    label: '@PhishLink',
    code: '{{phishLink}}',
    desc: 'Simulation trackable landing link',
  },
  {
    label: '@ManagerName',
    code: '{{managerName}}',
    desc: 'Target direct reporting manager',
  },
  {
    label: '@EmployeeID',
    code: '{{employeeId}}',
    desc: 'Corporate employee badge number',
  },
  {
    label: '@CurrentDate',
    code: '{{currentDate}}',
    desc: 'Simulation execution timestamp',
  },
];

const FormInput = ({
  label,
  value,
  onChange,
  placeholder = 'Type here',
}) => {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[12.5px] mb-2 font-bold text-slate-900 dark:text-white leading-none">
        {label} <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
      </label>

      <div className="w-full h-7 px-2.5 mb-2 rounded-xl flex items-center shadow-2xs relative bg-white text-slate-900">
        <input
          type="text"
          value={value || ''}
          onChange={onChange}
          placeholder={placeholder}
          className="
            w-full
            bg-transparent
            text-[10.5px]
            font-medium
            outline-none
            placeholder-slate-400
          "
        />
      </div>
    </div>
  );
};

const EmailDetailsTab = ({
  formData,
  setFormData,
  setErrorMsg,
}) => {
  const { isDark } = useUserType?.() || {
    isDark: false,
  };

  const subjectInputRef = useRef(null);
  const subjectFxRef = useRef(null);

  const [showSubjectFxMenu, setShowSubjectFxMenu] =
    useState(false);

  const [draft, setDraft] = useState(() => {
    try {
      const stored = localStorage.getItem(
        'voisshield_active_campaign_draft'
      );

      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  const matchedScenario = (
    scenariosJsonData?.scenarios || []
  ).find(
    (scenario) =>
      scenario.scenarioId ===
      (formData?.scenarioId || draft.scenarioId)
  );

  const availableSenderEmails = Array.from(
    new Set(
      (scenariosJsonData?.scenarios || [])
        .map(
          (scenario) =>
            scenario.senderEmailId
        )
        .filter(Boolean)
    )
  );

  const emailSubject =
formData?.emailSubject ?? '';

  const emailBody =
    formData?.emailBody ||
    draft.emailBody ||
    matchedScenario?.emailBody ||
    '';

  const persistChanges = (fields) => {
    try {
      const current = localStorage.getItem(
        'voisshield_active_campaign_draft'
      );

      const updated = {
        ...(current ? JSON.parse(current) : {}),
        ...fields,
      };

      localStorage.setItem(
        'voisshield_active_campaign_draft',
        JSON.stringify(updated)
      );

      setDraft(updated);
    } catch (error) {
      console.error(
        'Unable to save email draft:',
        error
      );
    }
  };

  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));

    persistChanges({
      [field]: value,
    });
  };

 const handleEmailIdChange = (event) => {
  const chosenEmail = event.target.value;

  updateField('emailId', chosenEmail);

  // Clear validation error when user selects Email ID
  if (chosenEmail) {
    setErrorMsg('');
  }

  const matchingScenario = (
    scenariosJsonData?.scenarios || []
  ).find(
    (scenario) =>
      scenario.senderEmailId === chosenEmail
  );

  if (matchingScenario?.senderName) {
    updateField(
      'senderName',
      matchingScenario.senderName
    );
  }
};

  const insertFxToSubject = (param) => {
    setShowSubjectFxMenu(false);

    const input = subjectInputRef.current;

    if (input) {
      const start =
        input.selectionStart ??
        emailSubject.length;

      const end =
        input.selectionEnd ??
        emailSubject.length;

      const before =
        emailSubject.substring(0, start);

      const after =
        emailSubject.substring(end);

      const updated =
        `${before}${param.label} ${after}`;

      updateField(
        'emailSubject',
        updated
      );

      setTimeout(() => {
        input.focus();

        const newPosition =
          start +
          param.label.length +
          1;

        input.setSelectionRange(
          newPosition,
          newPosition
        );
      }, 0);
    } else {
      const updated = emailSubject
        ? `${emailSubject} ${param.label}`
        : param.label;

      updateField(
        'emailSubject',
        updated
      );
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        subjectFxRef.current &&
        !subjectFxRef.current.contains(
          event.target
        )
      ) {
        setShowSubjectFxMenu(false);
      }
    };

    document.addEventListener(
      'mousedown',
      handleClickOutside
    );

    return () => {
      document.removeEventListener(
        'mousedown',
        handleClickOutside
      );
    };
  }, []);

  const shellBg = isDark
    ? '#1C1E24'
    : '#F1F5F7';

    const lCardBg = isDark ? '#1C1E24' : '#F1F5F7';

  return (
    <div className="w-full">

      {/* ====================================================
          TRUE L-SHAPED EMAIL DETAILS
      ==================================================== */}

      <div
        className="
          relative
          flex
          flex-col
          w-full
          min-h-[420px]
        "
      >

        {/* ==================================================
            LEFT CAPSULE
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
              Email
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
                  ? 'text-slate-300'
                  : 'text-slate-600'
              }
            `}
          >
            Set the sender and
            <br />
            subject details
            <br />
            here
          </p>
        </div>

              <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
                  </svg>
                </div>
        {/* ==================================================
            CONCAVE CORNER
        ================================================== */}

        <div
          className="
            absolute
            top-[114px]
            left-[154px]
            w-4
            h-4
            pointer-events-none
            z-20
            overflow-hidden
          "
        >
          <svg
            className="w-4 h-4"
            viewBox="0 0 16 16"
            fill="none"
          >
            <path
              d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z"
              fill={shellBg}
            />
          </svg>
        </div>

        {/* ==================================================
            TOP RIGHT ARM
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
    overflow-visible
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

            {/* ==================================================
                LEFT COLUMN

                EMAIL ID
                SENDER NAME
            ================================================== */}

            <div
              className="
                flex
                flex-col
                justify-center
                min-w-0
                gap-1.5
              "
            >

              {/* EMAIL ID */}

              <div className="flex flex-col gap-0.5">

                <label
                  className="
                    text-[12.5px]
                    mb-2
                    font-bold
                    text-slate-900
                    dark:text-white
                    leading-none
                  "
                >
                  Email ID <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
                </label>

                <div
                  className="
                    w-full
                    h-7
                    px-2.5
                    mb-2
                    rounded-xl
                    flex
                    items-center
                    shadow-2xs
                    relative
                    bg-white
                    text-slate-900
                  "
                >

                  <select
                    value={formData?.emailId || ""}
                    onChange={
                      handleEmailIdChange
                    }
                    className="
                      w-full
                      bg-transparent
                      text-[10.5px]
                      font-medium
                      outline-none
                      cursor-pointer
                      pr-4
                      appearance-none
                    "
                  >

                    <option value="">
                      Select Email 
                    </option>

                    {availableSenderEmails.map(
                      (email) => (
                        <option
                          key={email}
                          value={email || ""}
                          className="
                            bg-white
                            text-slate-900
                          "
                        >
                          {email}
                        </option>
                      )
                    )}

                  </select>

                  <ChevronDown
                    className="
                      w-3.5
                      h-3.5
                      text-slate-400
                      absolute
                      right-2.5
                      pointer-events-none
                    "
                  />

                </div>
              </div>

              {/* SENDER NAME */}

              <FormInput
  label="Sender Name"
  value={
    formData?.senderName || ''
  }
  onChange={(event) => {
    updateField(
      'senderName',
      event.target.value
    );

    if (event.target.value.trim()) {
      setErrorMsg('');
    }
  }}
  placeholder="Type here"
/>

            </div>

            {/* ==================================================
                RIGHT COLUMN

                EMAIL SUBJECT
            ================================================== */}

            <div
              className="
                flex
                flex-col
                min-w-0
                lg:border-l
                lg:border-slate-200
                dark:lg:border-white/10
                lg:pl-6
              "
            >

              <div className="flex flex-col gap-0.5">

                <label
                  className="
                    text-[12.5px]
                    mb-2
                    font-bold
                    text-slate-900
                    dark:text-white
                    leading-none
                  "
                >
                  Email Subject <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
                </label>

                <div
                  className="
                    w-full
                    h-12
                    px-2.5
                    mb-2
                    rounded-xl
                    flex
                    items-center
                    shadow-2xs
                    relative
                    bg-white
                    text-slate-900
                  "
                >

                  <input
                    ref={subjectInputRef}
                    type="text"
                    value={emailSubject}
                    onChange={(event) =>
                      updateField(
                        'emailSubject',
                        event.target.value
                      )
                    }
                    placeholder="Type here"
                    className="
                      w-full
                      bg-transparent
                      text-[10.5px]
                      font-medium
                      outline-none
                      placeholder-slate-400
                      pr-12
                    "
                  />

                  {/* FX */}

                  <div
  ref={subjectFxRef}
  className="
    absolute
    right-2
    top-1/2
    -translate-y-1/2
    z-[99999]
  "
  style={{
    overflow: "visible",
  }}
>

                    <button
                      type="button"
                      onMouseDown={(event) =>
                        event.preventDefault()
                      }
                      onClick={() =>
                        setShowSubjectFxMenu(
                          (previous) =>
                            !previous
                        )
                      }
                      className="
                        px-2
                        py-0.5
                        rounded-2xl
                        bg-black
                        dark:bg-white
                        hover:brightness-110
                        text-white
                        dark:text-black
                        font-mono
                        text-[9px]
                        font-bold
                        shadow-xs
                        flex
                        items-center
                        gap-1
                        cursor-pointer
                      "
                    >
                      <span>fx</span>

                      <ChevronDown
                        className="
                          w-2.5
                          h-2.5
                        "
                      />
                    </button>

                    {showSubjectFxMenu && (
                      <div
                        className="
                          absolute
                          top-full
                          right-0
                          mt-1
                          w-52
                          max-h-56
                          overflow-y-auto
                          rounded-xl
                          bg-[#1A1C23]
                          border
                          border-white/20
                          p-1
                          shadow-2xl
                          flex
                          flex-col
                          gap-1
                          text-left
                          z-[99999]
                        "
                      >

                        <span
                          className="
                            text-[8px]
                            font-mono
                            uppercase
                            text-slate-400
                            px-2
                            py-1
                            font-bold
                          "
                        >
                          Insert Into Subject
                        </span>

                        {FX_PARAMETERS.map(
                          (fx) => (
                            <button
                              key={fx.label}
                              type="button"
                              onMouseDown={(
                                event
                              ) =>
                                event.preventDefault()
                              }
                              onClick={() =>
                                insertFxToSubject(
                                  fx
                                )
                              }
                              className="
                                p-1.5
                                px-2
                                rounded-lg
                                hover:bg-white/10
                                text-left
                                flex
                                items-center
                                justify-between
                                gap-2
                                cursor-pointer
                                transition-colors
                              "
                            >

                              <span
                                className="
                                  text-[9.5px]
                                  font-mono
                                  font-bold
                                  text-[#FF8595]
                                  whitespace-nowrap
                                "
                              >
                                {fx.label}
                              </span>

                              <span
                                className="
                                  text-[8px]
                                  text-slate-400
                                  truncate
                                  max-w-[90px]
                                "
                              >
                                {fx.desc}
                              </span>

                            </button>
                          )
                        )}

                      </div>
                    )}

                  </div>

                </div>

              </div>

            </div>

          </div>
        </div>

        {/* ==================================================
            BOTTOM BASE
            ONLY EMAIL BODY
        ================================================== */}

        <div
          style={{
            backgroundColor: shellBg,
          }}
          className="
            w-full
            flex-1
            rounded-tl-xl
            rounded-b-xl
            p-4
            sm:p-5
            z-10
          "
        >

          <div
            className="
              flex
              flex-col
              gap-0.5
              w-full
            "
          >

            <label
              className="
                text-[12.5px]
                mb-2
                font-bold
                text-slate-900
                dark:text-white
                leading-none
              "
            >
              Email Body <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
            </label>

            <div className="w-full min-h-[220px]">

              <EmailBodyRichTextEditor
                value={emailBody}
                onChange={(updatedHtml) => {
                  updateField(
                    'emailBody',
                    updatedHtml
                  );
                }}
                placeholder="Type your email body here..."
                minHeight={200}
              />

            </div>

          </div>

        </div>

      </div>

    </div>
  );
};

export default EmailDetailsTab;