import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import Toast from '../../GlobalComponents/Toast';
import {
  Plus,
  ArrowLeft,
  Eye,
  X,
  Edit3,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import LandingPageCatalogues from './LandingPageCatalogues.json';
import { api } from '../../services/api';
import LandingPageDesigner from './LandingPageDesigner';
import LandingPageRichTextEditor from './LandingPageRichTextEditor';
import { PAGE_SCALE } from '../../shared/SharedStyles';
import { APP_URL } from '../../appConfig';
import {
  MAX_LANDING_BYTES,
  exportLandingHtml,
  landingBytes,
  splitCanvasBg
} from '../../services/landingHtml';

// =========================================================================
// 🎛️ SCALE & THEME CONSTANTS
// =========================================================================
const VarOverallRoundednessScale = 0.5;

const VODAFONE_FONT_STYLE =
  "@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Montserrat:wght@700;800;900&family=Plus+Jakarta+Sans:wght@700;800;900&family=JetBrains+Mono:wght@500;600;700&display=swap');\n" +
  ".font-voda-exb { font-family: 'Vodafone ExB', 'Montserrat', 'Plus Jakarta Sans', sans-serif; font-weight: 900; }\n" +
  ".font-mono-tech { font-family: 'JetBrains Mono', monospace; }\n" +
  ".rounded-3xl { border-radius: " + Math.round(24 * VarOverallRoundednessScale) + "px !important; }\n" +
  ".rounded-2xl { border-radius: " + Math.round(18 * VarOverallRoundednessScale) + "px !important; }\n" +
  ".rounded-xl  { border-radius: " + Math.round(14 * VarOverallRoundednessScale) + "px !important; }\n" +
  ".rounded-lg  { border-radius: " + Math.round(10 * VarOverallRoundednessScale) + "px !important; }\n" +
  ".rounded-md  { border-radius: " + Math.round(6 * VarOverallRoundednessScale) + "px !important; }\n";

const VIEW_GALLERY = 'VIEW_GALLERY';
const VIEW_EDITOR = 'VIEW_EDITOR';

const LandingPageCatalogue = () => {
  const location = useLocation();
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
    const checkDark = () => {
      const hasDarkClass = document.documentElement.classList.contains('dark');
      setIsDark(hasDarkClass || !!userContext.isDark);
    };
    checkDark();
    const observer = new MutationObserver(checkDark);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [userContext.isDark]);

  // Backed by the API (bundled JSON is only a fallback if it is unreachable).
  const [catalogues, setCatalogues] = useState([]);
  const [isLoadingCatalogues, setIsLoadingCatalogues] = useState(true);

  const [toast, setToast] = useState(null);
  const showToast = (msg, type = 'info', title) => {
    setToast({ message: msg, type, title, duration: 3000 });
  };

  useEffect(() => {
    let active = true;
    api.landingPages
      .list()
      .then((rows) => {
        if (active) setCatalogues(Array.isArray(rows) ? rows : []);
      })
      .catch((e) => {
        console.error('Failed to load landing pages', e);
        if (!active) return;
        setCatalogues(LandingPageCatalogues?.landingPages || []);
        // Say so: these are bundled samples, and changes to them won't save.
        setToast({
          message: 'Could not reach the server. Showing sample landing pages; changes may not save.',
          type: 'warning',
          title: 'Offline',
          duration: 6000,
        });
      })
      .finally(() => {
        if (active) setIsLoadingCatalogues(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // View & Filter States (Directly lands in Editor mode if navigated with createNew state)
  const shouldOpenCreateImmediately = Boolean(location.state?.createNew || location.state?.openCreate);
  const [currentView, setCurrentView] = useState(() => (shouldOpenCreateImmediately ? VIEW_EDITOR : VIEW_GALLERY));
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilter, setSearchFilter] = useState('Name'); // 'Name' or 'ID'
  const [previewModalItem, setPreviewModalItem] = useState(null);
  const [deleteConfirmationItem, setDeleteConfirmationItem] = useState(null);

  // Editor States
  const [editorId, setEditorId] = useState(null);
  const [pageName, setPageName] = useState('');
  const [pageDescription, setPageDescription] = useState('');
  const [isEditorExpanded, setIsEditorExpanded] = useState(false);

  // Persistent HTML Ref ensuring canvas content survives portal unmounts / expand toggles
  const activeHtmlRef = useRef('');
  // The page as it was opened, to tell whether leaving would lose changes.
  const editorBaselineRef = useRef({ name: '', description: '', html: '' });
  // One save at a time (a double click must not create two pages).
  const savingRef = useRef(false);
  const [editorHtml, setEditorHtml] = useState('');

  // Save Modal & Fullscreen Preview States
  const [showSaveChoiceModal, setShowSaveChoiceModal] = useState(false);
  const [isFullScreenLivePreview, setIsFullScreenLivePreview] = useState(false);
  const [stagedHtmlForPreview, setStagedHtmlForPreview] = useState('');

  // Lock Body Overflow When Fullscreen Preview OR Designer Expansion is Active
  useEffect(() => {
    if (isFullScreenLivePreview || isEditorExpanded || previewModalItem) {
      const prevBodyOverflow = document.body.style.overflow;
      const prevHtmlOverflow = document.documentElement.style.overflow;
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prevBodyOverflow;
        document.documentElement.style.overflow = prevHtmlOverflow;
      };
    }
  }, [isFullScreenLivePreview, isEditorExpanded, previewModalItem]);

  // Safe Property Extractors
  const getItemId = (item) => item?.LandingPageID || item?.landingPageId || item?.id || '';
  const getItemName = (item) => item?.LandingPageName || item?.landingPageName || item?.name || '';
  const getItemDesc = (item) => item?.LandingPageDescription || item?.landingPageDescription || item?.description || '';
  const getItemContent = (item) => item?.LandingPageContent || item?.landingPageContent || item?.content || '';
  const getItemDate = (item) => item?.CreatedDate || item?.createdDate || item?.date || '';

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
    return 'LP-' + String(highestNum + 1).padStart(3, '0');
  };

  // Open Editor for Creating New: Blank canvas
  const handleOpenCreate = () => {
    setEditorId(null);
    setPageName('');
    setPageDescription('');
    setIsEditorExpanded(false);
    activeHtmlRef.current = '';
    setEditorHtml('');
    editorBaselineRef.current = { name: '', description: '', html: '' };
    setCurrentView(VIEW_EDITOR);
  };

  // Open Editor for Modifying Existing
  const handleOpenEdit = (item) => {
    const content = getItemContent(item);
    setEditorId(getItemId(item));
    setPageName(getItemName(item));
    setPageDescription(getItemDesc(item));
    setIsEditorExpanded(false);
    activeHtmlRef.current = content;
    setEditorHtml(content);
    editorBaselineRef.current = {
      name: getItemName(item),
      description: getItemDesc(item),
      html: content
    };
    setCurrentView(VIEW_EDITOR);
  };

  const hasUnsavedChanges = () => {
    const base = editorBaselineRef.current;
    if (pageName !== base.name || pageDescription !== base.description) return true;
    // Compared as saved: the editor hands back its editable form of the
    // same page (on blur, expand), which must not count as a change.
    const asSaved = (html) => exportLandingHtml(html || '', { appUrl: APP_URL });
    return asSaved(activeHtmlRef.current) !== asSaved(base.html);
  };

  // Back to the gallery, but never silently throw away unsaved work.
  const handleBackToGallery = () => {
    if (
      hasUnsavedChanges() &&
      !window.confirm('You have unsaved changes to this landing page. Leave without saving?')
    ) {
      return;
    }
    setCurrentView(VIEW_GALLERY);
  };

  // Delete Action
  const handleDeleteItem = (id) => {
    api.landingPages
      .remove(id)
      .then(() => {
        setCatalogues((prev) => prev.filter((item) => getItemId(item) !== id));
        setDeleteConfirmationItem(null);
        showToast('Deleted ' + id, 'success');
      })
      .catch((e) => {
        console.error(e);
        showToast('Could not delete landing page. Please try again.', 'error');
      });
  };

  // Toggle Expand Safely without losing canvas content
  const handleToggleExpand = () => {
    setIsEditorExpanded((prev) => !prev);
  };

  // Initial trigger for Save: opens the choice dialogue
  const handleInitiateSave = () => {
    let name = pageName.trim();
    if (!name) {
      const fallbackPrompt = prompt(
        'Please enter a Landing Page Name:',
        currentDisplayId ? 'Landing Page ' + currentDisplayId : 'New Landing Page'
      );
      if (!fallbackPrompt || !fallbackPrompt.trim()) {
        showToast('Please specify a Landing Page Name', 'warning', 'Input Required');
        return;
      }
      name = fallbackPrompt.trim();
      setPageName(name);
    }

    const htmlContent = activeHtmlRef.current || editorHtml || '';

    if (!htmlContent.trim()) {
      showToast('Landing Page canvas cannot be empty!', 'warning', 'Input Required');
      return;
    }

    // What is saved and previewed is the page as a phished person gets it.
    const exportedHtml = exportLandingHtml(htmlContent, { appUrl: APP_URL });
    const bytes = landingBytes(exportedHtml);
    if (bytes > MAX_LANDING_BYTES) {
      showToast(
        'This landing page is ' + Math.ceil(bytes / 1024) + ' KB; the limit is ' +
          Math.round(MAX_LANDING_BYTES / 1024) + ' KB. Use smaller images.',
        'warning',
        'Too Large'
      );
      return;
    }

    activeHtmlRef.current = htmlContent;
    setStagedHtmlForPreview(exportedHtml);
    setShowSaveChoiceModal(true);
  };

  // Commit Save Action. The editor stays open until the server confirms the
  // save, so a failed save never loses the page.
  const handleCommitSubmit = () => {
    if (savingRef.current) return;
    const htmlContent =
      stagedHtmlForPreview ||
      exportLandingHtml(activeHtmlRef.current || editorHtml || '', { appUrl: APP_URL });
    const savedName = pageName.trim();

    const request = editorId
      ? api.landingPages.update(editorId, {
          LandingPageName: savedName || undefined,
          LandingPageDescription: pageDescription.trim(),
          LandingPageContent: htmlContent
        })
      : // The backend assigns the next LP-00N id.
        api.landingPages.create({
          LandingPageName: savedName || 'Untitled Landing Page',
          LandingPageDescription:
            pageDescription.trim() || 'Custom created security awareness landing page.',
          LandingPageContent: htmlContent
        });

    savingRef.current = true;
    setShowSaveChoiceModal(false);
    setIsFullScreenLivePreview(false);

    request
      .then((saved) => {
        if (editorId) {
          setCatalogues((prev) =>
            prev.map((item) => (getItemId(item) === editorId ? saved : item))
          );
          showToast("Updated '" + savedName + "'", 'success');
        } else {
          setCatalogues((prev) => [saved, ...prev]);
          showToast("Created '" + (saved?.LandingPageID || '') + "' successfully!", 'success');
        }
        setIsEditorExpanded(false);
        setPageName('');
        setPageDescription('');
        setEditorId(null);
        activeHtmlRef.current = '';
        setEditorHtml('');
        editorBaselineRef.current = { name: '', description: '', html: '' };
        setCurrentView(VIEW_GALLERY);

        // Back to the scenario wizard, with the new page attached, when this
        // page was designed from there ("Design a new one").
        const returnToScenario = location.state?.returnToScenario;
        const returnTo = location.state?.returnTo;
        if (!editorId && returnToScenario && returnTo) {
          navigate(returnTo, {
            replace: true,
            state: {
              landingPageCreatedFromScenario: true,
              createdLandingPage: saved
            }
          });
        }
      })
      .catch((e) => {
        console.error(e);
        // The server's reason when it has one (e.g. the page is too large).
        const reason = e?.status && e.status < 500 && e.message ? e.message : 'Please try again.';
        showToast(
          (editorId ? 'Could not save landing page. ' : 'Could not create landing page. ') + reason,
          'error'
        );
      })
      .finally(() => {
        savingRef.current = false;
      });
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
      className={
        'w-full flex-1 min-h-0 flex flex-col gap-2.5 overflow-hidden ' +
        (isEditorExpanded
          ? 'w-screen h-screen p-4 bg-slate-100 dark:bg-[#0c0d10] fixed inset-0'
          : '')
      }
      style={isEditorExpanded ? { zIndex: 2147483640 } : {}}
    >
      {/* ── 1. TOP BENTO ROW: REQUIRED DETAILS CARD (Hidden when expanded) ── */}
      {!isEditorExpanded && (
        <div
          className={
            'w-full p-3 rounded-2xl border flex flex-col md:flex-row items-stretch gap-4 flex-shrink-0 shadow-2xs ' +
            (isDark ? 'bg-[#1F2128] border-white/5' : 'bg-[#ffffff] border-slate-200')
          }
        >
          {/* Isolated Solid Black Title Box */}
          <div className="w-full md:w-[155px] p-3 rounded-xl bg-black text-white flex flex-col justify-between flex-shrink-0 shadow-xs">
            <div>
              <h3 className="text-[14px] font-bold leading-tight tracking-normal">
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
              <label className="text-[11.5px] font-voda font-bold text-slate-800 dark:text-slate-100 w-24 flex-shrink-0 leading-tight">
                Landing<br />Page ID
              </label>
              <div
                className={
                  'flex-1 h-8 px-3.5 rounded-lg flex items-center text-[10.5px] font-mono-tech font-bold select-none ' +
                  (isDark ? 'bg-[#15161A] text-slate-300' : 'bg-[#E9EEF4] text-slate-600')
                }
              >
                {String(currentDisplayId)}
              </div>
            </div>

            {/* Landing Page Name */}
            <div className="flex items-center gap-2">
              <label className="text-[11.5px] font-voda font-bold text-slate-800 dark:text-slate-100 w-24 flex-shrink-0 leading-tight">
                Landing<br />Page Name
              </label>
              <div
                className={
                  'flex-1 h-8 px-3.5 rounded-lg flex items-center ' +
                  (isDark ? 'bg-[#15161A] text-white' : 'bg-[#E9EEF4] text-slate-900')
                }
              >
                <input
                  type="text"
                  value={String(pageName)}
                  onChange={(e) => setPageName(e.target.value)}
                  placeholder="Type here"
                  className="w-full bg-transparent text-[11px] font-medium outline-none placeholder-slate-400"
                />
              </div>
            </div>
          </div>

          {/* Right Input: Description */}
          <div className="flex-1 flex flex-col justify-center gap-1 min-w-0">
            <label className="text-[11.5px] font-voda font-bold text-slate-800 dark:text-slate-100">
              Description
            </label>
            <div
              className={
                'w-full h-[52px] p-2.5 px-3.5 rounded-lg flex items-start ' +
                (isDark ? 'bg-[#15161A] text-white' : 'bg-[#E9EEF4] text-slate-900')
              }
            >
              <textarea
                rows={2}
                value={String(pageDescription)}
                onChange={(e) => setPageDescription(e.target.value)}
                placeholder="Type here"
                className="w-full h-full bg-transparent text-[11px] font-medium outline-none resize-none placeholder-slate-400 leading-snug"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── 2. ULTIMATE ADVANCED CAPABILITIES CANVAS CONTAINER ── */}
      <LandingPageRichTextEditor
        value={String(editorHtml)}
        onChange={(html) => {
          setEditorHtml(html);
          activeHtmlRef.current = html;
        }}
        fullHeight
        isExpanded={Boolean(isEditorExpanded)}
        onToggleExpand={() => handleToggleExpand()}
      />

      {/* ── 3. BOTTOM BUTTONS (With BACK button to the left of SAVE when expanded) ── */}
      <div className="flex items-center justify-center gap-3 pt-0.5 flex-shrink-0">
        {isEditorExpanded && (
          <button
            type="button"
            onClick={() => handleToggleExpand()}
            className="px-6 py-1.5 rounded-md bg-slate-700 hover:bg-slate-800 text-white font-voda font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer flex items-center gap-1.5 hover:scale-105 active:scale-95"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            Back
          </button>
        )}

        <button
          type="button"
          onClick={() => handleInitiateSave()}
          className="px-10 py-1.5 rounded-md bg-[#84cc16] hover:bg-[#65a30d] text-white font-voda font-bold text-xs uppercase tracking-wider shadow-sm transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          SAVE
        </button>
      </div>
    </div>
  );

  return (
    <>
      <style>{String(VODAFONE_FONT_STYLE)}</style>

      <div
        style={{ zoom: PAGE_SCALE }}
        className="w-full max-w-[1780px] mx-auto p-3 sm:p-3.5 -mt-2 select-none font-sans flex flex-col gap-2.5 h-[calc(108vh-0px)] overflow-hidden"
      >
        {/* ========================================================================= */}
        {/* ── 1. TOP HEADER BAR: "LANDING PAGE CATALOGUE"                            */}
        {/* ========================================================================= */}
        <div
          className={
            'w-full h-[40px] py-2.5 px-6 -mt-2 rounded-2xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm select-none ' +
            (isDark ? 'bg-[#ffffff] text-white border-white/10' : 'bg-[#000000] text-white border-black/10')
          }
        >
          <div className="flex items-center gap-3">
            {currentView === VIEW_EDITOR && (
              <button
                type="button"
                onClick={() => handleBackToGallery()}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
                title="Back to Catalogue"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5] rounded-md text-white dark:text-black" />
              </button>
            )}
            <h1 className="text-[13.5px] font-bold tracking-tight uppercase dark:text-black">
              LANDING PAGE CATALOGUE
            </h1>
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
                    className={
                      'flex items-center rounded-xl overflow-hidden border shadow-2xs ' +
                      (isDark ? 'bg-[#ffffff] text-black border-white/10' : 'bg-[#000000] text-slate-900 border-slate-300/80')
                    }
                  >
                    <input
                      type="text"
                      value={String(searchQuery)}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Type here"
                      className={
                        'px-3.5 py-1.5 text-[11px] font-medium bg-transparent outline-none w-56 ' +
                        (isDark ? 'text-white dark:text-black placeholder-slate-400' : 'text-slate-900 placeholder-slate-500')
                      }
                    />
                    <div className={'h-4 w-px ' + (isDark ? 'bg-white/20' : 'bg-slate-300')} />
                    <select
                      value={String(searchFilter)}
                      onChange={(e) => setSearchFilter(e.target.value)}
                      className={
                        'px-3 py-1.5 text-[10px] font-voda font-bold uppercase bg-transparent outline-none cursor-pointer pr-4 ' +
                        (isDark ? 'text-black/70' : 'text-white/90')
                      }
                    >
                      <option value="Name" className={isDark ? 'bg-[#15161A] text-white' : 'bg-white text-slate-900'}>
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
                    onClick={() => handleOpenCreate()}
                    className="px-3.5 py-1.5 rounded-xl bg-[#E60000] hover:bg-[#cc0000] text-white text-[10.5px] font-voda font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[3]" />
                    Create New
                  </button>
                </div>

                <div className={'text-[11px] ' + (isDark ? 'text-slate-400' : 'text-slate-600')}>
                  Total Templates: <strong>{isLoadingCatalogues ? '…' : filteredCatalogues.length}</strong>
                </div>
              </div>

              {/* Gallery Grid */}
              <div className="auto-rows-[215px] flex-1 min-h-0 overflow-y-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-black/10 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
                {filteredCatalogues.map((item) => (
                  <div
                    key={getItemId(item)}
                    className={
                      'relative rounded-2xl overflow-hidden border shadow-sm flex flex-col justify-between h-[215px] group transition-all select-none ' +
                      (isDark ? 'border-white/10 hover:border-white/25 bg-slate-900' : 'border-slate-200 hover:border-slate-300 bg-slate-100')
                    }
                  >
                    {/* Center-Aligned HTML Canvas */}
                    <div className="absolute inset-0 w-full h-full pointer-events-none select-none overflow-hidden z-0">
                      <iframe
                        title={getItemName(item)}
                        srcDoc={
                          '<!DOCTYPE html><html><head><meta charset="utf-8"/><style>' +
                          '* { box-sizing: border-box; }' +
                          'html, body { margin: 0; padding: 0; width: 100%; height: 100%; overflow: hidden; }' +
                          'body { display: flex; align-items: center; justify-content: center; background: transparent; }' +
                          'body > * { width: 100% !important; height: 100% !important; min-height: 100% !important; margin: 0 auto !important; display: flex !important; flex-direction: column !important; justify-content: center !important; align-items: center !important; text-align: center !important; padding: 16px 24px !important; }' +
                          // A saved canvas colour goes on the body, so the
                          // centring rule below still applies to the page's own blocks.
                          (splitCanvasBg(getItemContent(item)).bg
                            ? 'body { background: ' + splitCanvasBg(getItemContent(item)).bg + ' !important; }'
                            : '') +
                          '</style></head><body>' +
                          splitCanvasBg(getItemContent(item)).html +
                          '</body></html>'
                        }
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
                        className={
                          'px-2.5 py-1 rounded-lg text-[10.5px] font-voda font-bold tracking-wide shadow-sm border ' +
                          (isDark ? 'bg-[#202127]/80 text-white border-white/15' : 'bg-[#ffffff]/85 text-slate-900 border-slate-300/80')
                        }
                      >
                        {getItemId(item)}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {/* Edit Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className={
                            'p-1.5 rounded-lg shadow-sm border hover:scale-105 active:scale-95 transition-all cursor-pointer ' +
                            (isDark
                              ? 'bg-[#202127]/80 text-white border-white/15 hover:bg-[#202127]'
                              : 'bg-[#ffffff]/85 text-slate-900 border-slate-300/80 hover:bg-white')
                          }
                          title="Edit in Designer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete Button */}
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmationItem(item)}
                          className={
                            'p-1.5 rounded-lg shadow-sm border hover:scale-105 active:scale-95 transition-all cursor-pointer ' +
                            (isDark
                              ? 'bg-[#202127]/80 text-red-400 border-white/15 hover:bg-red-500/20'
                              : 'bg-[#ffffff]/85 text-red-600 border-slate-300/80 hover:bg-red-50')
                          }
                          title="Delete Landing Page"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Floating Themed Dock */}
                    <div
                      className={
                        'relative z-10 m-2.5 p-2 px-3 rounded-xl border shadow-md flex items-center justify-between gap-2.5 pointer-events-auto ' +
                        (isDark ? 'bg-[#202127]/80 border-white/15 text-white' : 'bg-[#ffffff]/85 border-slate-300/80 text-slate-900')
                      }
                    >
                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className={'text-[12px] font-voda font-bold truncate leading-tight ' + (isDark ? 'text-white' : 'text-slate-900')}
                          title={getItemName(item)}
                        >
                          {getItemName(item)}
                        </span>
                        <span className={'text-[9px] font-mono-tech mt-0.5 truncate font-semibold ' + (isDark ? 'text-slate-300' : 'text-slate-600')}>
                          {getItemDate(item)}
                        </span>
                      </div>

                      {/* Preview Button */}
                      <button
                        type="button"
                        onClick={() => setPreviewModalItem(item)}
                        className="px-3 py-1 rounded-lg bg-black text-white dark:bg-white dark:text-black font-voda font-bold text-[10px] uppercase tracking-wider shadow-sm transition-all hover:scale-105 active:scale-95 cursor-pointer flex-shrink-0 flex items-center gap-1.5"
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

        <LandingPageDesigner
          currentView={String(currentView)}
          VIEW_EDITOR={String(VIEW_EDITOR)}
          isEditorExpanded={Boolean(isEditorExpanded)}
          renderEditorContent={() => renderEditorContent()}
          showSaveChoiceModal={Boolean(showSaveChoiceModal)}
          setShowSaveChoiceModal={(val) => setShowSaveChoiceModal(val)}
          handleLaunchFullScreenPreview={() => handleLaunchFullScreenPreview()}
          handleCommitSubmit={() => handleCommitSubmit()}
          isFullScreenLivePreview={Boolean(isFullScreenLivePreview)}
          setIsFullScreenLivePreview={(val) => setIsFullScreenLivePreview(val)}
          stagedHtmlForPreview={String(stagedHtmlForPreview)}
        />

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
        {/* ── 4. FULL BROWSER SCREEN PREVIEW (PORTALED TO DOCUMENT.BODY)             */}
        {/* ========================================================================= */}
        {previewModalItem &&
          typeof document !== 'undefined' &&
          createPortal(
            <div
              id="lp-catalogue-fullscreen-preview"
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
              {/* Floating Top Right Close Button */}
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
                  onClick={() => setPreviewModalItem(null)}
                  className="p-2 rounded-xl bg-black/70 hover:bg-black text-white backdrop-blur-md border border-white/20 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-all"
                  title="Close Preview"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>

              {/* 100% Full Browser Viewport Preview */}
              <iframe
                title="Landing Page Preview"
                // No script from the page may run in the app's origin.
                sandbox=""
                srcDoc={
                  '<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width, initial-scale=1"/><style>html,body{margin:0;padding:0;width:100%;min-height:100vh;}</style></head><body>' +
                  getItemContent(previewModalItem) +
                  '</body></html>'
                }
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
        {/* ── 5. TOAST NOTIFICATION                                                  */}
        {/* ========================================================================= */}
        {toast && (
          <Toast
            message={toast.message}
            type={toast.type}
            title={toast.title}
            duration={toast.duration}
            onClose={() => setToast(null)}
          />
        )}
      </div>
    </>
  );
};

export default LandingPageCatalogue;