import React, { useState, useEffect } from 'react';
import { Wifi, Battery, Signal, Maximize2, Minimize2, Smartphone } from 'lucide-react';

interface PhoneContainerProps {
  children: React.ReactNode;
}

export function PhoneContainer({ children }: PhoneContainerProps) {
  const [deviceFrameActive, setDeviceFrameActive] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [batteryLevel, setBatteryLevel] = useState<number>(85);
  const [isCharging, setIsCharging] = useState<boolean>(false);

  // Sync simulated android status bar time
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let hrs = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 || 12;
      setCurrentTime(`${hrs}:${mins} ${ampm}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 30000);
    
    // Simulate slight battery changes over time
    const batInterval = setInterval(() => {
      setBatteryLevel(prev => {
        if (prev <= 10) return 98; // reset
        return prev - 1;
      });
    }, 180000);

    return () => {
      clearInterval(interval);
      clearInterval(batInterval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-4 md:p-8 font-sans transition-colors duration-300">
      
      {/* Frame Toggle Overlay Info */}
      <div className="mb-4 flex gap-4 items-center justify-between w-full max-w-sm px-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5 font-display text-sm font-semibold text-slate-800">
          <Smartphone className="w-4 h-4 text-brand-primary" />
          <span className="font-bold">Echo<span className="text-brand-primary">Alarm</span></span>
          <span className="bg-blue-50 text-blue-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full">PRO v2.4</span>
        </div>
        <button
          onClick={() => setDeviceFrameActive(!deviceFrameActive)}
          className="flex items-center gap-1 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 px-2.5 py-1.5 rounded-full font-mono cursor-pointer transition-colors duration-200 shadow-sm"
          title="Toggle phone viewport frame wrapper"
        >
          {deviceFrameActive ? (
            <>
              <Minimize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Full Screen</span>
            </>
          ) : (
            <>
              <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
              <span>Show Phone</span>
            </>
          )}
        </button>
      </div>

      {deviceFrameActive ? (
        /* High-Fidelity Pixel / Android Device Wrapper Frame */
        <div className="relative mx-auto w-[385px] h-[780px] bg-slate-300 rounded-[56px] border-[12px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(15,23,42,0.3)] flex flex-col overflow-hidden ring-4 ring-slate-400/20">
          
          {/* Hardware Physical buttons visual elements */}
          <div className="absolute right-[-15px] top-[140px] w-[5px] h-[40px] bg-slate-800 rounded-l-md pointer-events-none" /> {/* Power Button */}
          <div className="absolute right-[-15px] top-[200px] w-[5px] h-[70px] bg-slate-800 rounded-l-md pointer-events-none" /> {/* Volume Slider */}
          
          {/* Top Notch Area */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[30px] w-[140px] bg-slate-800 rounded-b-[20px] z-50 flex items-center justify-center">
            {/* Camera sensor and speaker hole */}
            <div className="w-3 h-3 bg-neutral-900 rounded-full mr-3 border border-neutral-800/40" />
            <div className="w-[35px] h-1 bg-neutral-900 rounded-full" />
          </div>

          {/* Simulated Top Android OS Status Bar */}
          <div className="h-[44px] bg-white px-7 pt-4 flex justify-between items-center text-xs text-slate-600 select-none z-40 shrink-0 border-b border-slate-100">
            <span className="font-semibold font-mono tracking-wider">{currentTime || '12:00 PM'}</span>
            <div className="flex items-center gap-1.5">
              <Signal className="w-3.5 h-3.5 text-slate-400 simulated-signal" />
              <Wifi className="w-3.5 h-3.5 text-slate-400" />
              <div className="flex items-center gap-1 font-mono">
                <span className="text-[10px] text-slate-400">{batteryLevel}%</span>
                <Battery className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Actual Application Content Area */}
          <div className="flex-1 bg-slate-50 relative overflow-y-auto overflow-x-hidden flex flex-col">
            {children}
          </div>

          {/* Simulated Bottom Navigation Pill */}
          <div className="h-[22px] bg-white flex items-center justify-center select-none z-40 shrink-0 pb-2 border-t border-slate-100">
            <div className="w-[35%] h-[4px] bg-slate-300 rounded-full" />
          </div>

        </div>
      ) : (
        /* Full Screen Flat Clean Layout Card */
        <div className="w-full max-w-md h-[800px] bg-slate-50 rounded-3xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden relative">
          {/* Flat Sim Status bar */}
          <div className="h-[38px] bg-white px-6 flex justify-between items-center text-xs text-slate-500 select-none z-30 shrink-0 border-b border-slate-100">
            <span className="font-semibold">{currentTime || '12:00 PM'}</span>
            <div className="flex items-center gap-1.5">
              <Signal className="w-3.5 h-3.5 text-slate-400" />
              <Wifi className="w-3.5 h-3.5 text-slate-400" />
              <Battery className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="flex-1 bg-slate-50 relative overflow-y-auto flex flex-col">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
