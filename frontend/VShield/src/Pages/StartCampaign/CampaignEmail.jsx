import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import {
  Check,
  ChevronDown,
  RotateCw,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Image as ImageIcon,
  Link as LinkIcon,
  Code,
  Palette,
  Maximize2,
  Minimize2,
  Search,
  AlertTriangle,
  X
} from 'lucide-react';
import { CAMPAIGN_STEPS } from './ChooseAScenario';
import { api } from '../../services/api';
import { useCampaignDraft } from '../../services/useCampaignDraft';
import userDLsJson from '../UserDLs/UserDLsData.json';
import scenariosJsonData from '../Scenarios/ScenariosData.json';
import masterUsersData from '../../MasterUserData.json';

// =========================================================================
// 🎛️ SCALE & THEME CONSTANTS (STRICTLY PRESERVED)
// =========================================================================
const VarStartCampaignScale = 0.93;
const VarOverallRoundednessScale = 0.5;

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

 /* 3D Flip Card Utilities */
 .perspective-1000 {
  perspective: 1000px;
  -webkit-perspective: 1000px;
 }
 .transform-style-preserve-3d {
  transform-style: preserve-3d;
  -webkit-transform-style: preserve-3d;
 }
 .backface-hidden {
  backface-visibility: hidden !important;
  -webkit-backface-visibility: hidden !important;
 }
 .rotate-y-180 {
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg);
 }

 /* Center-aligned Design Canvas Placeholder for ContentEditable */
 .rich-editor-canvas:empty::before {
  content: attr(data-placeholder);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  font-size: 13px;
  font-weight: 600;
  pointer-events: none;
  opacity: 0.65;
 }
