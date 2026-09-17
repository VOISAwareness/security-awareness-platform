import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import {
  Check,
  ChevronDown,
  X,
  Eye,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Subscript,
  Superscript,
  RemoveFormatting,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Indent,
  Outdent,
  Image as ImageIcon,
  Link as LinkIcon,
  Code,
  Palette,
  Highlighter,
  Maximize2,
  Minimize2,
  ArrowRight,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';
import { CAMPAIGN_STEPS } from './ChooseAScenario';
import scenariosJsonData from '../Scenarios/ScenariosData.json';
import initialLandingCatalogues from '../LandingPageCatalogue/LandingPageCatalogues.json';
import attachAnyOtherImg from '../../assets/AttachAnyOtherStartNewCampaign.png';
import createNewOneImg from '../../assets/CreateNewOneStartNewCampaign.png';

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

const CURRENT_STEP_NUMBER = 4; // Step 4: Landing Page

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

const LandingPageDetails = () => {
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

  // Read saved draft from prior steps
  const [draft, setDraft] = useState(() => {
    try {
      const stored = localStorage.getItem('voisshield_active_campaign_draft');
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  });

  // Strict Start Fresh Detection
  const isStartFresh =
    draft.scenarioId === 'start-fresh' ||
    draft.scenarioName === 'Start Fresh' ||
    Boolean(draft.isStartFresh);

  // Base background
  const lCardBg = isDark ? '#1C1E24' : '#F1F5F7';

  // Available landing pages (combines localStorage custom pages and LandingPageCatalogues.json)
  const [catalogues] = useState(() => {
    try {
      const stored = localStorage.getItem('voisshield_landing_pages');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return initialLandingCatalogues?.landingPages || [];
    } catch {
      return initialLandingCatalogues?.landingPages || [];
    }
  });

  // Safe Property Extractors
  const getItemId = (item) => item?.LandingPageID || item?.landingPageId || item?.id || '';
  const getItemName = (item) => item?.LandingPageName || item?.landingPageName || item?.name || '';
  const getItemContent = (item) => item?.LandingPageContent || item?.landingPageContent || item?.content || '';

  // Determine initial selected landing page: Defaults to LP-001 on Start Fresh as requested
  const matchedScenario = !isStartFresh
    ? (scenariosJsonData?.scenarios || []).find((s) => s.scenarioId === draft.scenarioId) || scenariosJsonData?.scenarios?.[0]
    : null;

  const targetLandingPageId = draft.landingPageId || matchedScenario?.landingPageId || 'LP-001';

  const [selectedLandingPage, setSelectedLandingPage] = useState(() => {
    return (
      catalogues.find((c) => getItemId(c) === targetLandingPageId) ||
      catalogues[0] ||
      null
    );
  });

  // Form & Content states
  const [landingPageId, setLandingPageId] = useState(() => {
    return draft.landingPageId || (selectedLandingPage ? getItemId(selectedLandingPage) : 'LP-001');
  });

  const [landingPageName, setLandingPageName] = useState(() => {
    return draft.landingPageName || (selectedLandingPage ? getItemName(selectedLandingPage) : 'Blue Security Alert Landing Page');
  });
  
  // Editor States
  const [rawHtmlMode, setRawHtmlMode] = useState(false);
  const [rawHtmlCode, setRawHtmlCode] = useState(() => {
    return draft.landingPageContent || (selectedLandingPage ? getItemContent(selectedLandingPage) : '');
  });
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);
  const [isFullScreenLivePreview, setIsFullScreenLivePreview] = useState(false);
  const [showEditorFxMenu, setShowEditorFxMenu] = useState(false);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Auto-dismiss top-right toaster after 4 seconds
  useEffect(() => {
    if (errorMsg) {
      const timer = setTimeout(() => setErrorMsg(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  const activeHtmlRef = useRef(
    draft.landingPageContent || (selectedLandingPage ? getItemContent(selectedLandingPage) : '')
  );

  const editorCanvasRef = useRef(null);
  const imageInputRef = useRef(null);
  const editorFxRef = useRef(null);
  const savedSelectionRef = useRef(null);

  // Synchronize canvas when selected landing page changes
  useEffect(() => {
    if (selectedLandingPage) {
      const id = getItemId(selectedLandingPage);
      const name = getItemName(selectedLandingPage);
      const content = getItemContent(selectedLandingPage);

      setLandingPageId(id);
      setLandingPageName(name);
      setRawHtmlCode(content);
      activeHtmlRef.current = content;

      if (!rawHtmlMode && editorCanvasRef.current) {
        editorCanvasRef.current.innerHTML = content;
      }
    }
  }, [selectedLandingPage]);

  // Layout restoration for editorCanvas
  useLayoutEffect(() => {
    if (!rawHtmlMode && editorCanvasRef.current) {
      editorCanvasRef.current.innerHTML = activeHtmlRef.current;
    }
  }, [rawHtmlMode, isEditorExpanded]);

  // Click outside to close fx menu
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (editorFxRef.current && !editorFxRef.current.contains(e.target)) {
        setShowEditorFxMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lock body scroll when fullscreen modal or preview is open
  useEffect(() => {
    if (isEditorExpanded || isAttachModalOpen || isFullScreenLivePreview) {
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevOverflow;
      };
    }
  }, [isEditorExpanded, isAttachModalOpen, isFullScreenLivePreview]);

  // Persist draft updates
  const persistChanges = (fields) => {
    try {
      const current = localStorage.getItem('voisshield_active_campaign_draft');
      const updated = { ...(current ? JSON.parse(current) : {}), ...fields };
      localStorage.setItem('voisshield_active_campaign_draft', JSON.stringify(updated));
    } catch (e) {
      console.error(e);
    }
  };

  // Selection preservation helpers
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

  // Run formatting command with guaranteed selection restore
  const runCommand = (command, value = null) => {
    if (rawHtmlMode) return;
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      restoreSelection();
      document.execCommand(command, false, value);
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
      persistChanges({ landingPageContent: activeHtmlRef.current });
      saveSelection();
    }
  };

  const handleFormatBlock = (blockTag) => {
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      restoreSelection();
      document.execCommand('formatBlock', false, blockTag);
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
      persistChanges({ landingPageContent: activeHtmlRef.current });
      saveSelection();
    }
  };

  const handleFontFamily = (fontName) => {
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      restoreSelection();
      document.execCommand('fontName', false, fontName);
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
      persistChanges({ landingPageContent: activeHtmlRef.current });
      saveSelection();
    }
  };

  const handleFontSize = (sizeVal) => {
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      restoreSelection();
      document.execCommand('fontSize', false, sizeVal);
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
      persistChanges({ landingPageContent: activeHtmlRef.current });
      saveSelection();
    }
  };

  const insertComponent = (type) => {
    if (rawHtmlMode) return;
    let html = '';
    switch (type) {
      case 'primary-btn':
        html = `<div style="text-align: center; margin: 20px 0;"><a href="#training" style="display: inline-block; background-color: #E60000; color: #ffffff; font-family: 'Vodafone ExB', Arial, sans-serif; font-size: 14px; font-weight: 800; padding: 12px 32px; border-radius: 8px; text-decoration: none; box-shadow: 0 4px 12px rgba(230,0,0,0.25);">Click Here to complete the training.</a></div>`;
        break;
      case 'secondary-btn':
        html = `<div style="text-align: center; margin: 20px 0;"><a href="#training" style="display: inline-block; background-color: #0d58be; color: #ffffff; font-family: Arial, sans-serif; font-size: 14px; font-weight: 700; padding: 12px 30px; border-radius: 8px; text-decoration: none;">Review Security Red Flags</a></div>`;
        break;
      case 'warning-banner':
        html = `<div style="max-width: 600px; margin: 20px auto; background-color: #FFF1F2; border-left: 4px solid #E11D48; padding: 14px 18px; border-radius: 6px; text-align: left;"><p style="margin: 0; font-size: 13px; font-weight: 700; color: #9F1239;">⚠️ Simulation Intercept: Do not share corporate credentials on external untrusted domains.</p></div>`;
        break;
      case 'two-cols':
        html = `<div style="max-width: 680px; margin: 24px auto; display: flex; gap: 20px; flex-wrap: wrap; text-align: left;"><div style="flex: 1; min-width: 240px; background: #F8FAFC; padding: 16px; border-radius: 10px; border: 1px solid #E2E8F0;"><h4 style="margin: 0 0 6px 0; color: #1E293B; font-weight: 800; font-size: 13px;">What Happened?</h4><p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">You engaged with a simulated email test run by Information Security to evaluate organization readiness.</p></div><div style="flex: 1; min-width: 240px; background: #F8FAFC; padding: 16px; border-radius: 10px; border: 1px solid #E2E8F0;"><h4 style="margin: 0 0 6px 0; color: #1E293B; font-weight: 800; font-size: 13px;">Next Steps</h4><p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">Complete the brief assigned training module to learn how to identify identical phishing lures.</p></div></div>`;
        break;
      case 'divider':
        html = `<hr style="border: none; border-top: 1px solid rgba(0,0,0,0.12); margin: 24px auto; max-width: 680px;" />`;
        break;
      default:
        break;
    }
    runCommand('insertHTML', html);
  };

  const promptInsertLink = () => {
    const url = prompt('Enter Destination URL (e.g. #training):', '#training');
    if (url) {
      runCommand('createLink', url);
    }
  };

  const handleToggleCodeMode = () => {
    if (!rawHtmlMode) {
      const currentHtml = editorCanvasRef.current ? editorCanvasRef.current.innerHTML : activeHtmlRef.current;
      activeHtmlRef.current = currentHtml;
      setRawHtmlCode(currentHtml);
      setRawHtmlMode(true);
    } else {
      activeHtmlRef.current = rawHtmlCode;
      setRawHtmlMode(false);
      persistChanges({ landingPageContent: rawHtmlCode });
    }
  };

  // Full-Screen Live Preview Launch
  const handleLaunchFullScreenPreview = () => {
    if (!rawHtmlMode && editorCanvasRef.current) {
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
    } else if (rawHtmlMode) {
      activeHtmlRef.current = rawHtmlCode;
    }
    setIsFullScreenLivePreview(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (typeof base64 === 'string') {
        const imgHtml = `<img src="${base64}" alt="Landing Graphic" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px auto; display: block;" />`;
        runCommand('insertHTML', imgHtml);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSelectCatalogueItem = (item) => {
    setSelectedLandingPage(item);
    setIsAttachModalOpen(false);
    setErrorMsg('');
    const id = getItemId(item);
    const name = getItemName(item);
    const content = getItemContent(item);
    setLandingPageId(id);
    setLandingPageName(name);
    setRawHtmlCode(content);
    activeHtmlRef.current = content;
    if (editorCanvasRef.current) {
      editorCanvasRef.current.innerHTML = content;
    }
    persistChanges({
      landingPageAttachedByUser: true,
      landingPageId: id,
      landingPageName: name,
      landingPageContent: content
    });
  };

  // Direct Redirect to Create New Canvas Designer inside Landing Page Catalogue
  const handleCreateNewLandingPage = () => {
    persistChanges({
      landingPageId,
      landingPageName,
      landingPageContent: rawHtmlMode ? rawHtmlCode : activeHtmlRef.current
    });
    navigate('/landing-page-catalogue', { state: { createNew: true, openCreate: true } });
  };

  const handleProceed = () => {
    const finalHtml = rawHtmlMode ? rawHtmlCode : activeHtmlRef.current;
    if (!landingPageId.trim() && !finalHtml.trim()) {
      setErrorMsg('Please attach or design a Landing Page');
      return;
    }
    persistChanges({
      landingPageId,
      landingPageName,
      landingPageContent: finalHtml
    });
    navigate('/start-campaign/training');
  };

  const handleGoBack = () => {
    const finalHtml = rawHtmlMode ? rawHtmlCode : activeHtmlRef.current;
    persistChanges({
      landingPageId,
      landingPageName,
      landingPageContent: finalHtml
    });
    navigate('/start-campaign/email');
  };

  const stepsList = CAMPAIGN_STEPS || [
    { id: 'scenario', step: 1, titleLine1: 'Choose A', titleLine2: 'Scenario' },
    { id: 'details', step: 2, titleLine1: 'Details &', titleLine2: 'Settings' },
    { id: 'email', step: 3, titleLine1: 'Campaign', titleLine2: 'Email' },
    { id: 'landing', step: 4, titleLine1: 'Landing', titleLine2: 'Page' },
    { id: 'training', step: 5, titleLine1: 'Add Training', titleLine2: 'Path' },
    { id: 'review', step: 6, titleLine1: 'Review &', titleLine2: 'Publish' }
  ];

  // Helper to compile final HTML payload for full preview
  const getRenderablePreviewHtml = () => {
    const sourceHtml = rawHtmlMode
      ? rawHtmlCode
      : (editorCanvasRef.current ? editorCanvasRef.current.innerHTML : activeHtmlRef.current);

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>
      * { box-sizing: border-box; }
      html, body { margin: 0; padding: 0; width: 100%; min-height: 100vh; font-family: 'Segoe UI', Arial, sans-serif; background: #ffffff; }
    </style></head><body>${
      (sourceHtml || '')
        .replace(/{{userName}}/g, draft.userName || 'Abhay H S')
        .replace(/{{email}}/g, 'abhay.hs1@vodafone.com')
        .replace(/{{department}}/g, 'AI & Data Analytics')
        .replace(/{{phishLink}}/g, '#training')
    }</body></html>`;
  };

  // =========================================================================
  // 🌟 RIBBON TOOLBAR & ZERO-SCROLL INSET CANVAS WORKSPACE
  // =========================================================================
  const renderEditorWorkspace = (expanded = false) => (
    <div className={`w-full rounded-2xl border border-[#202127] dark:border-white/20 bg-[#202127] dark:bg-white shadow-xs flex flex-col relative z-20 ${
      expanded ? 'h-[calc(100vh-80px)]' : 'flex-1 min-h-[240px] max-h-[340px]'
    }`}>
      {/* 🌟 Single-Row Comfortable Height Toolbar (h-10) with exact dark & light theme styling */}
      <div className="w-full h-10 px-2.5 py-1 flex items-center justify-between text-white select-none bg-[#202127] dark:bg-white border-b border-white/10 dark:border-black/10 rounded-t-xl relative z-30 flex-nowrap overflow-visible">
        <div className="flex items-center gap-1.5 text-xs flex-nowrap flex-shrink-0">
          
          {/* Format Block */}
          <select
            onMouseDown={() => saveSelection()}
            onChange={(e) => handleFormatBlock(e.target.value)}
            className="px-1 py-1 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
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
            className="px-1 py-1 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
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
            className="px-1 py-1 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer"
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
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Bold"
          >
            <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('italic'); }} 
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Italic"
          >
            <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('underline'); }} 
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Underline"
          >
            <Underline className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('strikeThrough'); }} 
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Strikethrough"
          >
            <Strikethrough className="w-3.5 h-3.5" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('removeFormat'); }} 
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-slate-400 hover:text-white dark:text-slate-500 dark:hover:text-black" 
            title="Clear Formatting"
          >
            <RemoveFormatting className="w-3.5 h-3.5" />
          </button>
          
          <span className="text-white/25 dark:text-black/25 mx-0.5">|</span>

          {/* Alignment */}
          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('justifyLeft'); }} 
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Align Left"
          >
            <AlignLeft className="w-3.5 h-3.5" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('justifyCenter'); }} 
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Align Center"
          >
            <AlignCenter className="w-3.5 h-3.5" />
          </button>

          <button 
            type="button" 
            onMouseDown={(e) => { e.preventDefault(); runCommand('justifyRight'); }} 
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 cursor-pointer bg-[#181A20] dark:bg-white text-white dark:text-black" 
            title="Align Right"
          >
            <AlignRight className="w-3.5 h-3.5" />
          </button>

          {/* Text Color */}
          <label className="flex items-center gap-0.5 cursor-pointer p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 relative" title="Text Color">
            <Palette className="w-3.5 h-3.5 text-[#E60000]" />
            <input
              type="color"
              onChange={(e) => runCommand('foreColor', e.target.value)}
              className="w-3.5 h-3.5 rounded cursor-pointer opacity-0 absolute inset-0"
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
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 text-blue-400 cursor-pointer"
            title="Upload Image"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              const url = prompt('Enter Destination URL:', '{{phishLink}}');
              if (url) runCommand('createLink', url);
            }}
            className="p-1 rounded hover:bg-white/10 dark:hover:bg-black/10 text-emerald-400 cursor-pointer"
            title="Insert Link"
          >
            <LinkIcon className="w-3.5 h-3.5" />
          </button>

          {/* 🌟 Compact Width Add Component Dropdown (Decreased width to fit single line) */}
          <select
            onChange={(e) => {
              if (e.target.value) {
                insertComponent(e.target.value);
                e.target.value = '';
              }
            }}
            className="px-1 py-1 rounded bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 text-[9px] font-bold border outline-none cursor-pointer w-[118px] max-w-[138px] truncate"
            defaultValue=""
            title="Insert Designed Component Block"
          >
            <option value="" disabled>+ Add component</option>
            <option value="primary-btn">Primary Button</option>
            <option value="secondary-btn">Corporate Button</option>
            <option value="warning-banner">Alert Banner</option>
            <option value="two-cols">2-Col Grid</option>
            <option value="divider">Divider</option>
          </select>

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

        {/* Right side: PREVIEW, HTML Code & Expand */}
        <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto pl-2">
          {/* 🌟 PREVIEW Button launching 100vw x 100vh full browser preview */}
          <button
            type="button"
            onClick={handleLaunchFullScreenPreview}
            className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-[8px] font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-all hover:scale-105 active:scale-95"
            title="Preview Landing Page in Full Browser Window"
          >
            <Eye className="w-3 h-2.5" />
            PREVIEW
          </button>

          <button
            type="button"
            onClick={handleToggleCodeMode}
            className={`px-2 py-1 rounded border text-[8px] font-bold flex items-center gap-1 cursor-pointer ${
              rawHtmlMode 
                ? 'bg-[#E60000] text-white border-[#E60000]' 
                : 'bg-[#181A20] dark:bg-white text-white dark:text-black border-white/20 dark:border-black/20 hover:bg-white/10'
            }`}
            title="Toggle HTML Source Code"
          >
            <Code className="w-3 h-3" />
            {rawHtmlMode ? 'Visual' : 'HTML'}
          </button>

          <button
            type="button"
            onClick={() => setIsEditorExpanded(!isEditorExpanded)}
            className="hover:text-[#E60000] text-white dark:text-black cursor-pointer transition-colors p-1 rounded hover:bg-white/10 dark:hover:bg-black/10"
            title={expanded ? 'Minimize Screen' : 'Expand Full Screen'}
          >
            {expanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* 🌟 Inset Canvas Container (Framed on Left, Right & Bottom by outer container) */}
      <div className="flex-1 min-h-0 mx-2.5 mb-2.5 rounded-xl border border-white/20 dark:border-black/15 overflow-hidden bg-white dark:bg-[#15161A] flex flex-col shadow-inner">
        {rawHtmlMode ? (
          <textarea
            value={rawHtmlCode}
            onChange={(e) => {
              setRawHtmlCode(e.target.value);
              activeHtmlRef.current = e.target.value;
              persistChanges({ landingPageContent: e.target.value });
            }}
            className="w-full h-full p-3 font-mono-tech text-xs bg-[#0F172A] text-emerald-400 outline-none resize-none leading-relaxed"
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
                persistChanges({ landingPageContent: activeHtmlRef.current });
              }
            }}
            className="w-full h-full outline-none cursor-text text-slate-900 dark:text-slate-100 overflow-y-auto p-0 leading-normal text-xs rich-editor-canvas"
          />
        )}
      </div>
    </div>
  );

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: VODAFONE_FONT_STYLE }} />

      {/* Screen Shell */}
      <div
        style={{ zoom: VarStartCampaignScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 h-[calc(109vh)] overflow-hidden"
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

          {/* ── 3. MAIN WORKSPACE WITH 2 HORIZONTAL TIERS (NO SCROLL VIEWPORT) ── */}
          <div className="flex-1 min-h-0 overflow-hidden p-3.5 sm:p-4 flex flex-col justify-between gap-3">
            
            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 🌟 TOP ROW: CAPSULE + METRICS + ATTACH ANY OTHER + CREATE NEW  */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="w-full flex flex-col md:flex-row items-stretch gap-3 flex-shrink-0">
              
              {/* 1. Left Isolated Purple Capsule */}
              <div
                className={`w-full md:w-[155px] p-3 rounded-2xl flex flex-col justify-between shadow-xs flex-shrink-0 ${
                  isDark ? 'bg-[#E9D5FF] text-slate-900' : 'bg-[#E9D5FF] text-slate-900'
                }`}
              >
                <div>
                  <h3 className="text-[15px] mb-1 font-voda font-bold tracking-tight leading-tight">
                    Landing<br />Page
                  </h3>
                </div>
                <p className="text-[8.5px] font-medium leading-snug opacity-80 mt-1">
                  {isStartFresh
                    ? 'A Default landing Page has been already selected, however you can change it'
                    : 'A Landing Page has been already selected via the selected Scenario, however you can change it'}
                </p>
              </div>

              {/* 2. Middle Read-Only Details Box (LP ID & LP Name) */}
              <div
                className="flex-1 rounded-2xl p-3 px-4 flex flex-col justify-center gap-3 mb-1"
              >
                <div className="flex items-center gap-3">
                  <label className="text-[13px] font-voda font-bold text-slate-800 dark:text-slate-200 w-24 flex-shrink-0 leading-tight">
                    Landing<br />Page ID
                  </label>
                  <div className={`flex-1 h-7 px-3.5 rounded-lg flex items-center text-[11px] font-mono-tech font-bold ${
                    isDark ? 'bg-[#15161A] text-slate-300' : 'bg-[#f1f5f7] text-slate-700'
                  }`}>
                    {landingPageId}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <label className="text-[13px] font-voda font-bold text-slate-800 dark:text-slate-200 w-24 flex-shrink-0 leading-tight">
                    Landing<br />Page Name
                  </label>
                  <div className={`flex-1 h-10 px-3.5 rounded-lg flex items-center text-[11px] font-medium self-start text-left truncate ${
                    isDark ? 'bg-[#15161A] text-slate-200' : 'bg-[#f1f5f7] text-slate-900'
                  }`}>
                    {landingPageName}
                  </div>
                </div>
              </div>

              {/* 3. "Attach any other" Action Card (Clipped 10% bottom & right) */}
              <div
                onClick={() => setIsAttachModalOpen(true)}
                className={`w-full md:w-[155px] p-3 rounded-2xl flex flex-col justify-between shadow-xs cursor-pointer hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden select-none ${
                  isDark ? 'bg-[#164E63] text-cyan-100' : 'bg-[#CFFAFE] text-slate-900'
                }`}
                title="Choose from Existing Landing Page Catalogue"
              >
                <div className="z-10">
                  <h4 className="text-[15px] mb-1 font-voda font-bold tracking-tight leading-tight">
                    Attach any<br />other
                  </h4>
                  <p className="text-[9px] font-medium leading-tight opacity-75 mt-1 max-w-[90px]">
                    Select any other Landing Page from existing Catalogue
                  </p>
                </div>

                {/* 3D Asset clipped 10% bottom & 10% right */}
                <div className="absolute -right-[5%] -bottom-[5%] w-[62px] h-[62px] pointer-events-none select-none flex items-center justify-center overflow-hidden z-0">
                  <img
                    src={attachAnyOtherImg || '/assets/AttachAnyOtherStartNewCampaign.png'}
                    alt="Attach any other"
                    className="w-full h-full object-contain filter drop-shadow-md"
                    onError={(e) => {
                      e.currentTarget.src = '/assets/AttachAnyOtherStartNewCampaign.png';
                    }}
                  />
                </div>
              </div>

              {/* 4. "Create New One" Action Card (Clipped 10% bottom & right) */}
              <div
                onClick={handleCreateNewLandingPage}
                className={`w-full md:w-[155px] p-3 rounded-2xl flex flex-col justify-between shadow-xs cursor-pointer hover:scale-[1.02] active:scale-95 transition-all relative overflow-hidden select-none ${
                  isDark ? 'bg-[#7C2D12] text-amber-100' : 'bg-[#FED7AA] text-slate-900'
                }`}
                title="Design a Fresh Landing Page in Catalogue"
              >
                <div className="z-10">
                  <h4 className="text-[15px] mb-1 font-voda font-bold tracking-tight leading-tight">
                    Create New<br />One
                  </h4>
                  <p className="text-[9px] font-medium leading-tight opacity-75 mt-1 max-w-[90px]">
                    Design a fresh new Landing Page on a Canvas and Save it
                  </p>
                </div>

                {/* 3D Asset clipped 10% bottom & 10% right */}
                <div className="absolute -right-[5%] -bottom-[5%] w-[62px] h-[62px] pointer-events-none select-none flex items-center justify-center overflow-hidden z-0">
                  <img
                    src={createNewOneImg || '/assets/CreateNewOneStartNewCampaign.png'}
                    alt="Create New One"
                    className="w-full h-full object-contain filter drop-shadow-md"
                    onError={(e) => {
                      e.currentTarget.src = '/assets/CreateNewOneStartNewCampaign.png';
                    }}
                  />
                </div>
              </div>

            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 🌟 BOTTOM ROW: ADVANCED RICH TEXT EDITOR (ZERO-SCROLL SIZED)   */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="w-full flex-1 min-h-0 flex flex-col">
              {renderEditorWorkspace(false)}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* 🌟 BOTTOM BAR: BACK & NEXT ACTION BUTTONS                      */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="flex items-center justify-end gap-2.5 pt-2 -mt-2 -mb-1 border-black/5 dark:border-white/10">
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

        {/* ========================================================================= */}
        {/* ── 🌟 COMPLETE BROWSER-SCREEN LIVE PREVIEW VIA REACT PORTAL               */}
        {/* ========================================================================= */}
        {isFullScreenLivePreview &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              id="landing-page-fullscreen-viewport"
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2147483647,
                backgroundColor: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                margin: 0,
                padding: 0,
                overflow: 'hidden'
              }}
            >
              {/* Floating Top Left Button: "Go Back" */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: '16px',
                  zIndex: 2147483647
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsFullScreenLivePreview(false)}
                  className="px-4 py-2 rounded-xl bg-black hover:bg-black/80 text-white font-voda font-bold text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-2xl hover:scale-105 active:scale-95 transition-all border border-white/30"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  Go Back
                </button>
              </div>

              {/* Floating Top Right Button: Exit Close 'X' */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: '16px',
                  zIndex: 2147483647
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsFullScreenLivePreview(false)}
                  className="p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md border border-white/20 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  title="Close Live Preview"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* 100% Full-Viewport Interactive Simulation Preview */}
              <iframe
                title="Full Screen Live Landing Page"
                srcDoc={getRenderablePreviewHtml()}
                style={{
                  width: '100vw',
                  height: '100vh',
                  border: 'none',
                  margin: 0,
                  padding: 0,
                  display: 'block',
                  backgroundColor: '#ffffff'
                }}
              />
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 🌟 FULLSCREEN MODAL PORTAL FOR EXPANDED RICH EDITOR                    */}
        {/* ========================================================================= */}
        {isEditorExpanded &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[2147483647] bg-white dark:bg-black p-4 flex flex-col justify-between">
              <div className="w-full flex-1 flex flex-col overflow-hidden">
                {renderEditorWorkspace(true)}
              </div>
              <div className="flex justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsEditorExpanded(false)}
                  className="px-6 py-2 rounded-xl bg-[#E60000] hover:bg-red-700 text-white font-voda font-bold text-xs uppercase cursor-pointer shadow-lg"
                >
                  Done Editing
                </button>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 🌟 "ATTACH ANY OTHER" CATALOGUE SELECTOR MODAL (PORTALED)              */}
        {/* ========================================================================= */}
        {isAttachModalOpen &&
          typeof document !== 'undefined' &&
          createPortal(
            <div className="fixed inset-0 z-[2147483646] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
              <div className="w-full max-w-5xl max-h-[85vh] bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-white/15">
                {/* Modal Header */}
                <div className="px-5 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-[#121418]">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-voda font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                      Attach Landing Page From Catalogue
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAttachModalOpen(false)}
                    className="p-1 rounded-lg text-slate-500 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Templates Grid */}
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 bg-slate-50 dark:bg-[#0c0d10]">
                  {catalogues.map((item) => {
                    const isSelected = getItemId(item) === landingPageId;
                    return (
                      <div
                        key={getItemId(item)}
                        className={`relative rounded-xl overflow-hidden border shadow-sm flex flex-col justify-between h-[210px] transition-all bg-white dark:bg-[#1A1C23] ${
                          isSelected ? 'ring-2 ring-[#E60000] border-transparent' : 'border-slate-200 dark:border-white/10'
                        }`}
                      >
                        {/* Scaled Preview Frame */}
                        <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
                          <iframe
                            title={getItemName(item)}
                            srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;display:flex;align-items:center;justify-content:center;text-align:center;font-family:'Segoe UI',Arial,sans-serif;}</style></head><body>${getItemContent(item)}</body></html>`}
                            className="w-[200%] h-[200%] border-none"
                            style={{
                              transform: 'scale(0.5)',
                              transformOrigin: 'top left'
                            }}
                            sandbox="allow-same-origin"
                          />
                        </div>

                        {/* Top ID badge */}
                        <div className="relative z-10 p-2.5 flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold bg-black text-white dark:bg-white dark:text-black shadow-xs">
                            {getItemId(item)}
                          </span>
                        </div>

                        {/* Bottom Card Footer */}
                        <div className="relative z-10 m-2 p-2 px-3 rounded-lg bg-white/90 dark:bg-black/80 backdrop-blur-xs border border-black/10 dark:border-white/10 flex items-center justify-between gap-2">
                          <div className="flex flex-col min-w-0 flex-1">
                            <span className="text-[11px] font-voda font-bold truncate text-slate-900 dark:text-white">
                              {getItemName(item)}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleSelectCatalogueItem(item)}
                            className="px-2.5 py-1 rounded-md bg-[#E60000] hover:bg-red-700 text-white font-voda font-bold text-[9.5px] uppercase tracking-wide cursor-pointer flex items-center gap-1 shadow-xs"
                          >
                            <span>Select</span>
                            <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>,
            document.body
          )}
      </div>
    </>
  );
};

export default LandingPageDetails;