import { useState, useMemo } from "react";
import { 
  Search, 
  ChevronDown,
  ExternalLink, 
  User,
  Check
} from 'lucide-react';

export const VarOverallCornerRoundednessAdjuster = 0.6;
export const VarGallaryCardLenghtAdjuster = 1.0;
export const VarGallaryCardsScaleAdjuster = 1.0;
export const VarGalleryLowerBaseHeightAdjuster = 460;

// =========================================================================
//  1.  CAPSULE HEADER (TOP-LEFT)                            //
// =========================================================================
const getLCardBg = (isDark) => (isDark ? '#0B1121' : '#FFFFFF');

const CAPSULE_THEME_COLOR = '#D9F2D0';
const CAPSULE_COUNTER_COLOR = '#16A34A';

const ApprovedPathsGallery = ({
  paths = [],
  isDark,
  videos = [],
  quizzes = [],
  certificates = [],
  onLaunch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Latest Approved Date');
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [detailModalItem, setDetailModalItem] = useState(null);

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

  const approvedPaths = useMemo(() => {
    let list = paths.filter((p) => {
      // Show paths that are published (approved)
      const isApproved = p.status === 'Published' || p.status === undefined;
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        q === '' ||
        (p.TrainingPathID && p.TrainingPathID.toLowerCase().includes(q)) ||
        (p.TrainingPathName && p.TrainingPathName.toLowerCase().includes(q));

      return isApproved && matchesSearch;
    });

    list.sort((a, b) => {
      const dateA = new Date(a.CreatedOn || 0).getTime();
      const dateB = new Date(b.CreatedOn || 0).getTime();
      if (sortBy === 'Oldest Approved Date') return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [paths, searchTerm, sortBy]);

  return (
    <>
      <div className="gallery-wrapper relative flex flex-col w-full select-none font-sans overflow-x-hidden pb-2">
        
        {/* ========================================================================= */}
        {/*  1.  CAPSULE HEADER (TOP-LEFT)                            */}
        {/* ========================================================================= */}
        <div
          style={{ 
            backgroundColor: CAPSULE_THEME_COLOR,
            borderRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="absolute top-0 left-0 w-[176px] h-[126px] p-3 flex flex-col justify-between shadow-xs z-20 text-slate-900 select-none overflow-hidden flex-shrink-0 text-left"
        >
          <div className="flex justify-between items-start relative z-10">
            <h3 className="text-[14.5px] font-voda font-bold tracking-tight leading-tight">
              My Approved<br />Paths
            </h3>
          </div>

          <p className="text-[9px] font-bold text-slate-700 leading-tight relative z-10 max-w-[105px] mb-1">
            Learning paths that are approved, compiled and published
          </p>
        </div>

        {/*  2. Concave Arc Fillet */}
        <div className="absolute top-[118px] left-[166px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
          </svg>
        </div>

        {/* ========================================================================= */}
        {/*  3. TOP-RIGHT ARM OF L-SHAPE CONTAINER                                 */}
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
                <div className="absolute top-7 left-0 w-48 bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                  {['Latest Approved Date', 'Oldest Approved Date'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSortBy(option);
                        setShowSortDropdown(false);
                      }}
                      className={`px-3 py-1 text-left text-[9.5px] font-bold cursor-pointer transition-colors ${
                        sortBy === option 
                          ? 'bg-[#D9F2D0] text-[#16A34A] dark:bg-emerald-950 dark:text-emerald-300' 
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
              {String(approvedPaths.length).padStart(2, '0')}
            </span>
            <span className="text-[13.5px] font-voda font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight">
              Total Approved<br />Paths
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
          {approvedPaths.length === 0 ? (
            <div className="w-full h-full min-h-[220px] flex flex-col items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">No approved training paths found.</p>
            </div>
          ) : (
            approvedPaths.map((path) => (
              <div
                key={path.TrainingPathID}
                onClick={(e) => handleDetailsClick(e, path)}
                style={{ 
                  borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`,
                  transform: `scale(${VarGallaryCardsScaleAdjuster})`,
                  width: `${100 * VarGallaryCardLenghtAdjuster}%`
                }}
                className="mx-auto px-6 py-5 bg-[#EEF2F6] dark:bg-[#15171E] text-slate-900 dark:text-white shadow-2xs flex flex-col gap-2 relative overflow-hidden transition-all hover:shadow-xs hover:scale-[1.01] cursor-pointer border border-black/5 dark:border-white/5 origin-top flex-shrink-0"
              >
                {/* Top Meta Line */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-full bg-white/90 dark:bg-black/60 text-[9px] font-black text-[#16A34A] dark:text-emerald-300 tracking-wide flex items-center gap-1 shadow-2xs font-mono-tech border border-emerald-200/50 dark:border-emerald-900/40">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                      {path.TrainingPathID}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[8.5px] font-black tracking-wide shadow-2xs border ${
                      path.isZipPath 
                        ? 'bg-amber-100 text-amber-800 border-amber-300/40' 
                        : 'bg-violet-100 text-violet-800 border-violet-300/40'
                    }`}>
                      {path.isZipPath ? 'Package + Certificate' : 'Videos + Quiz + Certificate'}
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-[#D9F2D0] text-[#16A34A] text-[8.5px] font-voda font-bold uppercase whitespace-nowrap shadow-2xs">
                    Status: Published
                  </span>
                </div>

                {/* Title & Description */}
                <h4 className="text-[12px] font-voda font-bold tracking-tight leading-tight text-slate-900 dark:text-white text-left">
                  {path.TrainingPathName}
                </h4>
                <p className="text-[9px] font-medium text-slate-700 dark:text-slate-300 leading-snug line-clamp-1 text-left">
                  <span className="font-bold text-slate-900 dark:text-white">Description: </span>
                  {path.Description}
                </p>

                {/* Identities & Actions Row */}
                <div className="flex items-center justify-between text-[9px] pt-1 border-t border-black/5 dark:border-white/5 flex-wrap gap-2">
                  <div className="flex items-center gap-3 text-slate-600 dark:text-slate-300 font-medium">
                    <span className="font-bold flex items-center gap-1">
                      <User className="w-2.5 h-2.5 text-slate-500" />
                      Created By: <strong className="text-slate-800 dark:text-slate-200">{path.createdBy?.split('@')?.[0] || 'Editor'}</strong>
                    </span>
                    <span>&bull;</span>
                    <span className="font-bold flex items-center gap-1 text-[#16A34A] dark:text-emerald-300">
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                      Approved By: <strong>{path.approvedBy?.split('@')?.[0] || 'Manager'}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {path.isZipPath && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 text-[8.5px] font-bold whitespace-nowrap shadow-2xs">
                        Sandbox Active
                      </span>
                    )}

                    <span className="px-2.5 py-0.5 rounded-md bg-[#C2EAB4] text-[#064E3B] text-[8.5px] font-voda font-black shadow-2xs whitespace-nowrap">
                      Duration: {path.UsedTime} mins
                    </span>

                    <button
                      type="button"
                      onClick={(e) => handleDetailsClick(e, path)}
                      className="text-slate-500 hover:text-black dark:hover:text-white cursor-pointer ml-1 transition-colors"
                      title="View Full Specifications"
                    >
                      <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                    </button>

                    <span className="text-[8px] font-semibold text-slate-500 ml-1">
                      Created: {formatShortDate(path.CreatedOn)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ========================================================================= */}
        {/* ──  SPECIFICATIONS MODAL ──                                            */}
        {/* ========================================================================= */}
        {detailModalItem && (
          <div className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div
              style={{ 
                borderRadius: `${Math.round(24 * VarOverallCornerRoundednessAdjuster)}px`
              }}
              className="w-full max-w-2xl bg-white border border-black/10 p-6 relative overflow-hidden shadow-2xl flex flex-col gap-3.5 text-slate-900 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-900 shadow-2xs border border-black/5">
                  <span className="w-2 h-2 rounded-full bg-[#16A34A]" />
                  <span>{detailModalItem.TrainingPathID} (Approved)</span>
                </div>

                <button
                  type="button"
                  onClick={() => setDetailModalItem(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-voda font-bold text-[9px] uppercase cursor-pointer transition-colors shadow-2xs"
                >
                  Go Back
                </button>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <h3 className="text-xl font-voda font-bold tracking-tight text-slate-950">
                  {detailModalItem.TrainingPathName}
                </h3>
                <p className="text-[12px] font-medium text-slate-700 mb-2 leading-relaxed">
                  <strong>Description: </strong>
                  {detailModalItem.Description || 'No description provided.'}
                </p>
                <div className="text-[11px] font-bold text-slate-800 mt-0.5">
                  Created on: {formatShortDate(detailModalItem.CreatedOn)} &bull; Created By: {detailModalItem.createdBy || 'Editor'}
                  {detailModalItem.approvedBy && (
                    <span className="ml-2 font-bold text-[#16A34A]">
                      &bull; Approved By: {detailModalItem.approvedBy}
                    </span>
                  )}
                </div>
              </div>

              <div className="w-full h-px bg-black/10" />

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
                      return q ? `${q.TrainingQuizName} (${Object.keys(q.QuizData || {}).length} Questions)` : 'None';
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
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default ApprovedPathsGallery;
