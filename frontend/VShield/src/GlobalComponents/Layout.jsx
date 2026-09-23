import React, { useState } from 'react';
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
  LogOut 
} from 'lucide-react';

import TopHeaderSection from './TopHeaderSection';

// =========================================================================
// 🎛️ LAYOUT SCALE, HEIGHT, WEIGHT & THEMED COLOR CONTROLS
// =========================================================================
export const VarLayoutScale = 0.9;
export const VarNavPaneButtonHeightAdjuster = 41.5; // Height in px for each nav item & Home
export const VarNavPaneIconsWieghtAdjuster = 2.2;
export const VarNavPaneIconsTextWieghtAdjuster = 'font-bold';

// Theme-aware color resolvers
export const VarNavPaneIconColor = (isDark) => (isDark ? '#94a3b8' : '#64748b');
export const VarNavPaneIconTextColor = (isDark) => (isDark ? '#e2e8f0' : '#1e293b');

export const TRANSITION_CONFIG = {
  type: "tween",
  duration: 0.2,
  ease: [0.16, 1, 0.3, 1]
};

const Layout = () => {
  const { user, logout, hasAccess, isDark } = useUserType?.() || { isDark: false };
  const navigate = useNavigate();
  const location = useLocation();
  const [isHovered, setIsHovered] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const handleScroll = (e) => {
    setIsScrolled(e.currentTarget.scrollTop > 10);
  };

  // Resolved colors based on current theme state
  const resolvedIconColor = VarNavPaneIconColor(Boolean(isDark));
  const resolvedTextColor = VarNavPaneIconTextColor(Boolean(isDark));

  const NavLink = ({ to, label, icon: Icon, perm, activePaths = [] }) => {
  if (perm !== 'always' && !hasAccess(perm)) return null;

  const isActive =
    location.pathname === to ||
    (to !== '/' &&
      to !== '/home' &&
      location.pathname.startsWith(to)) ||
    activePaths.includes(location.pathname);

    return (
      <Link 
        to={to} 
        title={!isHovered ? label : undefined}
        style={{ height: `${VarNavPaneButtonHeightAdjuster}px` }}
        className={`relative flex items-center rounded-lg transition-colors duration-150 select-none ${
          isHovered ? 'w-full px-2' : 'mx-auto justify-center'
        } ${
          isActive 
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
            style={!isActive ? { color: resolvedIconColor } : undefined}
            className={`w-[16px] h-[16px] transition-transform duration-150 group-hover:scale-110 ${
              isActive ? 'text-[#E60000] dark:text-[#ff3b3b]' : 'group-hover:text-slate-900 dark:group-hover:text-white'
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
              style={!isActive ? { color: resolvedTextColor } : undefined}
              className={`ml-2 text-[10px] uppercase tracking-normal whitespace-nowrap overflow-hidden ${VarNavPaneIconsTextWieghtAdjuster}`}
            >
              {label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    );
  };

  const isHomeActive = location.pathname === '/home' || location.pathname === '/';

  return (
    <div 
      style={{ 
        zoom: VarLayoutScale,
        width: `${100 / VarLayoutScale}vw`,
        height: `${100 / VarLayoutScale}vh`
      }}
      className="flex overflow-hidden bg-slate-50 dark:bg-[#030403] relative transition-colors duration-500"
    >
      {/* Ambient background glow */}
      <div className="absolute top-[-20%] left-[10%] w-[50vw] h-[50vw] bg-[#E60000]/5 rounded-full blur-[150px] pointer-events-none z-0" />

      {/* ========================================== */}
      {/* BORDERLESS DOCKED SIDEBAR                  */}
      {/* ========================================== */}
      <motion.aside 
        initial={{ width: 60 }} 
        animate={{ width: isHovered ? 220 : 60 }} 
        transition={TRANSITION_CONFIG}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="h-full flex flex-col justify-between flex-shrink-0 z-50 bg-white/70 dark:bg-[#05070a]/90 backdrop-blur-2xl border-none shadow-none select-none overflow-hidden"
      >
        <div className="flex flex-col flex-1 min-h-0 pt-2">
          {/* TOP ITEM: HOME */}
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
                  className={`w-[16px] h-[16px] ${isHomeActive ? 'text-[#E60000] dark:text-[#ff3b3b]' : 'group-hover:text-slate-900 dark:group-hover:text-white'}`} 
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
                    className={`ml-2 text-[10.5px] tracking-wider uppercase whitespace-nowrap overflow-hidden ${VarNavPaneIconsTextWieghtAdjuster}`}
                  >
                    HOME
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>

          {/* Separator under Home */}
          <div className="px-3 mb-1.5">
            <div className="h-px w-full bg-black/5 dark:bg-white/5" />
          </div>

          {/* 13 Navigation Items */}
          <nav className="flex-1 px-2 flex flex-col gap-[2.5px] overflow-hidden select-none">
            <NavLink to="/start-campaign" label="START NEW CAMPAIGN" icon={Rocket} perm="start-campaign" />
            <NavLink
  to="/create-scenario"
  label="SCENARIOS"
  icon={FileText}
  perm="scenarios"
  activePaths={['/new-scenario']}
/>
            <NavLink to="/campaigns" label="CAMPAIGNS" icon={Megaphone} perm="campaigns" />
            <NavLink to="/training" label="TRAINING" icon={Laptop} perm="training" />
            <NavLink to="/landing-page-catalogue" label="LANDING PAGE CATALOGUE" icon={LayoutTemplate} perm="landing-page-catalogue" />
            <NavLink to="/announcements" label="ANNOUNCEMENT" icon={MessageSquare} perm="announcements" />
            <NavLink to="/user-dls" label="USER LIST (DL)" icon={Users} perm="user-dls" />
            <NavLink to="/email-domains" label="EMAIL IDs & DOMAINS" icon={AtSign} perm="email-domains" />
            <NavLink to="/requests-approvals" label="REQUESTS & APPROVALS" icon={MessagesSquare} perm="requests-approvals" />
            <NavLink to="/gamification" label="GAMIFICATION ENGINE" icon={Sparkles} perm="gamification-engine" />
            <NavLink to="/analytics" label="DASHBOARD & ANALYTICS" icon={BarChart2} perm="analytics" />
            <NavLink to="/my-space" label="MY SPACE" icon={User} perm="always" />
            <NavLink to="/my-training" label="MY TRAINING" icon={GraduationCap} perm="always" />
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