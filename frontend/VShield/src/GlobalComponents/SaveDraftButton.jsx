import { Save } from 'lucide-react';

// "Save as draft", next to BACK / NEXT on every step of Start New Campaign and
// of the scenario editor: save the work as it is and leave it under Drafts,
// to pick up later. One component so every step's button looks the same.
const SaveDraftButton = ({ onClick, disabled = false, busy = false, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || busy}
    title={title}
    className="h-[24px] px-3 rounded-3xl border border-black/15 dark:border-white/25 bg-white dark:bg-transparent text-[#0B1121] dark:text-white hover:bg-slate-50 dark:hover:bg-white/10 font-voda font-bold text-[10px] uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
  >
    <Save className="w-3 h-3" strokeWidth={2.5} />
    {busy ? 'Saving…' : 'Save as draft'}
  </button>
);

export default SaveDraftButton;