`;

const CURRENT_STEP_NUMBER = 3; // Step 3: Campaign Email

// Essential Dynamic Email Variables
const FX_PARAMETERS = [
 { label: '@UserName', code: '{{userName}}', desc: 'Target user full name' },
 { label: '@UserEmailID', code: '{{email}}', desc: 'Target user email address' },
 { label: '@UserDepartment', code: '{{department}}', desc: 'Target user department' },
 { label: '@UserCountry', code: '{{country}}', desc: 'Target user work location' },
 { label: '@PhishLink', code: '{{phishLink}}', desc: 'Simulation trackable landing link' },
 { label: '@ManagerName', code: '{{managerName}}', desc: 'Target direct reporting manager' },
 { label: '@EmployeeID', code: '{{employeeId}}', desc: 'Corporate employee badge number' },
 { label: '@CurrentDate', code: '{{currentDate}}', desc: 'Simulation execution timestamp' }
];

const CampaignEmail = () => {
 const navigate = useNavigate();
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

 // Server-backed draft shared by every wizard step. It loads asynchronously, so
 // `serverDraft` is null on the first renders and `draft` stands in as empty.
 const { draft: serverDraft, update, flush } = useCampaignDraft();
 const draft = serverDraft || {};

 // Check if originated from "Start Fresh"
 const isStartFresh = draft.scenarioId === 'start-fresh' || draft.scenarioName === 'Start Fresh' || Boolean(draft.isStartFresh);

 // Base L-shape container color
 const lCardBg = isDark ? '#1C1E24' : '#F1F5F7';

 // Match scenario from ScenariosData.json based on draft.scenarioId
 const matchedScenario = (scenariosJsonData?.scenarios || []).find(
  (s) => s.scenarioId === draft.scenarioId
 ) || scenariosJsonData?.scenarios?.[0];

 // Unique list of sender email choices fetched from ScenariosData.json
 const availableSenderEmails = Array.from(
  new Set(
   (scenariosJsonData?.scenarios || [])
    .map((s) => s.senderEmailId)
    .filter(Boolean)
  )
 );

 // Recipient lists come from the API, so a list uploaded on the User Lists screen
 // is immediately targetable here. UserDLsData.json stays as the fallback while
 // the request is in flight, and if it fails or comes back empty.
 const [serverUserLists, setServerUserLists] = useState(null);

 useEffect(() => {
  let active = true;
  api.userLists
   .list()
   .then((rows) => {
    if (active && Array.isArray(rows)) setServerUserLists(rows);
   })
   .catch(() => {
    /* keep the bundled fallback below */
   });
  return () => {
   active = false;
  };
 }, []);

 // Member rows live on their own endpoint, so a list row carries counts only.
 const mappedServerLists = (serverUserLists || []).map((l) =>
  l.listType === 'SYNCED' || l.dlName
   ? {
      id: l.dlId || l.userListId,
      name: l.dlName,
      subText: l.dlId || l.description || '',
      type: 'Distribution List',
      totalUsers: l.totalUsers !== undefined ? l.totalUsers : (l.members ? l.members.length : 0),
      hookRate: l.aggregatedHookRate || '0%',
      reportRate: l.aggregatedReportRate || '0%',
      departmentBreakdown: l.departmentBreakdown || [],
      locationBreakdown: l.locationBreakdown || [],
      users: l.members || []
     }
   : {
      id: l.id || l.userListId,
      name: l.name,
      subText: l.dlId || l.description || '',
      type: l.type || 'Bulk Upload',
      totalUsers: l.totalUsers !== undefined ? l.totalUsers : (l.users ? l.users.length : 0),
      hookRate: l.aggregatedHookRate || '0%',
      reportRate: l.aggregatedReportRate || '0%',
      departmentBreakdown: l.departmentBreakdown || [],
      locationBreakdown: l.locationBreakdown || [],
      users: l.users || []
     }
 );

 // Dynamic User Lists directly from UserDLsData.json
 const bundledAvailableLists = [
  ...(userDLsJson?.savedUserLists || []).map((l) => ({
   id: l.id,
   name: l.name,
   subText: l.dlId || l.description || '',
   type: l.type || 'Bulk Upload',
   totalUsers: l.totalUsers !== undefined ? l.totalUsers : (l.users ? l.users.length : 0),
   hookRate: l.aggregatedHookRate || '0%',
   reportRate: l.aggregatedReportRate || '0%',
   departmentBreakdown: l.departmentBreakdown || [],
   locationBreakdown: l.locationBreakdown || [],
   users: l.users || []
  })),
  ...(userDLsJson?.syncedDistributionLists || []).map((l) => ({
   id: l.dlId,
   name: l.dlName,
   subText: l.dlId || l.description || '',
   type: 'Distribution List',
   totalUsers: l.totalUsers !== undefined ? l.totalUsers : (l.members ? l.members.length : 0),
   hookRate: l.aggregatedHookRate || '0%',
   reportRate: l.aggregatedReportRate || '0%',
   departmentBreakdown: l.departmentBreakdown || [],
   locationBreakdown: l.locationBreakdown || [],
   users: l.members || []
  }))
 ];

 const availableLists = mappedServerLists.length ? mappedServerLists : bundledAvailableLists;

 // Master Users sorted by Hook Rate % in descending order
 const sortedMasterUsers = [...(masterUsersData || [])].sort((a, b) => {
  const rateA = parseFloat(a['HookRate%'] ?? a.HookRate) || 0;
  const rateB = parseFloat(b['HookRate%'] ?? b.HookRate) || 0;
  return rateB - rateA;
 });

 // Form Fields Initialization
 //
 // The draft is fetched, so it cannot seed useState at mount. Each field is
 // therefore DERIVED from the draft and only overridden once the user edits it
 // (the setters keep their original names, so every call site is unchanged).
 // That preserves the original precedence — a value stored in the draft,
 // including an empty string, beats the scenario default — while making it
 // impossible for the arriving draft to clobber something already typed.
 const seedText = (value, fallback) => {
  if (!serverDraft) return '';
  return value !== undefined && value !== null ? value : fallback;
 };

 const [senderEmailIdEdit, setSenderEmailId] = useState(undefined);
 const senderEmailId =
  senderEmailIdEdit !== undefined
   ? senderEmailIdEdit
   : seedText(draft.senderEmailId, isStartFresh ? '' : (matchedScenario?.senderEmailId || ''));

 const [senderNameEdit, setSenderName] = useState(undefined);
 const senderName =
  senderNameEdit !== undefined
   ? senderNameEdit
   : seedText(draft.senderName, isStartFresh ? '' : (matchedScenario?.senderName || ''));

 const [emailSubjectEdit, setEmailSubject] = useState(undefined);
 const emailSubject =
  emailSubjectEdit !== undefined
   ? emailSubjectEdit
   : seedText(draft.emailSubject, isStartFresh ? '' : (matchedScenario?.emailSubject || ''));

 // Rich Text Editor State
 const initialContent = seedText(
  draft.emailBody,
  isStartFresh ? '' : (matchedScenario?.emailBody || '')
 );

 const [rawHtmlMode, setRawHtmlMode] = useState(false);
 const [rawHtmlCodeEdit, setRawHtmlCode] = useState(undefined);
 const rawHtmlCode = rawHtmlCodeEdit !== undefined ? rawHtmlCodeEdit : initialContent;
 const [isEditorExpanded, setIsEditorExpanded] = useState(false);
 const [showSubjectFxMenu, setShowSubjectFxMenu] = useState(false);
 const [showEditorFxMenu, setShowEditorFxMenu] = useState(false);

 const activeHtmlRef = useRef('');
 const editorCanvasRef = useRef(null);
 const imageInputRef = useRef(null);
 const subjectInputRef = useRef(null);
 const savedSelectionRef = useRef(null);

 const editorFxRef = useRef(null);
 const subjectFxRef = useRef(null);
 const userListDropdownRef = useRef(null);
 const singleUserDropdownRef = useRef(null);

 // Restore canvas HTML cleanly between visual mode and expand/unexpand toggles
 useLayoutEffect(() => {
  if (!rawHtmlMode && editorCanvasRef.current) {
   editorCanvasRef.current.innerHTML = activeHtmlRef.current || '';
  }
 }, [rawHtmlMode, isEditorExpanded]);

 // The body arrives with the draft, i.e. after mount, so paint it into the
 // contentEditable canvas exactly once — and never over something already typed.
 const bodySeededRef = useRef(false);
 useEffect(() => {
  if (bodySeededRef.current || !serverDraft) return;
  bodySeededRef.current = true;
  if (activeHtmlRef.current) return;
  activeHtmlRef.current = initialContent;
  if (!rawHtmlMode && editorCanvasRef.current) {
   editorCanvasRef.current.innerHTML = initialContent || '';
  }
 }, [serverDraft, initialContent, rawHtmlMode]);

 // Click outside listeners to close menus
 useEffect(() => {
  const handleClickOutside = (e) => {
   if (editorFxRef.current && !editorFxRef.current.contains(e.target)) {
    setShowEditorFxMenu(false);
   }
   if (subjectFxRef.current && !subjectFxRef.current.contains(e.target)) {
    setShowSubjectFxMenu(false);
   }
   if (userListDropdownRef.current && !userListDropdownRef.current.contains(e.target)) {
    setIsDropdownOpen(false);
   }
   if (singleUserDropdownRef.current && !singleUserDropdownRef.current.contains(e.target)) {
    setIsSingleUserDropdownOpen(false);
   }
  };
  document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
 }, []);

 // Lock Body Overflow when expanded fullscreen
 useEffect(() => {
  if (isEditorExpanded) {
   const prevBodyOverflow = document.body.style.overflow;
   document.body.style.overflow = 'hidden';
   return () => {
    document.body.style.overflow = prevBodyOverflow;
   };
  }
 }, [isEditorExpanded]);

 // User list state. The selection and its loaded flag live in the draft, so a
 // user returning to this step sees the list they had attached; `loadedData`
 // (the whole list with every user row) stays LOCAL — the server strips it.
 const [selectedListIdEdit, setSelectedListId] = useState(undefined);
 const selectedListId =
  selectedListIdEdit !== undefined ? selectedListIdEdit : (draft.selectedListId || '');
 const [isDropdownOpen, setIsDropdownOpen] = useState(false);
 const [isListLoadedEdit, setIsListLoaded] = useState(undefined);
 const [loadedData, setLoadedData] = useState(null);
 const membersFetchedRef = useRef(false);

 // Single user dropdown state from MasterUserData.json
 const [selectedSingleUser, setSelectedSingleUser] = useState(null);
 const [isSingleUserDropdownOpen, setIsSingleUserDropdownOpen] = useState(false);
 const [singleUserSearch, setSingleUserSearch] = useState('');

 const [errorMsg, setErrorMsg] = useState('');

 // Auto-dismiss top right toaster after 4 seconds
 useEffect(() => {
  if (errorMsg) {
   const timer = setTimeout(() => setErrorMsg(''), 4000);
   return () => clearTimeout(timer);
  }
 }, [errorMsg]);

 const currentSelectedList = availableLists.find((l) => l.id === selectedListId);

 // Restored as loaded only when the saved list still exists in the catalogue.
 const isListLoaded =
  isListLoadedEdit !== undefined
   ? isListLoadedEdit
   : Boolean(draft.isListLoaded && currentSelectedList);

 // Returning to this step: the draft remembers WHICH list was loaded but never
 // its rows, so pull the members back once to repopulate the breakdown charts.
 useEffect(() => {
  if (membersFetchedRef.current) return;
  if (!isListLoaded || loadedData || !currentSelectedList) return;
  membersFetchedRef.current = true;
  const list = currentSelectedList;
  api.userLists
   .members(list.id)
   .then((members) => {
    setLoadedData({
     ...list,
     users: Array.isArray(members) ? members : (list.users || [])
    });
   })
   .catch(() => {
    setLoadedData(list);
   });
 }, [isListLoaded, loadedData, currentSelectedList]);

 // Selection preservation using cloneRange so blur does not destroy range
 const saveSelection = () => {
  if (window.getSelection) {
   const sel = window.getSelection();
   if (sel.getRangeAt && sel.rangeCount > 0) {
    savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
   }
  }
 };

 const restoreSelection = () => {
  if (savedSelectionRef.current && window.getSelection) {
   const sel = window.getSelection();
   sel.removeAllRanges();
   sel.addRange(savedSelectionRef.current.cloneRange());
  }
 };

 // Execute formatting command with guaranteed selection restore
 const runCommand = (command, value = null) => {
  if (rawHtmlMode) return;
  if (editorCanvasRef.current) {
   editorCanvasRef.current.focus();
   restoreSelection();
   document.execCommand(command, false, value);
   activeHtmlRef.current = editorCanvasRef.current.innerHTML;
   setRawHtmlCode(activeHtmlRef.current);
   update({ emailBody: activeHtmlRef.current });
   saveSelection();
  }
 };

 // Format Block with focus restoration
 const handleFormatBlock = (blockTag) => {
  if (editorCanvasRef.current) {
   editorCanvasRef.current.focus();
   restoreSelection();
   document.execCommand('formatBlock', false, blockTag);
   activeHtmlRef.current = editorCanvasRef.current.innerHTML;
   setRawHtmlCode(activeHtmlRef.current);
   update({ emailBody: activeHtmlRef.current });
   saveSelection();
  }
 };

 // Font Family with focus restoration
 const handleFontFamily = (fontName) => {
  if (editorCanvasRef.current) {
   editorCanvasRef.current.focus();
   restoreSelection();
   document.execCommand('fontName', false, fontName);
   activeHtmlRef.current = editorCanvasRef.current.innerHTML;
   setRawHtmlCode(activeHtmlRef.current);
   update({ emailBody: activeHtmlRef.current });
   saveSelection();
  }
 };

 // Font Size with focus restoration
 const handleFontSize = (sizeVal) => {
  if (editorCanvasRef.current) {
   editorCanvasRef.current.focus();
   restoreSelection();
   document.execCommand('fontSize', false, sizeVal);
   activeHtmlRef.current = editorCanvasRef.current.innerHTML;
   setRawHtmlCode(activeHtmlRef.current);
   update({ emailBody: activeHtmlRef.current });
   saveSelection();
  }
 };

 // Insert fx parameter into Rich Editor at exact caret position
 const insertFxToEditor = (param) => {
  setShowEditorFxMenu(false);
  if (rawHtmlMode) {
   setRawHtmlCode((prev) => prev + param.code);
   activeHtmlRef.current += param.code;
   update({ emailBody: activeHtmlRef.current });
   return;
  }

  if (editorCanvasRef.current) {
   editorCanvasRef.current.focus();
   restoreSelection();
   const spanHtml = `<span style="background-color: rgba(230,0,0,0.12); color: #E60000; font-weight: bold; padding: 1px 5px; border-radius: 4px; font-family: monospace;">${param.label}</span>&nbsp;`;
   document.execCommand('insertHTML', false, spanHtml);
   activeHtmlRef.current = editorCanvasRef.current.innerHTML;
   setRawHtmlCode(activeHtmlRef.current);
   update({ emailBody: activeHtmlRef.current });
   saveSelection();
  }
 };

 // Insert fx parameter into Email Subject at caret position
 const insertFxToSubject = (param) => {
  setShowSubjectFxMenu(false);
  const input = subjectInputRef.current;
  if (input) {
   const start = input.selectionStart ?? emailSubject.length;
   const end = input.selectionEnd ?? emailSubject.length;
   const before = emailSubject.substring(0, start);
   const after = emailSubject.substring(end);
   const updated = `${before}${param.label} ${after}`;
   setEmailSubject(updated);
   update({ emailSubject: updated });
   setTimeout(() => {
    input.focus();
    input.setSelectionRange(start + param.label.length + 1, start + param.label.length + 1);
   }, 0);
  } else {
   const updated = emailSubject ? `${emailSubject} ${param.label}` : param.label;
   setEmailSubject(updated);
   update({ emailSubject: updated });
  }
 };

 // Toggle HTML Code view
 const handleToggleCodeMode = () => {
  if (!rawHtmlMode) {
   const currentHtml = editorCanvasRef.current ? editorCanvasRef.current.innerHTML : activeHtmlRef.current;
   activeHtmlRef.current = currentHtml;
   setRawHtmlCode(currentHtml);
   setRawHtmlMode(true);
  } else {
   activeHtmlRef.current = rawHtmlCode;
   setRawHtmlMode(false);
   update({ emailBody: rawHtmlCode });
  }
 };

 // Image Upload
 const handleImageUpload = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
   const base64 = event.target?.result;
   if (typeof base64 === 'string') {
    const imgHtml = `<img src="${base64}" alt="Email Graphic" style="max-width: 100%; height: auto; border-radius: 6px; margin: 8px auto; display: block;" />`;
    runCommand('insertHTML', imgHtml);
   }
  };
  reader.readAsDataURL(file);
 };

 // Switching user list automatically resets the loaded state
 const handleSelectUserList = (listId) => {
  setSelectedListId(listId);
  setIsDropdownOpen(false);
  setIsListLoaded(false);
  setLoadedData(null);
  setErrorMsg('');
  // `loadedData` is never sent: the server strips it and it would bloat the row.
  update({
   selectedListId: listId,
   isListLoaded: false
  });
 };

 // Clicking Load pulls the members for the active selection. They are held in
 // LOCAL state only — the draft never carries the recipient rows.
 const handleLoadList = async () => {
  if (!currentSelectedList) return;
  membersFetchedRef.current = true;
  setIsListLoaded(true);
  setLoadedData(currentSelectedList);
  setErrorMsg('');
  update({
   isListLoaded: true,
   selectedListId: currentSelectedList?.id,
   selectedListName: currentSelectedList?.name
  });

  try {
   const members = await api.userLists.members(currentSelectedList.id);
   setLoadedData({
    ...currentSelectedList,
    users: Array.isArray(members) ? members : (currentSelectedList.users || [])
   });
  } catch {
   // Members unavailable: keep the summary the list row already gives us
   // (totals and rates) rather than blanking the panel.
   setLoadedData(currentSelectedList);
  }
 };

 // Toggle expand mode safely keeping track of edits
 const handleToggleExpand = () => {
  if (!rawHtmlMode && editorCanvasRef.current) {
   activeHtmlRef.current = editorCanvasRef.current.innerHTML;
   setRawHtmlCode(activeHtmlRef.current);
   update({ emailBody: activeHtmlRef.current });
  } else if (rawHtmlMode) {
   activeHtmlRef.current = rawHtmlCode;
   update({ emailBody: rawHtmlCode });
  }
  setIsEditorExpanded((prev) => !prev);
 };

 const handleProceed = async () => {
  if (!senderEmailId.trim()) {
   setErrorMsg('Please specify a Sender Email ID');
   return;
  }
  if (!emailSubject.trim()) {
   setErrorMsg('Please specify an Email Subject');
   return;
  }
  if (!selectedListId || !isListLoaded) {
   setErrorMsg('Please select and load a Recipient List to proceed');
   return;
  }

  const finalHtml = rawHtmlMode ? rawHtmlCode : activeHtmlRef.current;
  update({
   senderEmailId: senderEmailId.trim(),
   senderName: senderName.trim(),
   emailSubject: emailSubject.trim(),
   emailBody: finalHtml,
   selectedListId: currentSelectedList?.id || '',
   selectedListName: currentSelectedList?.name || '',
   isListLoaded,
   selectedSingleUserEmail: selectedSingleUser?.UserEMailID
  });

  // Make sure the debounced save has landed before the next step reads the draft.
  await flush();
  navigate('/start-campaign/landing-page');
 };

 const handleGoBack = async () => {
  const finalHtml = rawHtmlMode ? rawHtmlCode : activeHtmlRef.current;
  update({
   senderEmailId: senderEmailId.trim(),
   senderName: senderName.trim(),
   emailSubject: emailSubject.trim(),
   emailBody: finalHtml,
   selectedListId: currentSelectedList?.id || '',
   selectedListName: currentSelectedList?.name || '',
   isListLoaded,
   selectedSingleUserEmail: selectedSingleUser?.UserEMailID
  });
  await flush();
  navigate('/start-campaign/details');
 };

 const stepsList = CAMPAIGN_STEPS || [
  { id: 'scenario', step: 1, titleLine1: 'Choose A', titleLine2: 'Scenario' },
  { id: 'details', step: 2, titleLine1: 'Details &', titleLine2: 'Settings' },
  { id: 'email', step: 3, titleLine1: 'Campaign', titleLine2: 'Email' },
  { id: 'landing', step: 4, titleLine1: 'Landing', titleLine2: 'Page' },
  { id: 'training', step: 5, titleLine1: 'Add Training', titleLine2: 'Path' },
  { id: 'review', step: 6, titleLine1: 'Review &', titleLine2: 'Publish' }
 ];

 // 1. Department Breakdown (Raw Count based from UserDLsData.json)
 const activeData = loadedData || currentSelectedList;
 const deptList = (() => {
  if (activeData?.departmentBreakdown && activeData.departmentBreakdown.length > 0) {
   return activeData.departmentBreakdown.map((d) => ({
    label: d.dept || d.department || 'Other',
    count: Number(d.count) || 0
   }));
  }
  const userList = activeData?.users || [];
  if (userList.length > 0) {
   const counts = {};
   userList.forEach((u) => {
    const dept = u.department || 'Other';
    counts[dept] = (counts[dept] || 0) + 1;
   });
   return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }
  return [];
 })();

 // 2. Location Breakdown (Raw Count based from UserDLsData.json users)
 const locationList = (() => {
  if (activeData?.locationBreakdown && activeData.locationBreakdown.length > 0) {
   return activeData.locationBreakdown.map((l) => ({
    label: (l.location || l.name || 'Other').toUpperCase(),
    count: Number(l.count) || 0
   }));
  }
  const userList = activeData?.users || [];
  if (userList.length > 0) {
   const counts = {};
   userList.forEach((u) => {
    const loc = (u.location || u.country || 'OTHER').toUpperCase();
    counts[loc] = (counts[loc] || 0) + 1;
   });
   return Object.entries(counts).map(([label, count]) => ({ label, count }));
  }
  return [];
 })();

 const maxDeptCount = Math.max(...deptList.map((d) => d.count), 1);
 const maxLocCount = Math.max(...locationList.map((l) => l.count), 1);

 // Filter master users by search
 const filteredMasterUsers = sortedMasterUsers.filter((u) =>
  (u.UserEMailID?.toLowerCase().includes(singleUserSearch.toLowerCase())) ||
  (u.UserName?.toLowerCase().includes(singleUserSearch.toLowerCase())) ||
  (u.Department?.toLowerCase().includes(singleUserSearch.toLowerCase()))
 );

 // =========================================================================
 // 🌟 RICH TEXT EDITOR COMPONENT (SEAMLESS CORNERS & RELIABLE FORMATTING)
 // =========================================================================
 const renderEditorWorkspace = (expanded = false) => (
  <div className={`w-full rounded-2xl border border-[#202127] bg-[#202127] dark:bg-white shadow-xs flex flex-col relative z-20 ${
   expanded ? 'h-[calc(100vh-80px)]' : 'h-[220px]'
  }`}>
   {/* 🌟 Single-Line Dark Header Toolbar (Seamless with Container) */}
   <div className="w-full h-8 px-2 flex items-center justify-between text-white select-none bg-[#202127] dark:bg-white border-b border-white/10 rounded-t-xl relative z-30 flex-nowrap">
    <div className="flex items-center gap-1 text-xs flex-nowrap">
     {/* Format Block */}
     <select
      onMouseDown={() => saveSelection()}
      onChange={(e) => handleFormatBlock(e.target.value)}
      className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
      title="Block Format"
      defaultValue="<p>"
     >
      <option value="<p>">Paragraph</option>
      <option value="<h1>">Heading 1</option>
      <option value="<h2>">Heading 2</option>
      <option value="<h3>">Heading 3</option>
      <option value="<blockquote>">Quote</option>
     </select>

     {/* Font Family */}
     <select
      onMouseDown={() => saveSelection()}
      onChange={(e) => handleFontFamily(e.target.value)}
      className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
      title="Font Family"
      defaultValue="'Segoe UI', Arial, sans-serif"
     >
      <option value="'Segoe UI', Arial, sans-serif">Segoe UI</option>
      <option value="'Vodafone ExB', 'Montserrat', Arial, sans-serif">Vodafone ExB</option>
      <option value="'Inter', sans-serif">Inter</option>
      <option value="'JetBrains Mono', monospace">Mono Tech</option>
     </select>

     {/* Font Size */}
     <select
      onMouseDown={() => saveSelection()}
      onChange={(e) => handleFontSize(e.target.value)}
      className="px-1 py-0.5 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
      title="Font Size"
      defaultValue="3"
     >
      <option value="2">12px</option>
      <option value="3">14px</option>
      <option value="4">18px</option>
      <option value="5">24px</option>
     </select>

     {/* Formatting Buttons */}
     <button 
      type="button" 
      onMouseDown={(e) => { e.preventDefault(); runCommand('bold'); }} 
      className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
      title="Bold"
     >
      <Bold className="w-3 h-3 stroke-[2.5]" />
     </button>

     <button 
      type="button" 
      onMouseDown={(e) => { e.preventDefault(); runCommand('italic'); }} 
      className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
      title="Italic"
     >
      <Italic className="w-3 h-3 stroke-[2.5]" />
     </button>

     <button 
      type="button" 
      onMouseDown={(e) => { e.preventDefault(); runCommand('underline'); }} 
      className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
      title="Underline"
     >
      <Underline className="w-3 h-3 stroke-[2.5]" />
     </button>

     <button 
      type="button" 
      onMouseDown={(e) => { e.preventDefault(); runCommand('strikeThrough'); }} 
      className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
      title="Strikethrough"
     >
      <Strikethrough className="w-3 h-3" />
     </button>

     <button 
      type="button" 
      onMouseDown={(e) => { e.preventDefault(); runCommand('removeFormat'); }} 
      className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black text-slate-400 hover:text-white dark:hover:text-black" 
      title="Clear Formatting"
     >
      <RemoveFormatting className="w-3 h-3" />
     </button>
     <span className="text-white/25 dark:text-black/25 mx-0.5">|</span>

     {/* Alignment */}
     <button 
      type="button" 
      onMouseDown={(e) => { e.preventDefault(); runCommand('justifyLeft'); }} 
      className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
      title="Align Left"
     >
      <AlignLeft className="w-3 h-3" />
     </button>

     <button 
      type="button" 
      onMouseDown={(e) => { e.preventDefault(); runCommand('justifyCenter'); }} 
      className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
      title="Align Center"
     >
      <AlignCenter className="w-3 h-3" />
     </button>

     <button 
      type="button" 
      onMouseDown={(e) => { e.preventDefault(); runCommand('justifyRight'); }} 
      className="p-0.5 rounded hover:bg-white/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
      title="Align Right"
     >
      <AlignRight className="w-3 h-3" />
     </button>

     {/* Text Color */}
     <label className="flex items-center gap-0.5 cursor-pointer p-0.5 rounded hover:bg-white/10 relative" title="Text Color">
      <Palette className="w-3 h-3 text-[#E60000]" />
      <input
       type="color"
       onChange={(e) => runCommand('foreColor', e.target.value)}
       className="w-3 h-3 rounded cursor-pointer opacity-0 absolute inset-0"
      />
     </label>

     <span className="text-white/25 dark:text-black/25 mx-0.5">|</span>

     {/* Image & Link */}
     <input
      type="file"
      ref={imageInputRef}
      accept="image/png, image/jpeg, image/jpg, image/svg+xml"
      onChange={handleImageUpload}
      className="hidden"
     />
     <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => imageInputRef.current?.click()}
      className="p-0.5 rounded hover:bg-white/10 text-blue-400 cursor-pointer"
      title="Upload Image"
     >
      <ImageIcon className="w-3 h-3" />
     </button>
     <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
       const url = prompt('Enter Destination URL:', '{{phishLink}}');
       if (url) runCommand('createLink', url);
      }}
      className="p-0.5 rounded hover:bg-white/10 text-emerald-400 cursor-pointer"
      title="Insert Link"
     >
      <LinkIcon className="w-3 h-3" />
     </button>

     {/* 🌟 Rich Editor "fx" Dropdown */}
     <div ref={editorFxRef} className="relative z-50">
      <button
       type="button"
       onMouseDown={(e) => {
        e.preventDefault();
        saveSelection();
       }}
       onClick={() => setShowEditorFxMenu(!showEditorFxMenu)}
       className="px-1.5 py-0 rounded-2xl bg-white dark:bg-black hover:brightness-110 text-black dark:text-white font-mono-tech text-[9px] font-bold shadow-xs flex items-center gap-0.5 cursor-pointer"
       title="Insert Dynamic Placeholder"
      >
       <span>fx</span>
       <ChevronDown className="w-2.5 h-2.5" />
      </button>

      {showEditorFxMenu && (
       <div
        style={{ position: 'absolute', top: '100%', left: 0, zIndex: 9999 }}
        className="mt-1 w-52 max-h-48 overflow-y-auto rounded-xl bg-[#1A1C23] border border-white/20 p-1 shadow-2xl flex flex-col gap-0.5 text-left"
       >
        <span className="text-[7.5px] font-mono-tech uppercase text-slate-400 px-2 py-0.5 font-bold">
         Dynamic Placeholders
        </span>
        {FX_PARAMETERS.map((fx) => (
         <button
          key={fx.label}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => insertFxToEditor(fx)}
          className="p-1 px-2 rounded-lg hover:bg-white/10 text-left flex items-center justify-between cursor-pointer transition-colors"
         >
          <span className="text-[9px] font-mono-tech font-bold text-[#FF8595]">
           {fx.label}
          </span>
          <span className="text-[8px] text-slate-400 truncate max-w-[80px]">
           {fx.desc}
          </span>
         </button>
        ))}
       </div>
      )}
     </div>
    </div>

    {/* Right side: HTML Code Toggle & Expand */}
    <div className="flex items-center gap-1 flex-shrink-0">
     <button
      type="button"
      onClick={handleToggleCodeMode}
      className={`px-1.5 py-0.5 rounded border text-[8.5px] font-bold flex items-center gap-0.5 cursor-pointer ${
       rawHtmlMode ? 'bg-[#E60000] text-white border-[#E60000]' : 'bg-[#181A20] text-white border-white/20 hover:bg-white/10'
      }`}
      title="Toggle HTML Source Code"
     >
      <Code className="w-2.5 h-2.5" />
      {rawHtmlMode ? 'Visual' : 'HTML'}
     </button>

     <button
      type="button"
      onClick={handleToggleExpand}
      className="hover:text-[#E60000] text-white dark:text-black cursor-pointer transition-colors p-0.5 rounded hover:bg-white/10"
      title={expanded ? 'Minimize Screen' : 'Expand Full Screen'}
     >
      {expanded ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
     </button>
    </div>
   </div>

   {/* Main Canvas Area: Clean bottom radius without outer edge bleed */}
   <div 
    className={`min-w-[480px] max-w-full flex-1 ml-1 p-2 mb-1 bg-white dark:bg-[#15161A] rounded-b-xl border-t border-slate-200 dark:border-white/10 overflow-hidden transition-all duration-200 ${
     isEditorExpanded 
      ? 'w-[1230px] min-w-[1230px] h-[500px] min-h-[400px] max-h-none resize-none' 
      : 'w-[648px] min-w-[400px] h-[180px] min-h-[180px] max-h-[125px] resize-x'
    }`}
    style={!isEditorExpanded ? { resize: 'horizontal' } : undefined}
   >
    <div className="w-full h-full overflow-y-auto">
     {rawHtmlMode ? (
      <textarea
       value={rawHtmlCode}
       onChange={(e) => {
        setRawHtmlCode(e.target.value);
        activeHtmlRef.current = e.target.value;
        update({ emailBody: e.target.value });
       }}
       className="w-full h-full p-2.5 font-mono-tech text-[10.5px] bg-[#0F172A] text-emerald-400 outline-none resize-none leading-relaxed rounded-lg"
       placeholder="Design Canvas"
      />
     ) : (
      <div
       ref={editorCanvasRef}
       contentEditable
       suppressContentEditableWarning
       data-placeholder="Design Canvas"
       onKeyUp={saveSelection}
       onMouseUp={saveSelection}
       onSelect={saveSelection}
       onInput={() => {
        saveSelection();
        if (editorCanvasRef.current) {
         activeHtmlRef.current = editorCanvasRef.current.innerHTML;
         setRawHtmlCode(activeHtmlRef.current);
         update({ emailBody: activeHtmlRef.current });
        }
       }}
       className="w-full h-full outline-none cursor-text text-slate-900 dark:text-slate-100 p-1 leading-normal text-xs rich-editor-canvas"
      />
     )}
    </div>
   </div>
  </div>
 );

 return (
  <>
   <style dangerouslySetInnerHTML={{ __html: VODAFONE_FONT_STYLE }} />

   {/* Screen Shell */}
   <div
    style={{ zoom: VarStartCampaignScale }}
    className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 h-[calc(109.5vh-0px)] overflow-hidden"
   >
    {/* ========================================================================= */}
    {/* ── 1. TOP HEADER BAR: "Start New Campaign"                                */}
    {/* ========================================================================= */}
    <div
     className={`w-full py-2.5 px-6 -mt-2 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none ${
      isDark ? 'bg-[#ffffff] text-white border-white/10' : 'bg-[#000000] text-white border-black/10'
     }`}
    >
     <div className="flex items-center gap-3">
      <h1 className="text-[14px] font-voda font-bold tracking-tight text-white dark:text-black uppercase">
       Start New Campaign
      </h1>
     </div>
     <div className="text-[13px] font-voda font-bold text-white/85 dark:text-black/85">
      -- Start a new campaign
     </div>
    </div>

    {/* ========================================================================= */}
    {/* ── 2. MAIN CONTAINER WITH DOCKED PROGRESS-FILL STEPPER STRIP              */}
    {/* ========================================================================= */}
    <div
     className={`w-full flex-1 min-h-0 rounded-2xl border flex flex-col justify-between overflow-hidden shadow-xs relative ${
      isDark ? 'bg-[#0F1015] border-white/10' : 'bg-white border-slate-200'
     }`}
    >
     {/* ── DOCKED CONTINUOUS STEPPER STRIP ── */}
     <div
      className={`w-full h-12 flex items-stretch flex-shrink-0 select-none pointer-events-none cursor-default ${
       isDark ? 'border-white/10 bg-[#12141A]' : 'border-slate-200/90 bg-white'
      }`}
     >
      {stepsList.map((step) => {
       const isCompleted = step.step < CURRENT_STEP_NUMBER;
       const isCurrent = step.step === CURRENT_STEP_NUMBER;
       const isFilled = step.step <= CURRENT_STEP_NUMBER;

       return (
        <div
         key={step.id}
         className={`flex-1 flex items-center justify-center gap-2.5 px-4 h-full transition-colors duration-200 select-none ${
          isFilled ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-transparent'
         }`}
        >
         {/* Step Icon */}
         {isCompleted ? (
          <div className="w-6 h-6 rounded-full bg-[#8ED973] dark:bg-[#74D054] text-white flex items-center justify-center flex-shrink-0 shadow-2xs">
           <Check className="w-3.5 h-3.5 stroke-[3]" />
          </div>
         ) : isCurrent ? (
          <div className="w-6 h-6 rounded-full bg-white dark:bg-black text-black dark:text-white font-bold flex items-center justify-center text-[11px] flex-shrink-0 shadow-2xs">
           {step.step}
          </div>
         ) : (
          <div
           className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${
            isDark ? 'bg-white text-black' : 'bg-black text-white'
           }`}
          >
           {step.step}
          </div>
         )}

         {/* Step Label */}
         <div
          className={`flex flex-col text-left leading-tight text-[11.5px] font-bold ${
           isCompleted
            ? 'text-[#8ED973] dark:text-[#74D054]'
            : isCurrent
            ? 'text-white dark:text-black'
            : isDark
            ? 'text-white opacity-85'
            : 'text-slate-900 opacity-85'
          }`}
         >
          <span>{step.titleLine1}</span>
          <span>{step.titleLine2}</span>
         </div>
        </div>
       );
      })}
     </div>

     {/* ── 3. MAIN WORKSPACE WITH 2 L-SHAPED BENTO COLUMNS (NO SCROLL) ── */}
     <div className="flex-1 min-h-0 overflow-hidden p-3.5 sm:p-4 flex flex-col justify-between gap-3">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch flex-1 min-h-0">
        
       {/* ═══════════════════════════════════════════════════════════════ */}
       {/* 👈 LEFT COLUMN: SENDER EMAIL INFO & COMPACT RICH EDITOR    */}
       {/* ═══════════════════════════════════════════════════════════════ */}
       <div className="relative flex flex-col h-full min-h-[420px]">
        {/* 🌟 1. Truly Isolated Capsule */}
        <div
         className={`absolute top-0 left-0 w-[164px] h-[122px] p-3 rounded-2xl flex flex-col justify-between shadow-xs z-20 ${
          isDark ? 'bg-white text-black' : 'bg-black text-white'
         }`}
        >
         <div>
          <h3 className="text-[14px] -mt-1 font-voda font-bold tracking-normal leading-tight">
           Sender<br />Email Info
          </h3>
         </div>
         <p className="text-[8.5px] font-medium leading-snug opacity-80 mt-1">
          The details are been already pre-filled through selected scenario template; however, you can still make changes
         </p>
        </div>

        {/* 🌟 2. Concave Arc Fillet */}
        <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
         <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
          <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
         </svg>
        </div>

        {/* 🌟 3. Top-Right Arm of L-Shape Container */}
        <div
         style={{ backgroundColor: lCardBg }}
         className="w-[calc(100%-170px)] ml-auto h-[129px] rounded-t-xl px-4 py-2 flex flex-col justify-center gap-1.5 z-10 -ml-2"
        >
         {/* Sender Email ID Field: Non-typeable Dropdown */}
         <div className="flex flex-col gap-0.5">
          <label className="text-[12.5px] mb-2 font-bold text-slate-900 dark:text-white leading-none">
           Sender Email ID
          </label>
          <div
           className={`w-full h-7 px-2.5 mb-2 rounded-xl flex items-center shadow-2xs relative ${
            isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
           }`}
          >
           <select
            value={senderEmailId}
            onChange={(e) => {
             const chosen = e.target.value;
             setSenderEmailId(chosen);
             setErrorMsg('');
             const matchingScn = (scenariosJsonData?.scenarios || []).find((s) => s.senderEmailId === chosen);
             if (matchingScn && matchingScn.senderName) {
              setSenderName(matchingScn.senderName);
              update({ senderEmailId: chosen, senderName: matchingScn.senderName });
             } else {
              update({ senderEmailId: chosen });
             }
            }}
            className="w-full bg-transparent text-[10.5px] font-medium outline-none cursor-pointer pr-4 appearance-none"
           >
            <option value="" disabled className={isDark ? 'bg-[#15161A] text-slate-400' : 'bg-white text-slate-400'}>
             Select from dropdown
            </option>
            {availableSenderEmails.map((email) => (
             <option
              key={email}
              value={email}
              className={isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'}
             >
              {email}
             </option>
            ))}
           </select>
           <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
          </div>
         </div>

         {/* Sender Name Field */}
         <div className="flex flex-col gap-0.5">
          <label className="text-[12.5px] mb-2 font-bold text-slate-900 dark:text-white leading-none">
           Sender Name
          </label>
          <div
           className={`w-full h-7 px-3 -mb-2 rounded-xl flex items-center shadow-2xs ${
            isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
           }`}
          >
           <input
            type="text"
            value={senderName}
            onChange={(e) => {
             setSenderName(e.target.value);
             update({ senderName: e.target.value });
            }}
            placeholder="Type Here"
            className="w-full bg-transparent text-[10.5px] font-medium outline-none placeholder-slate-400"
           />
          </div>
         </div>
        </div>

        {/* 🌟 4. Continuous Bottom Base */}
        <div
         style={{ backgroundColor: lCardBg }}
         className="w-full flex-1 rounded-tl-xl rounded-b-lg p-3 sm:p-4 flex flex-col justify-between gap-1.5 z-10"
        >
         {/* Email Subject with right-aligned "fx" mini dropdown */}
         <div className="flex flex-col gap-0.5">
          <label className="text-[12.5px] -mt-1 font-bold text-slate-900 dark:text-white self-start text-left">
           Email Subject
          </label>
          <div
           className={`w-full h-12 px-2.5 mt-1 rounded-xl flex items-center justify-between shadow-2xs relative ${
            isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
           }`}
          >
           <input
            ref={subjectInputRef}
            type="text"
            value={emailSubject}
            onChange={(e) => {
             setEmailSubject(e.target.value);
             setErrorMsg('');
             update({ emailSubject: e.target.value });
            }}
            placeholder="Type Here"
            className="w-full bg-transparent text-[10.5px] font-medium outline-none placeholder-slate-400 pr-2 justify-self-start text-left"
           />

           {/* Mini Dropdown for Email Subject "fx" */}
           <div ref={subjectFxRef} className="relative flex-shrink-0 z-50">
            <button
             type="button"
             onMouseDown={(e) => e.preventDefault()}
             onClick={() => setShowSubjectFxMenu(!showSubjectFxMenu)}
             className="px-2 py-0.5 rounded-2xl bg-black dark:bg-white hover:brightness-110 text-white dark:text-black font-mono-tech text-[9px] font-bold shadow-xs flex items-center gap-1 cursor-pointer"
             title="Add Dynamic Parameter to Subject"
            >
             <span>fx</span>
             <ChevronDown className="w-2.5 h-2.5" />
            </button>

            {showSubjectFxMenu && (
             <div
              style={{ position: 'absolute', top: '100%', right: 0, zIndex: 9999 }}
              className="mt-1 w-48 max-h-52 overflow-y-auto rounded-xl bg-[#1A1C23] border border-white/20 p-1 shadow-2xl flex flex-col gap-1 text-left"
             >
              <span className="text-[8px] font-mono-tech uppercase text-slate-400 px-2 py-0.5 font-bold">
               Insert Into Subject
              </span>
              {FX_PARAMETERS.map((fx) => (
               <button
                key={fx.label}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertFxToSubject(fx)}
                className="p-1 px-2 rounded-lg hover:bg-white/10 text-left flex items-center justify-between cursor-pointer transition-colors"
               >
                <span className="text-[9.5px] font-mono-tech font-bold text-[#FF8595]">
                 {fx.label}
                </span>
                <span className="text-[8px] text-slate-400 truncate max-w-[80px]">
                 {fx.desc}
                </span>
               </button>
              ))}
             </div>
            )}
           </div>
          </div>
         </div>

         {/* Email Body Rich Canvas */}
         <div className="flex flex-col gap-0.5 flex-1 min-h-0">
          <label className="text-[12.5px] mt-1 mb-2 font-bold text-slate-900 dark:text-white">
           Email Body
          </label>

          {renderEditorWorkspace(false)}
         </div>
        </div>
       </div>

       {/* ═══════════════════════════════════════════════════════════════ */}
       {/* 👉 RIGHT COLUMN: RECIPIENTS & AUDIENCE ANALYTICS        */}
       {/* ═══════════════════════════════════════════════════════════════ */}
       <div className="relative flex flex-col h-full min-h-[420px]">
        {/* 🌟 1. Truly Isolated Capsule (#FFD6DE Soft Pink) */}
        <div
         className={`absolute top-0 left-0 w-[164px] h-[122px] p-3 rounded-2xl flex flex-col justify-between shadow-xs z-20 ${
          isDark ? 'bg-[#FFD6DE] text-slate-900' : 'bg-[#FFD6DE] text-slate-900'
         }`}
        >
         <div>
          <h3 className="text-[14px] -mt-1 font-voda font-bold tracking-normal leading-tight">
           Recipients<br />Email IDs
          </h3>
         </div>
         <p className="text-[8.5px] font-medium leading-snug opacity-80 mt-1">
          Attach the target audience list here. The DLs and bulk files uploaded in User List will be available here
         </p>
        </div>

        {/* 🌟 2. Concave Arc Fillet */}
        <div className="absolute top-[114px] left-[154px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
         <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
          <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
         </svg>
        </div>

        {/* 🌟 3. Top-Right Arm of L-Shape Container */}
        <div
         style={{ backgroundColor: lCardBg }}
         className="w-[calc(100%-170px)] ml-auto h-[129px] rounded-t-xl px-4 py-2 flex flex-col justify-center gap-1 z-50 -ml-2 relative overflow-visible"
        >
         {/* Recipient IDs Header & Load Button */}
         <div className="flex items-center justify-between">
          <label className="text-[12.5px] mt-2 font-bold text-slate-900 dark:text-white leading-none">
           Recipient Ids
          </label>
          <button
           type="button"
           onClick={handleLoadList}
           className="inline-flex items-center gap-1 px-2.5 py-0.5 mt-1 rounded-full bg-black dark:bg-white hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black text-[9px] font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
          >
           <span>Load</span>
           <RotateCw className="w-2.5 h-2.5" />
          </button>
         </div>

         {/* Dropdown 1: User Lists Dropdown with "Select from dropdown" Placeholder (Empty in all cases initially) */}
         <div ref={userListDropdownRef} className="relative z-50">
          <div
           onClick={() => {
            setIsDropdownOpen(!isDropdownOpen);
            setIsSingleUserDropdownOpen(false);
           }}
           className={`w-full h-7 px-3 mt-2 rounded-xl flex items-center justify-between cursor-pointer shadow-2xs select-none ${
            isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
           }`}
          >
           <span className={`text-[10px] font-medium truncate pr-2 ${!currentSelectedList ? 'text-slate-400' : ''}`}>
            {currentSelectedList?.name || 'Select from dropdown'}
           </span>
           <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          </div>

          {isDropdownOpen && (
           <div
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999 }}
            className={`mt-1 max-h-96 overflow-y-auto rounded-2xl p-1.5 shadow-2xl border flex flex-col gap-1 ${
             isDark ? 'bg-[#181A20] border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
           >
            {availableLists.map((item) => {
             const isSelected = selectedListId === item.id;
             return (
              <div
               key={item.id}
               onClick={() => handleSelectUserList(item.id)}
               className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                isSelected
                 ? isDark ? 'bg-white/10' : 'bg-[#EBF1F5]'
                 : isDark ? 'hover:bg-white/5' : 'hover:bg-[#F2F5F8]'
               }`}
              >
               <div className="flex flex-col text-left pr-2 truncate">
                <span className="text-[10px] font-bold tracking-tight truncate">
                 {item.name}
                </span>
                {item.subText && (
                 <span className={`text-[8.5px] font-mono-tech truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {item.subText}
                 </span>
                )}
               </div>

               <div className="flex flex-col items-end flex-shrink-0 leading-tight">
                <span className={`text-[9.5px] font-mono-tech font-bold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                 {item.id}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                 <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                 <span className="text-[8.5px] font-medium text-slate-700 dark:text-slate-300">
                  {item.type}
                 </span>
                </div>
               </div>
              </div>
             );
            })}
           </div>
          )}
         </div>

         {/* OR Divider */}
         <div className="flex items-center justify-center -my-0.5 mt-0.5">
          <span className="text-[8.5px] font-black tracking-wider text-slate-400 uppercase">
           OR
          </span>
         </div>

         {/* Dropdown 2: Single Master User Email Dropdown */}
         <div ref={singleUserDropdownRef} className="relative z-40">
          <div
           onClick={() => {
            setIsSingleUserDropdownOpen(!isSingleUserDropdownOpen);
            setIsDropdownOpen(false);
           }}
           className={`w-full h-7 px-3 rounded-xl mt-2 flex items-center justify-between cursor-pointer shadow-2xs select-none ${
            isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'
           }`}
          >
           <span className="text-[10px] font-medium truncate pr-2">
            {selectedSingleUser ? selectedSingleUser.UserEMailID : 'Add email IDs one by one'}
           </span>
           <ChevronDown className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
          </div>

          {isSingleUserDropdownOpen && (
           <div
            style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999 }}
            className={`mt-1 max-h-96 overflow-y-auto rounded-2xl p-2 shadow-2xl border flex flex-col gap-1.5 ${
             isDark ? 'bg-[#181A20] border-white/15 text-white' : 'bg-white border-slate-200 text-slate-900'
            }`}
           >
            {/* Search Input Filter */}
            <div className={`px-2.5 py-1 rounded-lg border flex items-center gap-1.5 ${
             isDark ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'
            }`}>
             <Search className="w-3 h-3 text-slate-400 flex-shrink-0" />
             <input
              type="text"
              value={singleUserSearch}
              onChange={(e) => setSingleUserSearch(e.target.value)}
              placeholder="Filter by email, name or department..."
              className="w-full bg-transparent text-[9.5px] outline-none"
              onClick={(e) => e.stopPropagation()}
             />
            </div>

            {/* List of Users */}
            <div className="flex flex-col gap-1 max-h-80 overflow-y-auto pr-1">
             {filteredMasterUsers.map((user) => {
              const isSelected = selectedSingleUser?.UserID === user.UserID;
              return (
               <div
                key={user.UserID}
                onClick={() => {
                 setSelectedSingleUser(user);
                 setIsSingleUserDropdownOpen(false);
                }}
                className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition-all ${
                 isSelected
                  ? isDark ? 'bg-white/10' : 'bg-[#EBF1F5]'
                  : isDark ? 'hover:bg-white/5' : 'hover:bg-[#F2F5F8]'
                }`}
               >
                <div className="flex flex-col text-left pr-2 truncate">
                 <span className="text-[10px] font-bold tracking-tight truncate">
                  {user.UserEMailID}
                 </span>
                 <span className={`text-[8.5px] truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  {user.UserName}
                 </span>
                </div>

                <div className="flex flex-col items-end flex-shrink-0 leading-tight">
                 <span className={`text-[9px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {user.Department}
                 </span>
                 <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                  <span className="text-[8.5px] font-bold text-slate-900 dark:text-white">
                   {user['HookRate%']}%
                  </span>
                 </div>
                </div>
               </div>
              );
             })}
            </div>
           </div>
          )}
         </div>
        </div>

        {/* 🌟 4. Continuous Bottom Base */}
        <div
         style={{ backgroundColor: lCardBg }}
         className="w-full flex-1 rounded-tl-xl rounded-b-lg p-3 sm:p-4 flex flex-col justify-between gap-2 z-10"
        >
         {/* White Card Enclosure for Recipient List Details */}
         <div className={`w-full flex-1 rounded-2xl p-3.5 border transition-all duration-200 flex flex-col justify-between shadow-xs ${
          isDark ? 'bg-[#15161A] border-white/10 text-white' : 'bg-white border-slate-200/90 text-slate-900'
         }`}>
          <h4 className="text-[12.5px] font-bold text-slate-900 dark:text-white leading-none">
           Recipient List Details
          </h4>

          {/* Pre-Load State vs Loaded State */}
          {!isListLoaded ? (
           <div className="w-full flex-1 flex items-center justify-center min-h-[220px]">
            <span className="text-[12.5px] font-bold text-[#F4A7B5] dark:text-[#FFB3C1] select-none text-center">
             Load the User List to View the Details
            </span>
           </div>
          ) : (
           <>
            {/* 3 Metric Pink Summary Cards */}
            <div className="grid grid-cols-3 gap-2.5 mt-2">
             <div className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center text-center shadow-2xs ${
              isDark ? 'bg-[#FFD6DE] text-slate-900' : 'bg-[#FFD6DE] text-slate-900'
             }`}>
              <span className="text-[9px] font-semibold opacity-85">Total Recipients</span>
              <span className="text-[18px] font-voda font-bold leading-tight mt-0.5">
               {activeData?.totalUsers !== undefined ? activeData.totalUsers : (activeData?.users?.length || 0)}
              </span>
             </div>

             <div className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center text-center shadow-2xs ${
              isDark ? 'bg-[#FFD6DE] text-slate-900' : 'bg-[#FFD6DE] text-slate-900'
             }`}>
              <span className="text-[9px] font-semibold opacity-85">Aggregated Hook Rate %</span>
              <span className="text-[18px] font-voda font-bold leading-tight mt-0.5">
               {activeData?.hookRate || '0%'}
              </span>
             </div>

             <div className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center text-center shadow-2xs ${
              isDark ? 'bg-[#FFD6DE] text-slate-900' : 'bg-[#FFD6DE] text-slate-900'
             }`}>
              <span className="text-[9px] font-semibold opacity-85">Aggregated Report Rate %</span>
              <span className="text-[18px] font-voda font-bold leading-tight mt-0.5">
               {activeData?.reportRate || '0%'}
              </span>
             </div>
            </div>

            {/* Two Bar Charts: Department (Left) & Location (Right) */}
            <div className="grid grid-cols-2 gap-4 pt-3 pb-1 w-full flex-1 items-end">
             {/* Chart 1: Department vs Count */}
             <div className="flex flex-col items-center w-full">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-14 tracking-wider uppercase">
               Department
              </span>
              <div className="flex items-end justify-center gap-3 w-full h-[85px]">
               {deptList.length > 0 ? (
                deptList.map((item, idx) => {
                 const heightPx = Math.max(16, Math.round((item.count / maxDeptCount) * 65));
                 return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                   <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200">
                    {item.count}
                   </span>
                   <div
                    style={{ height: `${heightPx}px` }}
                    className="w-5 sm:w-6 rounded-full bg-[#FFCCD5]"
                   />
                   <span className="text-[8px] font-bold text-slate-800 dark:text-slate-300 mt-1 text-center leading-tight max-w-[48px] truncate">
                    {item.label}
                   </span>
                  </div>
                 );
                })
               ) : (
                <span className="text-[10px] text-slate-400">No department data</span>
               )}
              </div>
             </div>

             {/* Chart 2: Location vs Count */}
             <div className="flex flex-col items-center w-full">
              <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-14 tracking-wider uppercase">
               Location
              </span>
              <div className="flex items-end justify-center gap-3 w-full h-[85px]">
               {locationList.length > 0 ? (
                locationList.map((item, idx) => {
                 const heightPx = Math.max(16, Math.round((item.count / maxLocCount) * 65));
                 return (
                  <div key={idx} className="flex flex-col items-center gap-1">
                   <span className="text-[9px] font-bold text-slate-800 dark:text-slate-200">
                    {item.count}
                   </span>
                   <div
                    style={{ height: `${heightPx}px` }}
                    className="w-5 sm:w-6 rounded-full bg-[#FFCCD5]"
                   />
                   <span className="text-[8px] font-bold text-slate-800 dark:text-slate-300 mt-1 text-center leading-tight max-w-[48px] truncate">
                    {item.label}
                   </span>
                  </div>
                 );
                })
               ) : (
                <span className="text-[10px] text-slate-400">No location data</span>
               )}
              </div>
             </div>
            </div>
           </>
          )}
         </div>

         {/* Bottom-Right Aligned Action Buttons */}
         <div className="flex items-center justify-end gap-2.5 pt-3 -mt-2 -mb-2 border-black/5 dark:border-white/10">
          <button
           type="button"
           onClick={handleGoBack}
           className="w-[90px] h-[24px] rounded-3xl bg-[#000000] dark:bg-[#ffffff] hover:bg-black/80 dark:hover:bg-white/80 text-white dark:text-black font-voda font-bold text-[10px] uppercase transition-all cursor-pointer shadow-xs flex items-center justify-center"
          >
           Back
          </button>
          <button
           type="button"
           onClick={handleProceed}
           className="w-[90px] h-[24px] rounded-3xl bg-[#8ED973] hover:bg-[#7ec963] text-white font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex items-center justify-center"
          >
           NEXT
          </button>
         </div>
        </div>
       </div>

      </div>
     </div>
    </div>

    {/* ========================================================================= */}
    {/* ── 🌟 SCREEN TOP-RIGHT CORNER TOASTER (PORTAL)                            */}
    {/* ========================================================================= */}
    {errorMsg &&
      typeof document !== 'undefined' &&
      createPortal(
        <div className="fixed top-5 right-6 z-[9999] flex items-center gap-3 px-4 py-3 rounded-xl bg-white text-slate-900 border border-red-500/30 shadow-2xl animate-in fade-in slide-in-from-top-3 duration-200 max-w-sm">
          <div className="w-8 h-8 rounded-full bg-red-100 text-[#E60000] flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="flex flex-col text-left leading-tight flex-1">
            <span className="text-[10px] font-voda font-bold text-[#E60000] uppercase tracking-wider">
              Input Required
            </span>
            <span className="text-[9.5px] font-medium text-slate-700 mt-0.5">
              {errorMsg}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMsg('')}
            className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer flex-shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>,
        document.body
      )}

    {/* Fullscreen Modal Portal for Expanded Rich Editor */}
    {isEditorExpanded &&
     typeof document !== 'undefined' &&
     createPortal(
      <div className="fixed inset-0 z-[2147483647] bg-white dark:bg-black backdrop-blur-sm p-4 flex flex-col justify-between">
       <div className="w-full flex-1 flex flex-col overflow-hidden">
        {renderEditorWorkspace(true)}
       </div>
       <div className="flex justify-end pt-3">
        <button
         type="button"
         onClick={handleToggleExpand}
         className="px-6 py-2 rounded-xl bg-[#E60000] hover:bg-red-700 text-white font-voda font-bold text-[9px] uppercase cursor-pointer shadow-lg"
        >
         Done Editing
        </button>
       </div>
      </div>,
      document.body
     )}
   </div>
  </>
 );
};

export default CampaignEmail;