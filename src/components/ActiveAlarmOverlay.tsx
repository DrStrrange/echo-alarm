import React, { useEffect, useState } from 'react';
import { Volume2, Mic, Bell, Clock, Timer, Check, ShieldCheck, HeartPulse } from 'lucide-react';
import { Alarm, VoiceRecording } from '../types';
import { startPlayingAlarmAlert, stopAllActiveAlertSystem } from '../audioHelper';

interface ActiveAlarmOverlayProps {
  alarm: Alarm;
  recordings: VoiceRecording[];
  onDismiss: () => void;
  onSnooze: () => void;
  snoozeDuration: number;
}

export function ActiveAlarmOverlay({ alarm, recordings, onDismiss, onSnooze, snoozeDuration }: ActiveAlarmOverlayProps) {
  const [digitalTime, setDigitalTime] = useState<string>('');
  const [pulseScale, setPulseScale] = useState<boolean>(false);

  // Sync real time on the overlay
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      let hrs = d.getHours();
      const mins = String(d.getMinutes()).padStart(2, '0');
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 || 12;
      setDigitalTime(`${hrs}:${mins} ${ampm}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    const pulseInterval = setInterval(() => {
      setPulseScale(prev => !prev);
    }, 1200);

    return () => {
      clearInterval(interval);
      clearInterval(pulseInterval);
    };
  }, []);

  // Play audio system on mounting! Correctly uses lazy trigger
  useEffect(() => {
    // Slight timeout to prevent standard browser gesture blocks by giving the user a chance to interact,
    // though the app handles direct click play beautifully
    const timeout = setTimeout(() => {
      startPlayingAlarmAlert(alarm, recordings);
    }, 300);

    return () => {
      clearTimeout(timeout);
      stopAllActiveAlertSystem();
    };
  }, [alarm, recordings]);

  return (
    <div className="absolute inset-0 bg-white z-[99] flex flex-col justify-between p-6 overflow-hidden animate-fade-in text-slate-800">
      
      {/* Background visual pulsing ripple glows */}
      <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
        <div className={`w-[300px] h-[300px] rounded-full border-[8px] border-blue-400 transition-all duration-1000 ${
          pulseScale ? 'scale-150 opacity-0' : 'scale-75 opacity-100'
        }`} />
        <div className={`absolute w-[400px] h-[400px] rounded-full border-4 border-sky-400 transition-all duration-1000 delay-300 ${
          pulseScale ? 'scale-155 opacity-0' : 'scale-90 opacity-80'
        }`} />
      </div>

      {/* Top Status Header */}
      <div className="flex flex-col items-center mt-8 select-none z-10">
        <div className="w-14 h-14 bg-blue-50 border border-blue-200 rounded-full flex items-center justify-center text-brand-primary mb-3 animate-bounce">
          <Bell className="w-6 h-6 stroke-[2]" />
        </div>
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-primary font-mono font-bold">
          Active Voice Alarm
        </span>
      </div>

      {/* Hero Display: BIG CLOCK & ALARM LABEL */}
      <div className="flex flex-col items-center justify-center my-auto select-none z-10 gap-4 text-center px-4">
        
        {/* Giant active clock */}
        <div className="font-mono text-5xl font-bold tracking-tight text-slate-800 mb-2">
          {digitalTime || '12:00 PM'}
        </div>

        {/* Dynamic Alarm Task text header */}
        <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 shadow-lg max-w-xs flex flex-col items-center gap-2.5">
          
          <div className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-widest text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            {alarm.soundType === 'recorded' ? (
              <>
                <Mic className="w-3.5 h-3.5 animate-pulse" />
                <span>Playing Voice Alert</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 animate-pulse" />
                <span>Speaking TTS Remind</span>
              </>
            )}
          </div>

          <span className="text-lg font-bold tracking-tight text-slate-800 font-display">
            {alarm.label || 'Take Medicine! 💊'}
          </span>

          {alarm.snoozeIntensityEnabled !== false && alarm.snoozeCount && alarm.snoozeCount > 0 ? (
            <div className="bg-amber-50 border border-amber-250 text-amber-800 font-bold px-3 py-1 text-[10px] animate-pulse flex items-center gap-1.5 font-mono rounded-full">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              <span>Snooze Booster Lvl {alarm.snoozeCount} Active</span>
            </div>
          ) : null}
          
          {alarm.soundType === 'tts' && (
            <p className="text-xs text-slate-600 italic leading-relaxed px-1">
              "{alarm.ttsText}"
            </p>
          )}

          {/* Secure micro reminder */}
          <div className="flex items-center gap-1 text-[10px] text-slate-450 font-mono mt-1">
            <HeartPulse className="w-3.5 h-3.5 text-red-500 animate-pulse" />
            <span>Health & Duty Scheduler</span>
          </div>
        </div>

      </div>

      {/* Action Controls: Snooze & Dismiss */}
      <div className="flex flex-col gap-3.5 mb-10 z-10">
        
        {/* Snooze pill */}
        <button
          onClick={() => {
            stopAllActiveAlertSystem();
            onSnooze();
          }}
          className="w-full py-4 bg-slate-100 hover:bg-slate-150 active:scale-97 border border-slate-200 rounded-2xl font-semibold text-slate-700 transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
        >
          <Timer className="w-4 h-4 text-brand-secondary" />
          <span>Snooze Alarm ({snoozeDuration} {snoozeDuration === 1 ? 'Minute' : 'Minutes'})</span>
        </button>

        {/* Swipe/Click Dismiss active alarm pill */}
        <button
          onClick={() => {
            stopAllActiveAlertSystem();
            onDismiss();
          }}
          className="w-full py-4 bg-brand-primary hover:bg-blue-700 active:scale-97 text-white rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-md shadow-blue-200 cursor-pointer"
        >
          <Check className="w-5 h-5 stroke-[2.5]" />
          <span>DISMISS & I'M DONE</span>
        </button>

        <p className="text-[10px] text-slate-400 text-center font-mono select-none">
          Clicking Dismiss stops all speech loops
        </p>
      </div>

    </div>
  );
}
