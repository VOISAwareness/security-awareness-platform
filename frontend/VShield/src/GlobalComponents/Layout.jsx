import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useUserType } from '../UserTypeContext/UserTypeContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutGrid,
  Rocket,
  FileText,
  Megaphone,
  Laptop,
  LayoutTemplate,
  Image,
  MessageSquare,
  Users,
  AtSign,
  MessagesSquare,
  Sparkles,
  BarChart2,
  User,
  GraduationCap,
  Trophy,
  ChevronRight,
  LogOut
} from 'lucide-react';
import TopHeaderSection from './TopHeaderSection';
import { SCENARIO_STEPS } from '../Pages/Scenarios/CreateNewScenario/ScenarioConstants';
import { ANNOUNCEMENT_STEPS } from '../Pages/Announcement/CreateAnnouncement/AnnouncementConstants';

// =========================================================================
// 🎛️ LAYOUT SCALE, HEIGHT, WEIGHT & THEMED COLOR CONTROLS
// =========================================================================
export const VarLayoutScale = 0.9;
// Rescaled to 38px so all items fit seamlessly for Admin benchmark
export const VarNavPaneButtonHeightAdjuster = 40;
export const VarNavPaneIconsWieghtAdjuster = 2.2;
export const VarNavPaneIconsTextWieghtAdjuster = 'font-bold';
export const VarLeftNavPaneScrollBarWidthAdjuster = 2;

// Theme-aware color resolvers
export const VarNavPaneIconColor = (isDark) => (isDark ? '#94a3b8' : '#64748b');
export const VarNavPaneIconTextColor = (isDark) => (isDark ? '#e2e8f0' : '#1e293b');

export const TRANSITION_CONFIG = {
  type: "tween",
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1]
};

const ANNOUNCEMENT_SUB_ITEMS = [
  { label: 'Announcements', to: '/announcements' },
  { label: 'Create new template', to: '/new-announcement' },
  { label: 'Request & Approvals', to: '/announcements/approvals' },
  { label: 'All Announcements', to: '/announcements/history' }
];

// Persists left nav pane scroll position across collapse/expand and route transitions
let persistedNavScrollTop = 0;

