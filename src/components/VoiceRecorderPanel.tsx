import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Trash2, Play, Pause, Save, Check, Award, AlertCircle, Volume2, ShieldCheck } from 'lucide-react';
import { VoiceRecording } from '../types';
import { dbService } from '../db';
import { base64ToBlobUrl } from '../audioHelper';

interface VoiceRecorderPanelProps {
  onRecordingsUpdated: () => void;
  recordings: VoiceRecording[];
}

export function VoiceRecorderPanel({ onRecordingsUpdated, recordings }: VoiceRecorderPanelProps) {
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [permissionState, setPermissionState] = useState<'prompt' | 'granted' | 'denied'>('prompt');
  
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioChunks, setAudioChunks] = useState<Blob[]>([]);
  
  const [recordedBase64, setRecordedBase64] = useState<string>('');
  const [draftName, setDraftName] = useState<string>('');
  const [showSaveForm, setShowSaveForm] = useState<boolean>(false);
  
  // Audio preview playing states
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  const secondsTimerRef = useRef<any>(null);

  // Monitor voice streams to show simulated visual amplitude peaks
  const [waveBars, setWaveBars] = useState<number[]>([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);

  // Handle permission checks
  const requestMicPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Clean up right away
      stream.getTracks().forEach(track => track.stop());
      setPermissionState('granted');
      return true;
    } catch (err) {
      console.warn('Microphone permission blocked:', err);
      setPermissionState('denied');
      return false;
    }
  };

  // Recording action handlers
  const startRecording = async () => {
    const isGranted = await requestMicPermission();
    if (!isGranted) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      
      const chunks: Blob[] = [];
      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const fullBlob = new Blob(chunks, { type: 'audio/webm' });
        
        // Convert Blob to Base64 data string to save in our robust IndexedDB
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64Data = reader.result as string;
          setRecordedBase64(base64Data);
          setDraftName(`Voice Alert ${recordings.length + 1}`);
          setShowSaveForm(true);
        };
        reader.readAsDataURL(fullBlob);

        // Turn off stream tracks to disable record dot indicator
        stream.getTracks().forEach(track => track.stop());
      };

      setAudioChunks([]);
      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start elapsed timer
      secondsTimerRef.current = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
        // Simulate beautiful audio amplitude spikes for visual representation
        setWaveBars(Array.from({ length: 15 }, () => Math.floor(Math.random() * 24) + 4));
      }, 1000);

    } catch (e) {
      console.error('Failed to start MediaRecorder:', e);
      alert('Could not start recording context. Please permit camera/mic in frame settings.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      if (secondsTimerRef.current) {
        clearInterval(secondsTimerRef.current);
        secondsTimerRef.current = null;
      }
      setWaveBars([2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2]);
    }
  };

  // Convert and Save recording
  const handleSaveRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordedBase64 || !draftName.trim()) return;

    const newRecord: VoiceRecording = {
      id: 'voice-' + Date.now(),
      name: draftName.trim(),
      duration: recordingSeconds || 3, // fallback duration
      createdAt: new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      audioData: recordedBase64
    };

    await dbService.saveRecording(newRecord);
    setShowSaveForm(false);
    setRecordedBase64('');
    setDraftName('');
    onRecordingsUpdated();
  };

  // Triggering individual recording preview audio
  const togglePlayRecording = (rec: VoiceRecording) => {
    if (playingId === rec.id) {
      if (previewAudio) {
        previewAudio.pause();
        setPlayingId(null);
      }
    } else {
      // stop previous
      if (previewAudio) {
        previewAudio.pause();
      }

      const decodedUrl = base64ToBlobUrl(rec.audioData);
      if (!decodedUrl) {
        alert('Could not read voice recording.');
        return;
      }

      const audio = new Audio(decodedUrl);
      audio.onended = () => {
        setPlayingId(null);
      };
      
      setPreviewAudio(audio);
      setPlayingId(rec.id);
      audio.play().catch(err => {
        console.error('Audios play failed:', err);
        setPlayingId(null);
      });
    }
  };

  const handleDeleteRecording = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this custom alert recording? It won\'t be available for schedules any longer.')) {
      if (playingId === id && previewAudio) {
        previewAudio.pause();
        setPlayingId(null);
      }
      await dbService.deleteRecording(id);
      onRecordingsUpdated();
    }
  };

  // Cleanup audios on unmount
  useEffect(() => {
    return () => {
      if (previewAudio) {
        previewAudio.pause();
      }
      if (secondsTimerRef.current) {
        clearInterval(secondsTimerRef.current);
      }
    };
  }, [previewAudio]);

  const formatSeconds = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  return (
    <div className="w-full flex flex-col gap-5 px-5 pb-8 animate-fade-in text-slate-800">
      
      {/* Intro Header */}
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-slate-800">Voice Alerts Lab</h2>
        <p className="text-xs text-slate-500 mt-1">
          Record personalized speech or sounds (like "Aunt May take red capsule!") to use directly as your alarm voice alerts.
        </p>
      </div>

      {/* Recording Stage Panel */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col items-center justify-center relative overflow-hidden shadow-sm">
        
        {isRecording && (
          <div className="absolute top-3 left-3 flex items-center gap-1 bg-red-50 text-red-600 font-mono px-2 py-0.5 rounded text-[10px] uppercase tracking-wider animate-pulse border border-red-200 font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-0.5" />
            <span>LIVE REC</span>
          </div>
        )}

        <span className="text-xs text-slate-400 tracking-wide block uppercase font-mono mb-2">Voice Capture Studio</span>
        
        {/* Timing and Visual Ripple Indicator */}
        <div className="flex flex-col items-center justify-center my-4">
          <div className="text-3xl font-mono font-bold text-slate-800 tracking-wider">
            {formatSeconds(recordingSeconds)}
          </div>
          
          {/* Waveform graphic mock that bounces during active recording */}
          <div className="flex items-center gap-0.5 h-10 mt-3.5 px-6">
            {waveBars.map((val, i) => (
              <div
                key={i}
                className="w-1 bg-brand-primary rounded-full transition-all duration-300"
                style={{ height: isRecording ? `${val}px` : '4px', opacity: isRecording ? 1 : 0.4 }}
              />
            ))}
          </div>
        </div>

        {/* Action Toggle Button */}
        <div className="mt-2 flex gap-4 items-center">
          {!isRecording ? (
            <button
              onClick={startRecording}
              className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 active:scale-95 flex items-center justify-center text-white ring-4 ring-red-100 cursor-pointer transition-all duration-200 shadow-lg shadow-red-900/10"
              title="Record voice"
            >
              <Mic className="w-5 h-5 fill-white" />
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="w-14 h-14 rounded-full bg-slate-800 hover:bg-slate-700 active:scale-95 flex items-center justify-center text-white ring-4 ring-slate-200 cursor-pointer transition-all duration-200 shadow-lg"
              title="Stop recording"
            >
              <Square className="w-5 h-5 fill-white" />
            </button>
          )}
        </div>

        <p className="text-[10px] text-slate-400 mt-4 text-center">
          {isRecording ? 'Tap square to lock the recording' : 'Tap microphone to start voice clip'}
        </p>

        {/* Secure micro label */}
        <div className="mt-3 flex items-center gap-1 text-[11px] text-emerald-600 font-mono">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Saves locally to device storage</span>
        </div>
      </div>

      {/* Save voice metadata draft dialog */}
      {showSaveForm && (
        <form onSubmit={handleSaveRecording} className="bg-white border border-slate-200 shadow-lg rounded-xl p-4 animate-fade-in-up flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-brand-primary font-display">New voice clip captured!</span>
            <span className="text-[10px] font-mono text-slate-400">{formatSeconds(recordingSeconds)} length</span>
          </div>
          
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] text-slate-600 font-medium">Name your personal voice prompt:</label>
            <input
              type="text"
              required
              value={draftName}
              onChange={(e) => setDraftName(e.target.value)}
              placeholder="e.g. Grandma Pills Remind"
              className="bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder-slate-400 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-brand-primary focus:border-brand-primary"
            />
          </div>

          <div className="flex gap-2 justify-end mt-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setShowSaveForm(false);
                setRecordedBase64('');
              }}
              className="px-3 py-1.5 text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Discard
            </button>
            <button
              type="submit"
              className="px-3.5 py-1.5 flex items-center gap-1.5 bg-brand-primary hover:bg-blue-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Record</span>
            </button>
          </div>
        </form>
      )}

      {/* Recordings library list display */}
      <div className="flex flex-col gap-2.5">
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest block font-display">
          Personal Voice Library ({recordings.length})
        </span>

        {recordings.length === 0 ? (
          <div className="bg-slate-100/50 rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
            <Volume2 className="w-8 h-8 text-slate-300 stroke-[1.5]" />
            <span className="text-xs font-semibold text-slate-500">No recorded voice alerts yet</span>
            <span className="text-[10px] text-slate-400 max-w-[200px]">Create recordings above to assign customized human notifications to alarms.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-[280px] overflow-y-auto pr-1">
            {recordings.map((rec) => (
              <div
                key={rec.id}
                onClick={() => togglePlayRecording(rec)}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer ${
                  playingId === rec.id
                    ? 'bg-blue-50/50 border-blue-200 shadow-sm'
                    : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-350'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                    playingId === rec.id ? 'bg-brand-primary text-white scale-105' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {playingId === rec.id ? (
                      <Pause className="w-4 h-4 fill-white animate-pulse" />
                    ) : (
                      <Play className="w-4 h-4 fill-slate-500 text-slate-500" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-800 block truncate max-w-[170px]">{rec.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5 block">{rec.duration}s • {rec.createdAt}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleDeleteRecording(rec.id, e)}
                  className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:text-red-600 hover:bg-red-50 flex items-center justify-center transition-colors border border-slate-100 hover:border-red-100 cursor-pointer"
                  title="Remove recorded alert"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
