import { useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { User } from 'lucide-react';
import NotifyIllustration from '@/assets/RequestAndApprovalsAssets/NotifyForChangeImage.png';

const RejectionNoteWindow = ({
  isOpen,
  path,
  onClose,
  onSubmit,
  isDark = false
}) => {
  const [note, setNote] = useState('');

  if (!isOpen || !path) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!note.trim()) return;
    onSubmit(path, note.trim());
    setNote('');
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
          className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className={`relative w-full max-w-[820px] rounded-3xl shadow-2xl overflow-hidden p-8 z-10 border select-none flex flex-col justify-between min-h-[500px] ${
            isDark 
              ? "bg-[#1C1E24] border-white/10 text-white shadow-[0_20px_50px_rgba(0,0,0,0.6)]" 
              : "bg-white border-slate-200 text-slate-800 shadow-xl"
          }`}
        >
          {/* Top Right Decorative Illustration */}
          <div className="absolute top-2 right-2 w-[220px] h-[220px] pointer-events-none select-none z-10 opacity-20 dark:opacity-10">
            <img
              src={NotifyIllustration}
              alt="Rejection Announcement"
              className="w-full h-full object-contain drop-shadow-lg"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
          </div>

          {/* Modal Header & Meta Section */}
          <div className="relative z-20 flex flex-col gap-2.5 max-w-[560px]">
            <h2 className={`text-[22px] font-black tracking-tight ${isDark ? 'text-rose-400' : 'text-red-950'}`}>
              Add rejection feedback and reject
            </h2>

            {/* Path ID Tag */}
            <div className="w-fit">
              <span className={`px-3 py-1 rounded-full text-[10.5px] font-black tracking-wide flex items-center gap-1.5 shadow-2xs ${
                isDark ? 'bg-white/10 text-white border border-white/5' : 'bg-slate-100 text-slate-800 border border-black/5'
              }`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                {path.TrainingPathID}
              </span>
            </div>

            {/* Title & Description */}
            <h3 className={`text-[15px] font-black tracking-tight leading-tight mt-0.5 text-left ${isDark ? 'text-white' : 'text-slate-900'}`}>
              {path.TrainingPathName}
            </h3>

            <p className={`text-[11.5px] font-medium leading-snug text-left ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <strong className={`font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>Description: </strong>
              {path.Description}
            </p>

            {/* Creator & Creation Date */}
            <div className={`flex items-center gap-6 text-[11px] font-bold pt-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              <span>Created on: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{path.CreatedOn}</span></span>
              <span className="flex items-center gap-1.5">
                <User className={`w-3.5 h-3.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`} />
                Created By: <span className={isDark ? 'text-slate-200' : 'text-slate-700'}>{path.createdBy || 'Editor'}</span>
              </span>
            </div>
          </div>

          {/* Center: Note Input Area */}
          <div className="relative z-20 w-full mt-5 flex-1">
            <div className={`w-full h-[180px] rounded-2xl p-4 shadow-sm border ${
              isDark ? 'bg-[#15161a] border-white/5' : 'bg-white border-slate-200'
            }`}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Provide details on why this learning path is rejected or what changes are required..."
                rows={6}
                className={`w-full h-full bg-transparent text-[12px] font-medium outline-none resize-none leading-relaxed ${
                  isDark ? 'text-white placeholder-white/20' : 'text-slate-800 placeholder-slate-400'
                }`}
              />
            </div>
          </div>

          {/* Footer Action Buttons */}
          <div className="relative z-20 flex items-center justify-end gap-3 pt-5">
            <button
              type="button"
              onClick={onClose}
              className={`px-6 py-2 rounded-xl text-[11px] font-black tracking-wider uppercase transition-all shadow-xs cursor-pointer active:scale-95 ${
                isDark 
                  ? 'bg-white/10 text-white hover:bg-white/15' 
                  : 'bg-slate-200 text-slate-800 hover:bg-slate-300'
              }`}
            >
              Go Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!note.trim()}
              className="px-7 py-2 rounded-xl bg-[#F87171] hover:bg-[#EF4444] disabled:opacity-50 disabled:cursor-not-allowed text-white text-[11px] font-black tracking-wider uppercase transition-all shadow-xs cursor-pointer active:scale-95"
            >
              Reject Path
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default RejectionNoteWindow;
