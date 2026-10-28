import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import {
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  RefreshCw,
  Upload,
  Download,
  User as UserIcon,
  Trash2,
  X,
  Info
} from 'lucide-react';

import ExcelIcon from '../../assets/UserListScreenAssets/ExcelIconUserListsScreen.png';
import CSVIcon from '../../assets/UserListScreenAssets/CSVIconUserListsScreen.png';
import defaultData from './UserDLsData.json';
import masterUsersData from '../../MasterUserData.json';

// =========================================================================
// 🎛️ SCALE CONTROL & BRAND CONSTANTS
// =========================================================================
export const VarUserDLsScale = 0.94;
export const VarOverallRoundednessScale = 0.6;
export const VarBiggerWhiteDivHeight = '100%';

// Section Dimension Adjusters (Matching DL Screen Architecture)
export const varBulkDetailsInputSectionHeight = '60%';
export const varBulkDetailsInputSectionWidth = '70%';
export const varBulkAllUsersTableViewSectionHeight = '40%';
export const varBulkAllUsersTableViewSectionWidth = '70%';
export const VarListSummarySectionHeight = '100%';
export const VarListSummarySectionWidth = '30%';

const VODAFONE_FONT_STYLE = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@500;600;700;800&family=JetBrains+Mono:wght@500;600;700&display=swap');
  
  .font-voda-exb {
    font-family: 'Vodafone ExB', 'Montserrat', sans-serif;
    font-weight: 900;
  }
  .font-mono-tech {
    font-family: 'JetBrains Mono', monospace;
  }
  .rounded-3xl { border-radius: ${Math.round(28 * VarOverallRoundednessScale)}px !important; }
  .rounded-2xl { border-radius: ${Math.round(20 * VarOverallRoundednessScale)}px !important; }
  .rounded-xl  { border-radius: ${Math.round(14 * VarOverallRoundednessScale)}px !important; }
  .rounded-lg  { border-radius: ${Math.round(10 * VarOverallRoundednessScale)}px !important; }
  .rounded-md  { border-radius: ${Math.round(6 * VarOverallRoundednessScale)}px !important; }
