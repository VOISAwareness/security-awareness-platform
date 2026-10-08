import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  RefreshCw,
  Mail,
  User as UserIcon
} from 'lucide-react';
import defaultData from './UserDLsData.json';

// =========================================================================
// 🎛️ SCALE CONTROL & BRAND CONSTANTS
// =========================================================================
const VarUserDLsScale = 0.94;
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

const UserListUploadViaDL = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const userContext = useUserType?.() || {};

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

  const syncedDLs = defaultData.syncedDistributionLists || [];

  // Form States
  const [selectedDLId, setSelectedDLId] = useState('');
  const [cohortName, setCohortName] = useState('');
  const [description, setDescription] = useState('');

  // Staged Telemetry States
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedMembers, setLoadedMembers] = useState([]);
  const [loadedDeptBreakdown, setLoadedDeptBreakdown] = useState([]);
  const [loadedHookRate, setLoadedHookRate] = useState('12.1%');
  const [loadedReportRate, setLoadedReportRate] = useState('65.1%');

  // Table Controls
  const [tableSearch, setTableSearch] = useState('');
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Pre-load editing cohort if editId exists
  useEffect(() => {
    if (editId) {
      try {
        const stored = localStorage.getItem('voisshield_user_dls_data');
        const all = stored ? JSON.parse(stored) : defaultData.savedUserLists || [];
        const target = all.find((l) => l.id === editId);
        if (target) {
          setCohortName(target.name || '');
          setSelectedDLId(target.dlId || syncedDLs[0]?.dlId || '');
          setDescription(target.description || '');
          setLoadedMembers(target.users || []);
          setLoadedDeptBreakdown(target.departmentBreakdown || []);
          setLoadedHookRate(target.aggregatedHookRate || '12.1%');
          setLoadedReportRate(target.aggregatedReportRate || '65.1%');
          setIsLoaded(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [editId]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // DL Selection change handler
  const handleSelectDL = (e) => {
    const dlId = e.target.value;
    setSelectedDLId(dlId);
    setIsLoaded(false);

    const found = syncedDLs.find((d) => d.dlId === dlId);
    if (found) {
      if (!cohortName) setCohortName(found.dlName);
      if (!description) setDescription(found.description);
    }
  };

  // Load Action
  const handleLoad = () => {
    if (!selectedDLId) {
      showToast('Please select a Distribution List first!');
      return;
    }

    const found = syncedDLs.find((d) => d.dlId === selectedDLId);
    if (found) {
      setLoadedMembers(found.members || []);
      setLoadedDeptBreakdown(found.departmentBreakdown || []);
      setLoadedHookRate(found.aggregatedHookRate || '12.1%');
      setLoadedReportRate(found.aggregatedReportRate || '65.1%');
      if (!cohortName) setCohortName(found.dlName);
      if (!description) setDescription(found.description);
      setIsLoaded(true);
      showToast(`Loaded ${found.totalUsers} users from Active Directory`);
    }
  };

  // Save Action
  const handleSave = () => {
    if (!cohortName.trim()) {
      showToast('Please enter a Cohort Name');
      return;
    }
    if (!isLoaded || loadedMembers.length === 0) {
      showToast('No user records staged. Click LOAD first!');
      return;
    }

    try {
      const stored = localStorage.getItem('voisshield_user_dls_data');
      const allLists = stored ? JSON.parse(stored) : defaultData.savedUserLists || [];

      if (editId) {
        const updated = allLists.map((item) =>
          item.id === editId
            ? {
                ...item,
                name: cohortName.trim(),
                dlId: selectedDLId,
                description: description.trim() || item.description,
                totalUsers: loadedMembers.length,
                departmentBreakdown: loadedDeptBreakdown,
                users: loadedMembers,
                aggregatedHookRate: loadedHookRate,
                aggregatedReportRate: loadedReportRate
              }
            : item
        );
        localStorage.setItem('voisshield_user_dls_data', JSON.stringify(updated));
      } else {
        const newList = {
          id: `ul-${Date.now().toString().slice(-4)}`,
          name: cohortName.trim(),
          type: 'Distribution List',
          dlId: selectedDLId,
          description: description.trim() || 'Pre-configured Exchange Active Directory target group.',
          totalUsers: loadedMembers.length,
          usedCount: 0,
          createdDate: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }),
          aggregatedHookRate: loadedHookRate,
          aggregatedReportRate: loadedReportRate,
          departmentBreakdown: loadedDeptBreakdown,
          users: loadedMembers
        };
        localStorage.setItem('voisshield_user_dls_data', JSON.stringify([newList, ...allLists]));
      }

      showToast(`Saved User List '${cohortName.trim()}' successfully!`);
      setTimeout(() => {
        navigate('/user-dls');
      }, 700);
    } catch (e) {
      console.error(e);
      showToast('Error saving user list');
    }
  };

  // Filtered members for table
  const filteredMembers = loadedMembers.filter(
    (u) =>
      u.userName.toLowerCase().includes(tableSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(tableSearch.toLowerCase()) ||
      u.department.toLowerCase().includes(tableSearch.toLowerCase()) ||
      u.location.toLowerCase().includes(tableSearch.toLowerCase())
  );

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{ zoom: VarUserDLsScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 overflow-hidden h-[calc(110vh-10px)]"
      >
        {/* ========================================================================= */}
        {/* ── 1. TOP HEADER BAR: "USER LISTS" ─────────────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full py-2.5 px-6 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none ${
            isDark
              ? 'bg-[#f1f4f9] text-black border-white/10'
              : 'bg-[#15171C] text-white border-black/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/user-dls')}
              className="p-1.5 rounded-lg bg-white/10 dark:bg-black/10 hover:bg-white/20 dark:hover:bg-black/20 text-white dark:text-black cursor-pointer transition-colors"
              title="Return to User Lists"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <h1 className="text-[15px] font-voda-exb tracking-normal text-white dark:text-black">
              USER LISTS
            </h1>
          </div>

          <div className="text-[13px] font-voda-exb text-white/80 dark:text-black/80">
            -- {editId ? 'Edit Distribution List' : 'Add Distribution List (Exchange / Azure AD)'}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 2. INFO NOTICE STRIP ────────────────────────────────────────────────── */}
        {/* ========================================================================= */}
        <div
          className={`w-full py-2 px-4 rounded-xl border flex items-center gap-2.5 flex-shrink-0 text-[11px] font-medium shadow-2xs ${
            isDark ? 'bg-[#15161A] text-slate-300 border-white/10' : 'bg-white text-slate-700 border-slate-200'
          }`}
        >
          <div className="w-3.5 h-3.5 rounded-full border border-black dark:border-white flex items-center justify-center text-[9px] font-bold flex-shrink-0">
            i
          </div>
          <span>
            Select a pre-synced Active Directory Distribution List (DL) to review members, department distribution, risk telemetry, and save as an active simulation cohort.
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
          {/* ── TOP ROW: [DL FORM CONTAINER (7 COLS)] + [TELEMETRY DASHBOARD (5 COLS)] ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-shrink-0 items-stretch">
            
            {/* LEFT: FORM BLOCK (7 cols) */}
            <div
              className={`lg:col-span-7 p-4 rounded-2xl border flex flex-col justify-between gap-2.5 ${
                isDark ? 'bg-[#1F2128] border-white/5' : 'bg-[#F1F4F9] border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-black text-white dark:bg-white dark:text-black flex items-center justify-center">
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <h3 className="text-[13.5px] font-voda-exb uppercase tracking-tight text-slate-900 dark:text-white">
                    {editId ? 'Edit Distribution List Cohort' : 'Configure Exchange Distribution List'}
                  </h3>
                </div>
                <span className="text-[9.5px] font-mono-tech text-slate-500 dark:text-slate-400">
                  Sync: Microsoft Azure AD
                </span>
              </div>

              {/* Form Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Cohort Name */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Cohort Name:
                  </label>
                  <input
                    type="text"
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                    placeholder="Type cohort name..."
                    className={`w-full px-3 py-1.5 rounded-xl border text-[11px] font-medium outline-none ${
                      isDark ? 'bg-[#15161A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                    }`}
                  />
                </div>

                {/* DL ID Dropdown */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                    Distribution List (DL ID):
                  </label>
                  <div className="relative">
                    <select
                      value={selectedDLId}
                      onChange={handleSelectDL}
                      className={`w-full px-3 py-1.5 pr-8 rounded-xl border text-[11px] font-mono-tech outline-none appearance-none cursor-pointer ${
                        isDark ? 'bg-[#15161A] border-white/10 text-slate-200' : 'bg-white border-slate-200 text-slate-800'
                      }`}
                    >
                      <option value="">Select pre-configured DL...</option>
                      {syncedDLs.map((dl) => (
                        <option key={dl.dlId} value={dl.dlId}>
                          {dl.dlName} ({dl.dlId})
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-700 dark:text-slate-300">
                  Description:
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Type details about this target cohort..."
                  className={`w-full px-3 py-1.5 rounded-xl border text-[11px] font-medium outline-none ${
                    isDark ? 'bg-[#15161A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                />
              </div>

              {/* Action Buttons: LOAD + SAVE */}
              <div className="flex items-center gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={handleLoad}
                  className="px-6 py-1.5 rounded-xl bg-[#181A20] hover:bg-black text-white text-[11px] font-voda-exb uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" />
                  LOAD
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isLoaded}
                  className={`px-6 py-1.5 rounded-xl text-[11px] font-voda-exb uppercase tracking-wider shadow-sm transition-all cursor-pointer ${
                    isLoaded
                      ? 'bg-[#2E7D32] hover:bg-[#256629] text-white'
                      : 'bg-slate-300 dark:bg-white/10 text-slate-500 dark:text-white/30 cursor-not-allowed opacity-60'
                  }`}
                >
                  SAVE & SUBMIT
                </button>
              </div>
            </div>

            {/* RIGHT: TELEMETRY DASHBOARD (5 cols) */}
            <div
              className={`lg:col-span-5 p-4 rounded-2xl border flex flex-col justify-between gap-2 ${
                isDark ? 'bg-[#1F2128] border-white/5' : 'bg-[#F1F4F9] border-slate-200/90'
              }`}
            >
              <div className="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/10">
                <span className="text-[12px] font-voda-exb uppercase text-slate-900 dark:text-white">
                  Batch Telemetry Summary
                </span>
                <span className="text-[11px] font-mono-tech font-bold text-[#2E7D32] dark:text-[#4ADE80]">
                  Total Users: {loadedMembers.length}
                </span>
              </div>

              {/* Department Breakdown */}
              <div className="flex flex-wrap gap-1.5 my-auto min-h-[48px] items-center">
                {loadedDeptBreakdown.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic my-auto">
                    No telemetry loaded yet. Select a Distribution List and click LOAD.
                  </span>
                ) : (
                  loadedDeptBreakdown.map((dept, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg text-[9px] font-bold border bg-white dark:bg-[#15161A] border-slate-200 dark:border-white/10 text-slate-800 dark:text-slate-200"
                    >
                      {dept.dept} - <strong className="text-[#FF4D4D]">{dept.count}</strong>
                    </span>
                  ))
                )}
              </div>

              {/* Risk Indicators */}
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-black/5 dark:border-white/10">
                <div className="p-2 rounded-xl bg-[#FF4D4D]/10 border border-[#FF4D4D]/20 text-[#FF4D4D] flex flex-col items-center justify-center">
                  <span className="text-[8px] font-mono-tech font-bold uppercase">Aggregated Hook Rate</span>
                  <span className="text-[14px] font-voda-exb mt-0.5">{isLoaded ? loadedHookRate : '--'}</span>
                </div>

                <div className="p-2 rounded-xl bg-[#2E7D32]/10 border border-[#2E7D32]/20 text-[#2E7D32] dark:text-[#4ADE80] flex flex-col items-center justify-center">
                  <span className="text-[8px] font-mono-tech font-bold uppercase">Aggregated Report Rate</span>
                  <span className="text-[14px] font-voda-exb mt-0.5">{isLoaded ? loadedReportRate : '--'}</span>
                </div>
              </div>
            </div>

          </div>

          {/* ── BOTTOM SECTION: "EVERY USER BY USER" TABLE (Fills remaining height) ── */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 flex-1 ${
              isDark ? 'bg-[#1F2128] border-white/5' : 'bg-[#F1F4F9] border-slate-200/90'
            }`}
          >
            {/* Table Header Controls */}
            <div className="flex items-center justify-between pb-1.5 border-b border-black/5 dark:border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-3.5 rounded-full bg-[#E60000]" />
                <h3 className="text-xs font-voda-exb uppercase tracking-tight text-slate-900 dark:text-white">
                  Every user by user ({filteredMembers.length} records)
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`px-2.5 py-1 rounded-xl border flex items-center gap-1.5 ${
                    isDark ? 'bg-[#15161A] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'
                  }`}
                >
                  <Search className="w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="Search users, emails, depts..."
                    className="w-48 bg-transparent text-[10px] font-medium outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsTableExpanded(!isTableExpanded)}
                  className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  {isTableExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Table Data */}
            {isTableExpanded && (
              <div className="flex-1 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredMembers.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-8 text-center text-slate-400 text-xs italic">
                    No user records loaded. Select a Distribution List above and click LOAD.
                  </div>
                ) : (
                  <table className="w-full text-left text-[10.5px]">
                    <thead>
                      <tr
                        className={`border-b font-mono-tech uppercase text-[9px] ${
                          isDark ? 'border-white/10 text-slate-400 bg-white/[0.02]' : 'border-slate-200 text-slate-600 bg-white/50'
                        }`}
                      >
                        <th className="py-2 px-3">SR NO.</th>
                        <th className="py-2 px-3">USER NAME</th>
                        <th className="py-2 px-3">EMAIL ID</th>
                        <th className="py-2 px-3">DEPARTMENT</th>
                        <th className="py-2 px-3">LOCATION</th>
                        <th className="py-2 px-3 text-center">HOOK RATE %</th>
                        <th className="py-2 px-3 text-center">REPORT RATE %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((user) => (
                        <tr
                          key={user.srNo}
                          className={`border-b transition-colors ${
                            isDark ? 'border-white/5 hover:bg-white/[0.03]' : 'border-slate-200/60 hover:bg-white/60'
                          }`}
                        >
                          <td className="py-2 px-3 font-mono-tech text-slate-400">{user.srNo}</td>
                          <td className="py-2 px-3 font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-100">
                            <div className="w-5 h-5 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center text-xs">
                              <UserIcon className="w-3 h-3 text-slate-600 dark:text-slate-200" />
                            </div>
                            {user.userName}
                          </td>
                          <td className="py-2 px-3 font-mono-tech text-slate-400">{user.email}</td>
                          <td className="py-2 px-3 text-slate-600 dark:text-slate-300">{user.department}</td>
                          <td className="py-2 px-3 font-bold text-slate-700 dark:text-slate-200">{user.location}</td>
                          <td className="py-2 px-3 text-center font-mono-tech font-bold text-[#FF4D4D]">{user.hookRate}</td>
                          <td className="py-2 px-3 text-center font-mono-tech font-bold text-[#2E7D32] dark:text-[#4ADE80]">
                            {user.reportRate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-xl bg-[#2E7D32] text-white text-xs font-voda-exb shadow-xl flex items-center gap-2">
            <Check className="w-4 h-4 stroke-[3]" />
            {toastMessage}
          </div>
        )}
      </div>
    </>
  );
};

export default UserListUploadViaDL;