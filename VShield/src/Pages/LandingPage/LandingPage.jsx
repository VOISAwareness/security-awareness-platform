import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserType } from '../../UserTypeContext/UserTypeContext';
import { motion, useScroll, AnimatePresence } from 'framer-motion';
import Lenis from '@studio-freight/lenis';
import { 
  ShieldCheck, Lock, UserCircle, Sun, Moon, X, Sparkles, ArrowRight, ChevronUp
} from 'lucide-react';

import HeroImage from '../../LandingPageImage.png';
import AnimatedShackleGif from '../../assets/v-shield-animated-shackle.gif';
// IMPORT PART 2 SECTION
import LandingPagePart2 from './LandingPagePart2';

// =========================================================================
// 🎛️ HERO & KNOW MORE SCALE CONTROL VARIABLE (0.9 = 90%, 1.0 = 100%, etc.)
// =========================================================================
export const VarLandingPageScale = 1.0;

const LandingPage = () => {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [role, setRole] = useState('Admin');
  const [password, setPassword] = useState('123456');
  const [error, setError] = useState('');
  const [isScrolled, setIsScrolled] = useState(false);
  
  const { login, isDark, setIsDark } = useUserType();
  const navigate = useNavigate();
  const { scrollYProgress, scrollY } = useScroll();

  // Initialize Lenis for Smooth Scrolling
  useEffect(() => {
    const lenis = new Lenis({
      duration: 0.8,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smooth: true,
      wheelMultiplier: 1.0,
      touchMultiplier: 1.2,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    return () => lenis.destroy();
  }, []);

  // Sync header glassmorphism across the entire page scroll
  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setIsScrolled(latest > 20);
    });
    return () => unsubscribe();
  }, [scrollY]);

  // Sync scroll progress with dead-lock threshold
  useEffect(() => {
    const unsubscribe = scrollYProgress.on("change", (latest) => {
      setIsScrolled(latest > 0.08);
    });
    return () => unsubscribe();
  }, [scrollYProgress]);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    if (login(role, password)) {
      navigate('/home');
    } else {
      setError('Invalid credentials. Access Denied.');
    }
  };

  const roles = ['Admin', 'Campaign Creator', 'Campaign Manager', 'Gamification Engine Manager', 'Regular User', 'GMT'];

  return (
    <div className="w-full bg-slate-50 dark:bg-[#030403] relative selection:bg-[#E60000] selection:text-white font-sans transition-colors duration-500 overflow-x-hidden select-none">
      
      {/* ========================================================= */}
      {/* PERSISTENT HEADER (VISIBLE ON LANDING PAGE & PART 2)      */}
      {/* ========================================================= */}
      <header className={`fixed top-0 left-0 w-full h-[50px] flex items-center justify-between px-6 lg:px-12 z-50 transition-all duration-300 border-b border-black/[0.1] dark:border-white/[0.1] ${
        isScrolled 
          ? 'bg-slate-50/80 dark:bg-[#030403]/80 backdrop-blur-md shadow-sm' 
          : 'bg-transparent'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#E60000]/20 to-[#990099]/20 flex items-center justify-center border border-[#E60000]/30 shadow-sm">
            <ShieldCheck className="w-5 h-5 text-[#E60000]" />
          </div>
          <h2 className="text-lg font-bold tracking-tight transition-colors">
            <span className="text-slate-900 dark:text-white">VOIS</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E60000] to-[#990099]">Shield</span>
            <span className="text-slate-900 dark:text-white">.</span>
          </h2>
        </div>
        
        <div className="flex items-center gap-6">
          <span className="hidden md:block text-[10px] font-semibold text-slate-500 dark:text-slate-400">
            Contact: <a href="mailto:abhay.hs1@vodafone.com" className="hover:text-[#E60000] transition-colors">abhay.hs1@vodafone.com</a>
          </span>
          
          <div className="flex items-center bg-black/5 dark:bg-white/5 p-1 rounded-full border border-black/5 dark:border-white/10 relative w-14 h-7">
            <button onClick={() => setIsDark(false)} className={`flex-1 flex justify-center z-10 transition-colors ${!isDark ? 'text-black' : 'text-slate-400'}`}><Sun className="w-3.5 h-3.5" /></button>
            <button onClick={() => setIsDark(true)} className={`flex-1 flex justify-center z-10 transition-colors ${isDark ? 'text-white' : 'text-slate-400'}`}><Moon className="w-3.5 h-3.5" /></button>
            <div className={`absolute w-[calc(50%-4px)] h-[calc(100%-8px)] bg-white dark:bg-[#E60000] rounded-full shadow-sm transition-transform duration-300 ease-out ${isDark ? 'translate-x-[calc(100%+4px)]' : 'translate-x-0'}`} />
          </div>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* STAGE 1: HERO & KNOW MORE PRESENTATION (CONTROLLED BY VarLandingPageScale) */}
      {/* ========================================================================= */}
      <div 
        style={{ 
          zoom: VarLandingPageScale,
          width: `${100 / VarLandingPageScale}vw`
        }} 
        className="h-[180vh] relative"
      >
        <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col justify-between">
          
          {/* HERO SECTION */}
          <motion.div 
            animate={{ 
              opacity: isScrolled ? 0 : 1, 
              y: isScrolled ? -50 : 0, 
              scale: isScrolled ? 0.96 : 1,
              pointerEvents: isScrolled ? "none" : "auto"
            }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="w-full flex-1 flex items-center pt-[60px] pb-[70px] px-6 lg:px-12 relative z-10 overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 w-full max-w-[1600px] mx-auto items-center h-full">
              
              {/* LEFT: Text & SSO */}
              <div className="lg:col-span-6 w-full pr-0 lg:pr-8 -pl-9 mt-4 ">
                <div className="mb-6">
                  <h1 className="text-xl lg:text-[65px] font-extrabold tracking-tighter transition-colors leading-none -mt-8">
                    <span className="text-slate-900 dark:text-white">VOIS</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E60000] to-[#990099]">Shield</span>
                    <span className="text-slate-900 dark:text-white">.</span>
                  </h1>
                </div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-slate-200 to-slate-100 dark:from-white/10 dark:to-white/5 border border-slate-300 dark:border-white/10 shadow-sm mb-3">
                  <Sparkles className="w-3 h-3 text-[#990099]" />
                  <span className="text-[8px] font-bold tracking-widest text-slate-700 dark:text-slate-300 uppercase">Powered by AIDA</span>
                </div>

                <h2 className="text-2xl lg:text-2xl font-display font-semibold text-slate-900 dark:text-white tracking-tight mb-3 transition-colors leading-[1.2]">
                  Next-generation human firewall <br className="hidden lg:block" /> & security awareness matrix.
                </h2>

                <p className="font-display text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-8 max-w-lg transition-colors tracking-wide">
                  Equip your workforce with the knowledge to identify and neutralize cyber threats. Our intelligent platform delivers targeted simulations, comprehensive training, and real-time analytics.
                </p>

                <button 
                  onClick={() => setShowLoginModal(true)}
                  className="w-full sm:w-auto px-6 py-2.5 rounded-[8px] bg-[#0B1121] dark:bg-white text-white dark:text-[#0B1121] font-semibold text-[12px] tracking-wide hover:shadow-[0_10px_30px_rgba(0,0,0,0.2)] dark:hover:shadow-[0_10px_30px_rgba(255,255,255,0.2)] hover:-translate-y-1 transition-all duration-300 flex items-center justify-center gap-3 group border border-transparent dark:border-white/20"
                >
                  <svg className="w-3.5 h-4" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                    <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                    <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                    <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                  </svg>
                  Login with Microsoft SSO
                </button>
              </div>

              {/* RIGHT: Floating Shield Graphic */}
              <div className="hidden lg:flex flex-col items-center justify-center relative w-full h-full lg:col-span-6 pointer-events-none left-12">
                <motion.div
                  initial={{ x: "-50%" }}
                  animate={{ 
                    scale: [0.85, 1.15, 0.85],
                    opacity: [0.15, 0.4, 0.15]
                  }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute bottom-[10%] left-1/2 w-[45%] h-[25px] bg-black/50 dark:bg-white/60 rounded-[100%] blur-[12px] z-0"
                />

                <motion.div 
                  animate={{ y: [-20, 15, -20] }}
                  transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                  className="relative z-10 w-full h-[85%] flex items-center justify-center"
                >
                  <img 
                    src={HeroImage} 
                    alt="VOIS Shield Core" 
                    className="relative z-10 w-full h-full object-contain scale-90 drop-shadow-xl dark:drop-shadow-[0_15px_30px_rgba(0,0,0,0.6)]"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </motion.div>
              </div>

            </div>
          </motion.div>

          {/* ========================================================= */}
          {/* KNOW MORE SECTION (OPEN BOTTOM DRAWER IN UNEXPANDED STATE)*/}
          {/* ========================================================= */}
          <div 
            className={`w-full px-6 lg:px-6 z-30 transition-all duration-500 ${
              isScrolled 
                ? 'fixed inset-0 pt-[66px] pb-4 flex items-center justify-center pointer-events-auto' 
                : 'relative pb-3 flex justify-end pointer-events-auto'
            }`}
          >
            <motion.div
              layout
              animate={{ 
                height: isScrolled ? "calc(100vh - 82px)" : "45px",
                y: 0
              }}
              transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
              onClick={() => !isScrolled && window.scrollTo({ top: window.innerHeight, behavior: 'smooth' })}
              className="max-w-[1600px] w-full mx-auto rounded-[10px] bg-[#06080d] dark:bg-white border border-black/10 dark:border-slate-200 shadow-2xl overflow-hidden relative flex flex-col justify-center cursor-pointer md:cursor-default transition-colors duration-500"
            >
              {/* 1. INITIAL PEEK HEADER */}
              {!isScrolled && (
                <div className="w-full h-[60px] px-6 flex items-center justify-between">
                  <h3 className="text-sm sm:text-[14px] font-bold tracking-tight text-white dark:text-slate-900 flex items-center gap-3 select-none transition-colors duration-300">
                    Know More About This Platform
                  </h3>
                  <span className="text-xs font-medium tracking-wide text-slate-400 dark:text-slate-500 inline-flex items-center gap-1 select-none">
                  </span>
                </div>
              )}

              {/* 2. EXPANDED CONTENT (THEME INVERTED) */}
              {isScrolled && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-center w-full my-auto px-6 sm:px-10 lg:px-12 xl:px-14 py-4"
                >
                  
                  {/* LEFT: Headline, Paragraph, and Button */}
                  <div className="lg:col-span-7 flex flex-col justify-center items-start text-left">
                    <h2 className="text-4xl sm:text-5xl md:text-[3.35rem] lg:text-[3.5rem] xl:text-[4.2rem] font-black text-white dark:text-slate-900 tracking-tighter leading-[0.88] mb-4 text-left transition-colors duration-300">
                      KNOW<br />
                      MORE<br />
                      ABOUT<br />
                      THIS<br />
                      PLATFORM
                    </h2>

                    <p className="text-xs sm:text-[13px] lg:text-[13.5px] text-slate-300 dark:text-slate-600 font-normal leading-relaxed max-w-lg text-left mb-5 transition-colors duration-300">
                      <strong className="text-white dark:text-black font-semibold">VOISShield</strong> is an advanced AI-driven human firewall platform engineered to protect enterprise ecosystems. By combining real-time simulation algorithms with automated micro-learning, adaptive risk scoring, and holistic employee engagement matrixes, VOISShield transforms organizational awareness into robust frontline security intelligence.
                    </p>

                    <a
                      href="mailto:abhay.hs1@vodafone.com"
                      className="inline-flex items-center justify-center px-6 py-2.5 rounded-md bg-white dark:bg-[#0B1121] text-black dark:text-white font-extrabold text-xs uppercase tracking-wider hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors shadow-md"
                    >
                      CONTACT US
                    </a>
                  </div>

                  {/* RIGHT: Animated Shackle GIF & VOISShield Wordmark */}
                  <div className="lg:col-span-5 flex flex-col items-center justify-center gap-3 lg:gap-4">
                    <div className="w-full max-w-[240px] sm:max-w-[280px] lg:max-w-[320px] xl:max-w-[350px] flex items-center justify-center">
                      <img 
                        src={AnimatedShackleGif} 
                        alt="VOIS Shield Secure Lock" 
                        className="w-full h-auto max-h-[240px] lg:max-h-[270px] xl:max-h-[300px] object-contain drop-shadow-[0_20px_45px_rgba(230,0,0,0.35)] dark:drop-shadow-[0_20px_40px_rgba(0,0,0,0.2)]"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>

                    <h1 className="text-6xl lg:text-5xl font-extrabold tracking-tighter transition-colors leading-none mt-4">
                      <span className="text-slate-900 text-white dark:text-black">VOIS</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#E60000] to-[#990099]">Shield</span>
                      <span className="text-slate-900 text-white dark:text-black">.</span>
                    </h1>
                  </div>

                </motion.div>
              )}

            </motion.div>
          </div>

        </div>
      </div>

      {/* ========================================================= */}
      {/* STAGE 2: PART 2 - UNTOUCHED ORIGINAL 100% SCALE           */}
      {/* ========================================================= */}
      <div className="-mt-5 relative z-10 w-full">
        <LandingPagePart2 />
      </div>

      {/* ========================================================= */}
      {/* 3D LOGIN MODAL - UNTOUCHED ORIGINAL 100% SCALE            */}
      {/* ========================================================= */}
      <AnimatePresence>
        {showLoginModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 perspective-[1000px]">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowLoginModal(false)}
              className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-sm cursor-pointer"
            />

            <motion.div
              initial={{ scale: 0.9, y: 40, opacity: 0, rotateX: 10 }} 
              animate={{ scale: 1, y: 0, opacity: 1, rotateX: 0 }} 
              exit={{ scale: 0.9, y: 40, opacity: 0, rotateX: -10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="w-full max-w-sm p-8 rounded-2xl bg-white dark:bg-[#0B1121] border border-black/10 dark:border-white/10 shadow-2xl relative z-10"
            >
              <button onClick={() => setShowLoginModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-[#E60000] transition-colors">
                <X className="w-5 h-5" />
              </button>
              
              <div className="mb-8">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Developer Access</h3>
                <p className="text-xs text-slate-500 mt-1">Select a workspace role to preview the dashboard.</p>
              </div>

              <form className="space-y-5">
                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clearance Level</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserCircle className="h-5 w-5 text-slate-400 group-focus-within:text-[#E60000] transition-colors" />
                    </div>
                    <select 
                      value={role} onChange={(e) => setRole(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-xl pl-12 pr-10 py-3.5 text-slate-900 dark:text-white outline-none focus:border-[#E60000] shadow-sm transition-all appearance-none cursor-pointer text-sm"
                    >
                      {roles.map(r => <option key={r} value={r} className="dark:bg-[#0B1121]">{r}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Passcode</label>
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-slate-400 group-focus-within:text-[#E60000] transition-colors" />
                    </div>
                    <input 
                      type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                      className="w-full bg-slate-50 dark:bg-white/[0.03] border border-black/10 dark:border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-slate-900 dark:text-white outline-none focus:border-[#E60000] shadow-sm transition-all placeholder-slate-400 dark:placeholder-slate-600 text-sm"
                    />
                  </div>
                </div>

                {error && <p className="text-[#ff4d4d] text-xs font-medium bg-[#ff4d4d]/10 py-2 px-3 rounded-lg border border-[#ff4d4d]/20">{error}</p>}

                <div className="w-full flex justify-center">
  <button 
    type="button" 
    onClick={handleLogin} 
    className="w-full h-10 mt-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-black font-bold text-[10px] tracking-wide hover:bg-gradient-to-r hover:from-[#E60000] hover:to-[#990099] hover:text-white hover:shadow-[0_10px_30px_rgba(230,0,0,0.3)] transition-all duration-300 flex items-center justify-center gap-2 group"
  >
    <span className="truncate">INITIALIZE SESSION</span>
    <ArrowRight className="w-4 h-4 shrink-0 group-hover:translate-x-1 transition-transform" />
  </button>
</div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};

export default LandingPage;