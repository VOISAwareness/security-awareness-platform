import { Suspense, useState, useRef, useEffect, useLayoutEffect } from 'react';
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
import PageLoading from './PageLoading';
import ErrorBoundary from './ErrorBoundary';
import useIsWide from './useIsWide';
import useLayoutScale from './useLayoutScale';
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
export const VarLeftNavPaneScrollBarWidthAdjuster = 3;

// Theme-aware color resolvers
export const VarNavPaneIconColor = (isDark) => (isDark ? '#94a3b8' : '#64748b');
export const VarNavPaneIconTextColor = (isDark) => (isDark ? '#e2e8f0' : '#1e293b');

export const TRANSITION_CONFIG = {
  type: "tween",
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1]
};

// The Announcement item's second level: a flyout beside the docked sidebar on
// wide windows, listed under the item in the slide-in menu on narrow ones.
const ANNOUNCEMENT_SUB_ITEMS = [
  { label: 'Announcements', to: '/announcements' },
  { label: 'Create new template', to: '/new-announcement' },
  { label: 'Request & Approvals', to: '/announcements/approvals' },
  { label: 'All Announcements', to: '/announcements/history' }
];

const SIDEBAR_OPEN_WIDTH = 220;
const SIDEBAR_CLOSED_WIDTH = 60;

// Keeps the menu's scroll position across collapse/expand and page changes
let persistedNavScrollTop = 0;

const isSubItemActive = (pathname, sub) =>
  pathname === sub.to || (sub.to === '/new-announcement' && pathname.startsWith('/new-announcement/'));

