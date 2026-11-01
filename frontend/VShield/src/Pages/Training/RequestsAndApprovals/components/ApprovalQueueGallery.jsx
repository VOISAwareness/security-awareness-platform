import { useState, useMemo } from "react";
import { 
  Search, 
  ChevronDown, 
  ExternalLink, 
  User, 
  Check, 
  XCircle, 
  Play,
  HelpCircle,
  Award,
  Clock,
  UploadCloud
} from 'lucide-react';

export const VarOverallCornerRoundednessAdjuster = 0.6;
export const VarGallaryCardLenghtAdjuster = 1.0;
export const VarGallaryCardsScaleAdjuster = 0.99;
export const VarGalleryLowerBaseHeightAdjuster = 460;
export const VarAllFourButtonsAlign = 'Right';

// =========================================================================
//  1. ISOLATED CAPSULE HEADER (TOP-LEFT)                            //
// =========================================================================
const getLCardBg = (isDark) => (isDark ? '#0B1121' : '#FFFFFF');

const getCardBgColor = (index) => {
  const remainder = index % 3;
  if (remainder === 0) return '#CEFBEA';
  if (remainder === 1) return '#ECE8FF';
  return '#FFEFCE';
};

const CAPSULE_THEME_COLOR = '#D8F3DC';
const CAPSULE_COUNTER_COLOR = '#8ED973';