`;

const UserListViaBulkUpload = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const userContext = useUserType?.() || {};
  const fileInputRef = useRef(null);

  // Theme check: Reactive pipeline with MutationObserver
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

  // Background color for upper bento containers matching design
  const lCardBg = isDark ? '#1C1F27' : '#EEF2F6';

  // Form States
  const [cohortName, setCohortName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [rawFileText, setRawFileText] = useState('');

  // Staged User List States
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedMembers, setLoadedMembers] = useState([]);
  const [loadedDeptBreakdown, setLoadedDeptBreakdown] = useState([]);
  const [loadedHookRate, setLoadedHookRate] = useState('0.0%');
  const [loadedReportRate, setLoadedReportRate] = useState('0.0%');

  // Table Controls & Expand State
  const [tableSearch, setTableSearch] = useState('');
  const [isTableMaximized, setIsTableMaximized] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Floating Toaster for Deleted Records
  const [deletedSuccessMsg, setDeletedSuccessMsg] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Helper to cross-reference single-column Email IDs with MasterUserData.json
  const resolveAndValidateEmailList = (emailList = []) => {
    return emailList
      .map((item) => (typeof item === 'string' ? item.trim() : (item.email || item.UserEMailID || '').trim()))
      .filter((email) => email.length > 0 && email.includes('@'))
      .map((email, idx) => {
        const matched = (masterUsersData || []).find(
          (m) => m.UserEMailID?.toLowerCase() === email.toLowerCase()
        );

        if (matched) {
          return {
            srNo: idx + 1,
            userName: matched.UserName,
            email: matched.UserEMailID,
            department: matched.Department || 'Corporate Operations',
            location: (matched.Country || 'GLOBAL').toUpperCase(),
            hookRate: matched['HookRate%'] !== undefined ? `${matched['HookRate%']}%` : '5.0%',
            reportRate: matched['ReportRate%'] !== undefined ? `${matched['ReportRate%']}%` : '80.0%',
            isUnregistered: false
          };
        }

        // Unregistered Email (Does not exist in MasterUserData.json)
        return {
          srNo: idx + 1,
          userName: email.split('@')[0],
          email,
          department: 'Unregistered',
          location: 'N/A',
          hookRate: '0.0%',
          reportRate: '0.0%',
          isUnregistered: true
        };
      });
  };

  // Calculate telemetry metrics and department breakdown from members list
  const computeMetrics = (membersList = []) => {
    const deptCounts = {};
    membersList.forEach((u) => {
      deptCounts[u.department] = (deptCounts[u.department] || 0) + 1;
    });
    const breakdown = Object.entries(deptCounts).map(([dept, count]) => ({ dept, count }));
    setLoadedDeptBreakdown(breakdown);

    // Filter registered members for calculating realistic metrics
    const registeredOnly = membersList.filter((m) => !m.isUnregistered);
    if (registeredOnly.length > 0) {
      const avgHook = (registeredOnly.reduce((acc, u) => acc + parseFloat(u.hookRate), 0) / registeredOnly.length).toFixed(1);
      const avgReport = (registeredOnly.reduce((acc, u) => acc + parseFloat(u.reportRate), 0) / registeredOnly.length).toFixed(1);
      setLoadedHookRate(`${avgHook}%`);
      setLoadedReportRate(`${avgReport}%`);
    } else {
      setLoadedHookRate('0.0%');
      setLoadedReportRate('0.0%');
    }
  };

  // Pre-load editing cohort if editId exists
  useEffect(() => {
    if (editId) {
      try {
        const stored = localStorage.getItem('voisshield_user_dls_data');
        const all = stored ? JSON.parse(stored) : (Array.isArray(defaultData) ? defaultData : defaultData.savedUserLists || []);
        const target = all.find((l) => (l.UserListsID || l.id) === editId);
        if (target) {
          const rawEmails = Array.isArray(target.EMailIDs) ? target.EMailIDs : (target.users || []);
          const resolved = resolveAndValidateEmailList(rawEmails);

          setCohortName(target.UserListName || target.name || '');
          setDescription(target.UserListsDescription || target.description || '');
          setUploadedFileName('Existing_Cohort_Roster.csv');
          setLoadedMembers(resolved);
          computeMetrics(resolved);
          setIsLoaded(true);
        }
      } catch (e) {
        console.error(e);
      }
    }
  }, [editId]);

  // Download Sample Template with ONLY ONE Column: "Email ID"
  const handleDownloadTemplate = () => {
    const headers = 'Email ID\n';
    const sampleRows = [
      'abhay.hs1@vodafone.com',
      'trevor.sile@vodafone.com',
      'mitin.rinis@vodafone.com',
      'sarah.jenkins@vodafone.com',
      'karim.mostafa@vodafone.com',
      'unregistered.testuser@external.com'
    ].join('\n');

    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'VOISShield_Recipients_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded sample template (.csv)');
  };

  // Handle Local File Upload
  const handleFileSelection = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsLoaded(false);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text !== 'string') return;
      setRawFileText(text);

      if (!cohortName) {
        const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
        setCohortName(cleanName);
      }
      showToast(`Selected "${file.name}". Click LOAD to evaluate.`);
    };
    reader.readAsText(file);
  };

  // Load Action: Parse text, validate against MasterUsersData, and stage rows
  const handleLoad = () => {
    if (!uploadedFileName || !rawFileText) {
      showToast('Please select an Excel or CSV file first!');
      return;
    }

    const lines = rawFileText.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
    if (lines.length === 0) {
      showToast('The uploaded file is empty.');
      return;
    }

    // Determine header index or direct email list
    let dataRows = lines;
    if (lines[0].toLowerCase().includes('email')) {
      dataRows = lines.slice(1);
    }

    // Extract first column as Email ID
    const extractedEmails = dataRows.map((row) => {
      const cols = row.split(',').map((c) => c.replace(/["']/g, '').trim());
      return cols[0];
    });

    const resolved = resolveAndValidateEmailList(extractedEmails);
    if (resolved.length === 0) {
      showToast('No valid email IDs found in the file.');
      return;
    }

    setLoadedMembers(resolved);
    computeMetrics(resolved);
    setIsLoaded(true);

    const unregisteredCount = resolved.filter((m) => m.isUnregistered).length;
    if (unregisteredCount > 0) {
      showToast(`Loaded ${resolved.length} emails (${unregisteredCount} unregistered).`);
    } else {
      showToast(`Loaded and verified ${resolved.length} email IDs.`);
    }
  };

  // Handle Member Row Deletion with Real-time Recalculations
  const handleDeleteMember = (emailToDelete, userName) => {
    const updated = loadedMembers.filter((m) => m.email !== emailToDelete).map((m, idx) => ({
      ...m,
      srNo: idx + 1
    }));
    setLoadedMembers(updated);
    computeMetrics(updated);

    // Trigger floating success toaster
    setDeletedSuccessMsg(`Recipient ${userName || emailToDelete} removed successfully`);
    setTimeout(() => setDeletedSuccessMsg(''), 3000);
  };

  // Save Action
  const handleSave = () => {
    if (!cohortName.trim()) {
      showToast('Please enter a Name for this list');
      return;
    }
    if (!isLoaded || loadedMembers.length === 0) {
      showToast('No user records staged. Click LOAD first!');
      return;
    }

    try {
      const stored = localStorage.getItem('voisshield_user_dls_data');
      const allLists = stored ? JSON.parse(stored) : (Array.isArray(defaultData) ? defaultData : defaultData.savedUserLists || []);

      const formattedNow = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      const formattedTimestamp = new Date().toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });

      if (editId) {
        const updated = allLists.map((item) =>
          (item.UserListsID || item.id) === editId
            ? {
                ...item,
                UserListName: cohortName.trim(),
                UserListsDescription: description.trim() || item.UserListsDescription || item.description,
                TotalEmailIDsCount: loadedMembers.length,
                LastModified: formattedTimestamp,
                LastModifiedBy: userContext.userEmail || 'abhay.hs1@vodafone.com',
                EMailIDs: loadedMembers.map((u) => u.email)
              }
            : item
        );
        localStorage.setItem('voisshield_user_dls_data', JSON.stringify(updated));
      } else {
        const newList = {
          UserListsID: `UL-${Date.now().toString().slice(-5)}`,
          UserListName: cohortName.trim(),
          UploadType: 'Bulk Upload',
          UserListsDescription: description.trim() || 'Uploaded target roster via spreadsheet.',
          TotalEmailIDsCount: loadedMembers.length,
          CreationDate: formattedNow,
          CreatedBy: userContext.userEmail || 'abhay.hs1@vodafone.com',
          LastModified: formattedTimestamp,
          LastModifiedBy: userContext.userEmail || 'abhay.hs1@vodafone.com',
          NumberofTimesUsed: 0,
          EMailIDs: loadedMembers.map((u) => u.email)
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
  const filteredMembers = useMemo(() => {
    return loadedMembers.filter(
      (u) =>
        u.userName.toLowerCase().includes(tableSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(tableSearch.toLowerCase()) ||
        u.department.toLowerCase().includes(tableSearch.toLowerCase()) ||
        u.location.toLowerCase().includes(tableSearch.toLowerCase())
    );
  }, [loadedMembers, tableSearch]);

  const maxDeptCount = useMemo(() => {
    return Math.max(...loadedDeptBreakdown.map((d) => d.count), 1);
  }, [loadedDeptBreakdown]);

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      {/* ========================================================================= */}
      {/* ── 🌟 LAYER 1: ORIGINAL SCREEN ROOT (LOCKED NON-SCROLLABLE SHEET) ──────── */}
      {/* ========================================================================= */}
      <div
        style={{ zoom: VarUserDLsScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 h-[calc(108vh-0px)] overflow-hidden"
      >
        {/* Top Header Bar: Clean Title (No Left Arrow) */}
        <div
          className={`w-full h-[40px] -mt-3 py-2.5 px-6 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${
            isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[13.5px] font-voda font-bold tracking-tight uppercase">
              Recipients Lists
            </h1>
          </div>

          <div className="text-[12px] font-voda font-bold opacity-85">
            -- {editId ? 'Edit Bulk Upload' : 'Bulk Upload via Excel / CSV Roster'}
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 LAYER 2: BIG WHITE CONTAINER DIV (SPLIT 70% / 30% COLUMNS) ───────── */}
        {/* ========================================================================= */}
        <div
          style={{
            height: typeof VarBiggerWhiteDivHeight === 'number' ? `${VarBiggerWhiteDivHeight}px` : VarBiggerWhiteDivHeight
          }}
          className={`w-full flex-1 min-h-0 rounded-2xl border p-3.5 flex gap-3 overflow-hidden shadow-xs transition-colors ${
            isDark ? 'bg-[#12141A] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          {/* ========================================================================= */}
          {/* ── 👈 LEFT WORKSPACE: INPUT (70%) + COLLAPSIBLE/EXPANDABLE TABLE (30%) ─── */}
          {/* ========================================================================= */}
          <div
            style={{
              width: varBulkDetailsInputSectionWidth,
              flex: `0 0 ${varBulkDetailsInputSectionWidth}`
            }}
            className="h-full flex flex-col gap-3 min-w-0 overflow-hidden"
          >
            {/* ── 1. FILE & BATCH DETAILS INPUT SECTION ── */}
            {!isTableMaximized && (
              <div
                style={{
                  height: `calc(${varBulkDetailsInputSectionHeight} - 6px)`,
                  backgroundColor: lCardBg,
                  borderRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`
                }}
                className="p-5 border border-black/0 dark:border-white/0 flex flex-col justify-between shadow-2xs transition-all overflow-visible flex-shrink-0 relative"
              >
                {/* Header: Excel Icon + Title */}
                <div className="flex items-center gap-2.5 pb-1 flex-shrink-0">
                  <img
                    src={ExcelIcon}
                    alt="Excel File Icon"
                    className="w-5 h-4 -mt-1 object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <img
                    src={CSVIcon}
                    alt="Excel File Icon"
                    className="w-4 h-4 -mt-1 object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                  <h3 className="text-[13px] font-voda font-bold text-slate-950 dark:text-white leading-tight -mt-1">
                    Fill Details and Upload Excel or CSV File
                  </h3>
                </div>

                {/* Hidden Native File Input */}
                <input
                  type="file"
                  ref={fileInputRef}
                  accept=".csv, .xlsx, .xls, text/csv"
                  onChange={handleFileSelection}
                  className="hidden"
                />

                {/* Field 1: Select the File with Right-Aligned "Download Template" and "Load" */}
                <div className="flex flex-col gap-1.5 flex-shrink-0 relative">
                  <div className="flex items-center justify-between">
                    <label className="text-[12px] font-voda mt-3 font-bold text-slate-900 dark:text-white">
                      Upload File (.csv / .xlsx)
                    </label>

                    <div className="flex items-center gap-2 mb-1">
                      {/* Download Template Button (Single Column "Email ID") */}
                      <button
                        type="button"
                        onClick={handleDownloadTemplate}
                        className="h-5 px-3 rounded-full bg-white dark:bg-black/40 hover:bg-slate-100 text-[#2E7D32] dark:text-[#4ADE80] text-[9.5px] font-voda font-bold tracking-tight shadow-xs border border-[#2E7D32]/30 transition-all cursor-pointer flex items-center gap-1 active:scale-95"
                        title="Download sample template with Email ID column"
                      >
                        <Download className="w-2.5 h-2.5" />
                        <span>Download Template</span>
                      </button>

                      {/* Load Action Button */}
                      <button
                        type="button"
                        onClick={handleLoad}
                        className="h-5 px-4 rounded-full bg-[#181A20] hover:bg-black text-white text-[10px] font-voda font-bold tracking-tight shadow-xs transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
                      >
                        <span>Load</span>
                        <RefreshCw className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Interactive File Picker Box */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-8 px-3.5 pr-4 rounded-2xl bg-white dark:bg-[#12141A] text-slate-900 dark:text-white text-[11px] font-bold flex items-center justify-between cursor-pointer border border-black/5 dark:border-white/10 shadow-2xs select-none hover:border-black/20 transition-colors"
                  >
                    <span className={uploadedFileName ? 'text-slate-900 dark:text-white font-bold truncate' : 'text-slate-400 font-medium'}>
                      {uploadedFileName || 'Choose spreadsheet file (.csv, .xlsx)...'}
                    </span>
                    <span className="px-2 py-0.5 rounded-lg bg-[#EEF2F6] dark:bg-white/10 text-slate-700 dark:text-slate-300 text-[9px] font-bold flex items-center gap-1 flex-shrink-0">
                      <Upload className="w-2.5 h-2.5" /> Browse
                    </span>
                  </div>
                </div>

                {/* Field 2: Name */}
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <label className="text-[12px] mt-2 font-voda font-bold text-slate-900 dark:text-white">
                    Name
                  </label>
                  <input
                    type="text"
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                    placeholder="Type here"
                    className="w-full h-8 px-3.5 rounded-2xl bg-white dark:bg-[#12141A] text-slate-900 dark:text-white text-[11px] font-bold outline-none border border-black/5 dark:border-white/10 shadow-2xs placeholder-slate-400"
                  />
                </div>

                {/* Field 3: Description */}
                <div className="flex flex-col gap-1.5 flex-1 min-h-0">
                  <label className="text-[12px] mt-2 font-voda font-bold text-slate-900 dark:text-white">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Type here"
                    className="w-full flex-1 p-3 rounded-2xl bg-white dark:bg-[#12141A] text-slate-900 dark:text-white text-[11px] font-bold outline-none border border-black/5 dark:border-white/10 shadow-2xs placeholder-slate-400 resize-none"
                  />
                </div>

                {/* Bottom Action Buttons: Go Back (Dark Gray) & Save & Submit (Sage Green) */}
                <div className="flex items-center justify-end gap-2.5 pt-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => navigate('/user-dls')}
                    className="h-6 px-6 -mb-1 mt-1 rounded-2xl bg-[#3D3F45] hover:bg-[#2C2E34] text-white text-[10px] font-voda font-bold tracking-tight shadow-xs transition-all cursor-pointer active:scale-95"
                  >
                    Go Back
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isLoaded}
                    className={`h-6 px-6 -mb-1 mt-1 rounded-2xl text-[10px] font-voda font-bold tracking-tight shadow-xs transition-all cursor-pointer active:scale-95 ${
                      isLoaded
                        ? 'bg-[#8ED973] hover:bg-[#7DC862] text-white'
                        : 'bg-[#8ED973]/50 text-white/70 cursor-not-allowed opacity-60'
                    }`}
                  >
                    Save & Submit
                  </button>
                </div>
              </div>
            )}

            {/* ── 2. ALL USERS TABLE VIEW SECTION (HEIGHT: 40% OR 100% WHEN EXPANDED) ── */}
            <div
              style={{
                height: isTableMaximized ? '100%' : `calc(${varBulkAllUsersTableViewSectionHeight} - 6px)`,
                borderRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`
              }}
              className="w-full p-3.5 bg-black flex flex-col gap-2 overflow-hidden border border-black/5 dark:border-white/15 transition-all shadow-md"
            >
              {/* Header Controls with Upward Expand Option */}
              <div className="flex items-center justify-between pb-1.5 border-b border-white/10 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-3.5 rounded-full bg-[#E60000]" />
                  <h3 className="text-[12px] font-voda font-bold uppercase tracking-tight text-white">
                    Every user by user ({filteredMembers.length} records)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {/* Search Bar */}
                  <div className="px-2.5 py-0.5 rounded-lg border border-white/10 bg-white dark:bg-[#12141A] flex items-center gap-1.5 shadow-2xs">
                    <Search className="w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={tableSearch}
                      onChange={(e) => setTableSearch(e.target.value)}
                      placeholder="Search Email ID, User Name, Department..."
                      className="w-60 bg-transparent text-[9.5px] font-bold text-slate-900 dark:text-white outline-none placeholder-slate-400"
                    />
                  </div>

                  {/* Upward Arrow Expand Option */}
                  <button
                    type="button"
                    onClick={() => setIsTableMaximized(!isTableMaximized)}
                    className="p-1 rounded text-slate-300 hover:text-white hover:bg-white/10 cursor-pointer transition-colors"
                    title={isTableMaximized ? 'Collapse back to default size' : 'Expand table upward'}
                  >
                    {isTableMaximized ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Scrollable Table View with Unregistered "i" Badge & Delete Option */}
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredMembers.length === 0 ? (
                  <div className="h-full flex items-center justify-center p-6 text-center text-slate-400 text-xs italic">
                    No user records staged. Choose a spreadsheet file above and click LOAD.
                  </div>
                ) : (
                  <table className="w-full text-left text-[10.5px]">
                    <thead>
                      <tr className="border-b border-white/10 text-[9.5px] uppercase font-voda font-bold text-slate-400 bg-white/[0.02]">
                        <th className="py-1.5 px-3">SR NO.</th>
                        <th className="py-1.5 px-3">USER NAME</th>
                        <th className="py-1.5 px-3">EMAIL ID</th>
                        <th className="py-1.5 px-3">DEPARTMENT</th>
                        <th className="py-1.5 px-3">LOCATION</th>
                        <th className="py-1.5 px-3 text-center">HOOK RATE %</th>
                        <th className="py-1.5 px-3 text-center">REPORT RATE %</th>
                        <th className="py-1.5 px-3 text-center">DELETE</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredMembers.map((user) => (
                        <tr
                          key={user.email}
                          className="border-b border-white/5 hover:bg-white/[0.04] transition-colors"
                        >
                          <td className="py-1.5 px-3 text-slate-400 font-bold">{user.srNo}</td>
                          <td className="py-1.5 px-3 font-bold flex items-center gap-1.5 text-white">
                            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                              user.isUnregistered ? 'bg-[#E60000]/25 text-[#FF8595]' : 'bg-white/10 text-slate-300'
                            }`}>
                              <UserIcon className="w-3 h-3" />
                            </div>
                            <span>{user.userName}</span>
                          </td>
                          <td className="py-1.5 px-3 text-slate-300 font-bold">{user.email}</td>
                          <td className="py-1.5 px-3 text-slate-300 font-bold">
                            <span className={user.isUnregistered ? 'text-amber-400/90 italic' : ''}>
                              {user.department}
                            </span>
                          </td>
                          <td className="py-1.5 px-3 font-bold text-slate-200">{user.location}</td>
                          <td className="py-1.5 px-3 text-center font-bold text-[#FF4D4D]">{user.hookRate}</td>
                          <td className="py-1.5 px-3 text-center font-bold text-[#4ADE80]">
                            {user.reportRate}
                          </td>
                          
                          {/* Actions Column: Red "i" Mark (If Unregistered) + Trash Delete Button */}
                          <td className="py-1.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {user.isUnregistered && (
                                <div
                                  className="relative group inline-flex items-center justify-center cursor-help select-none"
                                  title="This email address is not registered in the Master User Directory and does not currently have access to VOISShield."
                                >
                                  <div className="w-4 h-4 rounded-full bg-[#E60000] text-white flex items-center justify-center text-[9px] font-bold shadow-xs">
                                    i
                                  </div>
                                  
                                  {/* Hover Floating Tooltip */}
                                  <div className="absolute right-full mr-2 top-1/2 -translate-y-1/2 hidden group-hover:flex z-50 w-56 p-2 rounded-xl bg-[#1C1F28] text-white text-[9px] font-medium leading-snug shadow-2xl border border-white/20 text-left pointer-events-none">
                                    This email address is not registered in the Master User Directory and does not currently have access to VOISShield.
                                  </div>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => handleDeleteMember(user.email, user.userName)}
                                className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-white/10 transition-colors cursor-pointer"
                                title={`Delete ${user.userName || user.email}`}
                              >
                                <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================================= */}
          {/* ── 👉 RIGHT WORKSPACE: RECIPIENTS SUMMARY (100% HEIGHT, 30% WIDTH) ─────── */}
          {/* ========================================================================= */}
          <div
            style={{
              width: VarListSummarySectionWidth,
              flex: `0 0 ${VarListSummarySectionWidth}`,
              height: VarListSummarySectionHeight,
              backgroundColor: lCardBg,
              borderRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`
            }}
            className="p-4 border border-black/0 dark:border-white/0 flex flex-col justify-between gap-3 shadow-2xs transition-colors overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10 flex-shrink-0">
              <span className="text-[13px] font-voda font-bold text-slate-900 dark:text-white">
                Loaded Bulk Upload Summary
              </span>
              <span className="text-[11.5px] font-voda font-bold text-[#2E7D32] dark:text-[#4ADE80]">
                Total Users: {loadedMembers.length}
              </span>
            </div>

            {/* Risk Indicators Cards */}
            <div className="grid grid-cols-2 gap-2.5 flex-shrink-0">
              <div className="p-3 rounded-xl bg-[#FF4D4D]/10 border border-[#FF4D4D]/25 text-[#FF4D4D] flex flex-col items-center justify-center">
                <span className="text-[9px] font-voda font-bold uppercase">Aggregated Hook Rate</span>
                <span className="text-[18px] font-voda font-bold mt-0.5">{isLoaded ? loadedHookRate : '--'}</span>
              </div>

              <div className="p-3 rounded-xl bg-[#2E7D32]/10 border border-[#2E7D32]/25 text-[#2E7D32] dark:text-[#4ADE80] flex flex-col items-center justify-center">
                <span className="text-[9px] font-voda font-bold uppercase">Aggregated Report Rate</span>
                <span className="text-[18px] font-voda font-bold mt-0.5">{isLoaded ? loadedReportRate : '--'}</span>
              </div>
            </div>

            {/* Horizontal Rounded-Edged Progress Bars for Departments */}
            <div className="flex-1 min-h-0 flex flex-col gap-2 pt-2 border-t border-black/10 dark:border-white/10 overflow-hidden">
              <span className="text-[11px] font-voda font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight flex-shrink-0">
                Department Distribution Breakdown
              </span>

              <div className="flex-1 min-h-0 overflow-y-auto pr-1.5 flex flex-col gap-2.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                {loadedDeptBreakdown.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-center text-slate-400 text-xs italic">
                    No summary loaded yet. Select a file above and click LOAD.
                  </div>
                ) : (
                  loadedDeptBreakdown.map((dept, idx) => {
                    const percentage = Math.round((dept.count / maxDeptCount) * 100);
                    return (
                      <div key={idx} className="flex flex-col gap-1 w-full bg-white dark:bg-[#12141A] p-2.5 rounded-xl border border-black/5 dark:border-white/10 shadow-2xs">
                        <div className="flex items-center justify-between text-[10px] font-bold">
                          <span className="text-slate-900 dark:text-slate-100 truncate">{dept.dept}</span>
                          <span className="text-[#E60000] font-voda font-bold flex-shrink-0">{dept.count} users</span>
                        </div>
                        {/* Rounded Edged Horizontal Bar */}
                        <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-white/10 overflow-hidden">
                          <div
                            style={{ width: `${percentage}%` }}
                            className="h-full rounded-full bg-[#E60000] transition-all duration-300"
                          />
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-xl bg-[#2E7D32] text-white text-xs font-voda font-bold shadow-xl flex items-center gap-2">
            <Check className="w-4 h-4 stroke-[3]" />
            {toastMessage}
          </div>
        )}

        {/* ── 🌟 SCREEN TOP-RIGHT CORNER TOASTER (PORTAL) ── */}
        {deletedSuccessMsg &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed top-5 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-slate-900 border border-emerald-500/30 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-[#16A34A] flex items-center justify-center flex-shrink-0">
                <Check className="w-4 h-4 stroke-[2.5]" />
              </div>
              <div className="flex flex-col text-left leading-tight flex-1">
                <span className="text-[10px] font-voda font-bold text-[#16A34A] uppercase tracking-wider">
                  Success
                </span>
                <span className="text-[9.5px] font-medium text-slate-700 mt-0.5">
                  {deletedSuccessMsg}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setDeletedSuccessMsg('')}
                className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer flex-shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>,
            document.body
          )}
      </div>
    </>
  );
};

export default UserListViaBulkUpload;