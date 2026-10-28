import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import {
  Search,
  Trash2,
  Edit3,
  ExternalLink,
  Users,
  X
} from 'lucide-react';

// Assets imported strictly from src/assets/UserListScreenAssets
import BulkUploadImg from '../../assets/UserListScreenAssets/BulkUploadImageUserListsScreen.png';
import CSVIcon from '../../assets/UserListScreenAssets/CSVIconUserListsScreen.png';
import DlUploadImg from '../../assets/UserListScreenAssets/DlUploadImageUserListsScreen.png';
import ExcelIcon from '../../assets/UserListScreenAssets/ExcelIconUserListsScreen.png';
import ExchangeIcon from '../../assets/UserListScreenAssets/ExchangeIconUserListScreens.png';

// Fallback data & master user lookup
import initialUserDLsData from './UserDLsData.json';
import masterUsersData from '../../MasterUserData.json';

// =========================================================================
// 🎛️ SCALE CONTROL & ADJUSTER CONSTANTS
// =========================================================================
export const VarUserDLsScale = 0.94;
export const VarOverallRoundednessScale = 0.6;

// Big White Div Height Adjuster
export const VarBiggerWhiteDivHeight = '100%';
export const VarBiggerWhiteDivHieght = VarBiggerWhiteDivHeight; // Alias for spelling consistency

// L-Shaped Top Cards Precise Dimensions & Gaps
export const VarTopCardHeight = 220; // in px, overall height of each top L-shaped card
export const VarCapsuleWidth = 150;  // in px, width of top-left isolated pill
export const VarCapsuleHeight = 110; // in px, height of top-left isolated pill
export const VarCutoutGap = 8;       // in px, white space gap between capsule and L-shaped container
export const VarFilletSize = 16;     // in px, size of inner concave arc fillet

// Top Section Button Widths & Gap Adjusters
export const VarBulkUploadButtonSectionWidth = '42%';
export const VarDistributionListButtonSectionWidth = '40%';
export const VarBulkAndDLButtonGap = 14; // in px

// 🌟 Top Buttons Hover Pop Animation Adjuster
export const varTopButtonsSectionAnimationAdjuster = 1.0;

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

// Modulo-3 subtle card alternating background for gallery items
const getGalleryCardBg = (index, isDark) => {
  const remainder = index % 3;
  if (isDark) {
    if (remainder === 0) return '#1A1D24';
    if (remainder === 1) return '#201C2C';
    return '#14251F';
  }
  if (remainder === 0) return '#FFF9EE'; // Soft Warm Cream
  if (remainder === 1) return '#F5F3FF'; // Soft Lavender
  return '#EDFAF4';                      // Soft Mint
};

