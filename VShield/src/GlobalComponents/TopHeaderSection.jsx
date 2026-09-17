import React from 'react';
import { Link } from 'react-router-dom';
import { useUserType } from '../UserTypeContext/UserTypeContext';
import { motion } from 'framer-motion';
import { Sun, Moon } from 'lucide-react';
import { TRANSITION_CONFIG } from './Layout';

// =========================================================================
// 🎛️ TOP HEADER SCALE CONTROL VARIABLE (0.9 = 90%, 1.0 = 100%, etc.)
// =========================================================================
export const VarTopHeaderSectionScale = 0.9;

const TopHeaderSection = ({ isSidebarExpanded = false, isScrolled = false }) => {
  const { isDark, setIsDark } = useUserType();

  return (
    <motion.header
      initial={false}
      animate={{ left: isSidebarExpanded ? 220 : 60 }}
      transition={TRANSITION_CONFIG}
      style={{ zoom: VarTopHeaderSectionScale }}
      className={`fixed top-0 right-0 h-[60px] flex items-center justify-between px-6 lg:px-6 z-40 border-none transition-colors duration-200 ${
        isScrolled
          ? 'bg-white/80 dark:bg-[#030403]/75 backdrop-blur-2xl shadow-sm'
          : 'bg-transparent'
      }`}
    >
      {/* Brand Title: Clicking navigates to Landing Page ('/') */}
      <Link 
        to="/" 
        title="Go to Landing Page" 
        className="flex items-center cursor-pointer select-none group"
      >
        <h2 className="text-2xl font-bold tracking-tight transition-colors pl-2">
          <span className="text-slate-900 dark:text-white">VOIS</span>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E60000] to-[#990099]">Shield</span>
          <span className="text-slate-900 dark:text-white">.</span>
        </h2>
      </Link>

      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        <span className="hidden md:inline-flex items-center text-xs font-medium text-slate-500 dark:text-slate-400">
          Contact:&nbsp;
          <a
            href="mailto:abhay.hs1@vodafone.com"
            className="font-semibold text-slate-700 dark:text-slate-300 hover:text-[#E60000] dark:hover:text-[#E60000] transition-colors"
          >
            abhay.hs1@vodafone.com
          </a>
        </span>

        {/* Theme Toggle */}
        <div
          className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-full relative w-16 h-8"
          role="group"
          aria-label="Theme toggle"
        >
          <button
            type="button"
            onClick={() => setIsDark(false)}
            aria-label="Light mode"
            className={`flex-1 flex justify-center items-center z-10 transition-colors ${
              !isDark ? 'text-black' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setIsDark(true)}
            aria-label="Dark mode"
            className={`flex-1 flex justify-center items-center z-10 transition-colors ${
              isDark ? 'text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>

          <div
            className={`absolute w-[calc(50%-4px)] h-[calc(100%-8px)] bg-white dark:bg-[#E60000] rounded-full shadow-sm transition-transform duration-200 ease-out ${
              isDark ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'
            }`}
          />
        </div>
      </div>
    </motion.header>
  );
};

export default TopHeaderSection;