import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Search,
  Check,
  Upload,
  Download,
  User as UserIcon,
  FileSpreadsheet
} from 'lucide-react';
import { api } from '../../services/api';

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

const UserListViaBulkUpload = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editId = searchParams.get('edit');
  const userContext = useUserType?.() || {};
  const fileInputRef = useRef(null);

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

  // Form States
  const [cohortName, setCohortName] = useState('');
  const [description, setDescription] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  // Raw file kept so it can be uploaded to S3 (the parsed rows are preview-only).
  const [selectedFile, setSelectedFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Staged Telemetry States
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadedMembers, setLoadedMembers] = useState([]);
  const [loadedDeptBreakdown, setLoadedDeptBreakdown] = useState([]);
  const [loadedHookRate, setLoadedHookRate] = useState('14.2%');
  const [loadedReportRate, setLoadedReportRate] = useState('58.4%');

  // Table Controls
  const [tableSearch, setTableSearch] = useState('');
  const [isTableExpanded, setIsTableExpanded] = useState(true);
  const [toastMessage, setToastMessage] = useState('');

  // Pre-load the cohort being edited from the backend.
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
          setLoadedDeptBreakdown(target.departmentBreakdown || []);
          setLoadedHookRate(target.aggregatedHookRate || '14.2%');
          setLoadedReportRate(target.aggregatedReportRate || '58.4%');
        }
        setLoadedMembers(Array.isArray(members) ? members : []);
        setIsLoaded(true);
      })
      .catch((e) => console.error('Failed to load cohort for editing', e));
    return () => {
      active = false;
    };
  }, [editId]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const headers = 'User Name,Email ID,Department,Location\n';
    const sampleRows = [
      'Abhay H S,abhay.hs1@vodafone.com,AI & Data Analytics,INDIA',
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

  // Turn parsed rows into the preview table + a normalised CSV file for upload.
  const applyRows = (rows, originalName) => {
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

    const deptMap = {};
    let skipped = 0;
    const parsedUsers = [];
    nonEmpty.slice(1).forEach((cols) => {
      const val = (i) => (i >= 0 ? String(cols[i] ?? '').trim() : '');
      const email = val(idx.email);
      // Rows without an email are dropped — the backend drops them too, and we
      // must never invent recipient addresses.
      if (!email) {
        skipped += 1;
        return;
      }
      const department = val(idx.department) || 'Unspecified';
      deptMap[department] = (deptMap[department] || 0) + 1;
      parsedUsers.push({
        srNo: parsedUsers.length + 1,
        userName: val(idx.userName),
        email,
        department,
        location: val(idx.location),
        hookRate: '—',
        reportRate: '—'
      });
    });

    if (parsedUsers.length === 0) {
      showToast('No rows with an email address were found');
      return;
    }

    // Normalised CSV is what gets uploaded, so Excel and CSV take one code path.
    const csv = [
      CSV_HEADERS.join(','),
      ...parsedUsers.map((u) =>
        [u.userName, u.email, u.department, u.location].map(csvCell).join(',')
      )
    ].join('\n');
    const csvName = originalName.replace(/\.[^/.]+$/, '') + '.csv';
    setSelectedFile(new File([csv], csvName, { type: 'text/csv' }));

    setLoadedMembers(parsedUsers);
    setLoadedDeptBreakdown(
      Object.entries(deptMap).map(([dept, count]) => ({ dept, count }))
    );
    setIsLoaded(true);

    if (!cohortName) {
      setCohortName(originalName.replace(/\.[^/.]+$/, '').replace(/_/g, ' '));
    }
    showToast(
      `Parsed ${parsedUsers.length} recipients` +
        (skipped ? ` (${skipped} row(s) skipped — no email)` : '!')
    );
  };

  // Parse Uploaded File (.csv or .xlsx)
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setSelectedFile(null);
    const ext = (file.name.split('.').pop() || '').toLowerCase();

    try {
      if (ext === 'xlsx') {
        // Lazy-loaded so the spreadsheet parser stays out of the main bundle.
        // The package only exposes subpath exports; /browser is the web build.
        const readXlsxFile = (await import('read-excel-file/browser')).default;
        const raw = await readXlsxFile(file);
        // Depending on version this returns either rows ([[...]]) or a list of
        // sheets ([{ sheet, data: [[...]] }]). Normalise to the first sheet's rows.
        const rows =
          Array.isArray(raw) && raw.length && raw[0] && Array.isArray(raw[0].data)
            ? raw[0].data
            : raw;
        applyRows(rows, file.name);
      } else if (ext === 'csv') {
        const text = await file.text();
        applyRows(
          text.split(/\r?\n/).map(splitCsvLine),
          file.name
        );
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

  // Save Action
  const handleSave = async () => {
    if (!cohortName.trim()) {
      showToast('Please enter a Cohort Name');
      return;
    }
    if (!isLoaded || loadedMembers.length === 0) {
      showToast('No user records staged. Please select a template file first!');
      return;
    }

    const name = cohortName.trim();
    const desc = description.trim() || 'Custom user cohort uploaded via spreadsheet file.';

    try {
      setIsSaving(true);

      if (selectedFile) {
        // Upload the raw file to S3, then ingest it server-side.
        // Passing editId replaces that list in place instead of duplicating it.
        showToast('Uploading recipient list...');
        const saved = await api.userLists.upload({
          name,
          description: desc,
          file: selectedFile,
          listId: editId || undefined
        });
        showToast(`Saved '${name}' with ${saved?.totalUsers ?? loadedMembers.length} recipients!`);
      } else if (editId) {
        // Editing metadata only (no new file staged).
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
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 overflow-hidden"
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
            -- {editId ? 'Edit Bulk Upload' : 'Bulk Upload via Excel / CSV Roster'}
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
            Upload custom spreadsheet lists (.csv, .xlsx) with recipient headers (User Name, Email ID, Department, Location) to automatically stage members and evaluate simulated vulnerabilities.
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
          {/* ── TOP ROW: [EMAIL-IDs STYLE FORM (7 COLS)] + [TELEMETRY DASHBOARD (5 COLS)] ── */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 flex-shrink-0 items-stretch">
            
            {/* 🌟 LEFT: CLEAN FORM CONTAINER (7 COLS) */}
            <div className="lg:col-span-7 flex flex-col justify-between gap-2.5">
              
              {/* ROW 1: USER LIST NAME & TEMPLATE FILE PICKER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                
                {/* Field 1: User List Name */}
                <div
                  className={`p-3 rounded-2xl border flex flex-col justify-between gap-1.5 ${
                    isDark ? 'bg-[#1F2128] border-white/5' : 'bg-[#F1F4F9] border-slate-200/90'
                  }`}
                >
                  <div>
                    <h3 className="text-[13px] font-voda-exb text-slate-900 dark:text-white leading-tight">
                      User List Name
                    </h3>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
                      Enter the name or batch identifier of the user list
                    </p>
                  </div>

                  <div
                    className={`w-full h-9 px-3 rounded-xl border flex items-center shadow-2xs ${
                      isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200/80'
                    }`}
                  >
                    <input
                      type="text"
                      value={cohortName}
                      onChange={(e) => setCohortName(e.target.value)}
                      placeholder="Type here.."
                      className="w-full bg-transparent text-[11px] font-medium outline-none placeholder-slate-400 text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Field 2: Upload CSV / Excel File with Integrated Download */}
                <div
                  className={`p-3 rounded-2xl border flex flex-col justify-between gap-1.5 ${
                    isDark ? 'bg-[#1F2128] border-white/5' : 'bg-[#F1F4F9] border-slate-200/90'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-[13px] font-voda-exb text-slate-900 dark:text-white leading-tight">
                        Template File (.csv / .xlsx)
                      </h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
                        Choose local file or download sample CSV
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      className="px-2 py-0.5 rounded-lg text-[9px] font-bold bg-[#2E7D32]/15 text-[#2E7D32] dark:text-[#4ADE80] border border-[#2E7D32]/30 hover:bg-[#2E7D32]/25 transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Download className="w-2.5 h-2.5" />
                      Template
                    </button>
                  </div>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".csv,.xlsx"
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full h-9 px-3 rounded-xl border flex items-center justify-between shadow-2xs cursor-pointer transition-all ${
                      uploadedFileName
                        ? 'border-[#2E7D32] bg-[#2E7D32]/10 text-[#2E7D32] dark:text-[#4ADE80]'
                        : isDark
                        ? 'bg-[#15161A] border-white/10 text-slate-400 hover:border-white/20'
                        : 'bg-white border-slate-200/80 text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <span className={`text-[11px] font-medium truncate ${uploadedFileName ? 'text-slate-900 dark:text-white font-semibold' : ''}`}>
                      {uploadedFileName || 'Type or choose file..'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-slate-700 dark:text-slate-200 text-[9px] font-bold flex items-center gap-1 flex-shrink-0">
                      <Upload className="w-2.5 h-2.5" /> Browse
                    </span>
                  </div>
                </div>

              </div>

              {/* ROW 2: DESCRIPTION (Spacious Card) */}
              <div
                className={`p-3 rounded-2xl border flex flex-col justify-between gap-1.5 ${
                  isDark ? 'bg-[#1F2128] border-white/5' : 'bg-[#F1F4F9] border-slate-200/90'
                }`}
              >
                <div>
                  <h3 className="text-[13px] font-voda-exb text-slate-900 dark:text-white leading-tight">
                    Description
                  </h3>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium -mt-0.5">
                    Provide purpose, target cohort details, or department focus
                  </p>
                </div>

                <div
                  className={`w-full h-11 px-3 py-1.5 rounded-xl border shadow-2xs ${
                    isDark ? 'bg-[#15161A] border-white/10' : 'bg-white border-slate-200/80'
                  }`}
                >
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Type here.."
                    className="w-full h-full bg-transparent text-[11px] font-medium outline-none placeholder-slate-400 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* ROW 3: CENTERED RECTANGULAR SAVE & SUBMIT BUTTON */}
              <div className="flex items-center justify-center pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!isLoaded || loadedMembers.length === 0 || isSaving}
                  className={`px-8 py-2 rounded-xl text-[12px] font-voda-exb uppercase tracking-wider shadow-sm transition-all cursor-pointer ${
                    isLoaded && loadedMembers.length > 0 && !isSaving
                      ? 'bg-[#15171C] text-white hover:bg-black hover:scale-[1.02]'
                      : 'bg-[#15171C]/60 text-white/40 cursor-not-allowed'
                  }`}
                >
                  SAVE & SUBMIT
                </button>
              </div>

            </div>

            {/* 🌟 RIGHT: RESTORED TELEMETRY DASHBOARD CARD (5 COLS) */}
            <div
              className={`lg:col-span-5 p-3.5 rounded-2xl border flex flex-col justify-between gap-2 ${
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
                    No spreadsheet loaded yet. Select a CSV/Excel file to auto-parse departments.
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

          {/* ── 🌟 BOTTOM RESTORED USER TABLE: "EVERY USER BY USER" (Fills remaining height) ── */}
          <div
            className={`p-3.5 rounded-2xl border flex flex-col gap-2.5 flex-1 min-h-[220px] ${
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
              <div className="flex-1 min-h-0 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredMembers.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400 text-xs italic">
                    <FileSpreadsheet className="w-8 h-8 opacity-25 mb-1 text-slate-400" />
                    No spreadsheet staged yet. Select a CSV/Excel file above to view parsed user records.
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

export default UserListViaBulkUpload;