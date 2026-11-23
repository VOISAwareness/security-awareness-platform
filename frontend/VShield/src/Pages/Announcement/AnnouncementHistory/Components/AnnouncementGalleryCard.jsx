import { ExternalLink, User, BarChart2 } from "lucide-react";

// One announcement on the On Going, Scheduled, Historical and Cancelled tabs:
// title and description beside its start-to-end timeline, then who created
// and approved it, and when it was published.

// "10/12/2026 09:00:00 AM" -> Date (also accepts "...,", and a trailing "BST")
export const parseDate = (s) => {
  const m =
    /^(\d{2})\/(\d{2})\/(\d{4}),? (\d{1,2}):(\d{2})(?::(\d{2}))? (AM|PM)(?: [A-Z]{2,4})?$/i.exec(
      String(s || "").trim(),
    );
  if (!m) return new Date(NaN);
  let h = Number(m[4]) % 12;
  if (m[7].toUpperCase() === "PM") h += 12;
  return new Date(
    Number(m[3]),
    Number(m[1]) - 1,
    Number(m[2]),
    h,
    Number(m[5]),
    Number(m[6] || 0),
  );
};

const pad = (n) => String(n).padStart(2, "0");

// "2-Jan-26"
const formatShortDate = (value) => {
  const d = parseDate(value);
  if (isNaN(d.getTime())) return "N/A";
  return `${d.getDate()}-${d.toLocaleString("en-US", { month: "short" })}-${String(d.getFullYear()).slice(-2)}`;
};

// "Oct-02-2026 2:00PM"
const formatScheduleTimestamp = (value) => {
  const d = parseDate(value);
  if (isNaN(d.getTime())) return "N/A";
  const hours = d.getHours() % 12 || 12;
  return `${d.toLocaleString("en-US", { month: "short" })}-${pad(d.getDate())}-${d.getFullYear()} ${hours}:${pad(d.getMinutes())}${d.getHours() >= 12 ? "PM" : "AM"}`;
};

// "09/28/2026 04:20:00 PM"
const formatPublishedTimestamp = (value) => {
  const d = parseDate(value);
  if (isNaN(d.getTime())) return "N/A";
  return `${pad(d.getMonth() + 1)}/${pad(d.getDate())}/${d.getFullYear()} ${pad(d.getHours() % 12 || 12)}:${pad(d.getMinutes())}:${pad(d.getSeconds())} ${d.getHours() >= 12 ? "PM" : "AM"}`;
};

const DAY = 1000 * 60 * 60 * 24;
const daysAgo = (value) => {
  const d = parseDate(value);
  if (isNaN(d.getTime())) return null;
  const days = Math.floor((Date.now() - d) / DAY);
  return days > 0 ? `(${days} Days Ago)` : "(Today)";
};
const daysUntil = (value) => {
  const d = parseDate(value);
  if (isNaN(d.getTime())) return null;
  const days = Math.ceil((d - Date.now()) / DAY);
  if (days > 0) return `(In ${days} Days)`;
  return days === 0 ? "(Starting today)" : "(Start time passed)";
};
const daysLeft = (value) => {
  const d = parseDate(value);
  if (isNaN(d.getTime())) return null;
  const days = Math.ceil((d - Date.now()) / DAY);
  return days > 0 ? `(${days} days left)` : "(Ending today)";
};

