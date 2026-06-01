import { Alarm, VoiceRecording } from './types';

const DB_NAME = 'SmartVoiceAlarmDB';
const DB_VERSION = 1;
const ALARMS_STORE = 'alarms';
const RECORDINGS_STORE = 'recordings';

// Robust local database capability check and fallback to LocalStorage
class FallbackStorage {
  private prefix = 'sva_';

  async getAlarms(): Promise<Alarm[]> {
    const raw = localStorage.getItem(this.prefix + 'alarms');
    return raw ? JSON.parse(raw) : [];
  }

  async saveAlarm(alarm: Alarm): Promise<void> {
    const alarms = await this.getAlarms();
    const idx = alarms.findIndex(a => a.id === alarm.id);
    if (idx >= 0) alarms[idx] = alarm;
    else alarms.push(alarm);
    localStorage.setItem(this.prefix + 'alarms', JSON.stringify(alarms));
  }

  async deleteAlarm(id: string): Promise<void> {
    const alarms = await this.getAlarms();
    const filtered = alarms.filter(a => a.id !== id);
    localStorage.setItem(this.prefix + 'alarms', JSON.stringify(filtered));
  }

  async getRecordings(): Promise<VoiceRecording[]> {
    const raw = localStorage.getItem(this.prefix + 'recordings');
    return raw ? JSON.parse(raw) : [];
  }

  async saveRecording(rec: VoiceRecording): Promise<void> {
    const recordings = await this.getRecordings();
    const idx = recordings.findIndex(r => r.id === rec.id);
    if (idx >= 0) recordings[idx] = rec;
    else recordings.push(rec);
    localStorage.setItem(this.prefix + 'recordings', JSON.stringify(recordings));
  }

  async deleteRecording(id: string): Promise<void> {
    const recordings = await this.getRecordings();
    const filtered = recordings.filter(r => r.id !== id);
    localStorage.setItem(this.prefix + 'recordings', JSON.stringify(filtered));
  }
}

const fallback = new FallbackStorage();

function checkIndexedDBSupport(): boolean {
  try {
    return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
  } catch {
    return false;
  }
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!checkIndexedDBSupport()) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(ALARMS_STORE)) {
        db.createObjectStore(ALARMS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(RECORDINGS_STORE)) {
        db.createObjectStore(RECORDINGS_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

export const dbService = {
  async getAlarms(): Promise<Alarm[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(ALARMS_STORE, 'readonly');
        const store = transaction.objectStore(ALARMS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return fallback.getAlarms();
    }
  },

  async saveAlarm(alarm: Alarm): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(ALARMS_STORE, 'readwrite');
        const store = transaction.objectStore(ALARMS_STORE);
        const req = store.put(alarm);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      return fallback.saveAlarm(alarm);
    }
  },

  async deleteAlarm(id: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(ALARMS_STORE, 'readwrite');
        const store = transaction.objectStore(ALARMS_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      return fallback.deleteAlarm(id);
    }
  },

  async getRecordings(): Promise<VoiceRecording[]> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(RECORDINGS_STORE, 'readonly');
        const store = transaction.objectStore(RECORDINGS_STORE);
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return fallback.getRecordings();
    }
  },

  async saveRecording(rec: VoiceRecording): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(RECORDINGS_STORE, 'readwrite');
        const store = transaction.objectStore(RECORDINGS_STORE);
        const req = store.put(rec);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      return fallback.saveRecording(rec);
    }
  },

  async deleteRecording(id: string): Promise<void> {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(RECORDINGS_STORE, 'readwrite');
        const store = transaction.objectStore(RECORDINGS_STORE);
        const req = store.delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      return fallback.deleteRecording(id);
    }
  },

  // Setup initial demo templates if empty
  async setupDefaultAlarms(): Promise<Alarm[]> {
    const alarms = await this.getAlarms();
    if (alarms.length > 0) return alarms;

    const defaultAlarms: Alarm[] = [
      {
        id: 'default-1',
        hour: 8,
        minute: 0,
        label: 'Take morning medicine 💊',
        enabled: true,
        repeatDays: [1, 2, 3, 4, 5], // Monday through Friday
        soundType: 'tts',
        ttsText: 'Attention! It is eight o-clock in the morning. Please take your prescribed morning medicine with water.',
        ttsPitch: 1.0,
        ttsRate: 1.0,
        snoozeCount: 0,
      },
      {
        id: 'default-2',
        hour: 19,
        minute: 30,
        label: 'Turn off the water garden 💧',
        enabled: true,
        repeatDays: [0, 6], // Saturday and Sunday
        soundType: 'tts',
        ttsText: 'Reminder! Remember to go stop the garden water faucet now so it does not overflow.',
        ttsPitch: 1.1,
        ttsRate: 0.95,
        snoozeCount: 0,
      }
    ];

    for (const a of defaultAlarms) {
      await this.saveAlarm(a);
    }
    return defaultAlarms;
  }
};
