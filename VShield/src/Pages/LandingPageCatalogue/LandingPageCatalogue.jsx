import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import {
  Search,
  Plus,
  ArrowLeft,
  Eye,
  Check,
  X,
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
  Edit3,
  Trash2,
  Maximize2,
  Minimize2,
  AlertTriangle,
  Monitor
} from 'lucide-react';
import LandingPageCatalogues from './LandingPageCatalogues.json';

// =========================================================================
// 🎛️ SCALE & THEME CONSTANTS
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

const VIEW_GALLERY = 'VIEW_GALLERY';
const VIEW_EDITOR = 'VIEW_EDITOR';

const LandingPageCatalogue = () => {
  const location = useLocation();
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

  // Data Store with safe JSON fallback
  const [catalogues, setCatalogues] = useState(() => {
    try {
      const stored = localStorage.getItem('voisshield_landing_pages');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
      return LandingPageCatalogues?.landingPages || [];
    } catch {
      return LandingPageCatalogues?.landingPages || [];
    }
  });

  // Keep localStorage synchronized
  useEffect(() => {
    try {
      localStorage.setItem('voisshield_landing_pages', JSON.stringify(catalogues));
    } catch (e) {
      console.error('Failed to save to localStorage:', e);
    }
  }, [catalogues]);

  // View & Filter States (Directly lands in Editor mode if navigated with createNew state)
  const shouldOpenCreateImmediately = Boolean(location.state?.createNew || location.state?.openCreate);
  const [currentView, setCurrentView] = useState(() => shouldOpenCreateImmediately ? VIEW_EDITOR : VIEW_GALLERY);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('Name'); // 'Name' or 'ID'
  const [previewModalItem, setPreviewModalItem] = useState(null);
  const [deleteConfirmationItem, setDeleteConfirmationItem] = useState(null);
  const [toastMessage, setToastMessage] = useState('');

  // Editor States
  const [editorId, setEditorId] = useState(null);
  const [pageName, setPageName] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [rawHtmlMode, setRawHtmlMode] = useState(false);
  const [rawHtmlCode, setRawHtmlCode] = useState('');
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  // Persistent HTML Ref ensuring canvas content survives portal unmounts / expand toggles
  const blankStarter = `
    <div style="min-height: 380px; width: 100%; display: flex; align-items: center; justify-content: center; text-align: center; background: transparent; padding: 40px 20px; box-sizing: border-box;">
      <div style="font-family: 'Vodafone ExB', 'Montserrat', Arial, sans-serif; font-size: 28px; font-weight: 900; color: #94a3b8; letter-spacing: 0.5px; opacity: 0.75;">
        Design Canvas
      </div>
    </div>
  `;
  const activeHtmlRef = useRef(shouldOpenCreateImmediately ? blankStarter : '');

  // Save Modal & Fullscreen Preview States
  const [showSaveChoiceModal, setShowSaveChoiceModal] = useState(false);
  const [isFullScreenLivePreview, setIsFullScreenLivePreview] = useState(false);
  const [stagedHtmlForPreview, setStagedHtmlForPreview] = useState('');

  const editorCanvasRef = useRef(null);
  const imageInputRef = useRef(null);

  // Synchronously restore canvas content when entering editor or toggling expand/portal
  useLayoutEffect(() => {
    if (currentView === VIEW_EDITOR && !rawHtmlMode && editorCanvasRef.current) {
      editorCanvasRef.current.innerHTML = activeHtmlRef.current;
    }
  }, [currentView, isEditorExpanded, rawHtmlMode]);

  // Lock Body Overflow When Fullscreen Live Preview OR Designer Expansion is Active
  useEffect(() => {
    if (isFullScreenLivePreview || isEditorExpanded) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isFullScreenLivePreview, isEditorExpanded]);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 2500);
  };

  // Safe Property Extractors
  const getItemId = (item) => item?.LandingPageID || item?.landingPageId || item?.id || '';
  const getItemName = (item) => item?.LandingPageName || item?.landingPageName || item?.name || '';
  const getItemDesc = (item) => item?.LandingPageDescription || item?.landingPageDescription || item?.description || '';
  const getItemContent = (item) => item?.LandingPageContent || item?.landingPageContent || item?.content || '';
  const getItemDate = (item) => item?.CreatedDate || item?.createdDate || item?.date || '';

  // Formatter for timestamp: dd/mm/yyyy hh:mm am/pm
  const getFormattedTimestamp = () => {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${day}/${month}/${year} ${strHours}:${minutes} ${ampm}`;
  };

  // Compute Next ID based on highest existing index
  const getNextAvailableId = () => {
    let highestNum = 0;
    catalogues.forEach((c) => {
      const idStr = getItemId(c);
      const match = idStr.match(/LP-(\d+)/i);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > highestNum) highestNum = num;
      }
    });
    return `LP-${String(highestNum + 1).padStart(3, '0')}`;
  };

  // Open Editor for Creating New: Blank canvas with centered "Design Canvas"
  const handleOpenCreate = () => {
    setEditorId(null);
    setPageName('');
    setPageDescription('');
    setRawHtmlCode('');
    setRawHtmlMode(false);
    setIsEditorExpanded(false);
    activeHtmlRef.current = blankStarter;
    setCurrentView(VIEW_EDITOR);
  };

  // Open Editor for Modifying Existing
  const handleOpenEdit = (item) => {
    const content = getItemContent(item);
    setEditorId(getItemId(item));
    setPageName(getItemName(item));
    setPageDescription(getItemDesc(item));
    setRawHtmlCode(content);
    setRawHtmlMode(false);
    setIsEditorExpanded(false);
    activeHtmlRef.current = content;
    setCurrentView(VIEW_EDITOR);
  };

  // Delete Action
  const handleDeleteItem = (id) => {
    setCatalogues((prev) => {
      const updated = prev.filter((item) => getItemId(item) !== id);
      try {
        localStorage.setItem('voisshield_landing_pages', JSON.stringify(updated));
      } catch (e) {
        console.error(e);
      }
      return updated;
    });
    setDeleteConfirmationItem(null);
    showToast(`Deleted ${id}`);
  };

  // Toggle Expand Safely without losing canvas content
  const handleToggleExpand = () => {
    if (!rawHtmlMode && editorCanvasRef.current) {
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
    } else if (rawHtmlMode) {
      activeHtmlRef.current = rawHtmlCode;
    }
    setIsEditorExpanded((prev) => !prev);
  };

  // Execute Rich Text Command
  const runCommand = (command, value = null) => {
    if (rawHtmlMode) return;
    document.execCommand(command, false, value);
    if (editorCanvasRef.current) {
      editorCanvasRef.current.focus();
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
    }
  };

  // Insert Custom Component Blocks
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
        html = `<div style="max-width: 680px; margin: 24px auto; display: flex; gap: 20px; flex-wrap: wrap; text-align: left;"><div style="flex: 1; min-width: 260px; background: #F8FAFC; padding: 18px; border-radius: 10px; border: 1px solid #E2E8F0;"><h4 style="margin: 0 0 6px 0; color: #1E293B; font-weight: 800;">What Happened?</h4><p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">You engaged with a simulated email test run by Information Security to evaluate organization readiness.</p></div><div style="flex: 1; min-width: 260px; background: #F8FAFC; padding: 18px; border-radius: 10px; border: 1px solid #E2E8F0;"><h4 style="margin: 0 0 6px 0; color: #1E293B; font-weight: 800;">Next Steps</h4><p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.5;">Complete the brief assigned training module to learn how to identify identical phishing lures.</p></div></div>`;
        break;
      case 'divider':
        html = `<hr style="border: none; border-top: 1px solid rgba(0,0,0,0.12); margin: 28px auto; max-width: 680px;" />`;
        break;
      default:
        break;
    }

    runCommand('insertHTML', html);
    if (editorCanvasRef.current) {
      activeHtmlRef.current = editorCanvasRef.current.innerHTML;
    }
  };

  // Insert Link Prompt
  const promptInsertLink = () => {
    const url = prompt('Enter Destination URL (e.g., https://learning.vodafone.com):', '#training');
    if (url) {
      runCommand('createLink', url);
    }
  };

  // Device Image Upload (Converts to Base64)
  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml'].includes(file.type)) {
      showToast('Please upload a valid PNG, JPG, or JPEG file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result;
      if (typeof base64 === 'string') {
        const imgHtml = `<img src="${base64}" alt="Security Graphic" style="max-width: 100%; height: auto; border-radius: 8px; margin: 16px auto; display: block;" />`;
        runCommand('insertHTML', imgHtml);
        if (editorCanvasRef.current) {
          activeHtmlRef.current = editorCanvasRef.current.innerHTML;
        }
        showToast('Image inserted onto canvas');
      }
    };
    reader.readAsDataURL(file);
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
    }
  };

  // Initial trigger for Save: opens the choice dialogue
  const handleInitiateSave = () => {
    let name = pageName.trim();
    if (!name) {
      const fallbackPrompt = prompt('Please enter a Landing Page Name:', currentDisplayId ? `Landing Page ${currentDisplayId}` : 'New Landing Page');
      if (!fallbackPrompt || !fallbackPrompt.trim()) {
        showToast('Please specify a Landing Page Name');
        return;
      }
      name = fallbackPrompt.trim();
      setPageName(name);
    }

    const htmlContent = rawHtmlMode
      ? rawHtmlCode
      : editorCanvasRef.current
      ? editorCanvasRef.current.innerHTML
      : activeHtmlRef.current || '';

    if (!htmlContent.trim()) {
      showToast('Landing Page canvas cannot be empty!');
      return;
    }

    activeHtmlRef.current = htmlContent;
    setStagedHtmlForPreview(htmlContent);
    setShowSaveChoiceModal(true);
  };

  // Commit Save Action
  const handleCommitSubmit = () => {
    const htmlContent =
      stagedHtmlForPreview ||
      activeHtmlRef.current ||
      (rawHtmlMode ? rawHtmlCode : editorCanvasRef.current?.innerHTML || '');

    if (editorId) {
      setCatalogues((prev) => {
        const updated = prev.map((item) =>
          getItemId(item) === editorId
            ? {
                ...item,
                LandingPageName: pageName.trim() || getItemName(item),
                LandingPageDescription: pageDescription.trim(),
                LandingPageContent: htmlContent
              }
            : item
        );
        try {
          localStorage.setItem('voisshield_landing_pages', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
      showToast(`Updated '${pageName.trim()}'`);
    } else {
      const newId = getNextAvailableId();
      const newPage = {
        LandingPageID: newId,
        LandingPageName: pageName.trim() || `Landing Page ${newId}`,
        LandingPageDescription: pageDescription.trim() || 'Custom created security awareness landing page.',
        CreatedDate: getFormattedTimestamp(),
        LandingPageContent: htmlContent
      };

      setCatalogues((prev) => {
        const updated = [newPage, ...prev];
        try {
          localStorage.setItem('voisshield_landing_pages', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
      showToast(`Created '${newId}' successfully!`);
    }

    setShowSaveChoiceModal(false);
    setIsFullScreenLivePreview(false);
    setIsEditorExpanded(false);
    setPageName('');
    setPageDescription('');
    setEditorId(null);
    activeHtmlRef.current = '';
    setCurrentView(VIEW_GALLERY);
  };

  // 🌟 Full Browser Screen Preview (Takes full browser viewport without OS native fullscreen)
  const handleLaunchFullScreenPreview = () => {
    setShowSaveChoiceModal(false);
    setIsFullScreenLivePreview(true);
  };

  // Filter Catalogues
  const filteredCatalogues = catalogues.filter((item) => {
    const id = getItemId(item).toLowerCase();
    const name = getItemName(item).toLowerCase();
    const desc = getItemDesc(item).toLowerCase();
    const q = (searchQuery || '').trim().toLowerCase();

    if (!q) return true;
    if (searchFilter === 'ID') {
      return id.includes(q);
    }
    return name.includes(q) || desc.includes(q);
  });

  const currentDisplayId = editorId || getNextAvailableId();

  // Helper function to render the editor workspace
  const renderEditorContent = () => (
    <div
      className={`w-full flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden ${
        isEditorExpanded
          ? 'w-screen h-screen p-4 bg-slate-100 dark:bg-[#0c0d10] fixed inset-0'
          : ''
      }`}
      style={isEditorExpanded ? { zIndex: 2147483640 } : {}}
    >
      {/* ── 1. TOP BENTO ROW: REQUIRED DETAILS CARD (Hidden when expanded) ── */}
      {!isEditorExpanded && (
        <div
          className={`w-full p-3 rounded-2xl border flex flex-col md:flex-row items-stretch gap-4 flex-shrink-0 shadow-2xs ${
            isDark ? 'bg-[#1F2128] border-white/5' : 'bg-[#ffffff] border-slate-200'
          }`}
        >
          {/* Isolated Solid Black Title Box */}
          <div className="w-full md:w-[155px] p-3 rounded-xl bg-black text-white flex flex-col justify-between flex-shrink-0 shadow-xs">
            <div>
              <h3 className="text-[12.5px] font-voda-exb leading-tight tracking-tight uppercase">
                Required<br />Details
              </h3>
            </div>
            <p className="text-[8px] text-slate-300 font-medium leading-tight mt-2">
              Fill in the required details to store a landing page and to use it in future
            </p>
          </div>

          {/* Middle Inputs: Landing Page ID & Landing Page Name */}
          <div className="w-full md:w-[380px] flex flex-col justify-center gap-2.5 flex-shrink-0">
            {/* Landing Page ID */}
            <div className="flex items-center gap-2">
              <label className="text-[11.5px] font-voda-exb text-slate-800 dark:text-slate-100 w-24 flex-shrink-0 leading-tight">
                Landing<br />Page ID
              </label>
              <div
                className={`flex-1 h-8 px-3.5 rounded-lg flex items-center text-[10.5px] font-mono-tech font-bold select-none ${
                  isDark ? 'bg-[#15161A] text-slate-300' : 'bg-[#E9EEF4] text-slate-600'
                }`}
              >
                {currentDisplayId}
              </div>
            </div>

            {/* Landing Page Name */}
            <div className="flex items-center gap-2">
              <label className="text-[11.5px] font-voda-exb text-slate-800 dark:text-slate-100 w-24 flex-shrink-0 leading-tight">
                Landing<br />Page Name
              </label>
              <div
                className={`flex-1 h-8 px-3.5 rounded-lg flex items-center ${
                  isDark ? 'bg-[#15161A] text-white' : 'bg-[#E9EEF4] text-slate-900'
                }`}
              >
                <input
                  type="text"
                  value={pageName}
                  onChange={(e) => setPageName(e.target.value)}
                  placeholder="Type here"
                  className="w-full bg-transparent text-[11px] font-medium outline-none placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Right Input: Description */}
          <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
            <label className="text-[11.5px] font-voda-exb text-slate-800 dark:text-slate-100">
              Description
            </label>
            <div
              className={`w-full h-[52px] p-2.5 px-3.5 rounded-lg flex items-start ${
                isDark ? 'bg-[#15161A] text-white' : 'bg-[#E9EEF4] text-slate-900'
              }`}
            >
              <textarea
                rows={2}
                value={pageDescription}
                onChange={(e) => setPageDescription(e.target.value)}
                placeholder="Type here"
                className="w-full h-full bg-transparent text-[11px] font-medium outline-none resize-none placeholder-slate-400 leading-snug"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 2. ULTIMATE ADVANCED CAPABILITIES CANVAS CONTAINER ── */}
      <div className="w-full flex-1 min-h-0 rounded-2xl bg-black dark:bg-[#1F2128] border border-black flex flex-col overflow-hidden shadow-sm">
        {/* Full Ribbon Toolbar */}
        <div className="w-full px-3 py-1.5 flex flex-wrap items-center justify-between gap-1 text-white flex-shrink-0 select-none bg-black dark:bg-[#1F2128] border-b border-white/10">
          <div className="flex flex-wrap items-center gap-1 text-xs">
            {/* Headings */}
            <select
              onChange={(e) => runCommand('formatBlock', e.target.value)}
              className="px-2 py-0.5 rounded bg-[#181A20] text-[10px] font-bold text-white border border-white/20 outline-none cursor-pointer"
              title="Block Format"
            >
              <option value="<p>">Paragraph</option>
              <option value="<h1>">Heading 1</option>
              <option value="<h2>">Heading 2</option>
              <option value="<h3>">Heading 3</option>
              <option value="<h4>">Heading 4</option>
              <option value="<blockquote>">Quote Block</option>
            </select>

            {/* Font Family */}
            <select
              onChange={(e) => runCommand('fontName', e.target.value)}
              className="px-2 py-0.5 rounded bg-[#181A20] text-[10px] font-bold text-white border border-white/20 outline-none cursor-pointer"
              title="Font Family"
            >
              <option value="'Vodafone ExB', 'Montserrat', Arial, sans-serif">Vodafone ExB</option>
              <option value="'Segoe UI', Arial, sans-serif">Segoe UI</option>
              <option value="'Inter', sans-serif">Inter</option>
              <option value="'Montserrat', sans-serif">Montserrat</option>
              <option value="'JetBrains Mono', monospace">Mono Tech</option>
            </select>

            {/* Font Size */}
            <select
              onChange={(e) => runCommand('fontSize', e.target.value)}
              className="px-1.5 py-0.5 rounded bg-[#181A20] text-[10px] font-bold text-white border border-white/20 outline-none cursor-pointer"
              title="Font Size"
            >
              <option value="3">Size 14px</option>
              <option value="1">Size 11px</option>
              <option value="2">Size 12px</option>
              <option value="4">Size 18px</option>
              <option value="5">Size 24px</option>
              <option value="6">Size 32px</option>
              <option value="7">Size 42px</option>
            </select>

            <span className="text-white/25 mx-0.5">|</span>

            {/* Formatting Buttons */}
            <button
              type="button"
              onClick={() => runCommand('bold')}
              className="p-1 rounded hover:bg-white/10 font-black cursor-pointer text-white"
              title="Bold"
            >
              <Bold className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('italic')}
              className="p-1 rounded hover:bg-white/10 italic cursor-pointer text-white"
              title="Italic"
            >
              <Italic className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('underline')}
              className="p-1 rounded hover:bg-white/10 underline cursor-pointer text-white"
              title="Underline"
            >
              <Underline className="w-3.5 h-3.5 stroke-[2.5]" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('strikeThrough')}
              className="p-1 rounded hover:bg-white/10 line-through cursor-pointer text-white"
              title="Strikethrough"
            >
              <Strikethrough className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('subscript')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
              title="Subscript"
            >
              <Subscript className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('superscript')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
              title="Superscript"
            >
              <Superscript className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('removeFormat')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-slate-400 hover:text-white"
              title="Clear Formatting"
            >
              <RemoveFormatting className="w-3.5 h-3.5" />
            </button>

            <span className="text-white/25 mx-0.5">|</span>

            {/* Alignments */}
            <button
              type="button"
              onClick={() => runCommand('justifyLeft')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
              title="Align Left"
            >
              <AlignLeft className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('justifyCenter')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
              title="Align Center"
            >
              <AlignCenter className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('justifyRight')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
              title="Align Right"
            >
              <AlignRight className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('justifyFull')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
              title="Justify"
            >
              <AlignJustify className="w-3.5 h-3.5" />
            </button>

            <span className="text-white/25 mx-0.5">|</span>

            {/* Lists & Indentation */}
            <button
              type="button"
              onClick={() => runCommand('insertUnorderedList')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
              title="Bullet List"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('insertOrderedList')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
              title="Numbered List"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('indent')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
              title="Increase Indent"
            >
              <Indent className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => runCommand('outdent')}
              className="p-1 rounded hover:bg-white/10 cursor-pointer text-white"
              title="Decrease Indent"
            >
              <Outdent className="w-3.5 h-3.5" />
            </button>

            <span className="text-white/25 mx-0.5">|</span>

            {/* Color Pickers */}
            <label className="flex items-center gap-1 cursor-pointer p-1 rounded hover:bg-white/10 text-[10px] font-bold text-white" title="Text Color">
              <Palette className="w-3.5 h-3.5 text-[#E60000]" />
              <input
                type="color"
                onChange={(e) => runCommand('foreColor', e.target.value)}
                className="w-4 h-4 rounded cursor-pointer opacity-0 absolute pointer-events-auto"
              />
              <span>Text</span>
            </label>

            <label className="flex items-center gap-1 cursor-pointer p-1 rounded hover:bg-white/10 text-[10px] font-bold text-white" title="Highlight / Fill Color">
              <Highlighter className="w-3.5 h-3.5 text-amber-400" />
              <input
                type="color"
                defaultValue="#FFF1F2"
                onChange={(e) => runCommand('hiliteColor', e.target.value)}
                className="w-4 h-4 rounded cursor-pointer opacity-0 absolute pointer-events-auto"
              />
              <span>Highlight</span>
            </label>

            <span className="text-white/25 mx-0.5">|</span>

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
              onClick={() => imageInputRef.current?.click()}
              className="px-2 py-0.5 rounded bg-[#181A20] hover:bg-white/20 border border-white/20 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
              title="Upload & Embed Local Image"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              Image
            </button>

            <button
              type="button"
              onClick={promptInsertLink}
              className="px-2 py-0.5 rounded bg-[#181A20] hover:bg-white/20 border border-white/20 text-[10px] font-bold text-white flex items-center gap-1 cursor-pointer"
              title="Insert Link"
            >
              <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
              Link
            </button>

            <span className="text-white/25 mx-0.5">|</span>

            {/* Components Menu */}
            <select
              onChange={(e) => {
                if (e.target.value) {
                  insertComponent(e.target.value);
                  e.target.value = '';
                }
              }}
              className="px-2 py-0.5 rounded bg-[#181A20] text-[10px] font-bold text-white border border-white/20 outline-none cursor-pointer"
              defaultValue=""
              title="Insert Designed Elements"
            >
              <option value="" disabled>+ Add Component</option>
              <option value="primary-btn">Primary Action Button (Red)</option>
              <option value="secondary-btn">Corporate Button (Blue)</option>
              <option value="warning-banner">Alert Warning Banner</option>
              <option value="two-cols">2-Column Layout Grid</option>
              <option value="divider">Horizontal Divider</option>
            </select>
          </div>

          {/* Right: Code Toggle & Expand */}
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={handleToggleCodeMode}
              className={`px-2 py-0.5 rounded border text-[10px] font-bold flex items-center gap-1 cursor-pointer ${
                rawHtmlMode
                  ? 'bg-[#E60000] text-white border-[#E60000]'
                  : 'bg-[#181A20] text-white border-white/20 hover:bg-white/10'
              }`}
              title="Toggle Raw HTML Source Code"
            >
              <Code className="w-3 h-3" />
              {rawHtmlMode ? 'Visual Mode' : 'HTML Code'}
            </button>

            <button
              type="button"
              onClick={handleToggleExpand}
              className="hover:text-[#E60000] cursor-pointer transition-colors p-1 rounded hover:bg-white/10"
              title={isEditorExpanded ? 'Minimize Screen' : 'Expand Full Screen'}
            >
              {isEditorExpanded ? (
                <Minimize2 className="w-3.5 h-3.5 stroke-[2.5]" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 stroke-[2.5]" />
              )}
            </button>
          </div>
        </div>

        {/* Main White Bordered Canvas Area */}
        <div className="flex-1 min-h-0 mx-2.5 mb-2.5 rounded-xl border border-white/20 overflow-hidden bg-white flex flex-col shadow-inner">
          {rawHtmlMode ? (
            <textarea
              value={rawHtmlCode}
              onChange={(e) => {
                setRawHtmlCode(e.target.value);
                activeHtmlRef.current = e.target.value;
              }}
              className="w-full h-full p-4 rounded-xl font-mono-tech text-xs bg-[#0F172A] text-emerald-400 outline-none resize-none leading-relaxed"
              placeholder="Enter custom HTML code here..."
            />
          ) : (
            <div
              ref={editorCanvasRef}
              contentEditable
              suppressContentEditableWarning
              onInput={() => {
                if (editorCanvasRef.current) {
                  activeHtmlRef.current = editorCanvasRef.current.innerHTML;
                }
              }}
              className="w-full h-full overflow-y-auto outline-none cursor-text shadow-sm [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:bg-black/20"
              style={{ minHeight: isEditorExpanded ? 'calc(100vh - 120px)' : '360px' }}
            />
          )}
        </div>
      </div>

      {/* ── 3. BOTTOM BUTTONS (With BACK button to the left of SAVE when expanded) ── */}
      <div className="flex items-center justify-center gap-3 pt-0.5 flex-shrink-0">
        {isEditorExpanded && (
          <button
            type="button"
            onClick={handleToggleExpand}
            className="px-6 py-1.5 rounded-md bg-slate-700 hover:bg-slate-800 text-white font-voda-exb text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            Back
          </button>
        )}

        <button
          type="button"
          onClick={handleInitiateSave}
          className="px-10 py-1.5 rounded-md bg-[#84cc16] hover:bg-[#65a30d] text-white font-voda-exb text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          SAVE
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{VODAFONE_FONT_STYLE}</style>

      <div
        style={{ zoom: VarUserDLsScale }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 h-[calc(108vh-0px)] overflow-hidden"
      >
        {/* ========================================================================= */}
        {/* ── 1. TOP HEADER BAR: "LANDING PAGE CATALOGUE"                            */}
        {/* ========================================================================= */}
        <div
          className={`w-full py-2.5 px-6 -mt-2 rounded-xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none ${
            isDark ? 'bg-[#ffffff] text-white border-white/10' : 'bg-[#000000] text-white border-black/10'
          }`}
        >
          <div className="flex items-center gap-3">
            {currentView === VIEW_EDITOR && (
              <button
                type="button"
                onClick={() => setCurrentView(VIEW_GALLERY)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Back to Catalogue"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5] rounded-md text-white dark:text-black" />
              </button>
            )}
            <h1 className="text-[14px] font-voda font-bold tracking-tight text-white dark:text-black uppercase">
              LANDING PAGE CATALOGUE
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[13px] font-voda font-bold tracking-tight text-white/80 dark:text-black/80">
              {currentView === VIEW_GALLERY
                ? '-- Oops! You Have Been Phished Templates'
                : '-- Design Landing Page in Canvas Designer'}
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 VIEW 1: GALLERY VIEW (Includes Info Strip and Main Container)       */}
        {/* ========================================================================= */}
        {currentView === VIEW_GALLERY && (
          <>
            <div className="flex flex-col gap-3 h-full overflow-hidden">
              {/* Top Controls: Search Bar + "SEARCH BY" Dropdown + "CREATE NEW" Button */}
              <div className="flex items-center justify-between gap-3 flex-shrink-0">
                <div className="flex items-center gap-2.5">
                  {/* Search Pill */}
                  <div
                    className={`flex items-center rounded-xl overflow-hidden border shadow-2xs ${
                      isDark ? 'bg-[#ffffff] text-black border-white/10' : 'bg-[#000000] text-slate-900 border-slate-300/80'
                    }`}
                  >
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type here"
                      className={`px-3.5 py-1.5 text-[11px] font-medium bg-transparent outline-none w-56 ${
                        isDark ? 'text-white dark:text-black placeholder-slate-400' : 'text-slate-900 placeholder-slate-500'
                      }`}
                    />
                    <div className={`h-4 w-px ${isDark ? 'bg-white/20' : 'bg-slate-300'}`} />
                    <select
                      value={searchFilter}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className={`px-3 py-1.5 text-[10px] font-voda font-bold uppercase bg-transparent outline-none cursor-pointer pr-4 ${
                        isDark ? 'text-black/70' : 'text-white/90'
                      }`}
                    >
                      <option value="Name" className={isDark ? 'bg-[#15161A] text-black' : 'bg-white text-slate-900'}>
                        SEARCH BY NAME
                      </option>
                      <option value="ID" className={isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'}>
                        SEARCH BY ID
                      </option>
                    </select>
                  </div>

                  {/* CREATE NEW BUTTON */}
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="px-3.5 py-1.5 rounded-xl bg-[#E60000] hover:bg-[#cc0000] text-white text-[10.5px] font-voda font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    Create New
                  </button>
                </div>

                <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Total Templates: <strong>{filteredCatalogues.length}</strong>
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredCatalogues.map((item) => (
                  <div
                    key={getItemId(item)}
                    className={`relative rounded-2xl overflow-hidden border shadow-sm flex flex-col justify-between h-[215px] group transition-all select-none ${
                      isDark ? 'border-white/10 hover:border-white/25 bg-slate-900' : 'border-slate-200 hover:border-slate-300 bg-slate-100'
                    }`}
                  >
                    {/* Center-Aligned HTML Canvas */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
                      <iframe
                        title={getItemName(item)}
                        srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
                          * { box-sizing: border-box; }
                          html, body {
                            margin: 0;
                            padding: 0;
                            width: 100%;
                            height: 100%;
                            overflow: hidden;
                          }
                          body {
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: transparent;
                          }
                          body > * {
                            width: 100% !important;
                            height: 100% !important;
                            min-height: 100% !important;
                            margin: 0 auto !important;
                            display: flex !important;
                            flex-direction: column !important;
                            justify-content: center !important;
                            align-items: center !important;
                            text-align: center !important;
                            padding: 16px 24px !important;
                          }
                        </style></head><body>${getItemContent(item)}</body></html>`}
                        className="w-[200%] h-[200%] border-none pointer-events-none select-none"
                        style={{
                          transform: 'scale(0.5)',
                          transformOrigin: 'top left'
                        }}
                        sandbox="allow-same-origin"
                      />
                    </div>

                    {/* Top Floating Overlays */}
                    <div className="relative z-10 p-2.5 flex items-center justify-between pointer-events-auto">
                      <span
                        className={`px-2.5 py-1 rounded-lg text-[10.5px] font-voda-exb tracking-wide shadow-sm border ${
                          isDark ? 'bg-[#202127]/80 text-white border-white/15' : 'bg-[#ffffff]/85 text-slate-900 border-slate-300/80'
                        }`}
                      >
                        {getItemId(item)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className={`p-1.5 rounded-lg shadow-sm border hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                            isDark
                              ? 'bg-[#202127]/80 text-white border-white/15 hover:bg-[#202127]'
                              : 'bg-[#ffffff]/85 text-slate-900 border-slate-300/80 hover:bg-white'
                          }`}
                          title="Edit in Designer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmationItem(item)}
                          className={`p-1.5 rounded-lg shadow-sm border hover:scale-105 active:scale-95 transition-all cursor-pointer ${
                            isDark
                              ? 'bg-[#202127]/80 text-red-400 border-white/15 hover:bg-red-500/20'
                              : 'bg-[#ffffff]/85 text-red-600 border-slate-300/80 hover:bg-red-50'
                          }`}
                          title="Delete Landing Page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Floating Themed Dock */}
                    <div
                      className={`relative z-10 m-2.5 p-2 px-3 rounded-xl border shadow-md flex items-center justify-between gap-2.5 pointer-events-auto ${
                        isDark ? 'bg-[#202127]/80 border-white/15 text-white' : 'bg-[#ffffff]/85 border-slate-300/80 text-slate-900'
                      }`}
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className={`text-[12px] font-voda-exb truncate leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}
                          title={getItemName(item)}
                        >
                          {getItemName(item)}
                        </span>
                        <span className={`text-[9px] font-mono-tech mt-0.5 truncate font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                          {getItemDate(item)}
                        </span>
                      </div>

                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewModalItem(item)}
                        className="px-3 py-1 rounded-lg bg-black text-white dark:bg-white dark:text-black font-voda-exb text-[10px] uppercase tracking-wider shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 flex items-center gap-1.5"
                      >
                        <Eye className="w-3 h-3" />
                        Preview
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* ========================================================================= */}
        {/* ── 🌟 VIEW 2: DESIGN LANDING PAGE CANVAS (DIRECT VIEWPORT RENDERING)      */}
        {/* ========================================================================= */}
        {currentView === VIEW_EDITOR && !isEditorExpanded && renderEditorContent()}

        {/* ── 🌟 PORTALED EXPANDED VIEW (When user clicks Fullscreen on Designer) ── */}
        {currentView === VIEW_EDITOR &&
          isEditorExpanded &&
          typeof document !== 'undefined' &&
          createPortal(renderEditorContent(), document.body)}

        {/* ========================================================================= */}
        {/* ── 🌟 SAVE CHOICE DIALOGUE MODAL (PORTALED TO PREVENT ANY Z-INDEX HIDING) */}
        {/* ========================================================================= */}
        {showSaveChoiceModal &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2147483646,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}
            >
              <div className="w-full max-w-md bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/15 p-5 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-voda-exb text-slate-900 dark:text-white uppercase tracking-tight">
                      Confirm Landing Page Save
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Choose how you want to proceed with saving your landing page:
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSaveChoiceModal(false)}
                    className="p-1 rounded-lg text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleLaunchFullScreenPreview}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer group"
                  >
                    <Monitor className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    <span className="text-[11.5px] font-voda-exb text-slate-900 dark:text-white uppercase">
                      Full Screen Preview
                    </span>
                    <span className="text-[9px] text-slate-400">
                      Test live browser viewport
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCommitSubmit}
                    className="p-3.5 rounded-xl bg-[#84cc16] hover:bg-[#65a30d] text-white flex flex-col items-center justify-center gap-1.5 transition-all text-center cursor-pointer shadow-sm group hover:scale-[1.02]"
                  >
                    <Check className="w-5 h-5 stroke-[3] text-white group-hover:scale-110 transition-transform" />
                    <span className="text-[11.5px] font-voda-exb text-white uppercase">
                      Submit
                    </span>
                    <span className="text-[9px] text-white/80">
                      Save to catalogue gallery
                    </span>
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 🌟 COMPLETE BROWSER SCREEN LIVE PREVIEW VIA REACT PORTAL               */}
        {/* ========================================================================= */}
        {isFullScreenLivePreview &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              id="lp-fullscreen-viewport-portal"
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
              {/* Floating Top Left Button: "Go Back & Submit" */}
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
                  onClick={handleCommitSubmit}
                  className="px-4 py-2 rounded-xl bg-[#84cc16] hover:bg-[#65a30d] text-white font-voda-exb text-xs uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-2xl hover:scale-105 active:scale-95 transition-all border border-white/30"
                >
                  <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                  Go Back & Submit
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
                  title="Exit Preview"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* 100% Full-Viewport Interactive Simulation Preview */}
              <iframe
                title="Full Screen Live Landing Page"
                srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>html,body{margin:0;padding:0;width:100%;min-height:100vh;}</style></head><body>${stagedHtmlForPreview}</body></html>`}
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
        {/* ── 🌟 DELETE CONFIRMATION MODAL (PORTALED)                                */}
        {/* ========================================================================= */}
        {deleteConfirmationItem &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 2147483646,
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                backdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '16px'
              }}
            >
              <div className="w-full max-w-sm bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden shadow-2xl border border-slate-200 dark:border-white/15 p-5 flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center gap-2.5 text-red-500">
                  <AlertTriangle className="w-5 h-5" />
                  <h3 className="text-sm font-voda font-bold uppercase tracking-tight">
                    Delete Landing Page
                  </h3>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300">
                  Are you sure you want to delete <strong>{getItemName(deleteConfirmationItem)}</strong> ({getItemId(deleteConfirmationItem)})? This action cannot be undone.
                </p>
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmationItem(null)}
                    className="px-3.5 py-1.5 rounded-lg border border-slate-300 dark:border-white/10 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(getItemId(deleteConfirmationItem))}
                    className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-voda font-bold uppercase cursor-pointer shadow-sm"
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            </div>,
            document.body
          )}

        {/* ========================================================================= */}
        {/* ── 4. FULLSCREEN GALLERY PREVIEW MODAL                                    */}
        {/* ========================================================================= */}
        {previewModalItem && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="w-full max-w-4xl max-h-[90vh] bg-white dark:bg-[#181A20] rounded-2xl overflow-hidden flex flex-col shadow-2xl border border-white/15">
              <div className="px-5 py-3 border-b border-black/10 dark:border-white/10 flex items-center justify-between bg-slate-100 dark:bg-[#121418]">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono-tech font-bold bg-black text-white dark:bg-white dark:text-black">
                    {getItemId(previewModalItem)}
                  </span>
                  <h3 className="text-xs font-voda-exb text-slate-900 dark:text-white uppercase truncate">
                    {getItemName(previewModalItem)}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewModalItem(null)}
                  className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-500 hover:text-black dark:hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-auto bg-slate-900 p-2">
                <iframe
                  title="Landing Page Preview"
                  srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body style="margin:0;padding:0;">${getItemContent(previewModalItem)}</body></html>`}
                  className="w-full h-[540px] border-none rounded-xl bg-white"
                />
              </div>

              <div className="px-5 py-2.5 border-t border-black/10 dark:border-white/10 flex items-center justify-between bg-slate-50 dark:bg-[#121418] text-[11px]">
                <span className="text-slate-500 font-mono-tech">
                  Timestamp: {getItemDate(previewModalItem)}
                </span>
                <button
                  type="button"
                  onClick={() => setPreviewModalItem(null)}
                  className="px-4 py-1.5 rounded-lg bg-black text-white dark:bg-white dark:text-black font-voda-exb text-xs uppercase cursor-pointer"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* ── 5. TOAST NOTIFICATION (PORTALED)                                      */}
        {/* ========================================================================= */}
        {toastMessage &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              style={{
                position: 'fixed',
                bottom: '24px',
                right: '24px',
                zIndex: 2147483647
              }}
              className="px-4 py-2 rounded-xl bg-[#2E7D32] text-white text-xs font-voda font-bold shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3 duration-200"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              {toastMessage}
            </div>,
            document.body
          )}
      </div>
    </>
  );
};

export default LandingPageCatalogue;