const AnnouncementGalleryCard = ({
  camp,
  tab,
  background,
  roundness = 1,
  onDetails,
  onAnalytics,
  actions = null,
}) => {
  const startNote =
    tab === "ongoing"
      ? daysAgo(camp.AnnouncementStartTime)
      : tab === "scheduled"
        ? daysUntil(camp.AnnouncementStartTime)
        : null;
  const endNote = tab === "ongoing" ? daysLeft(camp.AnnouncementEndTime) : null;
  const approvedBy = camp["AnnouncementApproved/RejectedBy"] || "NA";
  const pill =
    "h-6 px-3 rounded-full text-[9px] font-voda font-bold tracking-tight shadow-2xs flex items-center gap-1.5";

  return (
    <div
      style={{
        backgroundColor: background,
        borderRadius: `${Math.round(18 * roundness)}px`,
      }}
      className="p-4 px-5 text-slate-900 dark:text-white shadow-2xs flex flex-col gap-3 relative overflow-hidden transition-all hover:shadow-xs border border-black/5 dark:border-white/5 flex-shrink-0"
    >
      {/* Top Row: ID Badge + Created On + Status/Actions + External Link */}
      <div className="flex items-center -mt-2 -mb-1 justify-between gap-3">
        <span className="px-3 py-1 rounded-full bg-white/90 dark:bg-black/60 text-[8.5px] font-black text-slate-800 dark:text-slate-100 tracking-wide flex items-center gap-1.5 shadow-2xs font-mono-tech border border-black/5 dark:border-white/10">
          <span className="w-2 h-2 rounded-full bg-[#E60000]" />
          {camp.announcementId}
        </span>

        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-300">
            Created on: {formatShortDate(camp.AnnouncementCreationDate)}
          </span>

          {tab === "historical" && (
            <span className={`${pill} bg-[#F43F5E] text-white`}>
              Announcement Ended
            </span>
          )}
          {tab === "cancelled" && (
            <span className={`${pill} bg-[#EF4444] text-white`}>
              Announcement Cancelled
            </span>
          )}

          {actions}

          {onAnalytics && (
            <button
              type="button"
              onClick={() => onAnalytics(camp)}
              className={`${pill} bg-white hover:bg-slate-50 text-[#E11D48] border border-rose-200/60 cursor-pointer active:scale-95 transition-all`}
            >
              <span>View Analytics</span>
              <BarChart2 className="w-3 h-3 text-[#E11D48] stroke-[2.5]" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onDetails(camp)}
            className="text-slate-700 dark:text-slate-300 hover:text-black dark:hover:text-white cursor-pointer transition-colors p-0.5"
            title="View Full Specifications & Email Preview"
          >
            <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* Middle Row: Title & Description + Start-to-End Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        <div className="lg:col-span-7 flex flex-col text-left">
          <h4 className="text-[13px] font-voda font-bold tracking-tight text-slate-950 dark:text-white leading-tight">
            {camp.AnnouncementTitle}
          </h4>
          {tab === "cancelled" ? (
            <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 leading-snug mt-1 max-w-xl line-clamp-2">
              <strong className="font-bold text-slate-900 dark:text-white">
                Reason for cancelling:{" "}
              </strong>
              {camp.AnnouncementReasonForCancel &&
              camp.AnnouncementReasonForCancel.trim().toUpperCase() !== "NA"
                ? camp.AnnouncementReasonForCancel
                : "No reason given"}
            </p>
          ) : (
            camp.AnnouncementDescription && (
              <p className="text-[10px] font-medium text-slate-700 dark:text-slate-300 leading-snug mt-1 max-w-xl line-clamp-2">
                <strong className="font-bold text-slate-900 dark:text-white">
                  Description:{" "}
                </strong>
                {camp.AnnouncementDescription}
              </p>
            )
          )}
        </div>

        <div className="lg:col-span-5 flex items-center justify-end gap-2.5 text-right flex-shrink-0">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
              Scheduled Start Time:
            </span>
            <span className="text-[9.5px] font-medium text-slate-600 dark:text-slate-300">
              {formatScheduleTimestamp(camp.AnnouncementStartTime)}
            </span>
            {startNote && (
              <span className="text-[9.5px] font-bold text-[#16A34A] dark:text-[#4ADE80]">
                {startNote}
              </span>
            )}
          </div>

          <div className="flex items-center w-24 sm:w-28 mx-1 relative">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] shrink-0 z-10 shadow-xs" />
            <div className="flex-1 h-[1.5px] bg-slate-400 dark:bg-slate-500" />
            <span className="w-2 h-2 rounded-full bg-[#F43F5E] shrink-0 z-10 shadow-xs" />
          </div>

          <div className="flex flex-col items-start text-left leading-tight">
            <span className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
              Scheduled End Time:
            </span>
            <span className="text-[9.5px] font-medium text-slate-600 dark:text-slate-300">
              {formatScheduleTimestamp(camp.AnnouncementEndTime)}
            </span>
            {endNote && (
              <span className="text-[9.5px] font-bold text-[#16A34A] dark:text-[#4ADE80]">
                {endNote}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Meta Line: Created By + Approved By + Published On */}
      <div className="w-full pt-1.5 -mb-1 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3 flex-wrap text-[10px] font-voda font-bold text-slate-800 dark:text-slate-200">
        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
          <span>
            Created By:{" "}
            <strong className="font-semibold text-slate-700 dark:text-slate-300">
              {camp.AnnouncementCreatedBy || "User"}
            </strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[#9333EA] dark:text-[#C084FC]">
          <User className="w-3.5 h-3.5" />
          <span>
            Approved By: <strong>{approvedBy}</strong>
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <User className="w-3.5 h-3.5 text-slate-900 dark:text-white" />
          <span>
            Published On:{" "}
            <strong className="font-semibold text-slate-700 dark:text-slate-300">
              {formatPublishedTimestamp(camp.AnnouncementLastModified)}
            </strong>
          </span>
        </div>
      </div>
    </div>
  );
};

export default AnnouncementGalleryCard;
