import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { Search, Trash2, Edit3 } from 'lucide-react';

// =========================================================================
// 🎛️ SCALE CONTROL & BRAND CONSTANTS
// =========================================================================
const VarUserDLsScale = 0.96;
const VarOverallRoundednessScale = 0.5;

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap');
  
  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Montserrat', 'Plus Jakarta Sans', sans-serif;
    font-weight: 900;
  }
  .font-mono-tech {
    font-family: 'JetBrains Mono', monospace;
  }
  .rounded-3xl { border-radius: ${Math.round(24 * VarOverallRoundednessScale)}px !important; }
  .rounded-2xl { border-radius: ${Math.round(18 * VarOverallRoundednessScale)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(14 * VarOverallRoundednessScale)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(10 * VarOverallRoundednessScale)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallRoundednessScale)}px !important; }
`;

const UserDLsLandingPage = ({ onNavigateToBulkUpload, onNavigateToAddDL }) => {
  const navigate = useNavigate();
  const userContext = useUserType?.() || {};

  // Navigation handlers (uses router first, prop callback as fallback)
  const handleGoToBulkUpload = () => {
    if (onNavigateToBulkUpload) {
      onNavigateToBulkUpload();
    } else {
      navigate('/user-lists/bulk-upload');
    }
  };

  const handleGoToAddDL = () => {
    if (onNavigateToAddDL) {
      onNavigateToAddDL();
    } else {
      navigate('/user-lists/add-dl');
    }
  };

  // Theme check
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark') || !!userContext.isDark;
    }
    return !!userContext.isDark;
  });

  useEffect(() => {
    if (typeof userContext.isDark === 'boolean') {
      setIsDark(userContext.isDark);
    }
  }, [userContext.isDark]);

  useEffect(() => {
    const checkDark = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass || !!userContext.isDark);
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [userContext.isDark]);

  // Dynamic Theme Colors
  const cardBg = isDark ? '#1F2128' : '#F1F4F9';

  // Search and Collapse state
  const [searchQuery, setSearchQuery] = useState('');
  const [isExistingExpanded, setIsExistingExpanded] = useState(true);

  // Initial Mock Lists matching canvas
  const [lists, setLists] = useState([
    {
      id: 'batch-01',
      name: 'Batch 01 – August Campaign Finance Department',
      type: 'Bulk upload',
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever.",
      totalUsers: 58,
      usedCount: 4,
      createdDate: 'July 17th, 2026'
    },
    {
      id: 'batch-02',
      name: 'Batch 02 – August Campaign Supply Chain Management Department',
      type: 'Bulk upload',
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever.",
      totalUsers: 58,
      usedCount: 4,
      createdDate: 'July 17th, 2026'
    },
    {
      id: 'dl-01',
      name: 'Phishing Batch VOIS DL, Egypt',
      type: 'Distribution List',
      dlId: 'dl-phishingcampaignvoisshield@vodafone.com',
      description: "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever.",
      totalUsers: 58,
      usedCount: 4,
      createdDate: 'July 17th, 2026'
    }
  ]);

  const handleDelete = (id) => {
    setLists(prev => prev.filter(item => item.id !== id));
  };

  const handleEdit = (list) => {
    if (list.type === 'Distribution List') {
      navigate(`/user-lists/add-dl?edit=${list.id}`);
    } else {
      navigate(`/user-lists/bulk-upload?edit=${list.id}`);
    }
  };

  const filteredLists = lists.filter(l =>
    l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{ zoom: VarUserDLsScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 overflow-hidden"
      >
        {/* ========================================================================= */}
        {/* ── 1. TOP HEADER BAR: "User Lists" ─────────────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full h-10 py-2.5 px-6 -mt-2 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none ${
            isDark
              ? 'bg-[#ffffff] text-black border-white/10'
              : 'bg-[#15171C] text-white border-black/10'
          }`}
        >
          <h1 className="text-[15px] font-voda-exb tracking-normal text-white dark:text-black">
            USER LISTS
          </h1>

          <div className="text-[13px] font-voda-exb text-white/80 dark:text-black/80">
            -- Add New User Lists and DLs
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 2. INFO NOTICE STRIP ────────────────────────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full py-2 px-4 rounded-xl border flex items-center gap-2.5 flex-shrink-0 text-[11px] font-medium shadow-2xs ${
            isDark
              ? 'bg-[#15161A] text-slate-300 border-white/10'
              : 'bg-white text-slate-700 border-slate-200'
          }`}
        >
          <div className="w-3.5 h-3.5 rounded-full border border-black dark:border-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
            i
          </div>
          <span>
            Add the target user's email ID lists in two ways, bulk upload or add individual pre-created distribution list. Create user batches efficiently for running campaigns
          </span>
        </div>

        {/* ========================================================================= */}
        {/* ── 3. BIG WHITE CONTAINER DIV ─────────────────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full flex-1 min-h-0 rounded-2xl border p-3.5 flex flex-col gap-3 overflow-hidden shadow-xs ${
            isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          {/* ── TOP SECTION: 3 CARDS ROW (BULK UPLOAD + ADD DL + USER LISTS DETAILS) ── */}
          <div className="flex flex-col lg:flex-row gap-3 flex-shrink-0 items-stretch">
            
            {/* 1. BULK UPLOAD CARD (~26% width) - ENTIRE CONTAINER ACTS AS BUTTON */}
            <div
              onClick={handleGoToBulkUpload}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGoToBulkUpload();
                }
              }}
              className={`w-full lg:w-[26%] min-w-[260px] p-4 rounded-2xl border flex flex-col justify-between h-[162px] cursor-pointer hover:shadow-md transition-all group ${
                isDark ? 'bg-[#1F2128] border-white/0' : 'bg-[#F1F4F9] border-slate-200/0'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="leading-tight">
                    <h2 className="text-[16px] font-voda-exb uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-[#E60000] transition-colors">
                      BULK
                    </h2>
                    <h2 className="text-[16px] font-voda-exb uppercase tracking-tight text-slate-900 dark:text-white -mt-0.5 group-hover:text-[#E60000] transition-colors">
                      UPLOAD
                    </h2>
                  </div>

                  {/* Red Pill Badge */}
                  <span className="inline-block px-3 py-0.5 rounded-lg text-[9.5px] font-bold text-white bg-[#2E7D32] w-fit shadow-2xs">
                    Uses an excel template
                  </span>

                  {/* Description */}
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium mt-1 leading-snug">
                    Bulk upload the target user email<br />IDs in an excel file
                  </p>
                </div>

                {/* Graphic Icon */}
                <div className="flex-shrink-0 text-black dark:text-white pr-1 pt-0.5 group-hover:scale-105 transition-transform">
                  <svg width="44" height="50" viewBox="0 0 48 54" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="40" height="48" rx="8" stroke="currentColor" strokeWidth="4" />
                    <rect x="7" y="7" width="40" height="46" rx="8" fill="currentColor" />
                    <path d="M27 20L27 38M27 20L20 27M27 20L34 27" stroke={isDark ? '#1F2128' : '#F1F4F9'} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>

              {/* Bottom Right Pill Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  tabIndex={-1}
                  className="px-3.5 py-1 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-[9.5px] font-bold border border-slate-200/90 shadow-2xs transition-all pointer-events-none"
                >
                  + Click here to add new
                </button>
              </div>
            </div>

            {/* 2. ADD DISTRIBUTION LIST CARD (~26% width) - ENTIRE CONTAINER ACTS AS BUTTON */}
            <div
              onClick={handleGoToAddDL}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGoToAddDL();
                }
              }}
              className={`w-full lg:w-[26%] min-w-[260px] p-4 rounded-2xl border flex flex-col justify-between h-[162px] cursor-pointer hover:shadow-md transition-all group ${
                isDark ? 'bg-[#1F2128] border-white/0' : 'bg-[#F1F4F9] border-slate-200/0'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                  <div className="leading-tight">
                    <h2 className="text-[16px] font-voda-exb uppercase tracking-tight text-slate-900 dark:text-white group-hover:text-[#E60000] transition-colors">
                      DISTRIBUTION
                    </h2>
                    <h2 className="text-[16px] font-voda-exb uppercase tracking-tight text-slate-900 dark:text-white -mt-0.5 group-hover:text-[#E60000] transition-colors">
                      LIST
                    </h2>
                  </div>

                  {/* Green Pill Badge */}
                  <span className="inline-block px-3 py-0.5 rounded-lg text-[9.5px] font-bold text-white bg-[#FF4D4D] w-fit shadow-2xs">
                    Uses pre-created DLs
                  </span>

                  {/* Description */}
                  <p className="text-[10px] text-slate-700 dark:text-slate-300 font-medium mt-1 leading-snug">
                    Add a distribution list (DL) created<br />
                    in Outlook, Microsoft Azure AD or<br />
                    Exchange Admin Center
                  </p>
                </div>

                {/* Graphic Icon */}
                <div className="flex-shrink-0 text-black dark:text-white pr-1 pt-0.5 group-hover:scale-105 transition-transform">
                  <svg width="56" height="46" viewBox="0 0 60 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="6" width="46" height="34" rx="6" stroke="currentColor" strokeWidth="4" />
                    <path d="M4 10L25 24L46 10" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                    <circle cx="46" cy="34" r="12" fill={isDark ? '#1F2128' : '#F1F4F9'} />
                    <circle cx="46" cy="34" r="10" fill="currentColor" />
                    <circle cx="46" cy="31" r="3" fill={isDark ? '#1F2128' : '#F1F4F9'} />
                    <path d="M41 40C41 37.5 43.5 36 46 36C48.5 36 51 37.5 51 40" stroke={isDark ? '#1F2128' : '#F1F4F9'} strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Bottom Right Pill Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  tabIndex={-1}
                  className="px-3.5 py-1 rounded-full bg-white text-slate-900 hover:bg-slate-100 text-[9.5px] font-bold border border-slate-200/90 shadow-2xs transition-all pointer-events-none"
                >
                  + Click here to add new
                </button>
              </div>
            </div>

            {/* 3. USER LISTS DETAILS: CONTINUOUS L-SHAPED BENTO CONTAINER (~48% width) */}
            <div className="w-full lg:flex-1 min-w-[480px] h-[162px] relative">
              
              {/* ── ISOLATED TOP-LEFT CUTOUT PIECE: Solid Black Box ── */}
              <div className="absolute top-0 left-0 w-[189px] h-[77px] p-2.5 px-3 rounded-2xl bg-[#15171C] dark:bg-[#ffffff] text-white dark:text-black flex flex-col justify-between shadow-xs z-10">
                <div className="leading-tight">
                  <span className="text-[15px] font-voda-exb uppercase tracking-tight block -mt-1">
                    USER LISTS
                  </span>
                  <span className="text-[15px] font-voda-exb uppercase tracking-tight block -mt-1">
                    DETAILS
                  </span>
                </div>
                <p className="text-[8px] text-white dark:text-black font-medium leading-tight -mt-0">
                  Mini dashboard for viewing status and counts of uploaded user lists
                </p>
              </div>

              {/* ── 🌟 Concave Arc Fillet in the Re-entrant Inner Corner ── */}
              <div className="absolute top-[77px] left-[185px] w-3.5 h-3.5 pointer-events-none z-10 overflow-hidden">
                <svg
                  className="absolute top-0 left-0 w-3.5 h-3.5 pointer-events-none z-10"
                  viewBox="0 0 14 14"
                  fill="none"
                >
                  <path
                    d="M 14,0 A 14,14 0 0 0 0,14 H 14 Z"
                    fill={cardBg}
                  />
                </svg>
              </div>

              {/* ── TOP-RIGHT ARM OF L-SHAPE CONTAINER (X >= 195px, Y: 0 to 86px) ── */}
              <div
                style={{ backgroundColor: cardBg }}
                className="absolute top-0 left-[195px] right-0 h-[86px] rounded-t-xl flex items-center px-10 mr-0"
              >
                {/* Stat 1: Total DLs Uploaded */}
                <div className="w-[190px] flex items-center gap-2.5 flex-shrink-0">
                  <span className="text-[30px] -mt-2 font-voda-exb text-[#FF5C5C] leading-none flex-shrink-0 w-9 text-left">
                    02
                  </span>
                  <div className="flex flex-col justify-center leading-none text-left">
                    <span className="text-[15.5px] -mt-1.5 font-voda-exb text-slate-900 dark:text-white leading-[1.15]">
                      Total DLs
                    </span>
                    <span className="text-[15.5px] font-voda-exb text-slate-900 dark:text-white leading-[1.15]">
                      Uploaded
                    </span>
                    <span className="text-[9.5px] text-slate-700 dark:text-slate-300 mt-2 font-medium whitespace-nowrap">
                      This quarter <strong className="font-bold text-black dark:text-white">1</strong>
                    </span>
                  </div>
                </div>

                {/* Stat 2: Unused User Lists */}
                <div className="flex-1 flex items-center gap-2.5">
                  <span className="font-voda-exb -mt-2 leading-none flex-shrink-0 text-left flex items-baseline">
                    <span className="text-[30px] text-[#22C55E]">01</span>
                    <span className="text-[14px] text-[#000000] dark:text-white opacity-80">/04</span>
                  </span>
                  <div className="flex flex-col justify-center leading-none text-left">
                    <span className="text-[15.5px] -mt-1.5 font-voda-exb text-slate-900 dark:text-white leading-[1.15]">
                      Unused
                    </span>
                    <span className="text-[15.5px] font-voda-exb text-slate-900 dark:text-white leading-[1.15]">
                      User Lists
                    </span>
                    <span className="text-[9.5px] text-slate-700 dark:text-slate-300 mt-2 font-medium whitespace-nowrap">
                      This quarter <strong className="font-bold text-black dark:text-white">3</strong>
                    </span>
                  </div>
                </div>
              </div>

              {/* ── BOTTOM BASE OF L-SHAPE CONTAINER (X: 0 to 100%, Y: 86px to 162px) ── */}
              <div
                style={{ backgroundColor: cardBg }}
                className="absolute top-[86px] left-0 right-0 h-[80px] rounded-tl-xl rounded-b-xl flex items-center -mt-1 mr-0"
              >
                {/* Col 1: Stat 3 (Directly under Black Box, width: 195px) */}
                <div className="w-[195px] flex-shrink-0 px-4 flex items-center gap-2.5">
                  <span className="text-[30px] -mt-2 font-voda-exb text-[#818CF8] leading-none flex-shrink-0 w-9 text-left">
                    04
                  </span>
                  <div className="flex flex-col justify-center leading-none text-left">
                    <span className="text-[15.5px] -mt-1.5 font-voda-exb text-slate-900 dark:text-white leading-[1.15]">
                      Total User
                    </span>
                    <span className="text-[15.5px] font-voda-exb text-slate-900 dark:text-white leading-[1.15]">
                      Lists Uploaded
                    </span>
                    <span className="text-[9.5px] text-slate-700 dark:text-slate-300 mt-2 font-medium whitespace-nowrap">
                      This quarter <strong className="font-bold text-black dark:text-white">3</strong>
                    </span>
                  </div>
                </div>

                {/* Cols 2 & 3: Perfectly aligns under the top arm */}
                <div className="flex-1 flex items-center px-10">
                  {/* Stat 4: Total Bulk Uploads (Directly underneath Stat 1) */}
                  <div className="w-[190px] flex items-center gap-2.5 flex-shrink-0">
                    <span className="text-[30px] font-voda-exb -mt-2 text-[#2DD4BF] leading-none flex-shrink-0 w-9 text-left">
                      02
                    </span>
                    <div className="flex flex-col justify-center leading-none text-left">
                      <span className="text-[15.5px] -mt-1.5 font-voda-exb text-slate-900 dark:text-white leading-[1.15]">
                        Total Bulk
                      </span>
                      <span className="text-[15.5px] font-voda-exb text-slate-900 dark:text-white leading-[1.15]">
                        Uploads
                      </span>
                      <span className="text-[9.5px] text-slate-700 dark:text-slate-300 mt-2 font-medium whitespace-nowrap">
                        This quarter <strong className="font-bold text-black dark:text-white">2</strong>
                      </span>
                    </div>
                  </div>

                  {/* Empty Spacer Column (Underneath Stat 2) */}
                  <div className="flex-1" />
                </div>
              </div>

            </div>

          </div>

          {/* ── BOTTOM SECTION: EXISTING USER LISTS CONTAINER ── */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 flex-1 ${
              isDark ? 'bg-[#1F2128] border-white/0' : 'bg-[#F1F4F9] border-slate-200/0'
            }`}
          >
            {/* Header Title with Double Chevron */}
            <div className="flex items-center justify-between pb-0.5 flex-shrink-0">
              <h3 className="text-[14.5px] font-voda-exb text-slate-900 dark:text-white">
                Existing User Lists
              </h3>
              <button
                type="button"
                onClick={() => setIsExistingExpanded(!isExistingExpanded)}
                className="p-1 rounded text-slate-800 dark:text-slate-200 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <svg
                  width="20"
                  height="14"
                  viewBox="0 0 24 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className={`transition-transform duration-200 ${isExistingExpanded ? '' : 'rotate-180'}`}
                >
                  <path d="M4 14L12 6L20 14" />
                  <path d="M4 8L12 0L20 8" />
                </svg>
              </button>
            </div>

            {isExistingExpanded && (
              <>
                {/* Search Bar */}
                <div
                  className={`w-full px-4 py-2 rounded-xl border flex items-center justify-between flex-shrink-0 shadow-2xs ${
                    isDark ? 'bg-[#15161A] border-white/10 text-white' : 'bg-white border-slate-200/90 text-slate-900'
                  }`}
                >
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by User List Name"
                    className="w-full bg-transparent text-[11px] font-medium outline-none pr-3 placeholder-slate-400"
                  />
                  <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
                </div>

                {/* Grid of Solid Black Cards */}
                <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                  {filteredLists.length === 0 ? (
                    <div className="col-span-full h-full min-h-[140px] flex flex-col items-center justify-center text-slate-400 text-xs italic">
                      No existing user lists found.
                    </div>
                  ) : (
                    filteredLists.map((list) => (
                      <div
                        key={list.id}
                        className="p-4 rounded-2xl bg-[#181A20] text-white flex flex-col justify-between gap-3 shadow-md border border-white/5"
                      >
                        <div className="flex flex-col gap-2">
                          {/* Top Row: Name + Action Icons */}
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-[12px] font-voda-exb text-white leading-tight line-clamp-1">
                              Name: {list.name}
                            </span>

                            <div className="flex items-center gap-2 flex-shrink-0 text-white/80">
                              <button
                                type="button"
                                onClick={() => handleEdit(list)}
                                className="hover:text-white transition-colors cursor-pointer"
                                title="Edit List"
                              >
                                <Edit3 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(list.id)}
                                className="hover:text-red-400 transition-colors cursor-pointer"
                                title="Delete List"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Type */}
                          <div className="text-[11px] font-medium text-slate-200">
                            Type: {list.type}
                          </div>

                          {/* Description */}
                          <div className="text-[10px] text-slate-300 line-clamp-3 leading-relaxed">
                            <span className="font-bold text-white">Description: </span>
                            {list.description}
                          </div>

                          {/* Total Users */}
                          <div className="text-[11px] font-bold text-white mt-0.5">
                            Total Users: {list.totalUsers}
                          </div>

                          {/* DL ID (if present) */}
                          {list.dlId && (
                            <div className="text-[10px] font-mono-tech text-slate-300 truncate">
                              <span className="font-bold text-white">DL ID: </span>
                              {list.dlId}
                            </div>
                          )}
                        </div>

                        {/* Card Footer: Used count (Green) + Created Date */}
                        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[9.5px]">
                          <span className="font-bold text-[#4ADE80]">
                            Used {list.usedCount || 4} Times
                          </span>
                          <span className="text-slate-400 font-mono-tech">
                            Created On: {list.createdDate}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>

        </div>
      </div>
    </>
  );
};

export default UserDLsLandingPage;