const Layout = () => {
  const { user, logout, hasAccess, isDark } = useUserType?.() || { isDark: false };
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeSubmenu, setActiveSubmenu] = useState(null);

  const navRef = useRef(null);
  const isHoveredRef = useRef(isHovered);
  isHoveredRef.current = isHovered;

  const sidebarCloseTimerRef = useRef(null);
  const submenuCloseTimerRef = useRef(null);

  const clearTimers = () => {
    if (sidebarCloseTimerRef.current) {
      clearTimeout(sidebarCloseTimerRef.current);
      sidebarCloseTimerRef.current = null;
    }
    if (submenuCloseTimerRef.current) {
      clearTimeout(submenuCloseTimerRef.current);
      submenuCloseTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearTimers();
    };
  }, []);

  // Ensure nav pane and level 2 submenu close cleanly after any navigation
  useEffect(() => {
    clearTimers();
    setActiveSubmenu(null);
    setIsHovered(false);
  }, [location.pathname]);

  // Restore saved scroll position whenever the nav pane opens or route changes
  useLayoutEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = persistedNavScrollTop;
    }
  }, [isHovered, location.pathname]);

  const handleNavScroll = (e) => {
    setActiveSubmenu(null);
    if (isHoveredRef.current) {
      persistedNavScrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleSidebarEnter = () => {
    clearTimers();
    setIsHovered(true);
  };

  const handleSidebarLeave = () => {
    clearTimers();
    sidebarCloseTimerRef.current = setTimeout(() => {
      setActiveSubmenu(null);
      setIsHovered(false);
    }, 80);
  };

  const handleSubmenuOpen = (key, subItems, event) => {
    clearTimers();
    setIsHovered(true);
    const rect = event.currentTarget.getBoundingClientRect();
    const estimatedHeight = subItems.length * 36 + 24;
    const clampedTop = Math.min(rect.top, Math.max(8, window.innerHeight - estimatedHeight - 12));
    setActiveSubmenu({
      key,
      subItems,
      top: clampedTop,
      left: 220 * VarLayoutScale - 2
    });
  };

  const handleSubmenuLeave = () => {
    submenuCloseTimerRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 80);
  };

  const handleFlyoutEnter = () => {
    clearTimers();
    setIsHovered(true);
  };

  const handleFlyoutLeave = () => {
    clearTimers();
    sidebarCloseTimerRef.current = setTimeout(() => {
      setActiveSubmenu(null);
      setIsHovered(false);
    }, 80);
  };

  const handleFlyoutItemClick = () => {
    clearTimers();
    setActiveSubmenu(null);
    setIsHovered(false);
  };

  const handleLogout = () => {
    persistedNavScrollTop = 0;
    logout();
    navigate('/');
  };

  const handleScroll = (e) => {
    setIsScrolled(e.currentTarget.scrollTop > 10);
  };

  // Resolved colors based on current theme state
  const resolvedIconColor = VarNavPaneIconColor(Boolean(isDark));
  const resolvedTextColor = VarNavPaneIconTextColor(Boolean(isDark));

  const NavLink = ({ to, label, icon: Icon, perm, activePaths = [], subItems = null }) => {
    if (perm !== 'always' && hasAccess && !hasAccess(perm)) return null;

    const isActive =
      location.pathname === to ||
      (to !== '/' &&
        to !== '/home' &&
        location.pathname.startsWith(to)) ||
      activePaths.includes(location.pathname);

    const hasSubmenu = Array.isArray(subItems) && subItems.length > 0;
    const isSubmenuOpen = activeSubmenu?.key === label;

    return (
      <div
        className="relative w-full flex-shrink-0"
        onMouseEnter={hasSubmenu ? (e) => handleSubmenuOpen(label, subItems, e) : () => setActiveSubmenu(null)}
        onMouseLeave={hasSubmenu ? handleSubmenuLeave : undefined}
      >
        <Link
          to={to}
          title={!isHovered ? label : undefined}
          style={{ height: `${VarNavPaneButtonHeightAdjuster}px` }}
          className={`relative flex items-center rounded-lg transition-colors duration-150 select-none ${
            isHovered ? 'w-full px-2' : 'mx-auto justify-center'
          } ${
            isActive || isSubmenuOpen
              ? 'bg-[#E60000]/15 dark:bg-[#E60000]/20 text-[#E60000] dark:text-[#ff3b3b] shadow-sm shadow-[#E60000]/10 font-bold'
              : 'hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-medium'
          }`}
        >
          <div
            style={{
              width: `${VarNavPaneButtonHeightAdjuster}px`,
              height: `${VarNavPaneButtonHeightAdjuster}px`
            }}
            className="flex items-center justify-center flex-shrink-0"
          >
            <Icon
              style={!isActive && !isSubmenuOpen ? { color: resolvedIconColor } : undefined}
              className={`w-[15px] h-[15px] transition-transform duration-150 group-hover:scale-110 ${
                isActive || isSubmenuOpen
                  ? 'text-[#E60000] dark:text-[#ff3b3b]'
                  : 'group-hover:text-slate-900 dark:group-hover:text-white'
              }`}
              strokeWidth={isActive ? VarNavPaneIconsWieghtAdjuster + 0.5 : VarNavPaneIconsWieghtAdjuster}
            />
          </div>

          <AnimatePresence>
            {isHovered && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                style={!isActive && !isSubmenuOpen ? { color: resolvedTextColor } : undefined}
                className={`ml-2 text-[9.5px] uppercase tracking-normal whitespace-nowrap overflow-hidden flex-1 flex items-center justify-between ${VarNavPaneIconsTextWieghtAdjuster}`}
              >
                <span className="truncate">{label}</span>
                {hasSubmenu && (
                  <ChevronRight className="w-3 h-3 ml-1 flex-shrink-0 opacity-60" />
                )}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>
      </div>
    );
  };

  const isHomeActive = location.pathname === '/home';

  return (
    <div
      style={{
        zoom: VarLayoutScale,
        width: `${100 / VarLayoutScale}vw`,
        height: `${100 / VarLayoutScale}vh`
      }}
      className="flex overflow-hidden bg-slate-50 dark:bg-[#030403] relative transition-colors duration-500"
    >
      {/* Ultra-thin grey scrollbar styling for expanded left nav pane */}
      <style>{`
        .left-nav-pane-scroll::-webkit-scrollbar {
          width: ${VarLeftNavPaneScrollBarWidthAdjuster}px !important;
          height: ${VarLeftNavPaneScrollBarWidthAdjuster}px !important;
        }
        .left-nav-pane-scroll::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .left-nav-pane-scroll::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.5) !important;
          border-radius: 9999px !important;
        }
        .left-nav-pane-scroll::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.85) !important;
        }
        .left-nav-pane-scroll::-webkit-scrollbar-button {
          display: none !important;
          width: 0 !important;
          height: 0 !important;
        }
        @supports not selector(::-webkit-scrollbar) {
          .left-nav-pane-scroll {
            scrollbar-width: thin;
            scrollbar-color: rgba(148, 163, 184, 0.5) transparent;
          }
        }
      `}</style>

      {/* Ambient background glow */}
      <div className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] bg-[#E60000]/5 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* ========================================== */}
      {/* BORDERLESS DOCKED SIDEBAR                  */}
      {/* ========================================== */}
      <motion.aside
        initial={{ width: 60 }}
        animate={{ width: isHovered ? 220 : 60 }}
        transition={TRANSITION_CONFIG}
        onMouseEnter={handleSidebarEnter}
        onMouseLeave={handleSidebarLeave}
        className="h-full flex flex-col justify-between flex-shrink-0 z-50 bg-white/70 dark:bg-[#05070a]/90 backdrop-blur-2xl border-none shadow-none select-none overflow-hidden"
      >
        <div className="flex flex-col flex-1 min-h-0 pt-2">
          {/* TOP ITEM: HOME (VISIBLE ONLY FOR ROLES WITH 'home' PERMISSION) */}
          {hasAccess && hasAccess('home') && (
            <>
              <div className="flex items-center justify-center px-2 flex-shrink-0 mb-1">
                <Link
                  to="/home"
                  title="HOME"
                  style={{ height: `${VarNavPaneButtonHeightAdjuster}px` }}
                  className={`rounded-lg flex items-center transition-all duration-150 select-none ${
                    isHovered ? 'w-full px-2' : 'justify-center'
                  } ${
                    isHomeActive
                      ? 'bg-[#E60000]/15 dark:bg-[#E60000]/20 text-[#E60000] dark:text-[#ff3b3b] shadow-sm shadow-[#E60000]/10 font-bold'
                      : 'hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 font-medium'
                  }`}
                >
                  <div
                    style={{
                      width: `${VarNavPaneButtonHeightAdjuster}px`,
                      height: `${VarNavPaneButtonHeightAdjuster}px`
                    }}
                    className="flex items-center justify-center flex-shrink-0"
                  >
                    <LayoutGrid
                      style={!isHomeActive ? { color: resolvedIconColor } : undefined}
                      className={`w-[15px] h-[15px] ${
                        isHomeActive
                          ? 'text-[#E60000] dark:text-[#ff3b3b]'
                          : 'group-hover:text-slate-900 dark:group-hover:text-white'
                      }`}
                      strokeWidth={VarNavPaneIconsWieghtAdjuster + 0.5}
                    />
                  </div>

                  <AnimatePresence>
                    {isHovered && (
                      <motion.span
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, transition: { duration: 0.08 } }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        style={!isHomeActive ? { color: resolvedTextColor } : undefined}
                        className={`ml-2 text-[10px] tracking-wider uppercase whitespace-nowrap overflow-hidden ${VarNavPaneIconsTextWieghtAdjuster}`}
                      >
                        HOME
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </div>

              {/* Separator under Home */}
              <div className="px-3 mb-1">
                <div className="h-px w-full bg-black/5 dark:bg-white/5" />
              </div>
            </>
          )}

          {/* Navigation Items (Role-based visibility, scrollable only when expanded on hover) */}
          <nav
            ref={navRef}
            onScroll={handleNavScroll}
            className={`flex-1 min-h-0 px-2 flex flex-col gap-[1.5px] select-none ${
              isHovered ? 'overflow-y-auto overflow-x-hidden left-nav-pane-scroll' : 'overflow-hidden'
            }`}
          >
            <NavLink to="/start-campaign" label="START NEW CAMPAIGN" icon={Rocket} perm="start-campaign" />
            <NavLink
              to="/create-scenario"
              label="SCENARIOS"
              icon={FileText}
              perm="scenarios"
              activePaths={[
                '/new-scenario',
                ...SCENARIO_STEPS.map((step) => `/new-scenario/${step.path}`)
              ]}
            />
            <NavLink to="/campaigns" label="CAMPAIGNS" icon={Megaphone} perm="campaigns" />
            <NavLink to="/training" label="TRAINING (LMS)" icon={Laptop} perm="training" />
            <NavLink
              to="/landing-page-catalogue"
              label="LANDING PAGE CATALOGUE"
              icon={LayoutTemplate}
              perm="landing-page-catalogue"
            />
            <NavLink
              to="/cover-image-catalogue"
              label="COVER IMAGE CATALOGUE"
              icon={Image}
              perm="cover-image-catalogue"
            />
            <NavLink
              to="/announcements"
              label="ANNOUNCEMENT"
              icon={MessageSquare}
              perm="announcements"
              activePaths={[
                '/new-announcement',
                '/announcements/approvals',
                '/announcements/history',
                ...ANNOUNCEMENT_STEPS.map((step) => `/new-announcement/${step.path}`)
              ]}
              subItems={ANNOUNCEMENT_SUB_ITEMS}
            />
            <NavLink to="/user-dls" label="RECIPIENTS LIST" icon={Users} perm="user-dls" />
            <NavLink to="/email-domains" label="EMAIL IDs & DOMAINS" icon={AtSign} perm="email-domains" />
            {/* REQUESTS & APPROVALS LINK */}
            <NavLink
              to="/requests-approvals"
              label="REQUESTS & APPROVALS"
              icon={MessagesSquare}
              perm="requests-approvals"
            />
            <NavLink to="/gamification" label="GAMIFICATION ENGINE" icon={Sparkles} perm="gamification-engine" />
            <NavLink to="/analytics" label="INSIGHTS" icon={BarChart2} perm="analytics" />
            <NavLink to="/my-space" label="MY SPACE" icon={User} perm="always" />
            <NavLink to="/my-training" label="MY TRAINING" icon={GraduationCap} perm="always" />
            <NavLink to="/leaderboard" label="LEADERBOARD" icon={Trophy} perm="leaderboard" />
          </nav>
        </div>

        {/* Bottom Profile Section */}
        <div className="p-2 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/[0.01]">
          <div className={`flex items-center ${isHovered ? 'w-full px-1' : 'justify-center'}`}>
            <div
              style={{
                width: `${VarNavPaneButtonHeightAdjuster}px`,
                height: `${VarNavPaneButtonHeightAdjuster}px`
              }}
              className="flex items-center justify-center flex-shrink-0"
            >
              <div className="w-6 h-6 rounded-md bg-gradient-to-br from-[#E60000] to-[#990099] flex items-center justify-center text-white font-black text-[9px] shadow-sm">
                {user?.role?.charAt(0) || 'A'}
              </div>
            </div>

            <AnimatePresence>
              {isHovered && (
                <motion.div
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, transition: { duration: 0.08 } }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="ml-2 overflow-hidden whitespace-nowrap flex-1"
                >
                  <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate leading-tight">
                    {user?.role}
                  </p>
                  <button
                    onClick={handleLogout}
                    className="text-[9px] font-bold text-red-500 hover:text-red-400 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                  >
                    <LogOut className="w-2.5 h-2.5" /> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Hover Sub-Selection Flyout Portal */}
      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {activeSubmenu && isHovered && (
              <motion.div
                key={activeSubmenu.key}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -4, transition: { duration: 0.08 } }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                onMouseEnter={handleFlyoutEnter}
                onMouseLeave={handleFlyoutLeave}
                style={{
                  position: 'fixed',
                  top: `${activeSubmenu.top}px`,
                  left: `${activeSubmenu.left}px`,
                  zIndex: 9999
                }}
                className="pl-2 select-none"
              >
                <div className="min-w-[190px] p-1.5 rounded-xl bg-white/95 dark:bg-[#05070a]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-xl flex flex-col gap-0.5">
                  {activeSubmenu.subItems.map((sub) => {
                    const isSubActive =
                      location.pathname === sub.to ||
                      (sub.to === '/new-announcement' && location.pathname.startsWith('/new-announcement/'));

                    return (
                      <Link
                        key={sub.to}
                        to={sub.to}
                        onClick={handleFlyoutItemClick}
                        style={!isSubActive ? { color: resolvedTextColor } : undefined}
                        className={`px-3 py-2 rounded-lg text-[10px] uppercase tracking-normal whitespace-nowrap transition-colors duration-150 ${VarNavPaneIconsTextWieghtAdjuster} ${
                          isSubActive
                            ? 'bg-[#E60000]/15 dark:bg-[#E60000]/20 text-[#E60000] dark:text-[#ff3b3b] font-bold'
                            : 'hover:text-slate-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5'
                        }`}
                      >
                        {sub.label}
                      </Link>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}

      {/* ========================================== */}
      {/* MAIN VIEWPORT (HEADER + CONTENT)           */}
      {/* ========================================== */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <TopHeaderSection
          isSidebarExpanded={isHovered}
          isScrolled={isScrolled}
        />

        <main
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto relative z-10 pt-[60px]"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;