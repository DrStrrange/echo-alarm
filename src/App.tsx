import React, { useState, useEffect, useRef } from 'react';
import { 
  Clock, Mic, Plus, Volume2, CalendarRange, Sparkles, 
  HelpCircle, CheckCircle2, ShieldAlert, BadgeInfo, BellRing,
  Trash2, Sliders, PlayCircle, Star, Lightbulb, Play, X, Timer
} from 'lucide-react';
import { PhoneContainer } from './components/PhoneContainer';
import { AlarmCard } from './components/AlarmCard';
import { AlarmEditDialog } from './components/AlarmEditDialog';
import { VoiceRecorderPanel } from './components/VoiceRecorderPanel';
import { ActiveAlarmOverlay } from './components/ActiveAlarmOverlay';
import { Alarm, VoiceRecording } from './types';
import { dbService } from './db';

export default function App() {
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [recordings, setRecordings] = useState<VoiceRecording[]>([]);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'alarms' | 'voice-lab'>('alarms');
  
  // Dialog flow
  const [isEditDialogOpen, setIsEditDialogOpen] = useState<boolean>(false);
  const [selectedAlarmForEdit, setSelectedAlarmForEdit] = useState<Alarm | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [snoozeDuration, setSnoozeDuration] = useState<number>(() => {
    const saved = localStorage.getItem('sva_default_snooze_duration');
    return saved ? parseInt(saved, 10) : 9;
  });

  // Trigger overlays
  const [activeAlarmState, setActiveAlarmState] = useState<Alarm | null>(null);

  // Time metrics
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  const [currentHoursMinutes, setCurrentHoursMinutes] = useState<{ hh: string; mm: string; ss: string; ampm: string }>({
    hh: '12', mm: '00', ss: '00', ampm: 'AM'
  });

  // Simulator
  const [simCountdown, setSimCountdown] = useState<number | null>(null);
  const simTimerRef = useRef<any>(null);

  // Reload lists
  const refreshAppData = async () => {
    const loadedAlarms = await dbService.getAlarms();
    // If empty DB, pre-seed beautiful demos
    if (loadedAlarms.length === 0) {
      const seeded = await dbService.setupDefaultAlarms();
      setAlarms(seeded);
    } else {
      setAlarms(loadedAlarms);
    }

    const loadedRecs = await dbService.getRecordings();
    setRecordings(loadedRecs);
  };

  // Initial Seed & Load
  useEffect(() => {
    refreshAppData();
  }, []);

  // Update dynamic clock states every 1 second
  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      
      // Date label format (Mon, Jun 1)
      const options: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
      setCurrentDateFormatted(d.toLocaleDateString('en-US', options));

      // Hours Mins format
      let hrs = d.getHours();
      const ampm = hrs >= 12 ? 'PM' : 'AM';
      hrs = hrs % 12 || 12;

      setCurrentHoursMinutes({
        hh: String(hrs).padStart(2, '0'),
        mm: String(d.getMinutes()).padStart(2, '0'),
        ss: String(d.getSeconds()).padStart(2, '0'),
        ampm: ampm
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // BACKGROUND ALARM MONITORING ENGINE
  useEffect(() => {
    const checkAlarms = () => {
      const now = new Date();
      const nowHour = now.getHours();
      const nowMin = now.getMinutes();
      const nowSec = now.getSeconds();
      const currentDayOfWeek = now.getDay(); // 0 (Sun) to 6 (Sat)
      const dateToken = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;

      // We evaluate triggers right at second 0 of each minute
      if (nowSec === 0) {
        alarms.forEach(async (alarm) => {
          if (!alarm.enabled) return;

          // Check time match
          if (alarm.hour === nowHour && alarm.minute === nowMin) {
            
            // Eval Weekday repeats: if empty array, it's a one-off alarm. Else, target day must be in repeatDays
            const isOneOff = alarm.repeatDays.length === 0;
            const matchesDay = isOneOff || alarm.repeatDays.includes(currentDayOfWeek);

            if (matchesDay) {
              // Ensure we didn't already trigger this minute (to prevent accidental loop fires)
              const minutesToken = `${dateToken}_${nowHour}:${nowMin}`;
              if (alarm.lastTriggeredDate !== minutesToken) {
                
                // Track triggered marker
                alarm.lastTriggeredDate = minutesToken;
                
                // If it's a "Once only" non-repeating alarm, disable it for the future automatically on triggers
                if (isOneOff) {
                  alarm.enabled = false;
                }

                await dbService.saveAlarm(alarm);
                setAlarms([...alarms]);

                // BOOM! Trigger ringing alert screen overlay
                setActiveAlarmState(alarm);
              }
            }
          }
        });
      }
    };

    const interval = setInterval(checkAlarms, 1000);
    return () => clearInterval(interval);
  }, [alarms]);

  // Alarm management actions
  const handleToggleEnabled = async (id: string) => {
    const updated = alarms.map(a => {
      if (a.id === id) {
        return { ...a, enabled: !a.enabled };
      }
      return a;
    });
    setAlarms(updated);

    const target = updated.find(a => a.id === id);
    if (target) {
      await dbService.saveAlarm(target);
    }
  };

  const handleSaveAlarm = async (saved: Alarm) => {
    await dbService.saveAlarm(saved);
    setIsEditDialogOpen(false);
    setSelectedAlarmForEdit(null);
    refreshAppData();
  };

  const handleDeleteAlarm = async (id: string) => {
    await dbService.deleteAlarm(id);
    refreshAppData();
  };

  const handleEditClick = (alarm: Alarm) => {
    setSelectedAlarmForEdit(alarm);
    setIsEditDialogOpen(true);
  };

  const handleAddClick = () => {
    setSelectedAlarmForEdit(null);
    setIsEditDialogOpen(true);
  };

  // Alarm dismissal or snooze actions on the active alert screen
  const handleDismissRinging = () => {
    setActiveAlarmState(null);
  };

  const handleSnoozeRinging = () => {
    if (!activeAlarmState) return;

    // Standard snooze delay duration dynamic settings from 1 to 30 minutes
    const snoozeDate = new Date();
    snoozeDate.setMinutes(snoozeDate.getMinutes() + snoozeDuration);
    
    const cleanLabel = activeAlarmState.label.replace(/^Snoozed:\s*/, '');
    const currentSnoozeCount = activeAlarmState.snoozeCount || 0;
    const nextSnoozeCount = currentSnoozeCount + 1;

    // Create a temporary snooze alarm payload
    const snoozedAlarm: Alarm = {
      ...activeAlarmState,
      id: 'snooze-' + Date.now(),
      hour: snoozeDate.getHours(),
      minute: snoozeDate.getMinutes(),
      label: `Snoozed: ${cleanLabel}`,
      enabled: true,
      repeatDays: [], // Trig once
      snoozeCount: nextSnoozeCount,
    };

    dbService.saveAlarm(snoozedAlarm).then(() => {
      refreshAppData();
      setActiveAlarmState(null);
      alert(`Alarm snoozed! Snooze Count: ${nextSnoozeCount}. Voice booster will escalate and sound again in ${snoozeDuration} ${snoozeDuration === 1 ? 'minute' : 'minutes'}.`);
    });
  };

  // Simulator Test Tool
  const triggerSimulationIn3Seconds = () => {
    if (simCountdown !== null) return;
    
    // pick whichever alarm is edited/active or just fallback to the first
    const testAlarm = selectedAlarmForEdit || alarms[0] || {
      id: 'simulation-temp',
      hour: 12,
      minute: 0,
      label: 'Attention: Test Smart Reminder is working! 🚨',
      enabled: true,
      repeatDays: [],
      soundType: 'tts',
      ttsText: 'This is a high quality spoken audio test of your smart voice scheduler. Your speaker configurations, rate, pitch, and browser synthesis are working optimally!',
      ttsPitch: 1.0,
      ttsRate: 1.0,
      snoozeCount: 0
    };

    setSimCountdown(3);
    
    simTimerRef.current = setInterval(() => {
      setSimCountdown(prev => {
        if (prev === null) return null;
        if (prev <= 1) {
          clearInterval(simTimerRef.current);
          setSimCountdown(null);
          // Ring!
          setActiveAlarmState(testAlarm);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (simTimerRef.current) clearInterval(simTimerRef.current);
    };
  }, []);

  const getNextAlarmString = () => {
    const active = alarms.filter(a => a.enabled);
    if (active.length === 0) return 'No active schedules';

    // Find nearest
    // For visual simplicity, show how many are active
    return `${active.length} active voice alarm schedules`;
  };

  return (
    <PhoneContainer>
      
      {/* Tab Navigation header */}
      <div className="flex border-b border-slate-100 bg-white sticky top-0 z-30 justify-between px-2 pt-2 gap-2 select-none">
        <button
          onClick={() => setActiveTab('alarms')}
          className={`flex-1 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-t-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'alarms' 
              ? 'bg-slate-50 text-brand-primary border-b-2 border-brand-primary font-bold' 
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Schedules ({alarms.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('voice-lab')}
          className={`flex-1 py-3 text-center text-xs font-semibold uppercase tracking-wider rounded-t-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            activeTab === 'voice-lab' 
              ? 'bg-slate-50 text-brand-primary border-b-2 border-brand-primary font-bold' 
              : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50/50'
          }`}
        >
          <Mic className="w-3.5 h-3.5" />
          <span>Voice Lab ({recordings.length})</span>
        </button>
      </div>

      {activeTab === 'alarms' ? (
        /* ALARMS SCHEDULER VIEW */
        <div className="flex-1 flex flex-col gap-5 px-5 pb-24 relative overflow-x-hidden">
          
          {/* BIG DESIGN ACCENTED DIGITAL CLOCK DASHBOARD */}
          <div className="mt-4 bg-white border border-slate-200 rounded-3xl p-5 flex flex-col items-center justify-center text-center relative overflow-hidden shadow-sm select-none">
            
            {/* Settings trigger accessory button */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="absolute top-2.5 left-3 text-slate-400 hover:text-brand-primary p-1.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-colors"
              title="Configure app settings"
            >
              <Sliders className="w-4 h-4" />
            </button>

            {/* Absolute accent glowing pill */}
            <div className="absolute top-2.5 right-3 text-[10px] font-mono text-slate-400 flex items-center gap-1">
              <Star className="w-3 h-3 text-amber-500 fill-amber-500" />
              <span>EchoAlarm HUD</span>
            </div>

            {/* Date display */}
            <span className="text-xs font-semibold text-brand-primary font-display uppercase tracking-widest">
              {currentDateFormatted || 'Monday, Jun 1'}
            </span>

            {/* Large clock */}
            <div className="flex items-baseline font-mono font-bold text-4xl text-slate-800 tracking-tight mt-1.5 mb-1 select-all hover:text-slate-900 transition-colors">
              <span>{currentHoursMinutes.hh}</span>
              <span className="animate-pulse mx-0.5 text-brand-primary">:</span>
              <span>{currentHoursMinutes.mm}</span>
              <span className="text-xs text-slate-400 font-semibold ml-1.5 uppercase font-sans">
                {currentHoursMinutes.ampm}
              </span>
            </div>

            {/* Next trigger brief indicator */}
            <div className="flex flex-col gap-1 items-center mt-2 border-t border-slate-150 pt-2 w-full">
              <span className="text-[10px] text-slate-500 block font-mono">
                🔔 {getNextAlarmString()}
              </span>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-0.5">
                <span className="text-[9px] text-brand-primary font-bold uppercase tracking-wider font-mono flex items-center gap-1">
                  🔒 Local Storage
                </span>
                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider font-mono flex items-center gap-1">
                  •
                </span>
                <span className="text-[9px] text-amber-600 font-bold uppercase tracking-wider font-mono flex items-center gap-1">
                  💤 Snooze: {snoozeDuration}m
                </span>
              </div>
            </div>
          </div>

          {/* SIMULATION TEST CONTROL CARD */}
          <div className="bg-blue-50/60 rounded-2xl p-3.5 border border-blue-100 flex items-center justify-between shadow-sm">
            <div className="flex flex-col gap-0.5 max-w-[190px]">
              <div className="flex items-center gap-1">
                <Lightbulb className="w-3.5 h-3.5 text-blue-600 fill-blue-600/30" />
                <span className="text-xs font-bold text-blue-900 font-display">Simulation Tester</span>
              </div>
              <p className="text-[10px] text-blue-800/80 mt-0.5 leading-normal">
                Test custom speak narration and recorded sound trigger immediately.
              </p>
            </div>

            <button
              onClick={triggerSimulationIn3Seconds}
              disabled={simCountdown !== null}
              className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer transition-all ${
                simCountdown !== null
                  ? 'bg-blue-150 text-blue-600 border border-blue-300 animate-pulse'
                  : 'bg-brand-primary hover:bg-blue-700 text-white shadow shadow-blue-200 active:scale-95'
              }`}
            >
              {simCountdown !== null ? (
                <span>Trig in {simCountdown}s...</span>
              ) : (
                <>
                  <Play className="w-3 h-3 fill-white" />
                  <span>Test Ring</span>
                </>
              )}
            </button>
          </div>

          {/* ALARMS SCHEDULER MATRIX LIST */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-between items-center px-1">
              <span className="text-xs font-bold tracking-widest text-slate-400 uppercase font-display">
                Registered Schedules
              </span>
              <span className="text-[10px] text-slate-400 font-mono">Total alarms: {alarms.length}</span>
            </div>

            {alarms.length === 0 ? (
              <div className="bg-white rounded-3xl border border-dashed border-slate-200 p-10 text-center flex flex-col items-center justify-center gap-3">
                <Clock className="w-10 h-10 text-slate-300 stroke-[1.5]" />
                <span className="text-xs font-medium text-slate-400">No alarms created yet</span>
                <button
                  onClick={handleAddClick}
                  className="mt-1 text-xs px-4 py-2 bg-brand-primary hover:bg-blue-700 text-white font-semibold rounded-xl shadow cursor-pointer transition-colors"
                >
                  Create First Alarm
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {alarms.map((alarm) => (
                  <AlarmCard
                    key={alarm.id}
                    alarm={alarm}
                    recordings={recordings}
                    onToggleEnabled={handleToggleEnabled}
                    onEdit={handleEditClick}
                    onDelete={handleDeleteAlarm}
                  />
                ))}
              </div>
            )}
          </div>

          {/* FLOATING ACTION ADD FAB BUTTON */}
          <button
            onClick={handleAddClick}
            className="absolute bottom-6 right-6 w-14 h-14 bg-brand-primary text-white hover:bg-indigo-600 rounded-full flex items-center justify-center shadow-lg hover:shadow-indigo-500/20 cursor-pointer active:scale-95 transition-all outline-none z-25 shrink-0"
            title="Set new smart alarm"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>

        </div>
      ) : (
        /* VOICE LAB CAPTURE LAB */
        <div className="flex-1 flex flex-col pt-4 overflow-x-hidden">
          <VoiceRecorderPanel 
            onRecordingsUpdated={refreshAppData} 
            recordings={recordings} 
          />
        </div>
      )}

      {/* EDIT/ADD DIALOG OVERLAY */}
      {isEditDialogOpen && (
        <AlarmEditDialog
          alarm={selectedAlarmForEdit}
          recordings={recordings}
          onSave={handleSaveAlarm}
          onClose={() => {
            setIsEditDialogOpen(false);
            setSelectedAlarmForEdit(null);
          }}
        />
      )}

      {/* APP QUICK SETTINGS DIALOG OVERLAY */}
      {isSettingsOpen && (
        <div className="absolute inset-0 bg-white z-[45] overflow-y-auto flex flex-col p-5 text-slate-800 animate-slide-up">
          
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5 select-none shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-brand-primary">
                <Sliders className="w-4 h-4" />
              </div>
              <span className="font-display font-medium text-slate-900 tracking-tight text-sm">
                System Configurations
              </span>
            </div>
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-8 h-8 rounded-full hover:bg-slate-50 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <div className="flex-1 flex flex-col gap-6">
            
            {/* SNOOZE SECTION */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold tracking-wider uppercase font-mono">
                <Timer className="w-3.5 h-3.5 text-amber-500" />
                <span>Default Snooze Delay</span>
              </div>
              
              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex flex-col gap-4">
                
                <div className="flex justify-between items-baseline">
                  <span className="text-xs text-slate-500 font-medium">Snooze Duration</span>
                  <span className="text-lg font-mono font-bold text-slate-800 bg-white border border-slate-200 px-3 py-1 rounded-xl shadow-xs">
                    {snoozeDuration} <span className="text-xs font-sans text-slate-500 font-semibold">{snoozeDuration === 1 ? 'min' : 'mins'}</span>
                  </span>
                </div>

                {/* SLIDER CONTROLLER */}
                <div className="flex flex-col gap-2">
                  <input
                    id="snooze-slider"
                    type="range"
                    min="1"
                    max="30"
                    value={snoozeDuration}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      setSnoozeDuration(val);
                      localStorage.setItem('sva_default_snooze_duration', String(val));
                    }}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-brand-primary"
                  />
                  <div className="flex justify-between text-[9px] font-mono text-slate-400">
                    <span>1 minute</span>
                    <span>15 min</span>
                    <span>30 minutes</span>
                  </div>
                </div>

                {/* PRESETS PANEL */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-150">
                  <span className="text-[10px] text-slate-400 font-bold uppercase font-mono tracking-wider">Quick Duration Presets</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 5, 9, 15].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => {
                          setSnoozeDuration(preset);
                          localStorage.setItem('sva_default_snooze_duration', String(preset));
                        }}
                        className={`py-2 px-1 rounded-xl font-bold font-mono text-[11px] border cursor-pointer transition-all ${
                          snoozeDuration === preset
                            ? 'bg-brand-primary text-white border-brand-primary shadow-sm hover:bg-indigo-650'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {preset}m
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

            {/* DIAGNOSTIC / METADATA SECTION */}
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-600 font-bold tracking-wider uppercase font-mono">
                <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
                <span>Device Storage Sync</span>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Storage Location</span>
                  <span className="font-bold font-mono text-brand-primary text-[11px] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                    🔒 Local Phone Sandbox
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">DB Connection Type</span>
                  <span className="font-bold font-mono text-emerald-800 text-[11px] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    Offline-First indexedDB
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed font-sans text-center mt-1 pt-2 border-t border-slate-200/50">
                  Settings are immediately persisted to the browser's sandboxed Storage partition and loaded on future wake events.
                </p>
              </div>
            </div>

          </div>

          {/* Footer Save Button */}
          <div className="pt-4 border-t border-slate-100 mt-auto shrink-0 select-none">
            <button
              onClick={() => setIsSettingsOpen(false)}
              className="w-full py-3.5 bg-brand-primary hover:bg-blue-700 active:scale-97 text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-250 cursor-pointer text-center text-xs tracking-wider"
            >
              CLOSE & PERSIST
            </button>
          </div>

        </div>
      )}

      {/* TRIGGERED RINGING OVERLAY TAKEOVER */}
      {activeAlarmState && (
        <ActiveAlarmOverlay
          alarm={activeAlarmState}
          recordings={recordings}
          onDismiss={handleDismissRinging}
          onSnooze={handleSnoozeRinging}
          snoozeDuration={snoozeDuration}
        />
      )}

    </PhoneContainer>
  );
}
