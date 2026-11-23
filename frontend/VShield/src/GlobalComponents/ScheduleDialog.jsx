import { useRef, useState } from 'react';
import { CalendarClock, X } from 'lucide-react';
import DateTimeField from './DateTimeField';
import { scheduleProblem } from '../services/campaignSchedule';
import { zoneLabel } from '../shared/dateTime';

// Asks for a campaign's new start and end before it goes ahead again: when a
// campaign on hold is resumed, or a cancelled one is reinvoked. The times are
// UK time (the picker shows BST / GMT). `requireEnd` is false for a campaign
// that auto-ends after sending, where the end may be left empty.
// onConfirm({ startTime, endTime }) is awaited; an error it throws is shown
// here and the dialog stays open.
const ScheduleDialog = ({
  title,
  intro,
  confirmLabel = 'Confirm',
  busyLabel = 'Saving…',
  campaign,
  requireEnd = true,
  isDark = false,
  onConfirm,
  onClose,
}) => {
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const boxRef = useRef(null);

  const confirm = async () => {
    const problem = scheduleProblem({ startTime, endTime }, { requireEnd });
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onConfirm({ startTime, endTime: endTime || '' });
    } catch (e) {
      setError(e?.message || 'Could not save the new dates.');
      setBusy(false);
    }
  };

  // the picker sits on the page's grey in the wizard; here it needs its own box
  const field = isDark ? 'border border-white/10 bg-white/[0.04]' : 'border border-slate-200 bg-[#F4F6F9]';
  const label = `text-[10px] font-bold uppercase tracking-wide ${isDark ? 'text-slate-400' : 'text-slate-500'}`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-dialog-title"
      // Escape closes the dialog, except when it comes from a calendar: that
      // is portalled outside this box, and its Escape only closes itself.
      onKeyDown={(e) => e.key === 'Escape' && !busy && boxRef.current?.contains(e.target) && onClose()}
    >
      <div
        ref={boxRef}
        className={`w-full max-w-md rounded-2xl border p-5 shadow-2xl flex flex-col gap-4 ${
          isDark ? 'bg-[#15161A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 w-8 h-8 rounded-xl bg-[#E60000]/10 text-[#E60000] flex items-center justify-center flex-shrink-0">
              <CalendarClock className="w-4 h-4" />
            </span>
            <div>
              <h3 id="schedule-dialog-title" className="text-[14px] font-voda font-bold leading-tight">
                {title}
              </h3>
              {campaign && (
                <p className={`text-[10.5px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {campaign.campaignId} · {campaign.CampaignTitle || campaign.campaignTitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
            className="p-1 rounded-md opacity-60 hover:opacity-100 cursor-pointer disabled:cursor-not-allowed"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {intro && <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>{intro}</p>}

        <div className="flex flex-col gap-1.5">
          <span className={label}>New start ({zoneLabel()} · UK time)</span>
          <DateTimeField
            value={startTime}
            onChange={(next) => {
              setStartTime(next);
              setError('');
            }}
            disablePast
            isDark={isDark}
            className={field}
            ariaLabel="New start"
            placeholder="Select start date & time"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className={label}>New end{requireEnd ? '' : ' (optional: it ends after sending)'}</span>
          <DateTimeField
            value={endTime}
            onChange={(next) => {
              setEndTime(next);
              setError('');
            }}
            disablePast
            min={startTime}
            isDark={isDark}
            className={field}
            ariaLabel="New end"
            placeholder="Select end date & time"
          />
        </div>

        {error && (
          <p role="alert" className="text-[10.5px] font-bold text-[#E60000] dark:text-[#FF8A8A]">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className={`h-8 px-4 rounded-xl text-[10.5px] font-bold border cursor-pointer disabled:opacity-50 ${
              isDark ? 'border-white/15 hover:bg-white/5' : 'border-slate-200 hover:bg-slate-50'
            }`}
          >
            Not now
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="h-8 px-4 rounded-xl text-[10.5px] font-bold bg-[#8ED973] hover:bg-[#7DC862] text-white cursor-pointer disabled:opacity-60"
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ScheduleDialog;
