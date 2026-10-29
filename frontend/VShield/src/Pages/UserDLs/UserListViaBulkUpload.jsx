import { useState, useEffect, useMemo, useRef } from 'react';
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
  X
} from 'lucide-react';

import ExcelIcon from '../../assets/UserListScreenAssets/ExcelIconUserListsScreen.png';
import CSVIcon from '../../assets/UserListScreenAssets/CSVIconUserListsScreen.png';
import { api } from '../../services/api';
import { DEMO_USER } from '../../appConfig';
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
  // The chosen file, parsed when LOAD is clicked
  const [pendingFile, setPendingFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Staged User List States
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedMembers, setLoadedMembers] = useState([]);
  const [loadedDeptBreakdown, setLoadedDeptBreakdown] = useState([]);
  const [loadedHookRate, setLoadedHookRate] = useState('0.0%');
  const [loadedReportRate, setLoadedReportRate] = useState('0.0%');
  // Members differ from what is stored (a file was loaded or a row removed),
  // so saving uploads them; otherwise saving an edit only renames it.
  const [membersChanged, setMembersChanged] = useState(false);

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

  // A recipient row, completed from the people directory (MasterUserData.json):
  // blanks in the file take the directory's values, and people who are not in
  // the directory are flagged as unregistered.
  const resolveMember = (row, idx) => {
    const email = String(row.email || '').trim();
    const matched = (masterUsersData || []).find(
      (m) => m.UserEMailID?.toLowerCase() === email.toLowerCase()
    );
    return {
      srNo: idx + 1,
      userName: row.userName || matched?.UserName || email.split('@')[0],
      email,
      department: row.department || matched?.Department || 'Unregistered',
      location: (row.location || matched?.Country || 'N/A').toUpperCase(),
      hookRate: matched?.['HookRate%'] !== undefined ? `${matched['HookRate%']}%` : '—',
      reportRate: matched?.['ReportRate%'] !== undefined ? `${matched['ReportRate%']}%` : '—',
      isUnregistered: !matched
    };
  };

  // Calculate telemetry metrics and department breakdown from members list
  const computeMetrics = (membersList = []) => {
    const deptCounts = {};
    membersList.forEach((u) => {
      deptCounts[u.department] = (deptCounts[u.department] || 0) + 1;
    });
    setLoadedDeptBreakdown(Object.entries(deptCounts).map(([dept, count]) => ({ dept, count })));

    // Rates come from the directory, so only registered members count
    const registeredOnly = membersList.filter((m) => !m.isUnregistered);
    if (registeredOnly.length > 0) {
      const avg = (key) => (registeredOnly.reduce((acc, u) => acc + parseFloat(u[key]), 0) / registeredOnly.length).toFixed(1);
      setLoadedHookRate(`${avg('hookRate')}%`);
      setLoadedReportRate(`${avg('reportRate')}%`);
    } else {
      setLoadedHookRate('0.0%');
      setLoadedReportRate('0.0%');
    }
  };

  // Pre-load the list being edited from the backend.
  useEffect(() => {
    if (!editId) return;
    let active = true;
    Promise.all([api.userLists.list(), api.userLists.members(editId)])
      .then(([rows, members]) => {
        if (!active) return;
        const target = (Array.isArray(rows) ? rows : []).find(
          (l) => (l.userListId || l.id || l.dlId) === editId
        );
        if (target) {
          setCohortName(target.name || target.dlName || '');
          setDescription(target.description || '');
          setUploadedFileName(target.s3Key ? target.s3Key.split('/').pop() : 'Existing_Cohort.csv');
        }
        const resolved = (Array.isArray(members) ? members : []).map(resolveMember);
        setLoadedMembers(resolved);
        computeMetrics(resolved);
        setIsLoaded(true);
      })
      .catch((e) => console.error('Failed to load cohort for editing', e));
    return () => {
      active = false;
    };
  }, [editId]);

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const headers = 'User Name,Email ID,Department,Location\n';
    const sampleRows = [
      `${DEMO_USER.name},${DEMO_USER.email},AI & Data Analytics,INDIA`,
      'Trevor Sile,trevor.sile@vodafone.com,CARE,UK',
      'Mitin Rinis,mitin.rinis@vodafone.com,Finance,UK',
      'Sarah Jenkins,sarah.jenkins@vodafone.com,Finance,GERMANY',
      'Karim Mostafa,karim.mostafa@vodafone.com,Supply Chain Management,EGYPT'
    ].join('\n');

    const blob = new Blob([headers + sampleRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'VOISShield_UserList_Template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Downloaded sample template (.csv)');
  };

  // Canonical column order the backend ingest expects.
  const CSV_HEADERS = ['User Name', 'Email ID', 'Department', 'Location'];

  // Match the header row case-insensitively, tolerating a few common spellings.
  const columnIndexes = (header) => {
    const find = (...names) =>
      header.findIndex((h) => names.includes(String(h || '').trim().toLowerCase()));
    return {
      userName: find('user name', 'name', 'username'),
      email: find('email id', 'email', 'email address'),
      department: find('department', 'dept'),
      location: find('location', 'country')
    };
  };

  const csvCell = (v) => {
    const s = String(v ?? '').trim();
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  // Split a CSV line honouring quoted fields (so "Smith, John" stays one cell).
  const splitCsvLine = (line) => {
    const out = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i += 1) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"';
          i += 1;
        } else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        out.push(cur);
        cur = '';
      } else cur += ch;
    }
    out.push(cur);
    return out.map((c) => c.trim());
  };

  // Turn parsed rows into the staged members (preview table and summary).
  const applyRows = (rows) => {
    const nonEmpty = rows.filter((r) => r.some((c) => String(c ?? '').trim() !== ''));
    if (nonEmpty.length <= 1) {
      showToast('File appears empty or missing data rows');
      return;
    }

    const idx = columnIndexes(nonEmpty[0]);
    if (idx.email === -1) {
      showToast("Missing an 'Email ID' column. Use the sample template.");
      return;
    }

    let skipped = 0;
    const parsedRows = [];
    nonEmpty.slice(1).forEach((cols) => {
      const val = (i) => (i >= 0 ? String(cols[i] ?? '').trim() : '');
      const email = val(idx.email);
      // Rows without an email are dropped — the backend drops them too, and we
      // must never invent recipient addresses.
      if (!email) {
        skipped += 1;
        return;
      }
      parsedRows.push({
        userName: val(idx.userName),
        email,
        department: val(idx.department),
        location: val(idx.location)
      });
    });

    if (parsedRows.length === 0) {
      showToast('No rows with an email address were found');
      return;
    }

    const resolved = parsedRows.map(resolveMember);
    setLoadedMembers(resolved);
    computeMetrics(resolved);
    setMembersChanged(true);
    setIsLoaded(true);

    const unregisteredCount = resolved.filter((m) => m.isUnregistered).length;
    showToast(
      `Loaded ${resolved.length} recipients` +
        (unregisteredCount ? ` (${unregisteredCount} unregistered)` : '') +
        (skipped ? ` — ${skipped} row(s) skipped, no email` : '')
    );
  };

  // Choose a file (.csv or .xlsx); LOAD parses it
  const handleFileSelection = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setPendingFile(file);
    setIsLoaded(false);
    if (!cohortName) {
      setCohortName(file.name.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' '));
    }
    showToast(`Selected "${file.name}". Click LOAD to evaluate.`);
  };

  // Load Action: parse the chosen file and stage its rows
  const handleLoad = async () => {
    if (!pendingFile) {
      showToast('Please select an Excel or CSV file first!');
      return;
    }
    const ext = (pendingFile.name.split('.').pop() || '').toLowerCase();

    try {
      if (ext === 'xlsx') {
        // Lazy-loaded so the spreadsheet parser stays out of the main bundle.
        // The package only exposes subpath exports; /browser is the web build.
        const readXlsxFile = (await import('read-excel-file/browser')).default;
        const raw = await readXlsxFile(pendingFile);
        // Depending on version this returns either rows ([[...]]) or a list of
        // sheets ([{ sheet, data: [[...]] }]). Normalise to the first sheet's rows.
        const rows =
          Array.isArray(raw) && raw.length && raw[0] && Array.isArray(raw[0].data)
            ? raw[0].data
            : raw;
        applyRows(rows);
      } else if (ext === 'csv') {
        const text = await pendingFile.text();
        applyRows(text.split(/\r?\n/).map(splitCsvLine));
      } else if (ext === 'xls') {
        showToast('Legacy .xls is not supported — save as .xlsx or .csv');
      } else {
        showToast('Unsupported file type. Please upload .csv or .xlsx');
      }
    } catch (err) {
      console.error('Failed to read file', err);
      showToast('Could not read that file. Please check the format.');
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
    setMembersChanged(true);

    // Trigger floating success toaster
    setDeletedSuccessMsg(`Recipient ${userName || emailToDelete} removed successfully`);
    setTimeout(() => setDeletedSuccessMsg(''), 3000);
  };

  // Save Action
  const handleSave = async () => {
    if (!cohortName.trim()) {
      showToast('Please enter a Name for this list');
      return;
    }
    if (!isLoaded || loadedMembers.length === 0) {
      showToast('No user records staged. Click LOAD first!');
      return;
    }

    const name = cohortName.trim();
    const desc = description.trim() || 'Custom user cohort uploaded via spreadsheet file.';

    try {
      setIsSaving(true);

      if (membersChanged) {
        // The staged members as a normalised CSV (so Excel, CSV and removed
        // rows take one path), uploaded to S3 and ingested server-side.
        // Passing editId replaces that list in place instead of duplicating it.
        const csv = [
          CSV_HEADERS.join(','),
          ...loadedMembers.map((u) =>
            [u.userName, u.email, u.isUnregistered ? '' : u.department, u.location === 'N/A' ? '' : u.location]
              .map(csvCell)
              .join(',')
          )
        ].join('\n');
        const csvName = (uploadedFileName || name).replace(/\.[^/.]+$/, '') + '.csv';
        showToast('Uploading recipient list...');
        const saved = await api.userLists.upload({
          name,
          description: desc,
          file: new File([csv], csvName, { type: 'text/csv' }),
          listId: editId || undefined
        });
        showToast(`Saved '${name}' with ${saved?.totalUsers ?? loadedMembers.length} recipients!`);
      } else if (editId) {
        // Editing metadata only (members unchanged).
        await api.userLists.update(editId, { name, description: desc });
        showToast(`Updated '${name}' successfully!`);
      } else {
        setIsSaving(false);
        showToast('Please select a file to upload');
        return;
      }

      setTimeout(() => {
        navigate('/user-dls');
      }, 700);
    } catch (e) {
      setIsSaving(false);
      console.error(e);
      showToast(e?.message || 'Could not save the user list. Please try again.');
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
                    disabled={!isLoaded || isSaving}
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