const UserDLsLandingPage = ({ onNavigateToBulkUpload, onNavigateToAddDL }) => {
  const navigate = useNavigate();
  const userContext = useUserType?.() || {};

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

  // Background color for L-shape container matching design
  const lCardBg = isDark ? '#1C1F27' : '#EEF2F6';

  // Computed Cutout Geometry
  const cutoutRight = VarCapsuleWidth + VarCutoutGap; // 158px
  const cutoutBottom = VarCapsuleHeight + VarCutoutGap; // 118px

  // Navigation handlers
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

  // Load User Lists from localStorage or directly from UserDLsData.json
  const [userLists, setUserLists] = useState(() => {
    const seedData = Array.isArray(initialUserDLsData)
      ? initialUserDLsData
      : initialUserDLsData?.savedUserLists || [];
    try {
      const stored = localStorage.getItem('voisshield_user_dls_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If stored data matches structure, use it; otherwise fallback to seed
          return parsed;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return seedData;
  });

  // Gallery Search, Filter & Member Detail Modal
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL'); // 'ALL' | 'Bulk Upload' | 'Distribution List'
  const [selectedListForModal, setSelectedListForModal] = useState(null);

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this User List?')) {
      setUserLists((prev) => {
        const updated = prev.filter((item) => (item.UserListsID || item.id) !== id);
        try {
          localStorage.setItem('voisshield_user_dls_data', JSON.stringify(updated));
        } catch (e) {
          console.error(e);
        }
        return updated;
      });
    }
  };

  const handleEdit = (list) => {
    const targetId = list.UserListsID || list.id;
    const isDL = (list.UploadType || list.type) === 'Distribution List';
    if (isDL) {
      navigate(`/user-lists/add-dl?edit=${targetId}`);
    } else {
      navigate(`/user-lists/bulk-upload?edit=${targetId}`);
    }
  };

  // Filtered gallery lists strictly from userLists state
  const filteredLists = useMemo(() => {
    return userLists.filter((item) => {
      const name = item.UserListName || item.name || '';
      const id = item.UserListsID || item.id || '';
      const desc = item.UserListsDescription || item.description || '';
      const creator = item.CreatedBy || '';
      const type = item.UploadType || item.type || '';

      const matchesSearch =
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        desc.toLowerCase().includes(searchQuery.toLowerCase()) ||
        creator.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesType = typeFilter === 'ALL' || type.toLowerCase() === typeFilter.toLowerCase();
      return matchesSearch && matchesType;
    });
  }, [userLists, searchQuery, typeFilter]);

  // Modal detailed members matched against MasterUserData.json
  const modalMembers = useMemo(() => {
    if (!selectedListForModal) return [];
    const emails = Array.isArray(selectedListForModal.EMailIDs)
      ? selectedListForModal.EMailIDs
      : (selectedListForModal.users || []).map((u) => u.email || u.UserEMailID).filter(Boolean);

    return emails.map((email, idx) => {
      const matched = (masterUsersData || []).find(
        (m) => m.UserEMailID?.toLowerCase() === email?.toLowerCase()
      );
      return {
        srNo: idx + 1,
        email,
        name: matched?.UserName || email.split('@')[0],
        department: matched?.Department || 'Corporate Operations',
        country: matched?.Country || 'GLOBAL',
        hookRate: matched?.['HookRate%'] !== undefined ? `${matched['HookRate%']}%` : '5.0%',
        reportRate: matched?.['ReportRate%'] !== undefined ? `${matched['ReportRate%']}%` : '80.0%'
      };
    });
  }, [selectedListForModal]);

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
        {/* Top Header Bar: "Recipients Lists" */}
        <div
          className={`w-full h-[40px] py-2.5 px-6 -mt-2 rounded-2xl border flex items-center justify-between flex-shrink-0 transition-colors duration-300 shadow-sm ${
            isDark ? 'bg-white text-black border-white/10' : 'bg-[#000000] text-white border-black/10'
          }`}
        >
          <div className="flex items-center gap-3">
            <h1 className="text-[13.5px] font-bold tracking-tight uppercase">
              Recipients Lists
            </h1>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* ── 🌟 LAYER 2: BIG WHITE CONTAINER DIV (FILLS AVAILABLE HEIGHT) ────────── */}
        {/* ========================================================================= */}
        <div
          style={{
            height: typeof VarBiggerWhiteDivHeight === 'number' ? `${VarBiggerWhiteDivHeight}px` : VarBiggerWhiteDivHeight
          }}
          className={`w-full flex-1 min-h-0 rounded-2xl border p-3.5 flex flex-col gap-3 overflow-hidden shadow-xs transition-colors ${
            isDark ? 'bg-[#12141A] border-white/10' : 'bg-white border-slate-200'
          }`}
        >
          {/* ========================================================================= */}
          {/* ── 🌟 LAYER 3: TOP TWO L-SHAPED BENTO ACTION BUTTON CARDS ─────────────── */}
          {/* ========================================================================= */}
          <div 
            style={{ 
              gap: typeof VarBulkAndDLButtonGap === 'number' ? `${VarBulkAndDLButtonGap}px` : VarBulkAndDLButtonGap,
              height: `${VarTopCardHeight}px` 
            }}
            className="w-full flex items-center flex-shrink-0"
          >
            
            {/* ── CARD 1: BULK UPLOAD VIA EXCEL / CSV (TRUE L-SHAPED BENTO) ── */}
            <div 
              role="button"
              tabIndex={0}
              onClick={handleGoToBulkUpload}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGoToBulkUpload();
                }
              }}
              style={{ 
                height: `${VarTopCardHeight}px`,
                width: typeof VarBulkUploadButtonSectionWidth === 'number' ? `${VarBulkUploadButtonSectionWidth}px` : VarBulkUploadButtonSectionWidth,
                flex: `0 0 ${typeof VarBulkUploadButtonSectionWidth === 'number' ? `${VarBulkUploadButtonSectionWidth}px` : VarBulkUploadButtonSectionWidth}`,
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `translateY(-${Math.round(4 * varTopButtonsSectionAnimationAdjuster)}px)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
              className="relative flex flex-col overflow-hidden select-none cursor-pointer group"
            >
              
              {/* 🌟 1. Truly Isolated Sage Green Capsule */}
              <div
                style={{
                  width: `${VarCapsuleWidth}px`,
                  height: `${VarCapsuleHeight}px`,
                  borderRadius: `${Math.round(16 * VarOverallRoundednessScale)}px`
                }}
                className="absolute top-0 left-0 p-3 bg-[#D4EAD6] text-slate-950 flex flex-col justify-between shadow-2xs z-20 overflow-hidden"
              >
                <div className="z-10 leading-tight">
                  <h3 className="text-[14px] font-voda font-bold tracking-tight text-slate-950 leading-tight">
                    Bulk<br />Upload
                  </h3>
                  <p className="text-[8.5px] font-medium text-slate-700 leading-tight mt-3.5 max-w-[80px]">
                    Manually upload as many as target email ids
                  </p>
                </div>

                {/* Cropped Illustration Asset Attached to Corner */}
                <div className="absolute -bottom-2 -right-1 w-16 h-16 pointer-events-none select-none z-0">
                  <img
                    src={BulkUploadImg}
                    alt="Bulk Upload"
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>

              {/* 🌟 2. Concave Arc Fillet (Overlapped by 2px to eliminate animation subpixel seams) */}
              <div 
                style={{
                  top: `${VarCapsuleHeight - VarCutoutGap}px`,
                  left: `${VarCapsuleWidth - VarCutoutGap}px`,
                  width: `${VarFilletSize + 2}px`,
                  height: `${VarFilletSize + 2}px`
                }}
                className="absolute pointer-events-none z-20 overflow-hidden"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18" fill="none">
                  <path d="M 0 16 A 16 16 0 0 0 16 0 H 18 V 18 H 0 Z" fill={lCardBg} />
                </svg>
              </div>

              {/* 🌟 3. Top-Right Arm of L-Shape Container */}
              <div
                style={{
                  backgroundColor: lCardBg,
                  left: `${cutoutRight}px`,
                  height: `${cutoutBottom + 1}px`,
                  borderTopLeftRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`,
                  borderTopRightRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`
                }}
                className="absolute top-0 right-0 px-5 py-3 flex flex-col justify-center z-10 transition-colors"
              >
                <h2 className="text-[14px] font-voda font-bold text-slate-900 -mt-1 dark:text-white leading-snug">
                  Upload User List via an Excel or <br/> CSV File
                </h2>
                <p className="text-[9.5px] mt-2 text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-md">
                  Bulk upload the target (recipient) user email IDs using and Microsoft Excel file or using a CSV file, this files needs to be certain structure and follow the rules of the template
                </p>
              </div>

              {/* 🌟 4. Continuous Bottom Base */}
              <div
                style={{
                  backgroundColor: lCardBg,
                  top: `${cutoutBottom}px`,
                  height: `${VarTopCardHeight - cutoutBottom}px`,
                  borderBottomLeftRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`,
                  borderBottomRightRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`,
                  borderTopLeftRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`
                }}
                className="absolute left-0 right-0 px-5 py-3 flex flex-col justify-end z-10 transition-colors"
              >
                {/* Bottom Row: Icons + Label (Left) and ONE "Go here" Button (Right) */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5">
                      <img
                        src={ExcelIcon}
                        alt="Excel"
                        className="w-5 h-5 object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                      <img
                        src={CSVIcon}
                        alt="CSV"
                        className="w-5 h-5 object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    </div>
                    <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300">
                      Supports Microsoft Excel (.xlsx) and CSV Files (.csv)
                    </span>
                  </div>

                  <button
                    type="button"
                    tabIndex={-1}
                    className="h-5 px-5 rounded-full bg-[#181A20] dark:bg-white group-hover:bg-black dark:group-hover:bg-slate-100 text-white dark:text-black text-[10.5px] font-voda font-bold tracking-tight flex items-center justify-center cursor-pointer shadow-xs transition-all pointer-events-none"
                  >
                    Go here
                  </button>
                </div>
              </div>
            </div>

            {/* ── CARD 2: DISTRIBUTION LISTS (MICROSOFT OUTLOOK DLS) (TRUE L-SHAPED BENTO) ── */}
            <div 
              role="button"
              tabIndex={0}
              onClick={handleGoToAddDL}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleGoToAddDL();
                }
              }}
              style={{ 
                height: `${VarTopCardHeight}px`,
                width: typeof VarDistributionListButtonSectionWidth === 'number' ? `${VarDistributionListButtonSectionWidth}px` : VarDistributionListButtonSectionWidth,
                flex: `0 0 ${typeof VarDistributionListButtonSectionWidth === 'number' ? `${VarDistributionListButtonSectionWidth}px` : VarDistributionListButtonSectionWidth}`,
                transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = `translateY(-${Math.round(4 * varTopButtonsSectionAnimationAdjuster)}px)`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0px)';
              }}
              className="relative flex flex-col overflow-hidden select-none cursor-pointer group"
            >
              
              {/* 🌟 1. Truly Isolated Soft Pastel Blue Capsule */}
              <div
                style={{
                  width: `${VarCapsuleWidth}px`,
                  height: `${VarCapsuleHeight}px`,
                  borderRadius: `${Math.round(16 * VarOverallRoundednessScale)}px`
                }}
                className="absolute top-0 left-0 p-3 bg-[#D4E3F7] text-slate-950 flex flex-col justify-between shadow-2xs z-20 overflow-hidden"
              >
                <div className="z-10 leading-tight">
                  <h3 className="text-[14px] font-voda font-bold tracking-tight text-slate-950 leading-tight">
                    Distribution<br />List
                  </h3>
                  <p className="text-[8.5px] font-medium text-slate-700 leading-tight mt-3.5 max-w-[80px]">
                    It's the storage space for your all training elements
                  </p>
                </div>

                {/* Cropped Illustration Asset Attached to Corner */}
                <div className="absolute -bottom-2 -right-1 w-16 h-16 pointer-events-none select-none z-0">
                  <img
                    src={DlUploadImg}
                    alt="Distribution List"
                    className="w-full h-full object-contain"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                </div>
              </div>

              {/* 🌟 2. Concave Arc Fillet (Overlapped by 2px to eliminate animation subpixel seams) */}
              <div 
                style={{
                  top: `${VarCapsuleHeight - VarCutoutGap}px`,
                  left: `${VarCapsuleWidth - VarCutoutGap}px`,
                  width: `${VarFilletSize + 2}px`,
                  height: `${VarFilletSize + 2}px`
                }}
                className="absolute pointer-events-none z-20 overflow-hidden"
              >
                <svg className="w-[18px] h-[18px]" viewBox="0 0 18 18" fill="none">
                  <path d="M 0 16 A 16 16 0 0 0 16 0 H 18 V 18 H 0 Z" fill={lCardBg} />
                </svg>
              </div>

              {/* 🌟 3. Top-Right Arm of L-Shape Container */}
              <div
                style={{
                  backgroundColor: lCardBg,
                  left: `${cutoutRight}px`,
                  height: `${cutoutBottom + 1}px`,
                  borderTopLeftRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`,
                  borderTopRightRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`
                }}
                className="absolute top-0 right-0 px-5 py-3 flex flex-col justify-center z-10 transition-colors"
              >
                <h2 className="text-[14px] font-voda font-bold text-slate-900 -mt-1 dark:text-white leading-snug">
                  Add User List Via Prepared Distribution <br/> Lists – Microsoft Outlook DLs
                </h2>
                <p className="text-[9.5px] mt-2 text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-md">
                  Here you can fetch the pre created Outlook's Distribution List and store it for running any campaign
                </p>
              </div>

              {/* 🌟 4. Continuous Bottom Base */}
              <div
                style={{
                  backgroundColor: lCardBg,
                  top: `${cutoutBottom}px`,
                  height: `${VarTopCardHeight - cutoutBottom}px`,
                  borderBottomLeftRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`,
                  borderBottomRightRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`,
                  borderTopLeftRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`
                }}
                className="absolute left-0 right-0 px-5 py-3 flex flex-col justify-end z-10 transition-colors"
              >
                {/* Bottom Row: Icon + Label (Left) and ONE "Go here" Button (Right) */}
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <img
                      src={ExchangeIcon}
                      alt="Exchange"
                      className="w-5 h-5 object-contain"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <span className="text-[9.5px] font-bold text-slate-700 dark:text-slate-300">
                      Supports distribution list (DL) created in Outlook, Azure AD or Exchange Admin Center
                    </span>
                  </div>

                  <button
                    type="button"
                    tabIndex={-1}
                    className="h-5 px-5 rounded-full bg-[#181A20] dark:bg-white group-hover:bg-black dark:group-hover:bg-slate-100 text-white dark:text-black text-[10.5px] font-voda font-bold tracking-tight flex items-center justify-center cursor-pointer shadow-xs transition-all pointer-events-none"
                  >
                    Go here
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* ========================================================================= */}
          {/* ── 🌟 LAYER 4: BOTTOM GALLERY CONTAINER (SCROLLS INTERNALLY ONLY) ──────── */}
          {/* ========================================================================= */}
          <div
            style={{
              borderRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`
            }}
            className="w-full flex-1 min-h-0 p-3.5 bg-black flex flex-col gap-2.5 overflow-hidden border border-black/5 dark:border-white/15 transition-colors"
          >
            {/* Gallery Control Bar: Headline, Count Pill, Category Filter & Search */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-black/5 dark:border-white/10 flex-shrink-0">
              
              {/* Left: Headline & Total Counter */}
              <div className="flex items-center gap-2.5">
                <span className="w-1.5 h-3.5 rounded-full bg-[#E60000]" />
                <h3 className="text-[13px] font-voda font-bold text-slate-100 dark:text-white uppercase tracking-tight">
                  Current Recpients Lists Stored  
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-white dark:bg-black text-[9px] font-bold text-slate-800 dark:text-slate-200 font-voda border border-black/5 dark:border-white/10 shadow-2xs">
                  {String(filteredLists.length).padStart(2, '0')} Saved Lists
                </span>
              </div>

              {/* Right: Filter Category Tabs & Live Search */}
              <div className="flex items-center gap-2 flex-wrap">
                
                {/* Category Filter Pills */}
                <div className="flex items-center bg-white/80 dark:bg-black/50 p-0.5 rounded-xl border border-black/5 dark:border-white/10 shadow-2xs">
                  {['ALL', 'Bulk Upload', 'Distribution List'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTypeFilter(tab)}
                      className={`px-3 py-1 rounded-lg text-[8.5px] font-voda font-bold transition-all cursor-pointer ${
                        typeFilter === tab
                          ? 'bg-[#181A20] text-white dark:bg-white dark:text-black shadow-2xs'
                          : 'text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white'
                      }`}
                    >
                      {tab === 'ALL' ? 'All Types' : tab}
                    </button>
                  ))}
                </div>

                {/* Search Input */}
                <div className="relative flex items-center min-w-[220px]">
                  <input
                    type="text"
                    placeholder="Search by ID, name, or creator..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full h-7 pl-3 pr-8 rounded-lg bg-white dark:bg-[#12141A] font-bold text-slate-800 dark:text-slate-200 text-[9px] placeholder-slate-400 outline-none border border-black/5 dark:border-white/10 shadow-2xs"
                  />
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
                </div>

              </div>
            </div>

            {/* 🌟 SCROLLABLE GALLERY FEED (ONLY THIS ELEMENT SCROLLS) */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
              {filteredLists.length === 0 ? (
                <div className="w-full h-48 flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-bold text-slate-400">
                    No user lists found matching the current criteria.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {filteredLists.map((list, idx) => {
                    const cardItemBg = getGalleryCardBg(idx, isDark);
                    const listId = list.UserListsID || list.id;
                    const listName = list.UserListName || list.name;
                    const listType = list.UploadType || list.type || 'Bulk Upload';
                    const userCount = list.TotalEmailIDsCount !== undefined
                      ? list.TotalEmailIDsCount
                      : (list.EMailIDs ? list.EMailIDs.length : (list.totalUsers || 0));
                    const timesUsed = list.NumberofTimesUsed !== undefined ? list.NumberofTimesUsed : (list.usedCount || 0);

                    return (
                      <div
                        key={listId}
                        style={{
                          backgroundColor: cardItemBg,
                          borderRadius: `${Math.round(14 * VarOverallRoundednessScale)}px`
                        }}
                        className="p-3 text-slate-900 dark:text-white shadow-2xs border border-black/5 dark:border-white/5 flex flex-col justify-between gap-2 relative overflow-hidden transition-all hover:shadow-xs group"
                      >
                        {/* Top Line: ID Badge + Type Pill + Action Icons */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-0.5 rounded-full bg-white/95 dark:bg-black/60 text-[8.5px] font-bold text-slate-800 dark:text-slate-100 font-mono-tech flex items-center gap-1 shadow-2xs border border-black/5 dark:border-white/10">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                              {listId}
                            </span>

                            <span className={`px-2 py-0.5 rounded-full text-[7.5px] font-bold ${
                              listType === 'Distribution List'
                                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-300'
                                : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
                            }`}>
                              {listType}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-1">
                            {/* Member View Trigger */}
                            <button
                              type="button"
                              onClick={() => setSelectedListForModal(list)}
                              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="View Recipient Members"
                            >
                              <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                            </button>

                            {/* Edit */}
                            <button
                              type="button"
                              onClick={() => handleEdit(list)}
                              className="p-1 rounded text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                              title="Edit List"
                            >
                              <Edit3 className="w-3.5 h-3.5 stroke-[2.2]" />
                            </button>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleDelete(listId)}
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                              title="Delete List"
                            >
                              <Trash2 className="w-3.5 h-3.5 stroke-[2.2]" />
                            </button>
                          </div>
                        </div>

                        {/* Title & Description */}
                        <div>
                          <h4 className="text-[12px] font-voda font-bold tracking-tight text-slate-900 dark:text-white line-clamp-1">
                            {listName}
                          </h4>
                          <p className="text-[8.5px] font-medium text-slate-600 dark:text-slate-300 leading-snug line-clamp-2 mt-0.5">
                            <strong className="font-bold text-slate-800 dark:text-slate-200">Description: </strong>
                            {list.UserListsDescription || list.description || 'Target simulation cohort group.'}
                          </p>
                        </div>

                        {/* Bottom Metadata */}
                        <div className="pt-2 border-t border-black/5 dark:border-white/5 flex flex-col gap-1">
                          <div className="flex items-center justify-between text-[8.5px] font-bold">
                            <span className="flex items-center gap-1 text-slate-800 dark:text-slate-200">
                              <Users className="w-3 h-3 text-[#E60000]" />
                              <span>Total Recipients: <strong className="font-bold">{userCount}</strong></span>
                            </span>

                            <span className="text-[#16A34A] dark:text-[#4ADE80] font-bold">
                              Used {timesUsed} Times
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[7.5px] font-medium text-slate-500 dark:text-slate-400">
                            <span className="truncate">By: {list.CreatedBy || 'Admin'}</span>
                            <span>{list.CreationDate || list.createdDate || 'Recent'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* ── 🌟 MEMBERS SPECIFICATION POPUP MODAL ───────────────────────────────── */}
      {/* ========================================================================= */}
      {selectedListForModal && (
        <div className="fixed inset-0 z-[200] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{
              borderRadius: `${Math.round(20 * VarOverallRoundednessScale)}px`
            }}
            className="w-full max-w-3xl bg-white dark:bg-[#151820] border border-black/10 dark:border-white/10 p-5 relative overflow-hidden shadow-2xl flex flex-col gap-3 text-slate-900 dark:text-white transition-colors max-h-[85vh]"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-2 border-b border-black/10 dark:border-white/10">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-[#D8F3DC] text-emerald-900 font-mono-tech">
                  {selectedListForModal.UserListsID || selectedListForModal.id}
                </span>
                <h3 className="text-sm font-voda font-bold text-slate-900 dark:text-white">
                  {selectedListForModal.UserListName || selectedListForModal.name}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedListForModal(null)}
                className="p-1 rounded text-slate-400 hover:text-black dark:hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Meta Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] p-2.5 rounded-xl bg-slate-50 dark:bg-black/30 border border-black/5 dark:border-white/10">
              <div>
                <span className="text-slate-400 block text-[8px] font-bold uppercase">Type</span>
                <span className="font-bold">{selectedListForModal.UploadType || selectedListForModal.type}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[8px] font-bold uppercase">Total Users</span>
                <span className="font-bold">{modalMembers.length} Recipients</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[8px] font-bold uppercase">Created On</span>
                <span className="font-bold">{selectedListForModal.CreationDate || selectedListForModal.createdDate}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[8px] font-bold uppercase">Created By</span>
                <span className="font-bold truncate block">{selectedListForModal.CreatedBy || 'Admin'}</span>
              </div>
            </div>

            {/* Members Table */}
            <div className="flex-1 overflow-y-auto max-h-[45vh] border border-black/5 dark:border-white/10 rounded-xl">
              <table className="w-full text-left text-[10px]">
                <thead>
                  <tr className="border-b border-black/10 dark:border-white/10 bg-slate-100 dark:bg-black/40 font-mono-tech uppercase text-[8.5px] text-slate-500">
                    <th className="py-2 px-3">SR</th>
                    <th className="py-2 px-3">USER NAME</th>
                    <th className="py-2 px-3">EMAIL ID</th>
                    <th className="py-2 px-3">DEPARTMENT</th>
                    <th className="py-2 px-3">COUNTRY</th>
                    <th className="py-2 px-3 text-center">HOOK %</th>
                    <th className="py-2 px-3 text-center">REPORT %</th>
                  </tr>
                </thead>
                <tbody>
                  {modalMembers.map((m) => (
                    <tr
                      key={m.srNo}
                      className="border-b border-black/5 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                    >
                      <td className="py-1.5 px-3 font-mono-tech text-slate-400">{m.srNo}</td>
                      <td className="py-1.5 px-3 font-bold">{m.name}</td>
                      <td className="py-1.5 px-3 font-mono-tech text-slate-600 dark:text-slate-300">{m.email}</td>
                      <td className="py-1.5 px-3">{m.department}</td>
                      <td className="py-1.5 px-3 font-bold">{m.country}</td>
                      <td className="py-1.5 px-3 text-center font-mono-tech text-red-600 font-bold">{m.hookRate}</td>
                      <td className="py-1.5 px-3 text-center font-mono-tech text-emerald-600 font-bold">{m.reportRate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedListForModal(null)}
                className="px-5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-[9.5px] font-voda font-bold uppercase cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UserDLsLandingPage;