import { useState, useEffect } from 'react';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Trash2,
  Edit3,
  Check,
  X,
  ChevronDown
} from 'lucide-react';

// Default initial dataset
import defaultEmailData from './EmailIDsAndDomains.json';
import { api } from '../../services/api';

// =========================================================================
// 🎛️ SCALE CONTROL & BRAND CONSTANTS
// =========================================================================
const VarEmailIDsScale = 0.91;
const VarOverallRoundednessScale = 0.75;

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Poppins:wght@600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap');
  
  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Montserrat', 'Plus Jakarta Sans', sans-serif;
    font-weight: 900;
  }
  .font-mono-tech {
    font-family: 'JetBrains Mono', monospace;
  }

  /* Universal Roundedness Scaler */
  .rounded-2xl { border-radius: ${Math.round(18 * VarOverallRoundednessScale)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(14 * VarOverallRoundednessScale)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(10 * VarOverallRoundednessScale)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallRoundednessScale)}px !important; }
`;

const PRESET_DOMAINS = [
  '@domain',
  '@vodafone.com',
  '@internal.secure',
  '@notify.hub',
  '@vodafonepasswordnotification'
];

const EmailIDsAndDomains = () => {
  const { isDark } = useUserType?.() || { isDark: false };

  // Backed by the API (falls back to bundled JSON only if the API is unreachable).
  const [emailsList, setEmailsList] = useState([]);

  // Form Inputs
  const [localPart, setLocalPart] = useState('');
  const [domainPart, setDomainPart] = useState('');
  const [description, setDescription] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Search & Edit States
  const [searchQuery, setSearchQuery] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Load sender identities from the backend on mount.
  useEffect(() => {
    let active = true;
    api.senderIdentities
      .list()
      .then((items) => {
        if (active) setEmailsList(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        console.error('Failed to load sender identities', err);
        if (active) setEmailsList(defaultEmailData || []);
      });
    return () => {
      active = false;
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Formatted Current Date (e.g., July 17th, 2026)
  const getFormattedDate = () => {
    const today = new Date();
    const day = today.getDate();
    const month = today.toLocaleString('default', { month: 'long' });
    const year = today.getFullYear();
    const nth = (d) => {
      if (d > 3 && d < 21) return 'th';
      switch (d % 10) {
        case 1:  return "st";
        case 2:  return "nd";
        case 3:  return "rd";
        default: return "th";
      }
    };
    return `${month} ${day}${nth(day)}, ${year}`;
  };

  // Real-time Preview Calculator
  const calculatedPreview = () => {
    const cleanLocal = localPart.trim();
    const cleanDomain = domainPart.trim();

    if (!cleanLocal && !cleanDomain) {
      return '';
    }

    const formattedDomain = cleanDomain
      ? (cleanDomain.startsWith('@') ? cleanDomain : `@${cleanDomain}`)
      : '@domain';

    return `${cleanLocal || 'username'}${formattedDomain}`;
  };

  // Unique Domains Count
  const uniqueDomainsCount = new Set(
    emailsList.map((item) => {
      const parts = item.email.split('@');
      return parts.length > 1 ? parts[1].toLowerCase() : 'domain';
    })
  ).size;

  // Handle Submit Form
  const handleSubmit = (e) => {
    e.preventDefault();
    const cleanLocal = localPart.trim();
    if (!cleanLocal) {
      showToast('Please enter the local part of the Email ID');
      return;
    }

    const cleanDomain = domainPart.trim();
    const finalDomain = cleanDomain
      ? (cleanDomain.startsWith('@') ? cleanDomain : `@${cleanDomain}`)
      : '@domain';

    const fullEmail = `${cleanLocal}${finalDomain}`;

    // Duplicate Check
    if (emailsList.some((item) => item.email.toLowerCase() === fullEmail.toLowerCase())) {
      showToast('This Email ID already exists in repository!');
      return;
    }

    const newItem = {
      email: fullEmail,
      description: description.trim() || "Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text eve",
      createdDate: getFormattedDate(),
      status: 'Active',
      usageCount: 0
    };

    api.senderIdentities
      .create(newItem)
      .then((saved) => {
        setEmailsList((prev) => [saved, ...prev]);
        setLocalPart('');
        setDomainPart('');
        setDescription('');
        showToast(`Saved ${fullEmail} successfully!`);
      })
      .catch((err) => {
        console.error(err);
        showToast('Could not save Email ID. Please try again.');
      });
  };

  // Handle Delete
  const handleDelete = (id) => {
    const target = emailsList.find((item) => item.id === id);
    api.senderIdentities
      .remove(id)
      .then(() => {
        setEmailsList((prev) => prev.filter((item) => item.id !== id));
        showToast(`Deleted ${target?.email || 'Email ID'}`);
      })
      .catch((err) => {
        console.error(err);
        showToast('Could not delete Email ID. Please try again.');
      });
  };

  // Handle Save Edit Modal
  const handleSaveEdit = () => {
    if (!editingItem) return;
    const { id, ...patch } = editingItem;
    api.senderIdentities
      .update(id, patch)
      .then((updated) => {
        setEmailsList((prev) => prev.map((item) => (item.id === id ? updated : item)));
        setEditingItem(null);
        showToast('Updated Email record');
      })
      .catch((err) => {
        console.error(err);
        showToast('Could not update Email record. Please try again.');
      });
  };

  // Search Filter
  const filteredEmails = emailsList.filter(
    (item) =>
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Background Theme Tokens
  const cardBg = isDark ? '#202127' : '#F1F4F9';
  const inputBg = isDark ? '#15161A' : '#FFFFFF';
  const textColor = isDark ? 'text-white' : 'text-slate-900';

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{ zoom: VarEmailIDsScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3 -mt-3 select-none font-sans flex flex-col gap-2.5"
      >
        {/* ========================================================================= */}
        {/* ── 1. TOP FULL-WIDTH SECTION BAR: "ADD NEW EMAIL ID & DOMAIN" ─────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full h-[40px] px-5 rounded-xl border flex items-center justify-start transition-colors duration-300 shadow-sm select-none ${
            isDark
              ? 'bg-white text-[#0B1121] border-slate-200'
              : 'bg-[#06080D] text-white border-black/10'
          }`}
        >
          <span className="text-xs sm:text-[12.5px] font-voda-exb tracking-wider uppercase">
            EMAIL IDs & DOMAIN
          </span>
        </div>

        <div
  className={`w-full h-auto min-h-[40px] px-4 py-2.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-colors duration-300 select-none ${
    isDark
      ? 'bg-black/40 text-slate-200 border-white/15'
      : 'bg-white text-slate-700 border-black/5'
  }`}
