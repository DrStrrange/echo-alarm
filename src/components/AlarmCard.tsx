import React from 'react';
import { Volume2, Mic, Clock, Trash2, CalendarRange, ChevronRight } from 'lucide-react';
import { Alarm, VoiceRecording } from '../types';

interface AlarmCardProps {
  key?: React.Key;
  alarm: Alarm;
  recordings: VoiceRecording[];
  onToggleEnabled: (id: string) => void | Promise<void>;
  onEdit: (alarm: Alarm) => void;
  onDelete: (id: string) => void | Promise<void>;
}

export function AlarmCard({ alarm, recordings, onToggleEnabled, onEdit, onDelete }: AlarmCardProps) {
  
  // Format standard hours and minutes to comfortable 12h representation
  const formatTime12h = (hr: number, min: number) => {
    const ampm = hr >= 12 ? 'PM' : 'AM';
    const hrs = hr % 12 || 12;
    const mins = String(min).padStart(2, '0');
    return {
      timeStr: `${hrs}:${mins}`,
      ampm
    };
  };

  const { timeStr, ampm } = formatTime12h(alarm.hour, alarm.minute);

  // Format repeat options
  const formatRepeat = (days: number[]) => {
    if (days.length === 0) return 'Once Only';
    if (days.length === 7) return 'Every Day';
    if (days.length === 5 && !days.includes(0) && !days.includes(6)) return 'Weekdays';
    if (days.length === 2 && days.includes(0) && days.includes(6)) return 'Weekends';

    const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => dayLabels[d]).join(', ');
  };

  const alertSoundLabel = () => {
    if (alarm.soundType === 'tts') {
      return (
        <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider text-brand-primary font-semibold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
          <Volume2 className="w-3 h-3" />
          <span>TTS: "{alarm.label || 'Remind'}"</span>
        </span>
      );
    } else if (alarm.soundType === 'recorded') {
      const match = recordings.find(r => r.id === alarm.recordedVoiceId);
      return (
        <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 truncate max-w-[150px]">
          <Mic className="w-3 h-3" />
          <span>Voice: {match ? match.name : 'Unknown Rec'}</span>
        </span>
      );
    }
    return (
      <span className="flex items-center gap-1.5 text-[10px] uppercase font-mono tracking-wider text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
        <span>Default Tone</span>
      </span>
    );
  };

  return (
    <div
      onClick={() => onEdit(alarm)}
      className={`group relative p-4 rounded-3xl border transition-all duration-300 cursor-pointer flex flex-col gap-3 overflow-hidden ${
        alarm.enabled
          ? 'bg-white border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md'
          : 'bg-slate-100/60 border-slate-200/50 opacity-60 hover:opacity-85'
      }`}
    >
      {/* Decorative vertical gradient bar on active */}
      {alarm.enabled && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-primary" />
      )}

      {/* Main Row layout */}
      <div className="flex items-start justify-between">
        
        {/* Time presentation block */}
        <div className="flex items-baseline gap-1.5 select-none">
          <span className="font-mono text-3xl font-bold tracking-tight text-slate-800">
            {timeStr}
          </span>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">
            {ampm}
          </span>
        </div>

        {/* Dynamic sliding switch toggle (pill shaped) */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            onToggleEnabled(alarm.id);
          }}
          className={`w-11 h-6 rounded-full flex items-center p-0.5 transition-colors cursor-pointer duration-300 ${
            alarm.enabled ? 'bg-brand-primary' : 'bg-slate-200'
          }`}
        >
          <div
            className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 transform ${
              alarm.enabled ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </div>
      </div>

      {/* Title Label and Alarm info */}
      <div className="flex flex-col gap-1 pr-4">
        {alarm.label ? (
          <span className="text-sm font-semibold text-slate-800 font-display line-clamp-1">
            {alarm.label}
          </span>
        ) : (
          <span className="text-sm text-slate-400 italic">No description label</span>
        )}
        
        {/* Repeating days schedule row */}
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
          <CalendarRange className="w-3.5 h-3.5 text-slate-400" />
          <span>{formatRepeat(alarm.repeatDays)}</span>
        </div>
      </div>

      {/* Bottom info pills row: TTS / Rec tags + fast edit trigger */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-2.5 mt-0.5">
        <div className="flex items-center gap-1.5 overflow-hidden">
          {alertSoundLabel()}
        </div>
        
        <div className="flex items-center gap-2">
          {/* Delete alert trigger */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm('Are you sure you want to remove this alarm schedule?')) {
                onDelete(alarm.id);
              }
            }}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-400 hover:text-red-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Delete schedule"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>

          {/* Edit symbol chevron */}
          <ChevronRight className="w-4 h-4 text-slate-400 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>

    </div>
  );
}
