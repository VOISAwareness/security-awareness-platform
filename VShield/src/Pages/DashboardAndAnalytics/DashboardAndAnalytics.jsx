import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Target, Mail, AlertTriangle, ShieldCheck } from 'lucide-react';

// Custom Donut Chart Component using SVG and Framer Motion
const AnimatedDonut = ({ percentage, color, label }) => {
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative w-24 h-24 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90 drop-shadow-md">
        {/* Background Circle */}
        <circle cx="48" cy="48" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-black/5 dark:text-white/10" />
        {/* Animated Foreground Circle */}
        <motion.circle 
          cx="48" cy="48" r={radius} stroke={color} strokeWidth="8" fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-sm font-bold text-slate-900 dark:text-white">{percentage}%</span>
      </div>
    </div>
  );
};

const AnimatedNumber = ({ value }) => {
  const [displayValue, setDisplayValue] = useState(0);
  useEffect(() => {
    let start = 0;
    const increment = value / (1500 / 16); 
    const timer = setInterval(() => {
      start += increment;
      if (start >= value) { clearInterval(timer); setDisplayValue(value); } else { setDisplayValue(start); }
    }, 16);
    return () => clearInterval(timer);
  }, [value]);
  return <>{Math.floor(displayValue)}</>;
};

const DashboardAndAnalytics = () => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
      className="p-8 max-w-[1400px] w-full mx-auto pb-20 flex flex-col gap-8 relative z-10 font-sans"
    >
      <div className="mb-2">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Analytics Overview</h2>
        <p className="text-xs text-slate-500 mt-1">Real-time metrics for your active campaigns.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        
        {/* KPI 1: Active Campaigns (Number) */}
        <div className="whitish-glass rounded-2xl p-6 flex flex-col justify-between shadow-sm">
          <div className="flex justify-between items-start mb-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2"><Target className="w-3.5 h-3.5"/> Active Campaigns</p>
          </div>
          <h4 className="text-5xl font-display font-extrabold text-slate-900 dark:text-white tracking-tighter">
            0<AnimatedNumber value={2} />
          </h4>
        </div>

        {/* KPI 2: Open Rate (Donut) */}
        <div className="whitish-glass rounded-2xl p-6 flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mb-2"><Mail className="w-3.5 h-3.5"/> Open Rate</p>
            <p className="text-xs text-slate-400">Target: 15%</p>
          </div>
          <AnimatedDonut percentage={12.1} color="#10b981" /> {/* Emerald Green */}
        </div>

        {/* KPI 3: Hook Rate (Donut) */}
        <div className="whitish-glass rounded-2xl p-6 flex items-center justify-between shadow-sm border-l-4 border-l-[#E60000]">
          <div>
            <p className="text-[10px] font-bold text-[#E60000] uppercase tracking-widest flex items-center gap-2 mb-2"><AlertTriangle className="w-3.5 h-3.5"/> Hook Rate</p>
            <p className="text-xs text-slate-400">Target: &lt; 5%</p>
          </div>
          <AnimatedDonut percentage={8.6} color="#E60000" /> {/* VOIS Red */}
        </div>

        {/* KPI 4: Reporter Rate (Donut) */}
        <div className="whitish-glass rounded-2xl p-6 flex items-center justify-between shadow-sm border-l-4 border-l-[#990099]">
          <div>
            <p className="text-[10px] font-bold text-[#990099] uppercase tracking-widest flex items-center gap-2 mb-2"><ShieldCheck className="w-3.5 h-3.5"/> Reporter Rate</p>
            <p className="text-xs text-slate-400">Target: &gt; 25%</p>
          </div>
          <AnimatedDonut percentage={20.1} color="#990099" /> {/* VOIS Purple */}
        </div>

      </div>
    </motion.div>
  );
};

export default DashboardAndAnalytics;