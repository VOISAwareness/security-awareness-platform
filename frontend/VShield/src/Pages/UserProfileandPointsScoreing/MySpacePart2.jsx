import React, { useState } from 'react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  RotateCcw,
  Trophy,
  CheckCircle2,
  Search,
  AlertTriangle,
  Flame
} from 'lucide-react';

// =========================================================================
// 🎛️ SCALE CONTROL & STYLE CONSTANTS
// =========================================================================
const VarMySpacePart2Scale = 0.975;
const VarOverallRoundednessScale = 0.75;

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&display=swap');
  
  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Vodafone', 'Montserrat', 'Plus Jakarta Sans', sans-serif;
    font-weight: 900;
  }

  .rounded-2xl { border-radius: ${Math.round(16 * VarOverallRoundednessScale)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(12 * VarOverallRoundednessScale)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(8 * VarOverallRoundednessScale)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallRoundednessScale)}px !important; }
`;

// =========================================================================
// 🌟 10 MASONRY VIDEO MODULES
// =========================================================================
const MASONRY_MODULES = [
  {
    id: 'm1',
    title: 'Clean Desk & Clear Screen',
    description: 'Essential physical security protocols to safeguard enterprise information on unattended workstations.',
    category: 'Workplace',
    categoryStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
    thumbHeight: 'h-48',
    status: 'COMPLETED',
    points: 50
  },
  {
    id: 'm2',
    title: 'Mobile Device Security',
    description: 'Best practices for securing enterprise smartphones, tablets, and remote authentication credentials.',
    category: 'Device Safety',
    categoryStyle: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
    thumbHeight: 'h-64',
    status: 'COMPLETED',
    points: 50
  },
  {
    id: 'm3',
    title: 'Quishing (QR Code Phishing)',
    description: 'Learn how threat actors weaponize malicious QR codes in flyers and emails to hijack accounts.',
    category: 'Phishing',
    categoryStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
    thumbHeight: 'h-36',
    status: 'NOT_STARTED',
    points: 50
  },
  {
    id: 'm4',
    title: 'Vishing & Voice Impersonation',
    description: 'Defending against AI voice cloning and urgent phone-based executive impersonation fraud.',
    category: 'Social Eng.',
    categoryStyle: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
    thumbHeight: 'h-56',
    status: 'NOT_STARTED',
    points: 50
  },
  {
    id: 'm5',
    title: 'Basics of Ransomware & Malware',
    description: 'Understanding initial access vectors, suspicious attachments, and how ransomware propagates across networks.',
    category: 'Malware',
    categoryStyle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
    thumbHeight: 'h-44',
    status: 'NOT_STARTED',
    points: 50
  },
  {
    id: 'm6',
    title: 'Social Engineering & Pretexting',
    description: 'Recognizing manipulative psychological techniques used by attackers to extract sensitive data.',
    category: 'Human Firewall',
    categoryStyle: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    thumbHeight: 'h-52',
    status: 'COMPLETED',
    points: 50
  },
  {
    id: 'm7',
    title: 'Password Hygiene & MFA Practices',
    description: 'Constructing robust passphrases and avoiding MFA push-fatigue traps set by attackers.',
    category: 'Identity',
    categoryStyle: 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20',
    thumbHeight: 'h-60',
    status: 'NOT_STARTED',
    points: 50
  },
  {
    id: 'm8',
    title: 'Public Wi-Fi & Remote Safety',
    description: 'Safeguarding enterprise communication over untrusted public hotspots using VPN channels.',
    category: 'Network',
    categoryStyle: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20',
    thumbHeight: 'h-40',
    status: 'NOT_STARTED',
    points: 50
  },
  {
    id: 'm9',
    title: 'Data Classification & Handling',
    description: 'Standards for properly managing, labeling, and disposing of confidential customer data.',
    category: 'Governance',
    categoryStyle: 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20',
    thumbHeight: 'h-56',
    status: 'COMPLETED',
    points: 50
  },
  {
    id: 'm10',
    title: 'Incident Reporting & Response',
    description: 'Step-by-step guidance on how to quickly flag suspicious events directly to the SOC team.',
    category: 'Protocol',
    categoryStyle: 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20',
    thumbHeight: 'h-48',
    status: 'NOT_STARTED',
    points: 50
  }
];

const MySpacePart2 = () => {
  const { isDark } = useUserType?.() || { isDark: false };
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const completedCount = MASONRY_MODULES.filter((m) => m.status === 'COMPLETED').length;
  const pendingCount = MASONRY_MODULES.filter((m) => m.status === 'NOT_STARTED').length;

  // Filter & Search Logic
  const filteredModules = MASONRY_MODULES.filter((mod) => {
    const matchesFilter =
      activeFilter === 'ALL' ||
      (activeFilter === 'COMPLETED' && mod.status === 'COMPLETED') ||
      (activeFilter === 'PENDING' && mod.status === 'NOT_STARTED');

    const matchesSearch =
      mod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mod.category.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const filterTabs = [
    { id: 'ALL', label: 'ALL', count: MASONRY_MODULES.length, color: 'bg-[#E60000]' },
    { id: 'COMPLETED', label: 'COMPLETED', count: completedCount, color: 'bg-[#22C55E]' },
    { id: 'PENDING', label: 'PENDING', count: pendingCount, color: 'bg-amber-500' }
  ];

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{ zoom: VarMySpacePart2Scale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3 select-none font-sans flex flex-col gap-4"
      >
        {/* ========================================================================= */}
        {/* ── TOP-RIGHT SEARCH & FILTER CONTROLS (NO OUTER TITLE BOX) ────────────── */}
        {/* ========================================================================= */}
        <div className="w-full flex flex-col sm:flex-row items-center justify-end gap-2.5">
          {/* Search Bar */}
          <div
            className={`relative flex items-center rounded-xl border px-3 py-1.5 w-full sm:w-[240px] transition-colors ${
              isDark
                ? 'bg-[#202127] border-white/10 text-white'
                : 'bg-[#F1F3F7] border-slate-200 text-slate-900 shadow-2xs'
            }`}
          >
            <Search className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search video modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent text-[11px] font-medium focus:outline-none w-full placeholder:text-slate-400"
            />
          </div>

          {/* Filter Pills with Smooth Spring Sliding Indicator */}
          <div
            className={`flex items-center p-1 rounded-xl border transition-colors ${
              isDark
                ? 'bg-[#202127] border-white/10'
                : 'bg-[#F1F3F7] border-slate-200 shadow-2xs'
            }`}
          >
            {filterTabs.map((tab) => {
              const isSelected = activeFilter === tab.id;

              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`relative px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-tight transition-colors cursor-pointer z-10 ${
                    isSelected
                      ? 'text-white'
                      : isDark
                      ? 'text-slate-400 hover:text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {isSelected && (
                    <motion.div
                      layoutId="activeFilterPillMasonry"
                      transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                      className={`absolute inset-0 rounded-lg -z-10 shadow-sm ${tab.color}`}
                    />
                  )}
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── RESPONSIVE MASONRY GALLERY LAYOUT (#F1F3F7 Light / #202127 Dark) ──── */}
        {/* ========================================================================= */}
        <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 [column-fill:_balance]">
          <AnimatePresence mode="popLayout">
            {filteredModules.map((item) => {
              const isCompleted = item.status === 'COMPLETED';

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                  whileHover={{ y: -3, transition: { duration: 0.15 } }}
                  className={`group rounded-xl border overflow-hidden transition-all duration-300 hover:-translate-y-1.5 break-inside-avoid mb-4 flex flex-col justify-between ${
                    isDark
                      ? 'bg-[#2D2E37] border-white/5 hover:border-white/15 shadow-[0_12px_32px_rgba(0,0,0,0.45)]'
                      : 'bg-[#F1F3F7] border-black/10 hover:border-slate-300 shadow-[0_6px_20px_rgba(0,0,0,0.03)]'
                  }`}
                >
                  {/* ── 1. INNER MEDIA CONTAINER (THUMBNAIL HOLDER) ── */}
                  <div className="relative overflow-hidden p-3 pb-0">
                    <div
                      className={`w-full ${item.thumbHeight} rounded-lg relative overflow-hidden flex items-center justify-center border transition-transform duration-500 group-hover:scale-[1.02] ${
                        isDark
                          ? 'bg-gradient-to-br from-[#181920] via-[#15161B] to-[#0D0E13] border-white/5'
                          : 'bg-gradient-to-br from-[#FFFFFF] via-[#F8FAFC] to-[#EDF2F7] border-black/5'
                      }`}
                    >
                      {/* Ambient Brand Gradient Glow */}
                      <div className="absolute inset-0 bg-white dark:bg-black transition-colors duration-300 pointer-events-none" />

                      {/* Status Badge (No timestamp) */}
                      <div className="absolute top-2.5 right-2.5 z-10">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[8px] font-bold uppercase tracking-tight text-black/50 dark:text-white/50 text-black/50 dark:text-white/50 border border-[#22c55e]/25 backdrop-blur-md">
                            <CheckCircle2 className="w-2.5 h-2.5 stroke-[3]" />
                            COMPLETED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[8px] font-bold uppercase tracking-tight text-black/50 dark:text-white/50 text-black/50 dark:text-white/50 border border-[#22c55e]/25 backdrop-blur-md">
                            <Flame className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            AVAILABLE
                          </span>
                        )}
                      </div>

                      {/* 🌟 Center VOISShield. Brand Lockup */}
                      <div className="flex items-center justify-center gap-0.5 z-10 transform group-hover:scale-105 transition-transform duration-300">
                        <span className={`text-[18px] font-voda-exb tracking-tight ${isDark ? 'text-white' : 'text-[#0F172A]'}`}>
                          VOIS
                        </span>
                        <span className="text-[18px] font-voda-exb tracking-tight bg-gradient-to-r from-[#E60000] to-[#990099] bg-clip-text text-transparent">
                          Shield
                        </span>
                        <span className="text-[18px] font-voda-exb tracking-tight text-black dark:text-white">
                          .
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ── 2. CARD CONTENT SECTION ── */}
                  <div className="p-4 pt-3 flex flex-col flex-1 justify-between">
                    <div>
                      {/* Title */}
                      <h3
                        className={`text-[13.5px] font-voda-exb tracking-tight leading-snug mb-1.5 transition-colors ${
                          isDark
                            ? 'text-white group-hover:text-red-400'
                            : 'text-slate-900 group-hover:text-[#E60000]'
                        }`}
                      >
                        {item.title}
                      </h3>

                      {/* Description */}
                      <p className={`text-[10px] leading-relaxed line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                        {item.description}
                      </p>

                      {/* Category Tag Pill */}
                      <div className="mt-2.5 flex items-center">
                        <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-bold uppercase tracking-wider border ${item.categoryStyle}`}>
                          {item.category}
                        </span>
                      </div>
                    </div>

                    {/* ── 3. CARD FOOTER: REWARD / POINTS (TROPHY ICON) & ACTION BUTTON ── */}
                    <div className="flex items-center justify-between pt-3 border-t border-black/5 dark:border-white/5 mt-3.5">
                      {/* Reward / Points Metric */}
                      <div className="flex items-center gap-1.5 text-[10.5px] font-bold">
                        <Trophy className="w-3.5 h-3.5 text-[#22C55E]" />
                        <span className={isCompleted ? 'text-[#22C55E]' : isDark ? 'text-slate-300' : 'text-slate-700'}>
                          {isCompleted ? `Earned: +${item.points}` : `Reward: +${item.points}`}
                        </span>
                      </div>

                      {/* Start / Retake Action Button */}
                      {isCompleted ? (
                        <button
                          type="button"
                          className={`py-1 px-3 rounded-[4px] border text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer ${
                            isDark
                              ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100 shadow-2xs'
                          }`}
                        >
                          <RotateCcw className="w-2.5 h-2.5" />
                          RETAKE
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="py-1 px-3.5 rounded-[4px] text-[9.5px] font-bold uppercase tracking-wider flex items-center gap-1 bg-black/85 dark:bg-white/60 text-white hover:brightness-110 shadow-2xs transition-all cursor-pointer"
                        >
                          <Play className="w-2.5 h-2.5 fill-white" />
                          START
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Empty State */}
        {filteredModules.length === 0 && (
          <div
            className={`w-full py-12 rounded-2xl border flex flex-col items-center justify-center text-center ${
              isDark ? 'bg-[#202127] border-white/5 text-slate-400' : 'bg-[#F1F3F7] border-slate-200 text-slate-500'
            }`}
          >
            <AlertTriangle className="w-8 h-8 text-amber-500 mb-2" />
            <h4 className={`text-sm font-voda-exb ${isDark ? 'text-white' : 'text-slate-900'}`}>
              No Modules Found
            </h4>
            <p className="text-xs mt-1">Try adjusting your search query or filter criteria.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default MySpacePart2;