import { useEffect, useRef, useState } from "react";
import { useUserType } from "../../../../UserTypeContext/UserTypeContext";
import { ArrowDownUp, ArrowDownWideNarrow, ArrowUpNarrowWide, Check, ChevronDown, Search } from "lucide-react";

import EmailBodyRichTextEditor from "./EmailBodyRichTextEditor";
import scenariosJsonData from "../../ScenariosData.json";
import { api } from "../../../../services/api";
import { noVerifiedSender, senderChoices, sortByAdded } from "../../../../services/campaignSenders";
import { SUBJECT_FX } from "../../../../services/simulationPages";


const FormInput = ({ label, value, onChange, placeholder = "Type here" }) => {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-[12.5px] mb-2 font-bold text-slate-900 dark:text-white leading-none">
        {label}{" "}
        <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">*</span>
      </label>

      <div className="w-full h-7 px-2.5 mb-2 rounded-xl flex items-center shadow-2xs relative bg-white text-slate-900 dark:bg-[#15161A]
                    dark:border-white/10
                    dark:text-white">
        <input
          type="text"
          value={value || ""}
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

const EmailDetailsTab = ({ formData, setFormData, setErrorMsg }) => {
  const { isDark } = useUserType?.() || {
    isDark: false,
  };

  const subjectInputRef = useRef(null);
  const subjectFxRef = useRef(null);

  const [showSubjectFxMenu, setShowSubjectFxMenu] = useState(false);

  const matchedScenario = (scenariosJsonData?.scenarios || []).find(
    (scenario) => scenario.scenarioId === formData?.scenarioId,
  );

  // Sender Email ID choices: the whitelisted addresses on Email IDs & Domains
  // (GET /sender-identities), as in the campaign wizard: verified ones can be
  // chosen, the rest are listed greyed with their state, and a sender the
  // scenario already has stays even if it is no longer on the list. If the API
  // cannot be reached, the bundled scenarios' senders stand in.
  const [senderRows, setSenderRows] = useState(null);
  useEffect(() => {
    let active = true;
    api.senderIdentities
      .list()
      .then((rows) => {
        if (active) setSenderRows(Array.isArray(rows) ? rows : []);
      })
      .catch(() => {
        if (!active) return;
        const bundled = Array.from(
          new Set((scenariosJsonData?.scenarios || []).map((scenario) => scenario.senderEmailId).filter(Boolean)),
        );
        setSenderRows(bundled.map((email) => ({ email })));
      });
    return () => {
      active = false;
    };
  }, []);
  const senderOptions = senderChoices(senderRows || [], formData?.emailId);

  // The Email ID picker (as Start Campaign's "Add email IDs one by one"):
  // a search box over the senders already loaded, filtered as you type.
  const [showSenderMenu, setShowSenderMenu] = useState(false);
  const [senderSearch, setSenderSearch] = useState("");
  const senderMenuRef = useRef(null);
  // Sort by the date each Email ID was added: off, newest first, oldest first.
  const [senderOrder, setSenderOrder] = useState(null);
  const nextSenderOrder = { null: "newest", newest: "oldest", oldest: null }[String(senderOrder)];
  const senderOrderTip = {
    null: "Sort by date added. Click to show the newest Email IDs first.",
    newest: "Sorted by date added, newest first. Click for oldest first.",
    oldest: "Sorted by date added, oldest first. Click to go back to A to Z.",
  }[String(senderOrder)];
  const senderQuery = senderSearch.trim().toLowerCase();
  const shownSenders = sortByAdded(
    senderQuery
      ? senderOptions.filter((choice) => choice.email.toLowerCase().includes(senderQuery))
      : senderOptions,
    senderOrder,
  );
  const addedLabel = (choice) =>
    Number.isNaN(choice.addedAt)
      ? ""
      : new Date(choice.addedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const senderNote = (choice) =>
    choice.label === choice.email ? "Verified" : choice.label.slice(choice.email.length).trim().replace(/^\(|\)$/g, "");
  useEffect(() => {
    if (!showSenderMenu) return undefined;
    const close = (event) => {
      if (senderMenuRef.current && !senderMenuRef.current.contains(event.target)) setShowSenderMenu(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [showSenderMenu]);

  const emailSubject = formData?.emailSubject ?? "";

  const emailBody = formData?.emailBody || matchedScenario?.emailBody || "";

  // Sender, subject and body live in the scenario's own formData, which the
  // wizard saves as this user's scenario draft. (They used to be mirrored into
  // the campaign wizard's draft key, which the two screens then fought over.)
  const updateField = (field, value) => {
    setFormData((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleEmailIdChange = (event) => {
    const chosenEmail = event.target.value;

    updateField("emailId", chosenEmail);

    // Clear validation error when user selects Email ID
    if (chosenEmail) {
      setErrorMsg("");
    }

    const matchingScenario = (scenariosJsonData?.scenarios || []).find(
      (scenario) => scenario.senderEmailId === chosenEmail,
    );

    if (matchingScenario?.senderName) {
      updateField("senderName", matchingScenario.senderName);
    }
  };

  const insertFxToSubject = (param) => {
    setShowSubjectFxMenu(false);

    const input = subjectInputRef.current;

    if (input) {
      const start = input.selectionStart ?? emailSubject.length;

      const end = input.selectionEnd ?? emailSubject.length;

      const before = emailSubject.substring(0, start);

      const after = emailSubject.substring(end);

      const updated = `${before}${param.label} ${after}`;

      updateField("emailSubject", updated);

      setTimeout(() => {
        input.focus();

        const newPosition = start + param.label.length + 1;

        input.setSelectionRange(newPosition, newPosition);
      }, 0);
    } else {
      const updated = emailSubject
        ? `${emailSubject} ${param.label}`
        : param.label;

      updateField("emailSubject", updated);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        subjectFxRef.current &&
        !subjectFxRef.current.contains(event.target)
      ) {
        setShowSubjectFxMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const shellBg = isDark ? "#1C1E24" : "#F1F5F7";

  const lCardBg = isDark ? "#1C1E24" : "#F1F5F7";

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
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={shellBg} />
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
                  Email ID{" "}
                  <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">
                    *
                  </span>
                </label>

                <div ref={senderMenuRef} className="relative z-40 mb-2">
                  <button
                    type="button"
                    aria-haspopup="listbox"
                    aria-expanded={showSenderMenu}
                    onClick={() => {
                      setShowSenderMenu((open) => !open);
                      setSenderSearch("");
                    }}
                    className="w-full h-7 px-2.5 rounded-xl flex items-center justify-between shadow-2xs bg-white text-slate-900 dark:bg-[#15161A] dark:text-white cursor-pointer select-none"
                  >
                    <span className={`text-[10.5px] font-medium truncate pr-2 ${formData?.emailId ? "" : "text-slate-400"}`}>
                      {formData?.emailId || "Select Email"}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  </button>

                  {showSenderMenu && (
                    <div
                      role="listbox"
                      aria-label="Email IDs"
                      style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999 }}
                      className={`mt-1 rounded-2xl p-2 shadow-2xl border flex flex-col gap-1.5 ${
                        isDark ? "bg-[#181A20] border-white/15 text-white" : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      <div
                        className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
                          isDark ? "bg-white/5 border-white/10" : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <Search className="w-3 h-3 text-slate-400 flex-shrink-0" />
                        <input
                          type="text"
                          autoFocus
                          value={senderSearch}
                          onChange={(event) => setSenderSearch(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") setShowSenderMenu(false);
                          }}
                          placeholder="Filter by email ID..."
                          aria-label="Filter email IDs"
                          className="w-full bg-transparent text-[9.5px] outline-none"
                        />
                        <span className="group relative flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => setSenderOrder(nextSenderOrder)}
                            aria-label={senderOrderTip}
                            className={`flex h-4 w-4 items-center justify-center rounded cursor-pointer transition-colors ${
                              senderOrder
                                ? "text-[#2563EB] bg-[#2563EB]/10"
                                : isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-400 hover:text-slate-700 hover:bg-slate-200"
                            }`}
                          >
                            {senderOrder === "newest" ? (
                              <ArrowDownWideNarrow className="h-3 w-3" />
                            ) : senderOrder === "oldest" ? (
                              <ArrowUpNarrowWide className="h-3 w-3" />
                            ) : (
                              <ArrowDownUp className="h-3 w-3" />
                            )}
                          </button>
                          <span
                            role="tooltip"
                            className="pointer-events-none absolute right-0 top-full z-10 mt-1.5 w-44 rounded-lg bg-[#1A1C23] px-2 py-1.5 text-[8.5px] font-medium leading-snug text-white opacity-0 shadow-xl transition-opacity group-hover:opacity-100"
                          >
                            {senderOrderTip}
                          </span>
                        </span>
                      </div>

                      <div className="flex flex-col gap-1 max-h-60 overflow-y-auto pr-1">
                        {senderRows === null && (
                          <span className="p-2 text-[9.5px] text-slate-400">Loading Email IDs...</span>
                        )}
                        {senderRows !== null && noVerifiedSender(senderOptions) && (
                          <span className="p-2 text-[9.5px] text-slate-400">
                            No verified Email IDs yet: add one on Email IDs &amp; Domains.
                          </span>
                        )}
                        {senderRows !== null && senderOptions.length > 0 && shownSenders.length === 0 && (
                          <span className="p-2 text-[9.5px] text-slate-400">No Email ID matches "{senderSearch.trim()}".</span>
                        )}
                        {shownSenders.map((choice) => {
                          const isSelected = choice.email.toLowerCase() === String(formData?.emailId || "").toLowerCase();
                          const note = senderNote(choice);
                          return (
                            <button
                              key={choice.email}
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              disabled={!choice.selectable}
                              data-sender-choice={choice.selectable ? "verified" : "unverified"}
                              onClick={() => {
                                handleEmailIdChange({ target: { value: choice.email } });
                                setShowSenderMenu(false);
                              }}
                              title={choice.selectable ? choice.email : `${choice.email}: ${note}. Verify it on Email IDs & Domains first.`}
                              className={`p-2 rounded-xl flex items-center justify-between gap-2 text-left transition-all ${
                                !choice.selectable
                                  ? "opacity-45 cursor-not-allowed"
                                  : isSelected
                                    ? isDark ? "bg-white/10 cursor-pointer" : "bg-[#EBF1F5] cursor-pointer"
                                    : isDark ? "hover:bg-white/5 cursor-pointer" : "hover:bg-[#F2F5F8] cursor-pointer"
                              }`}
                            >
                              <span className="flex min-w-0 flex-col pr-2">
                                <span className="text-[10px] font-bold tracking-tight truncate">{choice.email}</span>
                                <span className={`text-[8.5px] truncate ${isDark ? "text-slate-400" : "text-slate-500"}`}>
                                  {note}
                                  {addedLabel(choice) && ` · Added ${addedLabel(choice)}`}
                                </span>
                              </span>
                              {isSelected && <Check className="w-3 h-3 flex-shrink-0 text-emerald-500" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* SENDER NAME */}

              <FormInput
                label="Sender Name"
                value={formData?.senderName || ""}
                onChange={(event) => {
                  updateField("senderName", event.target.value);

                  if (event.target.value.trim()) {
                    setErrorMsg("");
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
                justify-center
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
                  Email Subject{" "}
                  <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">
                    *
                  </span>
                </label>

                {/* As tall as Email ID + Sender Name beside it; 3+ lines show,
                    a longer subject scrolls. */}
                <div
                  className="
                    w-full
                    h-[92px]
                    pl-2.5
                    pr-1
                    py-1.5
                    mb-2
                    rounded-xl
                    flex
                    items-start
                    shadow-2xs
                    relative
                    bg-white
                    text-slate-900
                    dark:bg-[#15161A]
                    dark:border-white/10
                    dark:text-white
                  "
                >
                  <textarea
                    ref={subjectInputRef}
                    rows={3}
                    value={emailSubject}
                    onChange={(event) =>
                      // A subject is one line: Enter and pasted line breaks become spaces.
                      updateField("emailSubject", event.target.value.replace(/[\r\n]+/g, " "))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") event.preventDefault();
                    }}
                    placeholder="Type here"
                    className="
                      vshield-canvas-scroll
                      w-full
                      h-full
                      min-h-[3lh]
                      resize-none
                      overflow-y-auto
                      bg-transparent
                      text-[10.5px]
                      leading-[15px]
                      font-medium
                      text-left
                      align-top
                      outline-none
                      placeholder-slate-400
                      pr-14
                    "
                  />

                  {/* FX */}

                  <div
                    ref={subjectFxRef}
                    className="
    absolute
    right-3
    top-1.5
    z-[99999]
  "
                    style={{
                      overflow: "visible",
                    }}
                  >
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() =>
                        setShowSubjectFxMenu((previous) => !previous)
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

                        {SUBJECT_FX.map((fx) => (
                          <button
                            key={fx.label}
                            type="button"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => insertFxToSubject(fx)}
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
                        ))}
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
            z-0
            overflow-y-auto
            [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md
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
              Email Body{" "}
              <span className="text-[#FF6B6B] dark:text-[#FFA8A8] font-bold">
                *
              </span>
            </label>

            <div className="w-full min-h-[220px]">
              <EmailBodyRichTextEditor
                value={emailBody}
                onChange={(updatedHtml) => {
                  updateField("emailBody", updatedHtml);
                }}
                previewMeta={{
                  senderName: formData?.senderName || "",
                  senderEmail: formData?.emailId || "",
                  subject: emailSubject,
                }}
                browserPage={formData?.browserPageHtml || ""}
                onBrowserPageChange={(updatedHtml) => {
                  updateField("browserPageHtml", updatedHtml);
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
