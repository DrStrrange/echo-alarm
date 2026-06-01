import { Alarm, VoiceRecording } from './types';

export function base64ToBlobUrl(base64: string): string {
  try {
    const parts = base64.split(';base64,');
    const contentType = parts[0].split(':')[1] || 'audio/webm';
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);
    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }
    const blob = new Blob([uInt8Array], { type: contentType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Error decoding audio base64:', err);
    return '';
  }
}

// Keep track of active synth utterances or audio objects so they can be turned off
let activeAudio: HTMLAudioElement | null = null;
let synthesisLoopInterval: any = null;

export function stopAllActiveAlertSystem() {
  // Stop Speech Synthesis
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  if (synthesisLoopInterval) {
    clearInterval(synthesisLoopInterval);
    synthesisLoopInterval = null;
  }

  // Stop custom recording playing
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
}

export function startPlayingAlarmAlert(
  alarm: Alarm,
  recordings: VoiceRecording[],
  onStopCallback?: () => void
) {
  stopAllActiveAlertSystem();

  if (alarm.soundType === 'tts') {
    // text-to-speech voice playback
    const speakMessage = () => {
      if (typeof window === 'undefined' || !window.speechSynthesis) return;
      window.speechSynthesis.cancel(); // clean previous

      let pitch = alarm.ttsPitch || 1.0;
      let rate = alarm.ttsRate || 1.0;
      let text = alarm.ttsText || 'Alarm Alert!';

      // If snooze voice booster is enabled and the snooze count is active
      if (alarm.snoozeIntensityEnabled !== false && alarm.snoozeCount && alarm.snoozeCount > 0) {
        pitch = Math.min(2.0, pitch + alarm.snoozeCount * 0.15);
        rate = Math.min(2.2, rate + alarm.snoozeCount * 0.12);
        const warning = `Attention! You have already hit the snooze ${alarm.snoozeCount} ${alarm.snoozeCount === 1 ? 'time' : 'times'}. Please get up immediately! `;
        text = warning + text;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Attempt to load chosen voice by URI
      if (alarm.ttsVoiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.voiceURI === alarm.ttsVoiceURI);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      utterance.pitch = pitch;
      utterance.rate = rate;

      window.speechSynthesis.speak(utterance);
    };

    // Speak initially
    speakMessage();

    // Loop Speech synthesis every 10 seconds to make sure it doesn't just stop once.
    synthesisLoopInterval = setInterval(() => {
      speakMessage();
    }, 10000);

  } else {
    // For recorded or default alarm, if snooze voice booster is enabled, speak verbal snooze count warning first!
    const triggerMainAlert = () => {
      if (alarm.soundType === 'recorded') {
        const matchingRec = recordings.find(r => r.id === alarm.recordedVoiceId);
        if (matchingRec && matchingRec.audioData) {
          const url = base64ToBlobUrl(matchingRec.audioData);
          if (url) {
            activeAudio = new Audio(url);
            activeAudio.loop = true;
            activeAudio.play().catch(err => {
              console.error('Failed to play recorded voice. Falling back to default beep.', err);
              playFallbackTriggerTone();
            });
          } else {
            playFallbackTriggerTone();
          }
        } else {
          playFallbackTriggerTone();
        }
      } else {
        playFallbackTriggerTone();
      }
    };

    if (alarm.snoozeIntensityEnabled !== false && alarm.snoozeCount && alarm.snoozeCount > 0 && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const warningText = `Attention! You have already snoozed this alarm ${alarm.snoozeCount} ${alarm.snoozeCount === 1 ? 'time' : 'times'}. Get up now!`;
      const utterance = new SpeechSynthesisUtterance(warningText);
      utterance.pitch = Math.min(1.8, (alarm.ttsPitch || 1.0) + alarm.snoozeCount * 0.15);
      utterance.rate = Math.min(1.8, (alarm.ttsRate || 1.0) + alarm.snoozeCount * 0.12);
      
      if (alarm.ttsVoiceURI) {
        const voices = window.speechSynthesis.getVoices();
        const selectedVoice = voices.find(v => v.voiceURI === alarm.ttsVoiceURI);
        if (selectedVoice) utterance.voice = selectedVoice;
      }
      
      utterance.onend = triggerMainAlert;
      utterance.onerror = triggerMainAlert;
      window.speechSynthesis.speak(utterance);
    } else {
      triggerMainAlert();
    }
  }
}

function playFallbackTriggerTone() {
  if (typeof window === 'undefined') return;

  // Simple HTML Audio oscillator sound
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator loop
    const beep = () => {
      if (!audioCtx) return;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      osc.start();
      osc.stop(audioCtx.currentTime + 0.5);
    };

    beep();
    synthesisLoopInterval = setInterval(beep, 1500);
  } catch (err) {
    console.warn('Audio Context failed, falling back to standard HTML Audio element beep mock:', err);
    // Beep fallback alert
    const fallbackAudio = new Audio('https://assets.mixkit.co/active_storage/sfx/1011/1011-84.wav');
    fallbackAudio.loop = true;
    activeAudio = fallbackAudio;
    fallbackAudio.play().catch(() => {});
  }
}

