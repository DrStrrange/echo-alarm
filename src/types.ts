export interface Alarm {
  id: string;
  hour: number;        // 0 to 23
  minute: number;      // 0 to 59
  label: string;       // e.g. "Take medicine" or "Stop the water"
  enabled: boolean;
  repeatDays: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  soundType: 'tts' | 'recorded' | 'default';
  ttsText: string;     // Text to speak if soundType is 'tts'
  ttsPitch: number;    // Pitch value (0.5 to 2)
  ttsRate: number;     // Speed value (0.5 to 2)
  ttsVoiceURI?: string; // Selective system voices
  recordedVoiceId?: string; // Key to matching VoiceRecording
  snoozeCount: number;
  snoozeIntensityEnabled?: boolean;
  lastTriggeredDate?: string; // To ensure single trigger on non-repeating alarms (YYYY-MM-DD)
}

export interface VoiceRecording {
  id: string;
  name: string;
  duration: number; // in seconds
  createdAt: string; // timestamp string
  audioData: string; // Base64 data URI format for persistence
}

export interface ActiveAlarmState {
  alarm: Alarm;
  triggerTime: string; // standard time representation
  snoozedUntil?: number; // timestamp
}