>
  {/* Left Section: Action Title */}
  <span className={`text-[11px] uppercase tracking-wider font-voda-exb shrink-0 ${
    isDark ? 'text-white' : 'text-black'
  }`}>
    Add New Email IDs & Domains
  </span>

  {/* Right Section: Informational Text with Circle-I Icon at the start */}
  <div className="flex items-start gap-1.5 max-w-2xl sm:justify-end">
    <svg 
      className={`w-3.5 h-3.5 shrink-0 mt-0.5 opacity-80 ${isDark ? 'text-slate-400' : 'text-slate-500'}`} 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth="2" 
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 111.056 1.056L10.5 13.042a.75.75 0 11-1.056-1.056l1.806-1.716zM12 21a9 9 0 100-18 9 9 0 000 18zm0-13.5h.008v.008H12V7.5z" />
    </svg>
    <span className={`text-[9.5px] font-normal leading-normal ${
      isDark ? 'text-slate-400' : 'text-slate-500'
    }`}>
      Upload Whitelisted Email ID/IDs here, use these email IDs to ‘Start a new campaign’ or to ‘Create a new scenario’ (Template)
    </span>
  </div>
</div>


        {/* ========================================================================= */}
        {/* ── 2. MAIN 2-COLUMN DASHBOARD (STANDALONE & UNCUT) ────────────────────── */}
        {/* ========================================================================= */}
        <div className="flex flex-col lg:flex-row gap-3 w-full items-start">
          
          {/* ========================================================================= */}
          {/* ── COLUMN 1 (LEFT 65%): FORM CONTAINER WRAPPER ────────────────────────── */}
          {/* ========================================================================= */}
          <div
            className={`w-full lg:w-[70%] p-3.5 sm:p-4 rounded-2xl border flex flex-col justify-between gap-2.5 shadow-sm transition-all duration-300 ${
              isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            {/* ROW 1: [Local Part] + [Domain Part] */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {/* Local Part Card */}
              <div
                className="p-3.5 rounded-2xl flex flex-col justify-between min-h-[105px] transition-colors h-full"
                style={{ backgroundColor: cardBg }}
              >
                <div>
                  <h3 className={`text-[15px] -mt-1 font-voda-exb tracking-tight ${textColor}`}>
                    Local Part
                  </h3>
                  <p className={`text-[9.5px] font-medium mt-0.5 mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enter the local part of the Email ID
                  </p>
                </div>

                <div className="w-full px-3.5 py-2 rounded-md flex shadow-2xs mt-2" style={{ backgroundColor: inputBg }}>
                  <textarea
                    value={localPart}
                    onChange={(e) => setLocalPart(e.target.value)}
                    placeholder="Type here.."
                    rows={3}
                    className={`w-full bg-transparent text-[11px] font-medium outline-none resize-none text-left align-top ${textColor}`}
                  />
                </div>
              </div>

              {/* Domain Part Card */}
              <div
                className="p-3.5 rounded-2xl flex flex-col justify-between min-h-[115px] transition-colors relative h-full"
                style={{ backgroundColor: cardBg }}
              >
                <div>
                  <h3 className={`text-[15px] -mt-1 font-voda-exb tracking-tight ${textColor}`}>
                    Domain Part
                  </h3>
                  <p className={`text-[9.5px] font-medium mt-0.5 mb-2 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                    Enter or selected the Domain part of the Email ID
                  </p>
                </div>

                <div className="w-full px-3.5 py-2 rounded-md flex shadow-2xs mt-2 relative" style={{ backgroundColor: inputBg }}>
                  <textarea
                    value={domainPart}
                    onChange={(e) => setDomainPart(e.target.value)}
                    placeholder="Type here.."
                    rows={3}
                    className={`w-full bg-transparent text-[11px] font-medium outline-none resize-none text-left align-top ${textColor}`}
                  />

                  {/* Dropdown Selector Button */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className={`w-[135px] px-2.5 py-1.5 rounded-lg text-[8.5px] font-voda-exb flex justify-between items-center gap-1 transition-colors cursor-pointer ${
                        isDark ? 'bg-[#2E313D] hover:bg-[#393C49] text-slate-200' : 'bg-[#EAEFF5] hover:bg-[#DCE3EC] text-slate-800'
                      }`}
                    >
                      <span>Select from existing</span>
                      <ChevronDown className="w-3 h-3 opacity-70" />
                    </button>

                    {/* Dropdown Menu */}
                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 5 }}
                          className={`absolute right-0 bottom-full mb-1 w-48 rounded-xl border shadow-xl z-30 py-1 overflow-hidden ${
                            isDark ? 'bg-[#202127] border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          {PRESET_DOMAINS.map((domain) => (
                            <button
                              key={domain}
                              type="button"
                              onClick={() => {
                                setDomainPart(domain);
                                setIsDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-1.5 text-left text-[10px] font-mono-tech hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer block truncate ${
                                domainPart === domain ? 'text-[#E60000] font-bold' : ''
                              }`}
                            >
                              {domain}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>
            </div>

            {/* ── ROW 2 & 3 COMBINED: CONTINUOUS L-SHAPED CONTAINER (DESCRIPTION + REVIEW/SUBMIT) ── */}
            <div className="w-full flex items-end flex-1 min-h-0 relative">
              {/* Continuous L-Shaped Container Background & Content */}
              <div className="w-full flex flex-col h-full justify-between">
                {/* 1. Upper Part of L-Container: Description (Full Width) */}
                <div
                  className="w-full p-3.5 rounded-t-2xl rounded-br-2xl transition-colors"
                  style={{ backgroundColor: cardBg }}
                >
                  <h3 className={`text-[14px] -mt-1 font-voda-exb tracking-tight ${textColor}`}>
                    Description
                  </h3>

                  <div className="w-full px-3.5 py-2 rounded-lg mt-2.5 flex shadow-2xs" style={{ backgroundColor: inputBg }}>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Type here.."
                      rows={3}
                      className={`w-full bg-transparent text-[11px] font-medium outline-none resize-none text-left align-top ${textColor}`}
                    />
                  </div>
                </div>

                {/* 2. Lower Part of L-Container: Review & Submit (Recessed on Right for Button) */}
                <div className="flex items-stretch w-full relative">
                  {/* Left Side: Review and Submit Box */}
                  <div
                    className="flex-1 p-3.5 rounded-b-2xl rounded-tr-none transition-colors relative"
                    style={{ backgroundColor: cardBg }}
                  >
                    <h3 className={`text-[14px] font-voda-exb tracking ${textColor}`}>
                      Review and Submit
                    </h3>

                    <div
                      className="w-full h-[64px] px-4 rounded-xl flex items-center justify-center text-center shadow-2xs mt-2.5 transition-colors"
                      style={{ backgroundColor: inputBg }}
                    >
                      <span
                        className={`text-[10.5px] sm:text-[11px] truncate ${
                          calculatedPreview()
                            ? 'font-bold text-inherit'
                            : 'font-bold text-slate-400 dark:text-slate-500'
                        }`}
                      >
                        {calculatedPreview() || 'Above entered Email ID will be displayed here'}
                      </span>
                    </div>
                  </div>

                  {/* Right Cutout Slot with Concave Corner Fillet & Square Green Save & Submit Button */}
                  <div className="w-[140px] flex-shrink-0 flex items-center justify-center pl-3 relative">
                    {/* 🌟 Concave Arc Fillet in the Re-entrant Inner Corner */}
                    <svg
                      className="absolute top-0 left-0 w-3.5 h-3.5 pointer-events-none z-10"
                      viewBox="0 0 14 14"
                      fill="none"
                    >
                      <path
                        d="M 0,0 H 14 A 14,14 0 0 0 0,14 Z"
                        fill={cardBg}
                      />
                    </svg>

                    {/* Isolated Square-like Save & Submit Button */}
                    <button
                      type="button"
                      onClick={handleSubmit}
                      className="w-full h-[120px] -ml-2 mt-2 rounded-2xl bg-[#15171C] dark:bg-[#f1f4f9] hover:bg-[#595959] text-white dark:text-black flex flex-col items-start justify-top text-center shadow-xs cursor-pointer transition-transform active:scale-98"
                    >
                      <span className="text-[15px] mt-2 ml-2 font-voda-exb uppercase leading-tight drop-shadow-xs">
                        Save &<br />Submit
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ── COLUMN 2 (RIGHT 35%): DIRECTORY WRAPPER WITH L-SHAPED CONTAINER ─────── */}
          {/* ========================================================================= */}
          <div
            className={`w-full lg:w-[30%] p-3.5 sm:p-4 rounded-2xl border flex flex-col gap-2.5 shadow-sm transition-all duration-300 ${
              isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200'
            }`}
          >
            {/* Top Row: Standalone Black Card + Upper Part of L-Container ("Total Email IDs") */}
            <div className="flex items-stretch gap-2.5 w-full">
              {/* Standalone Black Card: All Existing Email IDs & Domains */}
              <div className="w-[50%] bg-[#0D0D11] text-white bg-[#15171C] dark:bg-[#f1f4f9] rounded-xl p-3.5 mb-2 -mr-0.5 flex flex-col justify-between min-h-[120px] flex-shrink-0 z-10">
                <div>
                  <h4 className="text-[15.5px] text-white dark:text-black font-voda-exb leading-snug">
                    All Existing<br />Email IDs & Domains
                  </h4>
                  <p className="text-[8.5px] font-medium leading-relaxed text-white dark:text-black mt-2">
                    Access all the Email IDs along with Domains which are been added to VOISShield
                  </p>
                </div>
              </div>

              {/* 🌟 1. Upper Arm of L-Container: Total Email IDs Counter */}
              <div
                className="flex-1 p-3.5 rounded-t-xl rounded-tr-xl rounded-bl-none flex flex-col justify-between min-h-[120px] relative transition-colors"
                style={{ backgroundColor: cardBg }}
              >
                <div>
                  <span className={`text-[15.5px] font-voda-exb leading-tight block ${textColor}`}>
                    Total Email IDs
                  </span>
                  <div className={`text-[26px] font-voda-exb leading-none my-2.5 ${textColor}`}>
                    {emailsList.length.toString().padStart(2, '0')}
                  </div>
                </div>

                <span className={`text-[11.5px] font-medium leading-tight block ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Total Unique Domains: {uniqueDomainsCount.toString().padStart(2, '0')}
                </span>

                {/* 🌟 Concave Arc Fillet in the Re-entrant Inner Corner */}
                <svg
                        className="absolute -bottom-px -left-[14px] w-[14px] h-[14px] pointer-events-none z-20 overflow-visible"
                        viewBox="0 0 14 14"
                        fill="none"
                      >
                        <path
                          d="M 0,14 A 14,14 0 0 0 14,0 V 14 H 0 Z"
                          fill={isDark ? "#202127" : "#f1f3f7"}
                        />
                      </svg>
              </div>
            </div>

            {/* 🌟 2. Lower Body of L-Container: Search & Email Records Gallery (Full Width) */}
            <div
              className="w-full p-3.5 rounded-b-2xl rounded-tl-2xl flex flex-col gap-3 -mt-2.5 transition-colors"
              style={{ backgroundColor: cardBg }}
            >
              {/* Search Input Bar with Right-Aligned Search Icon */}
              <div
                className="w-full px-3.5 py-2 rounded-xl flex items-center justify-between shadow-2xs"
                style={{ backgroundColor: inputBg }}
              >
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by Email ID"
                  className={`w-full bg-transparent text-[11px] font-medium outline-none pr-2 ${textColor}`}
                />
                <Search className="w-4 h-4 text-slate-500 flex-shrink-0" />
              </div>

              {/* 🌟 SCROLLABLE RECORDS LIST CONTAINER */}
              <div className="max-h-[300px] overflow-y-auto flex flex-col gap-2.5 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredEmails.length === 0 ? (
                  <div className={`p-4 text-center rounded-xl border text-xs font-semibold ${
                    isDark ? 'border-white/5 text-slate-400' : 'border-slate-200 text-slate-500'
                  }`}>
                    No Email IDs found.
                  </div>
                ) : (
                  filteredEmails.map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 3 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -3 }}
                      className="p-3.5 rounded-2xl flex flex-col justify-between shadow-2xs transition-all flex-shrink-0 gap-1.5"
                      style={{ backgroundColor: inputBg }}
                    >
                      {/* Top Row: Email + Action Icons */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-[12px] font-voda-exb truncate flex-1 ${textColor}`}>
                          {item.email}
                        </span>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Edit Action Button */}
                          <button
                            type="button"
                            onClick={() => setEditingItem(item)}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                              isDark ? 'bg-[#202127] text-slate-300 hover:text-white' : 'bg-[#F1F4F9] text-slate-700 hover:text-black'
                            }`}
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Action Button */}
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                              isDark ? 'bg-[#202127] text-slate-300 hover:text-red-500' : 'bg-[#F1F4F9] text-slate-700 hover:text-red-500'
                            }`}
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Middle: Description */}
                      <p className="text-[9.5px] font-normal leading-relaxed text-slate-700 dark:text-slate-300">
                        <strong className="font-bold text-slate-900 dark:text-white">Description:</strong> {item.description}
                      </p>

                      {/* Bottom Right: Created Date */}
                      <div className="w-full flex justify-end mt-0.5">
                        <span className={`text-[9px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          Created On: {item.createdDate}
                        </span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── MODAL: EDIT EMAIL RECORD DIALOG ────────────────────────────────────── */}
        {/* ========================================================================= */}
        <AnimatePresence>
          {editingItem && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`w-full max-w-md p-5 rounded-2xl border shadow-2xl ${
                  isDark ? 'bg-[#15161A] border-white/15 text-white' : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-black/5 dark:border-white/5">
                  <h3 className="text-xs font-voda-exb uppercase tracking-tight flex items-center gap-2">
                    <span className="w-1.5 h-3.5 rounded-full bg-[#E60000]" />
                    Edit Email Record
                  </h3>
                  <button onClick={() => setEditingItem(null)} className="opacity-60 hover:opacity-100 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="py-4 flex flex-col gap-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Email Address:
                    </label>
                    <input
                      type="text"
                      value={editingItem.email}
                      onChange={(e) => setEditingItem({ ...editingItem, email: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-[12px] font-medium outline-none ${
                        isDark ? 'bg-[#202127] border-white/15 text-white' : 'bg-[#F1F3F7] border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase">
                      Campaign Purpose / Description:
                    </label>
                    <textarea
                      rows={3}
                      value={editingItem.description}
                      onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                      className={`w-full px-3 py-2 rounded-xl border text-[11px] font-medium outline-none resize-none ${
                        isDark ? 'bg-[#202127] border-white/15 text-white' : 'bg-[#F1F3F7] border-slate-300 text-slate-900'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/5 dark:border-white/5">
                  <button
                    type="button"
                    onClick={() => setEditingItem(null)}
                    className="px-3.5 py-1.5 rounded-xl border text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    className="px-4 py-1.5 rounded-xl bg-[#E60000] text-white text-xs font-voda-exb uppercase tracking-wider hover:bg-[#cc0000] shadow-sm cursor-pointer"
                  >
                    Save Changes
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Toast Feedback Notification */}
        <AnimatePresence>
          {toastMessage && (
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 15 }}
              className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-xl bg-[#22C55E] text-white text-xs font-voda-exb shadow-xl flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {toastMessage}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
};

export default EmailIDsAndDomains;