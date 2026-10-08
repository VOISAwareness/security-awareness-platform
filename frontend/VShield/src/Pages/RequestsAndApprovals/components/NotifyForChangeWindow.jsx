import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Calendar } from 'lucide-react';
import NotifyIllustration from '../../../assets/RequestAndApprovalsAssets/NotifyForChangeImage.png';

const NotifyForChangeWindow = ({
  isOpen,
  campaign,
  busy = false,
  error = '',
  onClose,
  onSubmit
}) => {
  const [note, setNote] = useState(campaign?.NotificationMessage || '');

  if (!isOpen || !campaign) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!note.trim() || busy) return;
    onSubmit(campaign, note.trim());
  };

  // Format short date (e.g. 2-Jan-26 or extracted from CreationDate)
  const formatShortDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split(' ')[0];
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr.split(' ')[0] || 'N/A';
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
        {/* Soft Dim Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative w-full max-w-[820px] rounded-3xl bg-[#E6DBF5] text-slate-900 shadow-2xl overflow-hidden p-8 z-10 border border-white/60 select-none flex flex-col justify-between min-h-[500px]"
        >
          {/* Top Right Decorative Illustration */}
          <div className="absolute top-2 right-2 w-[220px] h-[220px] pointer-events-none select-none z-10 opacity-95">
            <img
              src={NotifyIllustration}
              alt="Notify Announcement"
              className="w-full h-full object-contain drop-shadow-lg"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>

          {/* Modal Header & Meta Section */}
          <div className="relative z-20 flex flex-col gap-2.5 max-w-[560px]">
            <h2 className="text-[22px] font-black tracking-tight text-slate-900">
              Add a note and send
            </h2>

            {/* Campaign ID Tag */}
            <div className="w-fit">
              <span className="px-3 py-1 rounded-full bg-white text-[10.5px] font-black text-slate-800 tracking-wide flex items-center gap-1.5 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                {campaign.campaignId}
              </span>
            </div>

            {/* Title & Description */}
            <h3 className="text-[15px] font-black text-slate-900 tracking-tight leading-tight mt-0.5">
              {campaign.CampaignTitle}
            </h3>

            <p className="text-[11.5px] font-medium text-slate-700 leading-snug">
              <strong className="text-slate-900 font-bold">Description: </strong>
              {campaign.CampaignDescription}
            </p>

            {/* Creator & Creation Date */}
            <div className="flex items-center gap-6 text-[11px] font-bold text-slate-800 pt-1">
              <span>Created on: <span className="font-semibold text-slate-700">{formatShortDate(campaign.CreationDate)}</span></span>
              <span className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-700" />
                Created By: <span className="font-semibold text-slate-700">{campaign.CreatedBy}</span>
              </span>
            </div>
          </div>

          {/* Center: Note Input Area */}
          <div className="relative z-20 w-full mt-5 flex-1">
            <div className="w-full h-[180px] bg-white rounded-2xl p-4 shadow-sm border border-black/5">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type the note here"
                rows={6}
                className="w-full h-full bg-transparent text-[12px] font-medium text-slate-800 outline-none resize-none leading-relaxed placeholder-slate-400"
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="relative z-20 flex items-center justify-end gap-3 pt-5">
            {error && (
              <p className="mr-auto text-[11px] font-bold text-rose-700">{error}</p>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 rounded-xl bg-black hover:bg-slate-900 text-white text-[11px] font-black tracking-wider uppercase transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!note.trim() || busy}
              className="px-7 py-2 rounded-xl bg-[#84D984] hover:bg-[#72C872] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-black tracking-wider uppercase transition-all shadow-xs cursor-pointer active:scale-95"
            >
              {busy ? 'Sending…' : 'Send'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default NotifyForChangeWindow;