import React, { useState, useEffect } from 'react';
import { Volume2, Mic, Clock, Save, X, Sparkles, VolumeX, AlertTriangle, Play, Sun, Pill, Brain } from 'lucide-react';
import { Alarm, VoiceRecording } from '../types';

interface AlarmEditDialogProps {
  alarm: Alarm | null; // null represents adding a new one
  recordings: VoiceRecording[];
  onSave: (alarm: Alarm) => void;
  onClose: () => void;
}

export function AlarmEditDialog({ alarm, recordings, onSave, onClose }: AlarmEditDialogProps) {
  // Timing parameters
  const [hour, setHour] = useState<number>(8);
  const [minute, setMinute] = useState<number>(0);
  const [ampm, setAmpm] = useState<'AM' | 'PM'>('AM');

  // Alarm settings
  const [label, setLabel] = useState<string>('');
  const [repeatDays, setRepeatDays] = useState<number[]>([]);
  const [soundType, setSoundType] = useState<'tts' | 'recorded' | 'default'>('tts');
  
  // TTS parameters
  const [ttsText, setTtsText] = useState<string>('');
  const [ttsPitch, setTtsPitch] = useState<number>(1.0);
  const [ttsRate, setTtsRate] = useState<number>(1.0);
  const [ttsVoiceURI, setTtsVoiceURI] = useState<string>('');
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Recording parameters
  const [recordedVoiceId, setRecordedVoiceId] = useState<string>('');

  // Snooze escalation intensity control
  const [snoozeIntensityEnabled, setSnoozeIntensityEnabled] = useState<boolean>(true);

  // Local helper to load speech synthesis system voices
  useEffect(() => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices);
        
        // Pick an English or standard voice as default if not set
        if (!ttsVoiceURI && voices.length > 0) {
          const defaultVoice = voices.find(v => v.lang.startsWith('en') || v.default) || voices[0];
          setTtsVoiceURI(defaultVoice.voiceURI);
        }
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [ttsVoiceURI]);

  // Load existing parameters on open
  useEffect(() => {
    if (alarm) {
      // Convert standard hour (0-23) to 12h + AM/PM
      const hStr = alarm.hour;
      const isPm = hStr >= 12;
      setHour(hStr % 12 || 12);
      setMinute(alarm.minute);
      setAmpm(isPm ? 'PM' : 'AM');
      setLabel(alarm.label);
      setRepeatDays(alarm.repeatDays);
      setSoundType(alarm.soundType);
      
      // Auto-populate tts/voice values
      setTtsText(alarm.ttsText || '');
      setTtsPitch(alarm.ttsPitch || 1.0);
      setTtsRate(alarm.ttsRate || 1.0);
      setTtsVoiceURI(alarm.ttsVoiceURI || '');
      setRecordedVoiceId(alarm.recordedVoiceId || '');
      setSnoozeIntensityEnabled(alarm.snoozeIntensityEnabled !== false);
    } else {
      // Defaults for new alarms
      const now = new Date();
      let hr = now.getHours();
      const min = Math.ceil(now.getMinutes() / 5) * 5; // round to nearest 5m
      const isPm = hr >= 12;
      
      setHour(hr % 12 || 12);
      setMinute(min >= 60 ? 0 : min);
      setAmpm(isPm ? 'PM' : 'AM');
      setLabel('Take morning medicine 💊');
      setRepeatDays([1, 2, 3, 4, 5]); // Weekdays default
      setSoundType('tts');
      setTtsText('Attention! It is time to take your prescribed morning medicine.');
      setTtsPitch(1.0);
      setTtsRate(1.0);
      setSnoozeIntensityEnabled(true);
      
      if (recordings.length > 0) {
        setRecordedVoiceId(recordings[0].id);
      }
    }
  }, [alarm, recordings]);

  // Synergize the TTS alert text description with custom alarm label when user changes label
  const handleLabelChange = (val: string) => {
    setLabel(val);
    
    // Auto populate TTS text if it was blank or matches previous pattern
    const startsEmpty = !ttsText || ttsText.toLowerCase().includes('time to');
    if (startsEmpty) {
      const cleanedLabel = val.replace(/[💊💧🚪⏰🚿⚠️🚨]/g, '').trim();
      setTtsText(`Attention! This is your voice alert reminder. It is time to: ${cleanedLabel || 'comply with alarm directives'}.`);
    }
  };

  // Toggle repeating day
  const handleToggleDay = (dayIndex: number) => {
    if (repeatDays.includes(dayIndex)) {
      setRepeatDays(prev => prev.filter(d => d !== dayIndex));
    } else {
      setRepeatDays(prev => [...prev, dayIndex].sort());
    }
  };

  // Single TTS testing speaker
  const handleTestTTS = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      alert('Speech synthesis not enabled in browser.');
      return;
    }
    // cancel existing speech
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(ttsText || 'Speaker testing alert!');
    if (ttsVoiceURI) {
      const matched = availableVoices.find(v => v.voiceURI === ttsVoiceURI);
      if (matched) utterance.voice = matched;
    }
    utterance.pitch = ttsPitch;
    utterance.rate = ttsRate;

    window.speechSynthesis.speak(utterance);
  };

  // Submit and package return elements
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Convert 12h + AM/PM back to standard solid hour 0-23
    let computedHour = hour;
    if (ampm === 'PM' && hour < 12) {
      computedHour += 12;
    } else if (ampm === 'AM' && hour === 12) {
      computedHour = 0;
    }

    const packagedAlarm: Alarm = {
      id: alarm ? alarm.id : 'alarm-' + Date.now(),
      hour: computedHour,
      minute: minute,
      label: label.trim() || 'Custom Alarm Alert',
      enabled: true,
      repeatDays: repeatDays,
      soundType: soundType,
      ttsText: ttsText.trim() || `Reminder: ${label}`,
      ttsPitch: ttsPitch,
      ttsRate: ttsRate,
      ttsVoiceURI: ttsVoiceURI,
      recordedVoiceId: recordedVoiceId || undefined,
      snoozeCount: alarm ? alarm.snoozeCount : 0,
      snoozeIntensityEnabled: snoozeIntensityEnabled
    };

    onSave(packagedAlarm);
  };

  const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const fullDayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const handleApplyTemplate = (type: 'wakeup' | 'meds' | 'focus') => {
    if (type === 'wakeup') {
      setHour(7);
      setMinute(0);
      setAmpm('AM');
      setLabel('Wake Up! 🌅');
      setRepeatDays([1, 2, 3, 4, 5]); // Weekdays default
      setSoundType('tts');
      setTtsText(`Good morning! Rise and shine. This is your seven AM voice wake up call. It is time to start an amazing, productive day!`);
      setTtsPitch(1.15);
      setTtsRate(1.0);
    } else if (type === 'meds') {
      setHour(9);
      setMinute(0);
      setAmpm('AM');
      setLabel('Take Medicine 💊');
      setRepeatDays([0, 1, 2, 3, 4, 5, 6]); // All days default
      setSoundType('tts');
      setTtsText(`Attention, please! It is now nine AM and this is your vital health voice alert. Please take your prescribed medicine at this time.`);
      setTtsPitch(0.95);
      setTtsRate(0.9);
    } else if (type === 'focus') {
      setHour(2);
      setMinute(0);
      setAmpm('PM');
      setLabel('Work Focus Session 💻');
      setRepeatDays([1, 2, 3, 4, 5]); // Weekdays default
      setSoundType('tts');
      setTtsText(`Focus block initiated! Stop scrolling, clear your desk, put on your headphones, and dive into your deep work task now!`);
      setTtsPitch(1.02);
      setTtsRate(1.05);
    }
  };

  return (
    <div className="absolute inset-0 bg-white z-50 overflow-y-auto max-h-[720px] flex flex-col p-5 text-slate-800">
      
      {/* Top Header Row */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4 shrink-0">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-brand-primary" />
          <h3 className="font-display text-lg font-bold text-slate-800">
            {alarm ? 'Edit Schedule Alarm' : 'Set New Alarm'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 hover:bg-slate-105 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Templates Block */}
      <div className="mb-4 bg-slate-50 border border-slate-200/80 rounded-2xl p-3 flex flex-col gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono">
          <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
          <span>Quick Preset Templates</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => handleApplyTemplate('wakeup')}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 transition-all text-[11px] cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
          >
            <Sun className="w-4 h-4 text-amber-500 mb-0.5" />
            <span>Wake Up</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('meds')}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 transition-all text-[11px] cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
          >
            <Pill className="w-4 h-4 text-red-500 mb-0.5" />
            <span>Take Meds</span>
          </button>
          <button
            type="button"
            onClick={() => handleApplyTemplate('focus')}
            className="flex flex-col items-center justify-center py-2 px-1 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 font-bold text-slate-700 transition-all text-[11px] cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95"
          >
            <Brain className="w-4 h-4 text-brand-primary mb-0.5" />
            <span>Work Focus</span>
          </button>
        </div>
      </div>

      {/* Main configuration forms */}
      <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-4">
        
        {/* BIG CHRONO TIME SELECTOR */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col items-center justify-center gap-3">
          <div className="flex items-center justify-center gap-2">
            
            {/* Hours selection */}
            <div className="flex flex-col items-center">
              <select
                value={hour}
                onChange={(e) => setHour(parseInt(e.target.value))}
                className="bg-white border border-slate-200 font-mono text-4xl p-2 font-bold text-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-[9px] text-slate-400 font-mono mt-1">Hour</span>
            </div>

            <span className="font-mono text-3xl text-slate-400 pb-4 font-bold">:</span>

            {/* Minutes selection */}
            <div className="flex flex-col items-center">
              <select
                value={minute}
                onChange={(e) => setMinute(parseInt(e.target.value))}
                className="bg-white border border-slate-200 font-mono text-4xl p-2 font-bold text-slate-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-brand-primary"
              >
                {Array.from({ length: 60 }).map((_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                ))}
              </select>
              <span className="text-[9px] text-slate-400 font-mono mt-1">Minute</span>
            </div>

            {/* AM / PM Toggle buttons */}
            <div className="flex flex-col gap-1 ml-2">
              <button
                type="button"
                onClick={() => setAmpm('AM')}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                  ampm === 'AM'
                    ? 'bg-brand-primary text-white scale-105 shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                }`}
              >
                AM
              </button>
              <button
                type="button"
                onClick={() => setAmpm('PM')}
                className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                  ampm === 'PM'
                    ? 'bg-brand-primary text-white scale-105 shadow-sm'
                    : 'bg-white border border-slate-200 text-slate-400 hover:text-slate-600'
                }`}
              >
                PM
              </button>
            </div>

          </div>
        </div>

        {/* ALARM TEXT DESCRIPTION LABEL */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-slate-600 font-medium tracking-wide uppercase font-mono">Alarm Task / Label</label>
          <input
            type="text"
            required
            value={label}
            onChange={(e) => handleLabelChange(e.target.value)}
            placeholder="e.g. Take medicine 💊"
            className="bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
          />
        </div>

        {/* WEEK REPEATING OPTION BUTTONS */}
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] text-slate-600 font-medium tracking-wide uppercase font-mono">Repeat Days</label>
          <div className="flex justify-between gap-1 mt-1 bg-slate-50 p-2 rounded-2xl border border-slate-200">
            {dayLabels.map((lbl, idx) => {
              const isSelected = repeatDays.includes(idx);
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => handleToggleDay(idx)}
                  className={`w-9 h-9 rounded-full text-xs font-semibold font-mono flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-brand-primary text-white scale-103 shadow-md shadow-blue-150'
                      : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50 hover:text-slate-600'
                  }`}
                  title={`Toggle repeat on ${fullDayLabels[idx]}`}
                >
                  {lbl}
                </button>
              );
            })}
          </div>
        </div>

        {/* SNOOZE INTENSITY ESCALATION TOGGLE */}
        <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl select-none">
          <div className="flex flex-col gap-0.5 max-w-[78%]">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-primary" />
              Snooze Voice Booster
            </span>
            <p className="text-[10px] text-slate-500 leading-normal">
              Escalates speech pitch, rates, and reads voice alarms with snooze warnings (e.g. "We are on snooze number 2!").
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSnoozeIntensityEnabled(!snoozeIntensityEnabled)}
            className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors cursor-pointer duration-300 shrink-0 ${
              snoozeIntensityEnabled ? 'bg-brand-primary' : 'bg-slate-200'
            }`}
          >
            <div
              className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform duration-300 ${
                snoozeIntensityEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* VOICE ALARM AUDIO TYPE PICKER */}
        <div className="flex flex-col gap-2 mt-1">
          <label className="text-[11px] text-slate-600 font-medium tracking-wide uppercase font-mono">Alert Type & Alarm Voice</label>
          
          {/* Sub menu controls */}
          <div className="grid grid-cols-3 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              type="button"
              onClick={() => setSoundType('tts')}
              className={`py-1.5 text-xs font-medium rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
                soundType === 'tts'
                  ? 'bg-white border border-slate-200 text-brand-primary font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>TTS Voice</span>
            </button>
            <button
              type="button"
              onClick={() => setSoundType('recorded')}
              className={`py-1.5 text-xs font-medium rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
                soundType === 'recorded'
                  ? 'bg-white border border-emerald-200 text-emerald-700 font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>Custom Rec</span>
            </button>
            <button
              type="button"
              onClick={() => setSoundType('default')}
              className={`py-1.5 text-xs font-medium rounded-lg text-center transition-all flex items-center justify-center gap-1.5 ${
                soundType === 'default'
                  ? 'bg-white border border-slate-200 text-slate-700 font-bold shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <span>Default Beep</span>
            </button>
          </div>

          {/* Sub configurations fields for each chosen alert type */}
          <div className="p-3.5 bg-slate-50/60 border border-slate-200 rounded-2xl min-h-[160px] flex flex-col justify-center">
            
            {/* 1. TEXT-TO-SPEECH DESIGN SETUP */}
            {soundType === 'tts' && (
              <div className="flex flex-col gap-3 animate-fade-in text-xs">
                
                {/* Speech prompt text input */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-mono">Spoken Reminder Phrase:</label>
                  <textarea
                    rows={2}
                    value={ttsText}
                    onChange={(e) => setTtsText(e.target.value)}
                    placeholder="Enter what the voice should speak..."
                    className="bg-white border border-slate-200 text-xs text-slate-800 rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-brand-primary"
                  />
                </div>

                {/* System Voices selector */}
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] text-slate-500 font-mono">Narrator Accent Voice:</label>
                  <select
                    value={ttsVoiceURI}
                    onChange={(e) => setTtsVoiceURI(e.target.value)}
                    className="bg-white border border-slate-200 p-1.5 rounded-lg text-[11px] text-slate-800 focus:outline-none focus:max-w-full"
                  >
                    {availableVoices.length === 0 ? (
                      <option>Detecting browser voices...</option>
                    ) : (
                      availableVoices.map(voice => (
                        <option key={voice.voiceURI} value={voice.voiceURI}>
                          {voice.name} ({voice.lang})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Speech parameters: pitch + speed sliders */}
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>Rate (Speed):</span>
                      <span>{ttsRate}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={ttsRate}
                      onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                      className="accent-brand-primary bg-slate-200 h-1 rounded-lg outline-none"
                    />
                  </div>

                  <div className="flex flex-col gap-1">
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>Pitch (Tone):</span>
                      <span>{ttsPitch}x</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.5"
                      step="0.05"
                      value={ttsPitch}
                      onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                      className="accent-brand-primary bg-slate-200 h-1 rounded-lg outline-none"
                    />
                  </div>
                </div>

                {/* Test Spoken Dialog */}
                <button
                  type="button"
                  onClick={handleTestTTS}
                  className="mt-2 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold transition-all rounded-lg border border-slate-250 hover:border-slate-350 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Play className="w-3.5 h-3.5 text-brand-primary fill-brand-primary" />
                  <span>Test Voice Announcement Now</span>
                </button>
              </div>
            )}

            {/* 2. RECORDED CUSTOM VOICE BINDER */}
            {soundType === 'recorded' && (
              <div className="flex flex-col gap-3 animate-fade-in text-xs text-center justify-center">
                {recordings.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-2 text-slate-450 gap-1.5">
                    <VolumeX className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <span className="font-semibold text-slate-500">No custom voice records registered.</span>
                    <span className="text-[10px] text-slate-400 max-w-[200px]">
                      Access the **Voice Alerts Lab** under the Voice Lab tab to record your own custom sound!
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 text-left">
                    <div className="flex flex-col gap-1">
                      <label className="text-[10px] text-slate-500 block font-mono">Assign Recorded Custom Clip:</label>
                      <select
                        required
                        value={recordedVoiceId}
                        onChange={(e) => setRecordedVoiceId(e.target.value)}
                        className="bg-white border border-slate-200 p-2 rounded-xl text-slate-800 font-medium cursor-pointer"
                      >
                        {recordings.map(rec => (
                          <option key={rec.id} value={rec.id}>
                            🎙️ {rec.name} ({rec.duration}s length)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-1 bg-emerald-50 border border-emerald-100 p-2 rounded-xl flex items-center gap-2 text-emerald-700 text-[10px]">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span>This voice will loop continuously when schedule triggers.</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 3. DEFAULT BEEPS */}
            {soundType === 'default' && (
              <div className="flex flex-col items-center justify-center text-center p-3 animate-fade-in text-xs gap-1.5">
                <Clock className="w-7 h-7 text-slate-300 stroke-[1.5]" />
                <span className="font-semibold text-slate-700">Default Alarm Beeps</span>
                <span className="text-[10px] text-slate-400 max-w-[220px]">
                  Failsafe synthesizer beep signal loops. Best for standard alarms that require no audio narrations.
                </span>
              </div>
            )}

          </div>
        </div>

        {/* BOTTOM SAVE/CANCEL DECISIONS ACTION ROWS */}
        <div className="mt-auto pt-4 flex gap-3 border-t border-slate-100 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 text-sm text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-2xl cursor-pointer border border-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 py-3 text-sm font-semibold bg-brand-primary hover:bg-blue-700 text-white rounded-2xl cursor-pointer transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-blue-100"
          >
            <Save className="w-4 h-4" />
            <span>Save Alarm</span>
          </button>
        </div>

      </form>
    </div>
  );
}
