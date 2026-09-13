import { DateTime } from 'luxon';
import type { TimeFormat, Palette, Theme, SortStrategy, MeetingSelection } from '../domain/types';

export const STORAGE_KEY = 'timesync:v1';

export interface SavedPreset {
  id: string;
  name: string;
  timezones: string[];
  homeZone: string;
  meeting?: MeetingSelection | null;
  pinnedDate?: string | null;
  createdAt: number;
}

export interface PersistedPrefs {
  theme?: Theme;
  palette?: Palette;
  timeFormat?: TimeFormat;
  sortStrategy?: SortStrategy;
  homeZone?: string;
}

export interface LastBoardState {
  timezones: string[];
  homeZone: string;
  meeting?: MeetingSelection | null;
}

export interface PersistedState {
  version: 1;
  prefs: PersistedPrefs;
  lastBoard: LastBoardState | null;
  recents: string[];
  presets: SavedPreset[];
}

/**
 * SSR and Private-Mode safe localStorage accessor.
 */
export function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    const s = window.localStorage;
    const probe = '__ts_probe__';
    s.setItem(probe, probe);
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function getDefaultPersistedState(): PersistedState {
  return {
    version: 1,
    prefs: {},
    lastBoard: null,
    recents: [],
    presets: []
  };
}

function isValidTimezoneId(tz: unknown): tz is string {
  if (typeof tz !== 'string') return false;
  const trimmed = tz.trim();
  return trimmed.length > 0 && DateTime.now().setZone(trimmed).isValid;
}

function isValidHalfHour(index: unknown): index is number {
  return (
    typeof index === 'number' &&
    Number.isFinite(index) &&
    Number.isInteger(index * 2) &&
    index >= 0 &&
    index <= 24
  );
}

/**
 * Migration and schema sanitization harness.
 * Safely parses and validates arbitrary JSON against PersistedState version 1.
 */
export function migrate(raw: unknown): PersistedState | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, any>;

  if (obj.version === 1) {
    const prefs: PersistedPrefs = {};
    if (obj.prefs && typeof obj.prefs === 'object') {
      if (obj.prefs.theme === 'light' || obj.prefs.theme === 'dark') {
        prefs.theme = obj.prefs.theme;
      }
      if (['gray', 'teal', 'indigo', 'pink', 'blue', 'purple'].includes(obj.prefs.palette)) {
        prefs.palette = obj.prefs.palette;
      }
      if (obj.prefs.timeFormat === '12h' || obj.prefs.timeFormat === '24h') {
        prefs.timeFormat = obj.prefs.timeFormat;
      }
      if (['custom', 'offset-asc', 'offset-desc', 'name'].includes(obj.prefs.sortStrategy)) {
        prefs.sortStrategy = obj.prefs.sortStrategy;
      }
      if (isValidTimezoneId(obj.prefs.homeZone)) {
        prefs.homeZone = obj.prefs.homeZone.trim();
      }
    }

    let lastBoard: LastBoardState | null = null;
    if (obj.lastBoard && typeof obj.lastBoard === 'object' && Array.isArray(obj.lastBoard.timezones)) {
      const timezones = obj.lastBoard.timezones
        .filter(isValidTimezoneId)
        .map((tz: string) => tz.trim());
      const homeZone = isValidTimezoneId(obj.lastBoard.homeZone)
        ? obj.lastBoard.homeZone.trim()
        : timezones[0] || 'UTC';

      let meeting: MeetingSelection | null = null;
      if (obj.lastBoard.meeting && typeof obj.lastBoard.meeting === 'object') {
        const { startHourIndex, endHourIndex } = obj.lastBoard.meeting;
        if (
          isValidHalfHour(startHourIndex) &&
          isValidHalfHour(endHourIndex) &&
          endHourIndex > startHourIndex
        ) {
          meeting = { startHourIndex, endHourIndex };
        }
      }

      if (timezones.length > 0) {
        lastBoard = { timezones, homeZone, meeting };
      }
    }

    const recents: string[] = Array.isArray(obj.recents)
      ? obj.recents
          .filter(isValidTimezoneId)
          .map((tz: string) => tz.trim())
          .slice(0, 8)
      : [];

    const presets: SavedPreset[] = Array.isArray(obj.presets)
      ? obj.presets
          .filter(
            (p: unknown): p is Record<string, any> => {
              if (!p || typeof p !== 'object') return false;
              const rec = p as Record<string, unknown>;
              return typeof rec.id === 'string' && typeof rec.name === 'string';
            }
          )
          .map((p) => {
            const timezones = Array.isArray(p.timezones)
              ? p.timezones.filter(isValidTimezoneId).map((tz: string) => tz.trim())
              : [];
            let meeting: MeetingSelection | null = null;
            if (
              p.meeting &&
              typeof p.meeting === 'object' &&
              isValidHalfHour(p.meeting.startHourIndex) &&
              isValidHalfHour(p.meeting.endHourIndex) &&
              p.meeting.endHourIndex > p.meeting.startHourIndex
            ) {
              meeting = { startHourIndex: p.meeting.startHourIndex, endHourIndex: p.meeting.endHourIndex };
            }

            return {
              id: p.id,
              name: p.name.trim() || 'Untitled Preset',
              timezones,
              homeZone: isValidTimezoneId(p.homeZone) ? p.homeZone.trim() : timezones[0] || 'UTC',
              meeting,
              pinnedDate:
                typeof p.pinnedDate === 'string' && DateTime.fromISO(p.pinnedDate).isValid
                  ? p.pinnedDate
                  : null,
              createdAt: typeof p.createdAt === 'number' ? p.createdAt : Date.now()
            };
          })
      : [];

    return {
      version: 1,
      prefs,
      lastBoard,
      recents,
      presets
    };
  }

  return null;
}

export function loadPersisted(): PersistedState | null {
  const s = safeStorage();
  if (!s) return null;
  try {
    const raw = s.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch {
    return null;
  }
}

export function savePersisted(state: PersistedState): void {
  const s = safeStorage();
  if (!s) return;
  try {
    s.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded or storage blocked
  }
}

/**
 * Deduplicate and append a timezone ID to the recents list (MRU order, max 8 items)
 */
export function updateRecentsList(existing: string[], ianaName: string, max = 8): string[] {
  const filtered = existing.filter((tz) => tz !== ianaName);
  return [ianaName, ...filtered].slice(0, max);
}

/**
 * Serialize full state to formatted JSON for user download.
 */
export function exportStateJson(state: PersistedState): string {
  return JSON.stringify(state, null, 2);
}

/**
 * Parse and validate an imported backup JSON string.
 */
export function importStateJson(jsonString: string): {
  success: boolean;
  state?: PersistedState;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object' || parsed.version !== 1) {
      return { success: false, error: 'Unrecognized or invalid backup file format.' };
    }
    // Prevent accidental data wipes from incomplete or empty JSON
    if (!parsed.prefs && !parsed.lastBoard && !Array.isArray(parsed.presets) && !Array.isArray(parsed.recents)) {
      return { success: false, error: 'Backup file contains no recognizable state fields.' };
    }
    const migrated = migrate(parsed);
    if (!migrated) {
      return { success: false, error: 'Failed to process backup file structure.' };
    }
    return { success: true, state: migrated };
  } catch (err) {
    return { success: false, error: 'Invalid JSON file.' };
  }
}
