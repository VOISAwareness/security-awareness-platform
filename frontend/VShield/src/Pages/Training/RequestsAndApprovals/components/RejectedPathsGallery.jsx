 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { useState, useMemo } from "react";
import { 
  Search, 
  ChevronDown, 
  ExternalLink, 
  UserX,
  Settings,
  UploadCloud
} from 'lucide-react';

export const VarOverallCornerRoundednessAdjuster = 0.6;
export const VarGallaryCardsScaleAdjuster = 1.0;
export const VarGalleryLowerBaseHeightAdjuster = 460;

// =========================================================================
//  1.  CAPSULE HEADER (TOP-LEFT)                            //
// =========================================================================
const getLCardBg = (isDark) => (isDark ? '#1C1E24' : '#FFFFFF');

const CAPSULE_THEME_COLOR = '#FCD5CE';
const CAPSULE_COUNTER_COLOR = '#F43F5E';

const RejectedPathsGallery = ({ 
  paths = [], 
  isDark,
  videos = [],
  quizzes = [],
  certificates = [],
  onEdit,
  onSendForApproval,
  onLaunch
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('Latest Date');
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
    } catch (e2) {
      return dateStr.split(' ')[0] || 'N/A';
    }
  };

  const getCleanUserName = (emailStr) => {
    if (!emailStr) return 'Manager';
    const prefix = emailStr.split('@')[0] || '';
    return prefix
      .split('.')
      .map(part => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ') || emailStr;
  };

  const filteredPaths = useMemo(() => {
    let list = paths.filter((p) => {
      const isRejected = p.status === 'Rejected';
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch = !q || 
        (p.TrainingPathID && p.TrainingPathID.toLowerCase().includes(q)) ||
        (p.TrainingPathName && p.TrainingPathName.toLowerCase().includes(q));
      return isRejected && matchesSearch;
    });

    list.sort((a, b) => {
      const dateA = new Date(a.CreatedOn || 0).getTime();
      const dateB = new Date(b.CreatedOn || 0).getTime();
      if (sortBy === 'Oldest Date') return dateA - dateB;
      return dateB - dateA;
    });

    return list;
  }, [paths, searchTerm, sortBy]);

  return (
    <>
      <div className="gallery-wrapper relative flex flex-col w-full select-none font-sans overflow-x-hidden">
        
        {/*  1.  CAPSULE HEADER (TOP-LEFT) */}
        <div
          style={{ 
            backgroundColor: CAPSULE_THEME_COLOR,
            borderRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="absolute top-0 left-0 w-[176px] h-[126px] p-3 flex flex-col justify-between shadow-xs z-20 text-slate-900 select-none overflow-hidden flex-shrink-0 text-left"
        >
          <div className="flex justify-between items-start relative z-10">
            <h3 className="text-[14.5px] font-voda font-bold tracking-tight leading-tight">
              Rejected<br />Paths
            </h3>
          </div>

          <p className="text-[9px] font-bold text-slate-700 leading-tight relative z-10 max-w-[115px] mb-1">
            Learning paths that were reviewed and rejected by managers
          </p>
        </div>

        {/*  2. Concave Arc Fillet */}
        <div className="absolute top-[118px] left-[166px] w-4 h-4 pointer-events-none z-20 overflow-hidden">
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 0 16 A 16 16 0 0 0 16 0 V 16 H 0 Z" fill={lCardBg} />
          </svg>
        </div>

        {/*  3. Top-Right Arm of L-Shape Container */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            borderTopRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-[calc(100%-182px)] ml-auto h-[133px] px-4 py-2.5 flex items-center justify-between relative z-30 select-none -ml-2 transition-colors border-t border-r border-black/5 dark:border-white/5 flex-shrink-0"
        >
          <div className="flex flex-col gap-2 -mt-8 max-w-[340px] w-full text-left">
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

            <div className="relative w-44">
              <button
                type="button"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="w-full h-6 px-2.5 rounded-lg bg-[#EEF2F6] dark:bg-[#12141A] text-slate-700 dark:text-slate-300 text-[8px] font-bold flex items-center justify-between border border-black/5 dark:border-white/5 cursor-pointer shadow-2xs"
              >
                <span className="truncate">Sort: {sortBy}</span>
                <ChevronDown className="w-3 h-3 text-slate-500 shrink-0 ml-1" />
              </button>

              {showSortDropdown && (
                <div className="absolute top-7 left-0 w-44 bg-white dark:bg-[#161820] rounded-md shadow-2xl border border-black/10 dark:border-white/10 py-1 z-[100] flex flex-col">
                  {['Latest Date', 'Oldest Date'].map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => {
                        setSortBy(option);
                        setShowSortDropdown(false);
                      }}
                      className={`px-3 py-1 text-left text-[9.5px] font-bold cursor-pointer transition-colors ${
                        sortBy === option 
                          ? 'bg-[#FCD5CE] text-[#BE123C] dark:bg-rose-950 dark:text-rose-300' 
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

          <div className="flex flex-col items-end justify-center text-right pr-2">
            <span 
              style={{ color: CAPSULE_COUNTER_COLOR }}
              className="text-5xl font-black leading-none tracking-tight font-voda-exb"
            >
              {String(filteredPaths.length).padStart(2, '0')}
            </span>
            <span className="text-[13.5px] font-voda font-bold text-slate-900 dark:text-white mt-1 leading-tight tracking-tight text-right">
              Total Rejected Paths
            </span>
          </div>
        </div>

        {/*  4. Continuous Lower L-Base */}
        <div
          style={{ 
            backgroundColor: lCardBg,
            height: `${VarGalleryLowerBaseHeightAdjuster}px`,
            borderTopLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomLeftRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`,
            borderBottomRightRadius: `${Math.round(16 * VarOverallCornerRoundednessAdjuster)}px`
          }}
          className="w-full p-3 pb-5 flex flex-col gap-2.5 overflow-y-auto z-10 border-b border-l border-r border-black/5 dark:border-white/5 transition-colors [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-slate-300 dark:[&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-md"
        >
          {filteredPaths.length === 0 ? (
            <div className="w-full h-full min-h-[160px] flex items-center justify-center text-center">
              <p className="text-xs font-bold text-slate-400">No rejected training paths found.</p>
            </div>
          ) : (
            filteredPaths.map((path) => {
              const rejectedByEmail = path.approvedBy || 'Admin';
              const rejectedByName = getCleanUserName(rejectedByEmail);

              return (
                <div
                  key={path.TrainingPathID}
                  onClick={(e) => handleDetailsClick(e, path)}
                  style={{ 
                    borderRadius: `${Math.round(14 * VarOverallCornerRoundednessAdjuster)}px`,
                    transform: `scale(${VarGallaryCardsScaleAdjuster})`
                  }}
                  className="w-full box-border bg-[#EEF2F6] dark:bg-[#15171E] px-3.5 py-3.5 flex items-center justify-between text-slate-900 dark:text-slate-100 shadow-2xs border border-black/5 dark:border-white/5 hover:border-black/10 transition-colors hover:scale-[1.01] cursor-pointer flex-shrink-0"
                >
                  <div className="flex flex-col text-left leading-tight min-w-0 flex-1 pr-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[9.5px] font-bold text-[#F43F5E] tracking-wide font-mono-tech shrink-0">
                        {path.TrainingPathID}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[8.5px] font-black tracking-wide shadow-2xs border ${
                        path.isZipPath 
                          ? 'bg-amber-100 text-amber-800 border-amber-300/40' 
                          : 'bg-violet-100 text-violet-800 border-violet-300/40'
                      }`}>
                        {path.isZipPath ? 'Zip + Certs' : 'Vids + Quizzes + Certs'}
                      </span>
                    </div>
                    <h4 className="text-[12px] font-voda font-bold tracking-tight leading-tight text-slate-900 dark:text-white truncate mt-1">
                      {path.TrainingPathName}
                    </h4>
                    {path.rejectionMessage && (
                      <p className="text-[10px] text-red-500 font-bold mt-1.5 leading-snug">
                        Reason: {path.rejectionMessage}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2.5 shrink-0">
                    <div className="flex items-center gap-1.5 flex-nowrap">
                      <span 
                        title={`Rejected by ${rejectedByEmail}`}
                        className="h-5 px-2 rounded-md bg-[#FEE2E2] dark:bg-rose-950/60 text-[#BE123C] dark:text-rose-300 text-[8px] font-voda font-bold whitespace-nowrap flex items-center gap-1 border border-[#FCA5A5]/40 shadow-2xs"
                      >
                        <UserX className="w-2.5 h-2.5 stroke-[2.5]" />
                        <span>Rejected by: <strong className="font-extrabold">{rejectedByName}</strong></span>
                      </span>

                      <span className="text-[8px] font-bold text-slate-600 dark:text-slate-300 hidden sm:inline whitespace-nowrap">
                        Created By: <span className="font-semibold text-slate-500">{_optionalChain([path, 'access', _ => _.createdBy, 'optionalAccess', _2 => _2.split, 'call', _3 => _3('@'), 'access', _4 => _4[0]]) || 'Editor'}</span>
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDetailsClick(e, path)}
                        className="text-slate-500 hover:text-black dark:hover:text-white cursor-pointer ml-1 transition-colors"
                        title="View Full Specifications"
                      >
                        <ExternalLink className="w-3.5 h-3.5 stroke-[2.2]" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 flex-nowrap">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(path);
                          }}
                          className="h-5 px-2.5 rounded-md bg-slate-600 hover:bg-slate-700 text-white text-[8px] font-voda font-bold uppercase tracking-wider transition-all shadow-2xs hover:scale-102 active:scale-95 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                        >
                          <Settings className="w-2.5 h-2.5" />
                          Settings
                        </button>
                      )}
                      {onSendForApproval && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSendForApproval(path);
                          }}
                          className="h-5 px-2.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white text-[8px] font-voda font-bold uppercase tracking-wider transition-all shadow-2xs hover:scale-102 active:scale-95 cursor-pointer flex items-center justify-center gap-1 whitespace-nowrap"
                        >
                          <UploadCloud className="w-2.5 h-2.5" />
                          Send for Approval
                        </button>
                      )}
                      <span className="text-[8.5px] font-bold text-slate-600 dark:text-slate-400 mr-2 whitespace-nowrap">
                        Created: {formatShortDate(path.CreatedOn)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
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
                  <span className="w-2 h-2 rounded-full bg-[#F43F5E]" />
                  <span>{detailModalItem.TrainingPathID} (Rejected)</span>
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
                  Created on: {detailModalItem.CreatedOn || 'N/A'} &bull; Created By: {detailModalItem.createdBy || 'Editor'}
                  {detailModalItem.approvedBy && (
                    <span className="ml-2 font-bold text-[#BE123C]">
                      &bull; Rejected by: {detailModalItem.approvedBy}
                    </span>
                  )}
                </div>
              </div>

              {detailModalItem.rejectionMessage && (
                <div className="p-3.5 rounded-xl bg-red-100/90 border border-red-300 text-red-950 flex flex-col gap-1 shadow-2xs text-left">
                  <span className="text-[11px] font-voda font-bold uppercase tracking-wider text-red-700">
                    Rejection Feedback & Remarks:
                  </span>
                  <p className="text-[12px] font-medium leading-relaxed">
                    {detailModalItem.rejectionMessage}
                  </p>
                </div>
              )}

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
                    {_optionalChain([detailModalItem, 'access', _5 => _5.TrainingVideoAttached, 'optionalAccess', _6 => _6.map, 'call', _7 => _7(vidId => {
                      const v = videos.find(x => x.TrainingVideoID === vidId);
                      return <li key={vidId}>{v ? v.TrainingVideoName : vidId}</li>;
                    })]) || <li>None</li>}
                  </ul>
                </div>
                <div className="sm:col-span-2">
                  <strong>Attached Quiz:</strong>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {(() => {
                      const qzId = _optionalChain([detailModalItem, 'access', _8 => _8.TrainingQuizAttached, 'optionalAccess', _9 => _9[0]]);
                      const q = quizzes.find(x => x.TrainingQuizID === qzId);
                      return q ? `${q.TrainingQuizName} (${Object.keys(q.QuizData || {}).length} Questions)` : 'None';
                    })()}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <strong>Attached Certificate:</strong>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    {(() => {
                      const certId = _optionalChain([detailModalItem, 'access', _10 => _10.TrainingCertificateAttached, 'optionalAccess', _11 => _11[0]]);
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

export default RejectedPathsGallery;
