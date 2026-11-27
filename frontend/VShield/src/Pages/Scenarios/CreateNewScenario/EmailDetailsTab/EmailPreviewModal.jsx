import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  Archive,
  Ban,
  Flag,
  Forward,
  Inbox,
  Mail,
  Minus,
  MoreHorizontal,
  Pencil,
  Reply,
  ReplyAll,
  Search,
  Send,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { PREVIEW_RECIPIENT, previewDocument, previewSubject } from "../../../../services/simulationPages";

// =========================================================================
// Email preview in a desktop mail client's look, the way the employee meets
// the simulation:
//   - Inbox: the message list with the reading pane (a single click)
//   - Window: the message opened in its own window (a double click)
// A generic client, not any vendor's product. The body is a sandboxed frame:
// nothing in it runs and no link can be followed. Mount it only while open,
// so every opening starts on the simulation message.
// =========================================================================

const VIEWS = [
  { id: "pane", label: "Inbox · reading pane", hint: "Single click in the inbox" },
  { id: "window", label: "Opened in its own window", hint: "Double click on the message" },
];

const FOLDERS = [
  { name: "Inbox", icon: Inbox, count: 5 },
  { name: "Drafts", icon: Pencil },
  { name: "Sent Items", icon: Send },
  { name: "Deleted Items", icon: Trash2 },
  { name: "Junk Email", icon: Ban },
  { name: "Archive", icon: Archive },
];

// Everyday mail around the simulation, so the list looks like a real inbox.
const OTHER_MAIL = [
  {
    id: "m1",
    from: "IT Service Desk",
    subject: "Scheduled maintenance this weekend",
    snippet: "Some services will be briefly unavailable on Saturday between 22:00 and 23:30.",
    time: "09:12",
  },
  {
    id: "m2",
    from: "People Team",
    subject: "Updated holiday calendar for next year",
    snippet: "The holiday calendar has been published on the intranet. Please plan your leave.",
    time: "Yesterday",
  },
  {
    id: "m3",
    from: "Jordan Lee",
    subject: "Notes from the weekly sync",
    snippet: "Thanks all for joining. Actions and owners are listed below.",
    time: "Mon",
  },
  {
    id: "m4",
    from: "Facilities",
    subject: "Car park resurfacing",
    snippet: "The east car park will be closed on Thursday while it is resurfaced.",
    time: "Fri",
  },
];

const SIMULATION_ID = "simulation";