const ApprovalQueueGallery = ({ 
  paths = [], 
  onApprove, 
  onReject, 
  isDark,
  videos = [],
  quizzes = [],
  certificates = [],
  onLaunch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Latest Request Date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);

  // Inline Rejection States
  const [inlineRejectPathId, setInlineRejectPathId] = useState(null);
  const [rejectComment, setRejectComment] = useState('');
  
  // Specifications Modal Rejection States
  const [modalRejecting, setModalRejecting] = useState(false);
  const [modalRejectComment, setModalRejectComment] = useState('');

  const lCardBg = getLCardBg(isDark);

  const handleDetailsClick = (e, path) => {
    e.stopPropagation();
    if (onLaunch) {
      onLaunch(path);
    } else {
      setDetailModalItem(path);
    }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr.split(' ')[0];
      const day = d.getDate();
      const month = d.toLocaleString('en-US', { month: 'short' });
      const year = String(d.getFullYear()).slice(-2);
      return `${day}-${month}-${year}`;
    } catch { /* ignore */
      return dateStr.split(' ')[0] || 'N/A';
    }
  };

  const processedPaths = useMemo(() => {
    let list = paths.filter(p => {
      const isPending = p.status === 'Pending';
      const matchesSearch = searchTerm.trim() === '' || 
        (p.TrainingPathID && p.TrainingPathID.toLowerCase().includes(searchTerm.trim().toLowerCase())) ||
        (p.TrainingPathName && p.TrainingPathName.toLowerCase().includes(searchTerm.trim().toLowerCase()));
      return isPending && matchesSearch;
    });

    list.sort((a, b) => {
      const dateA = new Date(a.CreatedOn || 0).getTime();
      const dateB = new Date(b.CreatedOn || 0).getTime();

      if (sortBy === 'Oldest Request Date') return dateA - dateB;
      return dateB - dateA; // Default is Latest Request Date
    });

    return list;
  }, [paths, searchTerm, sortBy]);

  const getButtonsRowJustifyClass = () => {
    const align = (VarAllFourButtonsAlign || 'Right').toLowerCase();
    if (align === 'left' || align === 'start') return 'justify-start';
    if (align === 'center') return 'justify-center';
    if (align === 'between') return 'justify-between';
    return 'justify-end';
  };

  return (
    <>
      <div className="gallery-wrapper relative flex flex-col w-full select-none font-sans pb-2">
        
        {/* ========================================================================= */}
        {/*  1. CAPSULE HEADER (TOP-LEFT)                            */}
        {/* ========================================================================= */}
        <div
          style={{ 
            backgroundColor: CAPSULE_THEME_COLOR,
            borderRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="absolute top-0 left-0 w-[176px] h-[126px] p-3 flex flex-col justify-between shadow-xs z-20 text-slate-900 select-none overflow-hidden flex-shrink-0 text-left"
        >
          <div className="flex justify-between items-start relative z-10">
            <h3 className="text-[15.5px] font-voda font-bold tracking-tight leading-tight">
              My Approvals<br />Queue
            </h3>
          </div>

          <p className="text-[9px] font-bold text-slate-700 leading-tight relative z-10 max-w-[125px] mb-1">
            Learning paths waiting for your review and approval
          </p>
        </div>

        {/*  2. Concave Arc Fillet */}
        <div className="absolute top-[118px] left-[166px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
          </svg>
        </div>

        {/* ========================================================================= */}
        {/*  3. TOP-RIGHT ARM OF L-SHAPE CONTAINER              */}
        {/* ========================================================================= */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            borderTopRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-[calc(100%-182px)] ml-auto h-[133px] px-4 py-2.5 flex items-center justify-between relative z-30 select-none -ml-2 transition-colors border-t border-r border-black/5 dark:border-white/5 flex-shrink-0"
        >
          {/* Controls Column */}
          <div className="flex flex-col -mt-8 gap-2 max-w-[340px] w-full text-left">
            {/* Search by Path ID or Title */}
            <div className="relative flex items-center">
              <input 
                type="text"
                placeholder="Search by Path ID or Title"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-7 pl-3 pr-8 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] font-bold text-slate-800 dark:text-slate-200 text-[9px] placeholder-slate-400 outline-none border border-black/5 dark:border-white/5"
              />
              <Search className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 pointer-events-none" />
            </div>

            {/* Sort By Dropdown */}
            <div className="relative w-48">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-full h-6 px-2.5 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] text-slate-700 dark:text-slate-300 text-[8px] font-bold flex items-center justify-between border border-black/5 dark:border-white/5 cursor-pointer shadow-2xs"
              >
                <span className="truncate">Sort: {sortBy}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 ml-1" />
              </button>

              {showSortDropdown && (
                <div className="absolute top-7 left-0 w-full bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                  {['Latest Request Date', 'Oldest Request Date'].map(option => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSortBy(option);
                        setShowSortDropdown(false);
                      }}
                      className={`px-3 py-1 text-left text-[9.5px] font-bold cursor-pointer transition-colors ${
                        sortBy === option 
                          ? 'bg-[#D8F3DC] text-emerald-900 dark:bg-emerald-950 dark:text-emerald-300' 
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Dynamic Big Counter */}
          <div className="flex flex-col items-end justify-center text-right pr-2">
            <span 
              style={{ color: CAPSULE_COUNTER_COLOR }}
              className="text-5xl font-black leading-none tracking-tight font-voda-exb"
            >
              {String(processedPaths.length).padStart(2, '0')}
            </span>
            <span className="text-[13.5px] font-voda font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight">
              Total Approvals<br />Pending
            </span>
          </div>
        </div>

        {/* ========================================================================= */}
        {/*  4. CONTINUOUS LOWER L-BASE                                            */}
        {/* ========================================================================= */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            height: `${VarGalleryLowerBaseHeightAdjuster}px`,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderTopRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-full p-5 pb-6 flex flex-col gap-4 overflow-y-auto z-10 border-b border-l border-r border-black/5 dark:border-white/5 transition-colors [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md"
        >
          {processedPaths.length === 0 ? (
            <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">No training paths currently waiting in approval queue.</p>
            </div>
          ) : (
            processedPaths.map((path, idx) => {
              const cardBgColor = getCardBgColor(idx);
              const isRejectingThis = inlineRejectPathId === path.TrainingPathID;

              return (
                <div 
                  key={path.TrainingPathID}
                  onClick={(e) => !isRejectingThis && handleDetailsClick(e, path)}
                  style={{ 
                    backgroundColor: cardBgColor,
                    borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`,
                    transform: `scale(${VarGallaryCardsScaleAdjuster})`,
                    width: `${100 * VarGallaryCardLenghtAdjuster}%`
                  }}
                  className="mx-auto px-6 py-5 text-slate-900 shadow-2xs flex flex-col gap-2 relative overflow-hidden transition-all hover:shadow-xs hover:scale-[1.01] cursor-pointer border border-black/5 origin-top flex-shrink-0"
                >
                  {/* Top Meta Line */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 mt-1 rounded-full bg-white/85 text-[9px] font-black text-slate-800 tracking-wide flex items-center gap-1 shadow-2xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#E60000]" />
                        {path.TrainingPathID}
                      </span>
                      <span className={`px-2.5 py-0.5 mt-1 rounded-full text-[8.5px] font-black tracking-wide shadow-2xs border ${
                        path.isZipPath 
                          ? 'bg-amber-100 text-amber-800 border-amber-300/40' 
                          : 'bg-violet-100 text-violet-800 border-violet-300/40'
                      }`}>
                        {path.isZipPath ? 'Package + Certificate' : 'Videos + Quiz + Certificate'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-[8.5px] font-bold text-slate-600">
                      <span>Created on: {formatShortDate(path.CreatedOn)}</span>
                      {!isRejectingThis && (
                        <button 
                          type="button" 
                          onClick={(e) => handleDetailsClick(e, path)}
                          className="text-slate-700 hover:text-black cursor-pointer ml-1"
                          title="View Full Specifications"
                        >
                          <ExternalLink className="w-3 h-3 stroke-[2.2]" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-[12px] font-voda font-bold tracking-tight leading-tight text-slate-900 text-left">
                    {path.TrainingPathName}
                  </h4>
                  <p className="text-[9px] mb-2 font-medium text-slate-700 leading-snug line-clamp-1 text-left">
                    <span className="font-bold text-slate-900">Description: </span>
                    {path.Description}
                  </p>

                  {/* Attached Components stats */}
                  <div className="flex items-center text-[9px] text-slate-800 flex-wrap gap-x-3 pt-0.5">
                    <span className="font-bold flex items-center gap-1">
                      <User className="w-2.5 h-2.5 text-slate-600" />
                      Created By: <span className="font-semibold text-slate-700">{path.createdBy || 'Editor'}</span>
                    </span>
                    {!path.isZipPath ? (
                      <>
                        <span className="text-slate-400 font-bold">&bull;</span>
                        <span className="font-bold flex items-center gap-1">
                          <Play className="w-2.5 h-2.5 text-red-500 fill-current" />
                          Videos: <span className="font-semibold text-slate-700">{path.TrainingVideoAttached?.length || 0}</span>
                        </span>
                        <span className="text-slate-400 font-bold">&bull;</span>
                        <span className="font-bold flex items-center gap-1">
                          <HelpCircle className="w-2.5 h-2.5 text-[#7C3AED]" />
                          Quizzes: <span className="font-semibold text-slate-700">{path.TrainingQuizAttached?.length || 0}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-slate-400 font-bold">&bull;</span>
                        <span className="font-bold flex items-center gap-1 text-amber-600">
                          <UploadCloud className="w-2.5 h-2.5" />
                          Standalone Package
                        </span>
                      </>
                    )}
                    <span className="text-slate-400 font-bold">&bull;</span>
                    <span className="font-bold flex items-center gap-1">
                      <Award className="w-2.5 h-2.5 text-[#16A34A]" />
                      Certificate: <span className="font-semibold text-slate-700">{path.TrainingCertificateAttached?.length || 0}</span>
                    </span>
                    <span className="text-slate-400 font-bold">&bull;</span>
                    <span className="font-bold flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5 text-slate-600" />
                      Duration: <span className="font-semibold text-slate-700">{path.UsedTime} mins</span>
                    </span>
                  </div>

                  {/* Sleek Action Buttons Row */}
                  <div className={`flex items-center gap-1.5 pt-1.5 mt-0.5 ${getButtonsRowJustifyClass()}`}>
                    {isRejectingThis ? (
                      <div className="flex flex-col gap-2 w-full mt-1.5" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col gap-1 text-left">
                          <label className="text-[9px] font-extrabold text-slate-600 uppercase tracking-wider">
                            Provide rejection remarks:
                          </label>
                          <textarea
                            value={rejectComment}
                            onChange={(e) => setRejectComment(e.target.value)}
                            placeholder="State reason for rejecting this path..."
                            className="w-full h-12 p-2 rounded-lg border border-red-300 bg-white text-[10px] font-semibold text-slate-850 focus:outline-none focus:border-red-500 resize-none leading-relaxed shadow-inner"
                          />
                        </div>
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setInlineRejectPathId(null);
                              setRejectComment('');
                            }}
                            className="h-6 px-3 rounded bg-slate-200 hover:bg-slate-300 text-slate-700 text-[8px] font-bold uppercase transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            disabled={!rejectComment.trim()}
                            onClick={() => {
                              onReject(path, rejectComment.trim());
                              setInlineRejectPathId(null);
                              setRejectComment('');
                            }}
                            className="h-6 px-3 rounded bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[8px] font-bold uppercase transition-colors cursor-pointer"
                          >
                            Submit Rejection
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onApprove && onApprove(path);
                          }}
                          className="h-6 px-3 rounded-md bg-[#84D988] hover:bg-[#72C872] text-white text-[8.5px] font-voda font-bold uppercase tracking-wider transition-all shadow-2xs hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                        >
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                          Approve
                        </button>
                        
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInlineRejectPathId(path.TrainingPathID);
                            setRejectComment('');
                          }}
                          className="h-6 px-3 rounded-md bg-[#F87171] hover:bg-[#EF4444] text-white text-[8.5px] font-voda font-bold uppercase tracking-wider transition-all shadow-2xs hover:scale-[1.02] active:scale-95 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                        >
                          <XCircle className="w-2.5 h-2.5 stroke-[2.5]" />
                          Reject
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ========================================================================= */}
        {/* ──  FULL SPECIFICATIONS MODAL ──                                        */}
        {/* ========================================================================= */}
        {detailModalItem && (
          <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              style={{ 
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full max-w-2xl bg-white border border-black/10 p-6 relative overflow-hidden shadow-2xl flex flex-col gap-3.5 text-slate-900 transition-colors"
            >
              {/* Top Bar */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-900 shadow-2xs border border-black/5">
                  <span className="w-2 h-2 rounded-full bg-[#E60000]" />
                  <span>{detailModalItem.TrainingPathID}</span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setDetailModalItem(null);
                    setModalRejecting(false);
                    setModalRejectComment('');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-voda font-bold text-[9px] uppercase cursor-pointer transition-colors shadow-2xs"
                >
                  Go Back
                </button>
              </div>

              {/* Title & Description */}
              <div className="flex flex-col gap-1 text-left">
                <h3 className="text-xl font-voda font-bold tracking-tight text-slate-950">
                  {detailModalItem.TrainingPathName}
                </h3>
                <p className="text-[12px] font-medium text-slate-700 mb-2 leading-relaxed text-left">
                  <strong>Description: </strong>
                  {detailModalItem.Description}
                </p>
                <div className="text-[11px] font-bold text-slate-800 mt-0.5 text-left">
                  Created on: {detailModalItem.CreatedOn} &bull; Created By: {detailModalItem.createdBy || 'Editor'}
                </div>
              </div>

              <div className="w-full h-px bg-black/10" />

              {/* Specifications Detail Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-3.5 gap-x-6 text-[12px] font-medium text-slate-800 text-left bg-slate-50 p-4 rounded-xl border border-black/5">
                <div>
                  <strong>Estimated Duration: </strong>
                  <span className="font-bold text-indigo-600">{detailModalItem.UsedTime} Mins</span>
                </div>
                <div>
                  <strong>Always Available: </strong>
                  <span>{detailModalItem.isAlwaysAvailable ? 'Yes' : 'No'}</span>
                </div>
                <div className="sm:col-span-2">
                  <strong>Attached Videos:</strong>
                  <ul className="list-disc pl-5 mt-1 text-[11px] text-slate-600 space-y-1">
                    {detailModalItem.TrainingVideoAttached?.map(vidId => {
                      const v = videos.find(x => x.TrainingVideoID === vidId);
                      return <li key={vidId}>{v ? v.TrainingVideoName : vidId}</li>;
                    }) || <li>None</li>}
                  </ul>
                </div>
                <div className="sm:col-span-2">
                  <strong>Attached Quiz:</strong>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {(() => {
                      const qzId = detailModalItem.TrainingQuizAttached?.[0];
                      const q = quizzes.find(x => x.TrainingQuizID === qzId);
                      return q ? `${q.TrainingQuizName} (${Object.keys(q.QuizData || {}).length} Questions, Passing: ${q.TrainingCompletionThreshold}%)` : 'None';
                    })()}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <strong>Attached Certificate:</strong>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {(() => {
                      const certId = detailModalItem.TrainingCertificateAttached?.[0];
                      const cert = certificates.find(x => x.TrainingCertificateID === certId);
                      return cert ? cert.TrainingCertificateName : 'None';
                    })()}
                  </div>
                </div>
              </div>

              {/* Bottom: 3 Action Buttons inside Modal */}
              <div className="flex flex-col gap-3 pt-2 border-t border-black/10">
                {modalRejecting ? (
                  <div className="flex flex-col gap-2 w-full">
                    <div className="flex flex-col gap-1 text-left">
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                        Rejection Feedback & Remarks:
                      </label>
                      <textarea
                        value={modalRejectComment}
                        onChange={(e) => setModalRejectComment(e.target.value)}
                        placeholder="State reason for rejecting this learning path..."
                        className="w-full h-16 p-3 rounded-lg border border-red-200 bg-white text-xs font-semibold text-slate-800 focus:outline-none focus:border-red-500 resize-none leading-relaxed shadow-inner"
                      />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setModalRejecting(false);
                          setModalRejectComment('');
                        }}
                        className="h-8 px-4 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-750 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={!modalRejectComment.trim()}
                        onClick={() => {
                          onReject && onReject(detailModalItem, modalRejectComment.trim());
                          setDetailModalItem(null);
                          setModalRejecting(false);
                          setModalRejectComment('');
                        }}
                        className="h-8 px-5 rounded-xl bg-red-500 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold uppercase cursor-pointer"
                      >
                        Submit Rejection
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 w-full ${getButtonsRowJustifyClass()}`}>
                    <button
                      type="button"
                      onClick={() => {
                        onApprove && onApprove(detailModalItem);
                        setDetailModalItem(null);
                      }}
                      className="h-7 px-4 rounded-lg bg-[#84D988] hover:bg-[#72C872] text-white text-[10px] font-voda font-bold uppercase tracking-wider transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      Approve
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setModalRejecting(true);
                        setModalRejectComment('');
                      }}
                      className="h-7 px-4 rounded-lg bg-[#F87171] hover:bg-[#EF4444] text-white text-[10px] font-voda font-bold uppercase tracking-wider transition-all shadow-2xs hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1.5"
                    >
                      <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                      Reject
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ApprovalQueueGallery;