const Layout = () => {
  const { user, logout, hasAccess, isDark } = useUserType?.() || { isDark: false };
  const navigate = useNavigate();
  const location = useLocation();
  // Hover expansion and the open flyout belong to the page they started on:
  // following a link collapses the sidebar and closes the flyout.
  const [hoveredOn, setHoveredOn] = useState(null);
  const hovered = hoveredOn === location.pathname;
  const setHovered = (on) => setHoveredOn(on ? location.pathname : null);
  const [isScrolled, setIsScrolled] = useState(false);
  // The open flyout: { key, subItems, top, on } (wide windows only)
  const [submenu, setSubmenu] = useState(null);
  const activeSubmenu = submenu?.on === location.pathname ? submenu : null;
  const setActiveSubmenu = (value) => setSubmenu(value ? { ...value, on: location.pathname } : null);
  // Wide windows: the docked sidebar, expanded on hover. Narrower (tablets,
  // phones): a slide-in menu opened from the header, so pages get the width.
  const isWide = useIsWide();
  // The whole app's zoom: 0.9 on a laptop-sized window, more on bigger ones (useLayoutScale.js).
  const layoutScale = useLayoutScale();
  // The menu is open only on the page it was opened on, and only while narrow:
  // following a link (or widening the window) closes it.
  const [menuOpenOn, setMenuOpenOn] = useState(null);
  const menuOpen = !isWide && menuOpenOn === location.pathname;
  const setMenuOpen = (open) => setMenuOpenOn(open ? location.pathname : null);
  const isHovered = isWide ? hovered : menuOpen; // labels shown

  const navRef = useRef(null);
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

  useEffect(() => clearTimers, []);

  // Restore the saved scroll position whenever the menu opens or the page changes
  useLayoutEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = persistedNavScrollTop;
    }
  }, [isHovered, location.pathname]);

  const handleNavScroll = (e) => {
    setActiveSubmenu(null);
    if (isHovered) {
      persistedNavScrollTop = e.currentTarget.scrollTop;
    }
  };

  // Wide windows only: expand on hover, collapse a moment after leaving (so
  // moving across to the flyout doesn't close it)
  const handleSidebarEnter = () => {
    clearTimers();
    setHovered(true);
  };

  const handleSidebarLeave = () => {
    clearTimers();
    sidebarCloseTimerRef.current = setTimeout(() => {
      setActiveSubmenu(null);
      setHovered(false);
    }, 80);
  };

  const handleSubmenuOpen = (key, subItems, event) => {
    clearTimers();
    setHovered(true);
    // The flyout is portalled outside the zoomed layout, so its top is in
    // screen pixels (the item's own) and its size is zoomed to match below.
    const rect = event.currentTarget.getBoundingClientRect();
    const estimatedHeight = (subItems.length * 36 + 24) * layoutScale;
    const top = Math.min(rect.top, Math.max(8, window.innerHeight - estimatedHeight - 12));
    setActiveSubmenu({ key, subItems, top });
  };

  const handleSubmenuLeave = () => {
    submenuCloseTimerRef.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 80);
  };

  const handleFlyoutEnter = () => {
    clearTimers();
    setHovered(true);
  };

  const handleFlyoutItemClick = () => {
    clearTimers();
    setActiveSubmenu(null);
    setHovered(false);
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
    const flyout = hasSubmenu && isWide;
    const isSubmenuOpen = flyout && activeSubmenu?.key === label;
    const highlighted = isActive || isSubmenuOpen;

    return (
      <div
        className="relative w-full flex-shrink-0"
        onMouseEnter={isWide ? (flyout ? (e) => handleSubmenuOpen(label, subItems, e) : () => setActiveSubmenu(null)) : undefined}
        onMouseLeave={flyout ? handleSubmenuLeave : undefined}
      >
        <Link
          to={to}
          title={!isHovered ? label : undefined}
          style={{ height: `${VarNavPaneButtonHeightAdjuster}px` }}
          className={`relative flex items-center rounded-lg transition-colors duration-150 select-none ${
            isHovered ? 'w-full px-2' : 'mx-auto justify-center'
          } ${
            highlighted
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
              style={!highlighted ? { color: resolvedIconColor } : undefined}
              className={`w-[15px] h-[15px] transition-transform duration-150 group-hover:scale-110 ${
                highlighted ? 'text-[#E60000] dark:text-[#ff3b3b]' : 'group-hover:text-slate-900 dark:group-hover:text-white'
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
                style={!highlighted ? { color: resolvedTextColor } : undefined}
                className={`ml-2 text-[9.5px] uppercase tracking-normal whitespace-nowrap overflow-hidden flex-1 flex items-center justify-between ${VarNavPaneIconsTextWieghtAdjuster}`}
              >
                <span className="truncate">{label}</span>
                {flyout && <ChevronRight className="w-3 h-3 ml-1 flex-shrink-0 opacity-60" />}
              </motion.span>
            )}
          </AnimatePresence>
        </Link>

        {/* Narrow windows: the second level listed under the item (no hover on touch) */}
        {hasSubmenu && !isWide && isHovered && (
          <div className="flex flex-col gap-0.5 pl-11 pr-1 py-0.5">
            {subItems.map((sub) => {
              const subActive = isSubItemActive(location.pathname, sub);
              return (
                <Link
                  key={sub.to}
                  to={sub.to}
                  style={!subActive ? { color: resolvedTextColor } : undefined}
                  className={`px-2 py-1.5 rounded-lg text-[9.5px] uppercase tracking-normal whitespace-nowrap transition-colors duration-150 ${VarNavPaneIconsTextWieghtAdjuster} ${
                    subActive
                      ? 'bg-[#E60000]/15 dark:bg-[#E60000]/20 text-[#E60000] dark:text-[#ff3b3b]'
                      : 'hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {sub.label}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const isHomeActive = location.pathname === '/home';

  return (
    <div
      style={{
        zoom: layoutScale,
        width: `${100 / layoutScale}vw`,
        height: `${100 / layoutScale}vh`
      }}
      className="flex overflow-hidden bg-slate-50 dark:bg-[#030403] relative transition-colors duration-500"
    >
      {/* Ultra-thin grey scrollbar for the expanded menu */}
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
      {/* Narrow windows: the open menu dims the page; a tap outside closes it */}
      <AnimatePresence>
        {!isWide && menuOpen && (
          <motion.div
            key="menu-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
            className="fixed inset-0 z-[55] bg-black/40"
          />
        )}
      </AnimatePresence>

      <motion.aside
        id="app-menu"
        initial={false}
        animate={
          isWide
            ? { width: isHovered ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH, x: 0 }
            : { width: SIDEBAR_OPEN_WIDTH, x: menuOpen ? 0 : -240 }
        }
        transition={TRANSITION_CONFIG}
        onMouseEnter={isWide ? handleSidebarEnter : undefined}
        onMouseLeave={isWide ? handleSidebarLeave : undefined}
        aria-hidden={!isWide && !menuOpen ? true : undefined}
        className={`h-full flex flex-col justify-between flex-shrink-0 select-none overflow-hidden ${
          isWide
            ? 'z-50 bg-white/70 dark:bg-[#05070a]/90 backdrop-blur-2xl border-none shadow-none'
            : 'fixed left-0 top-0 z-[60] bg-white dark:bg-[#05070a] shadow-2xl'
        }`}
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
                      className={`w-[15px] h-[15px] ${isHomeActive ? 'text-[#E60000] dark:text-[#ff3b3b]' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`}
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

          {/* Navigation Items (role-based visibility; scrolls when expanded) */}
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
            <NavLink to="/landing-page-catalogue" label="LANDING PAGE CATALOGUE" icon={LayoutTemplate} perm="landing-page-catalogue" />
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
                  <p className="text-[10px] font-bold text-slate-900 dark:text-white truncate leading-tight">{user?.role}</p>
                  <button
                    onClick={handleLogout}
                    className="text-[9px] font-bold text-red-500 hover:text-red-400 hover:underline flex items-center gap-1 mt-0.5 cursor-pointer"
                  >
                    <LogOut className="w-2.5 h-2.5"/> Logout
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>

      {/* Wide windows: the hover flyout beside the sidebar (portalled, zoomed like the app) */}
      {isWide && typeof document !== 'undefined' &&
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
                onMouseLeave={handleSidebarLeave}
                style={{
                  position: 'fixed',
                  zoom: layoutScale,
                  top: `${activeSubmenu.top / layoutScale}px`,
                  left: `${SIDEBAR_OPEN_WIDTH - 2}px`,
                  zIndex: 9999
                }}
                className="pl-2 select-none"
              >
                <div className="min-w-[190px] p-1.5 rounded-xl bg-white/95 dark:bg-[#05070a]/95 backdrop-blur-2xl border border-black/10 dark:border-white/10 shadow-xl flex flex-col gap-0.5">
                  {activeSubmenu.subItems.map((sub) => {
                    const subActive = isSubItemActive(location.pathname, sub);
                    return (
                      <Link
                        key={sub.to}
                        to={sub.to}
                        onClick={handleFlyoutItemClick}
                        style={!subActive ? { color: resolvedTextColor } : undefined}
                        className={`px-3 py-2 rounded-lg text-[10px] uppercase tracking-normal whitespace-nowrap transition-colors duration-150 ${VarNavPaneIconsTextWieghtAdjuster} ${
                          subActive
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
          leftOffset={isWide ? (isHovered ? SIDEBAR_OPEN_WIDTH : SIDEBAR_CLOSED_WIDTH) : 0}
          isScrolled={isScrolled}
          onMenu={isWide ? undefined : () => setMenuOpen(!menuOpen)}
          menuOpen={menuOpen}
        />

        <main
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto relative z-10 pt-[60px]"
        >
          {/* a page's code loads when it is first opened (App.jsx) */}
          {/* keyed by route: a page that failed to load clears when another is opened */}
          <ErrorBoundary key={location.pathname}>
            <Suspense fallback={<PageLoading show surface="page" />}>
              <Outlet />
            </Suspense>
          </ErrorBoundary>
        </main>
      </div>

    </div>
  );
};

export default Layout;