const initialsOf = (name) =>
  String(name || "?")
    .split(/[\s._@-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "?";

const textOf = (html) => {
  if (typeof document === "undefined") return "";
  const el = document.createElement("div");
  el.innerHTML = String(html || "");
  return (el.textContent || "").replace(/\s+/g, " ").trim();
};

const Avatar = ({ name, size = 36 }) => (
  <span
    style={{ width: size, height: size, fontSize: size * 0.38 }}
    className="flex flex-shrink-0 items-center justify-center rounded-full bg-[#C7E0F4] font-semibold text-[#0F548C]"
  >
    {initialsOf(name)}
  </span>
);

const ToolButton = ({ icon: Icon, label }) => (
  <span className="flex items-center gap-1.5 rounded px-2 py-1 text-[12px] text-[#242424] hover:bg-[#EBEBEB] cursor-default select-none">
    <Icon className="h-4 w-4 text-[#0F6CBD]" />
    {label}
  </span>
);

const EmailPreviewModal = ({
  open,
  onClose,
  html,
  senderName,
  senderEmail,
  subject,
  initialView = "pane",
}) => {
  const [view, setView] = useState(initialView);
  const [selectedId, setSelectedId] = useState(SIMULATION_ID);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  const from = senderName?.trim() || senderEmail?.trim() || "Unknown sender";
  const fromEmail = senderEmail?.trim() || "";
  // Placeholders shown with sample values.
  const title = previewSubject(subject) || "(no subject)";
  const now = new Date();
  const sentAt = now.toLocaleString("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
  const listTime = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

  const bodyDoc = useMemo(() => previewDocument(html), [html]);
  const snippet = useMemo(() => textOf(html).slice(0, 110), [html]);

  if (!open || typeof document === "undefined") return null;

  const selectedOther = OTHER_MAIL.find((m) => m.id === selectedId);

  const header = (compact) => (
    <div className={compact ? "px-5 pt-4" : "px-6 pt-5"}>
      <h2 className={`font-semibold text-[#242424] ${compact ? "text-[18px]" : "text-[20px]"} leading-snug`}>
        {title}
      </h2>
      <div className="mt-3 flex items-start gap-3">
        <Avatar name={from} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-1.5">
            <span className="text-[14px] font-semibold text-[#242424]">{from}</span>
            {fromEmail && <span className="text-[12.5px] text-[#616161]">&lt;{fromEmail}&gt;</span>}
          </div>
          <div className="text-[12px] text-[#616161]">
            To: {PREVIEW_RECIPIENT.name} &lt;{PREVIEW_RECIPIENT.email}&gt;
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-center gap-0.5 text-[#0F6CBD]">
            <span className="rounded p-1 hover:bg-[#EBEBEB]" title="Reply"><Reply className="h-4 w-4" /></span>
            <span className="rounded p-1 hover:bg-[#EBEBEB]" title="Reply all"><ReplyAll className="h-4 w-4" /></span>
            <span className="rounded p-1 hover:bg-[#EBEBEB]" title="Forward"><Forward className="h-4 w-4" /></span>
            <span className="rounded p-1 hover:bg-[#EBEBEB] text-[#616161]"><MoreHorizontal className="h-4 w-4" /></span>
          </div>
          <span className="text-[11.5px] text-[#616161]">{sentAt}</span>
        </div>
      </div>
    </div>
  );

  const bodyFrame = (
    <iframe
      title="Email body preview"
      sandbox=""
      srcDoc={bodyDoc}
      className="block h-full w-full border-0 bg-white"
    />
  );

  // -------------------------------------------------------------------
  // Inbox with the reading pane (single click)
  // -------------------------------------------------------------------
  const renderPane = () => (
    <div className="flex h-full min-h-0 flex-col bg-[#F5F5F5]">
      {/* App bar */}
      <div className="flex h-11 flex-shrink-0 items-center gap-3 bg-[#0F6CBD] px-3 text-white">
        <Mail className="h-5 w-5" />
        <span className="text-[13px] font-semibold">Mail</span>
        <div className="mx-auto flex w-full max-w-md items-center gap-2 rounded bg-white/90 px-2 py-1 text-[12px] text-[#616161]">
          <Search className="h-3.5 w-3.5" />
          Search
        </div>
        <Avatar name={PREVIEW_RECIPIENT.name} size={28} />
      </div>

      {/* Ribbon */}
      <div className="flex h-10 flex-shrink-0 items-center gap-1 border-b border-[#E0E0E0] bg-white px-3">
        <span className="mr-2 flex items-center gap-1.5 rounded bg-[#0F6CBD] px-3 py-1 text-[12px] font-semibold text-white select-none">
          <Pencil className="h-3.5 w-3.5" /> New mail
        </span>
        <ToolButton icon={Trash2} label="Delete" />
        <ToolButton icon={Archive} label="Archive" />
        <ToolButton icon={Ban} label="Report" />
        <ToolButton icon={Reply} label="Reply" />
        <ToolButton icon={ReplyAll} label="Reply all" />
        <ToolButton icon={Forward} label="Forward" />
        <ToolButton icon={Flag} label="Flag" />
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Folders */}
        <div className="hidden w-48 flex-shrink-0 flex-col gap-0.5 border-r border-[#E0E0E0] bg-[#FAFAFA] p-2 md:flex">
          <span className="px-2 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-[#616161]">
            {PREVIEW_RECIPIENT.email}
          </span>
          {FOLDERS.map(({ name, icon: Icon, count }) => (
            <span
              key={name}
              className={`flex items-center gap-2 rounded px-2 py-1.5 text-[13px] select-none ${
                name === "Inbox" ? "bg-[#EBF3FC] font-semibold text-[#0F6CBD]" : "text-[#242424]"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{name}</span>
              {count ? <span className="text-[12px] font-semibold">{count}</span> : null}
            </span>
          ))}
        </div>

        {/* Message list */}
        <div className="flex w-[300px] flex-shrink-0 flex-col border-r border-[#E0E0E0] bg-white lg:w-[340px]">
          <div className="flex items-center gap-4 border-b border-[#E0E0E0] px-4 py-2 text-[13px]">
            <span className="border-b-2 border-[#0F6CBD] pb-1 font-semibold text-[#0F6CBD]">Focused</span>
            <span className="pb-1 text-[#616161]">Other</span>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <button
              type="button"
              onClick={() => setSelectedId(SIMULATION_ID)}
              onDoubleClick={() => setView("window")}
              title="Double click to open in its own window"
              className={`relative block w-full border-b border-[#F0F0F0] px-4 py-2.5 text-left cursor-pointer ${
                selectedId === SIMULATION_ID ? "bg-[#CFE4FA]" : "hover:bg-[#F5F5F5]"
              }`}
            >
              <span className="absolute inset-y-0 left-0 w-[3px] bg-[#0F6CBD]" />
              <span className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[14px] font-semibold text-[#242424]">{from}</span>
                <span className="flex-shrink-0 text-[11.5px] font-semibold text-[#0F6CBD]">{listTime}</span>
              </span>
              <span className="block truncate text-[13px] font-semibold text-[#0F6CBD]">{title}</span>
              <span className="block truncate text-[12px] text-[#616161]">{snippet || "(no preview)"}</span>
            </button>
            {OTHER_MAIL.map((mail) => (
              <button
                key={mail.id}
                type="button"
                onClick={() => setSelectedId(mail.id)}
                className={`block w-full border-b border-[#F0F0F0] px-4 py-2.5 text-left cursor-pointer ${
                  selectedId === mail.id ? "bg-[#CFE4FA]" : "hover:bg-[#F5F5F5]"
                }`}
              >
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[14px] text-[#242424]">{mail.from}</span>
                  <span className="flex-shrink-0 text-[11.5px] text-[#616161]">{mail.time}</span>
                </span>
                <span className="block truncate text-[13px] text-[#242424]">{mail.subject}</span>
                <span className="block truncate text-[12px] text-[#616161]">{mail.snippet}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Reading pane */}
        <div className="flex min-w-0 flex-1 flex-col bg-white">
          {selectedOther ? (
            <div className="px-5 pt-4">
              <h2 className="text-[18px] font-semibold text-[#242424]">{selectedOther.subject}</h2>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={selectedOther.from} />
                <span className="text-[14px] font-semibold text-[#242424]">{selectedOther.from}</span>
              </div>
              <p className="mt-5 text-[14px] text-[#242424]">{selectedOther.snippet}</p>
            </div>
          ) : (
            <>
              {header(true)}
              <div className="mt-3 min-h-0 flex-1 border-t border-[#F0F0F0]">{bodyFrame}</div>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // -------------------------------------------------------------------
  // The message in its own window (double click)
  // -------------------------------------------------------------------
  const renderWindow = () => (
    <div className="flex h-full min-h-0 items-stretch justify-center bg-[#3B3B3B]/40 p-3 sm:p-6">
      <div className="flex w-full max-w-5xl min-h-0 flex-col overflow-hidden rounded-md border border-[#C8C8C8] bg-white shadow-2xl">
        {/* Title bar */}
        <div className="flex h-9 flex-shrink-0 items-center bg-[#0F6CBD] pl-3 text-white">
          <Mail className="mr-2 h-4 w-4" />
          <span className="flex-1 truncate text-[12.5px]">{title} - Message (HTML)</span>
          <span className="flex h-full">
            <span className="flex w-11 items-center justify-center hover:bg-white/15"><Minus className="h-3.5 w-3.5" /></span>
            <span className="flex w-11 items-center justify-center hover:bg-white/15"><Square className="h-3 w-3" /></span>
            <button
              type="button"
              onClick={() => setView("pane")}
              className="flex w-11 items-center justify-center hover:bg-[#C42B1C] cursor-pointer"
              title="Close the message window (back to the inbox)"
            >
              <X className="h-4 w-4" />
            </button>
          </span>
        </div>

        {/* Ribbon */}
        <div className="flex-shrink-0 border-b border-[#E0E0E0] bg-[#FAFAFA]">
          <div className="flex gap-4 px-3 pt-1.5 text-[12px] text-[#616161]">
            <span>File</span>
            <span className="border-b-2 border-[#0F6CBD] pb-1 font-semibold text-[#0F6CBD]">Message</span>
            <span>Help</span>
          </div>
          <div className="flex flex-wrap items-center gap-1 border-t border-[#E0E0E0] px-2 py-1.5">
            <ToolButton icon={Trash2} label="Delete" />
            <ToolButton icon={Archive} label="Archive" />
            <span className="mx-1 h-5 w-px bg-[#E0E0E0]" />
            <ToolButton icon={Reply} label="Reply" />
            <ToolButton icon={ReplyAll} label="Reply all" />
            <ToolButton icon={Forward} label="Forward" />
            <span className="mx-1 h-5 w-px bg-[#E0E0E0]" />
            <ToolButton icon={Ban} label="Report" />
            <ToolButton icon={Flag} label="Follow up" />
          </div>
        </div>

        {header(false)}
        <div className="mt-4 min-h-0 flex-1 border-t border-[#F0F0F0]">{bodyFrame}</div>
      </div>
    </div>
  );

  return createPortal(
    <div
      className="fixed inset-0 z-[2147483647] flex flex-col bg-[#1B1B1F]"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      role="dialog"
      aria-modal="true"
      aria-label="Email preview"
    >
      {/* Preview controls */}
      <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-white/10 bg-[#202127] px-3 py-2 text-white">
        <span className="mr-2 text-[11px] font-bold uppercase tracking-wider text-slate-300">Email preview</span>
        <div className="flex rounded-lg border border-white/15 bg-black/30 p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setView(v.id)}
              title={v.hint}
              className={`rounded-md px-3 py-1 text-[11px] font-semibold cursor-pointer transition-colors ${
                view === v.id ? "bg-white text-[#202127]" : "text-slate-300 hover:text-white"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <span className="hidden text-[10.5px] text-slate-400 md:inline">
          Sample recipient: {PREVIEW_RECIPIENT.name}. Links are shown but cannot be followed here.
        </span>
        <button
          type="button"
          onClick={onClose}
          className="ml-auto flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-bold text-slate-200 hover:bg-white/10 cursor-pointer"
          title="Close preview (Esc)"
        >
          <X className="h-3.5 w-3.5" /> Close
        </button>
      </div>

      <div className="min-h-0 flex-1">{view === "window" ? renderWindow() : renderPane()}</div>
    </div>,
    document.body,
  );
};

export default EmailPreviewModal;
