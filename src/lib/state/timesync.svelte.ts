import { DateTime } from 'luxon';
import type { TimeFormat, Palette, Theme, SortStrategy, MeetingSelection } from '../domain/types';
import { getSystemTimezone } from '../domain/timezone';
import {
  STORAGE_KEY,
  loadPersisted,
  savePersisted,
  updateRecentsList,
  type PersistedState,
  type SavedPreset
} from './persistence';

export class TimeSyncState {
  timezones = $state<string[]>([]);
  homeZone = $state<string>('UTC');
  selectedDate = $state<string>(DateTime.now().toISODate() || new Date().toISOString().slice(0, 10));
  timeFormat = $state<TimeFormat>('24h');
  palette = $state<Palette>('gray');
  theme = $state<Theme>('light');
  sortStrategy = $state<SortStrategy>('custom');
  meeting = $state<MeetingSelection | null>(null);
  searchOpen = $state<boolean>(false);
  now = $state<DateTime>(DateTime.now());

  recents = $state<string[]>([]);
  presets = $state<SavedPreset[]>([]);

  private initialized = false;
  private persistedHasTheme = false;
  private persistTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.homeZone = getSystemTimezone();
      this.hydrateFromStorage();
      this.initFromUrl();
      this.applyDomAttributes();
      this.syncToUrl();

      setInterval(() => {
        this.now = DateTime.now();
      }, 30000);

      window.addEventListener('popstate', () => {
        this.initFromUrl();
        this.applyDomAttributes();
      });

      window.addEventListener('storage', (e) => {
        if (e.key === STORAGE_KEY) {
          this.rehydrateFromStorage();
        }
      });
    } else {
      this.timezones = ['UTC'];
    }
  }

  /**
   * Hydrate state from localStorage before URL parameters are applied.
   * Explicit URL query parameters will later take precedence over stored state.
   */
  hydrateFromStorage() {
    const stored = loadPersisted();
    if (!stored) return;

    if (stored.recents) this.recents = stored.recents;
    if (stored.presets) this.presets = stored.presets;

    if (stored.prefs.theme) {
      this.theme = stored.prefs.theme;
      this.persistedHasTheme = true;
    }
    if (stored.prefs.palette) this.palette = stored.prefs.palette;
    if (stored.prefs.timeFormat) this.timeFormat = stored.prefs.timeFormat;
    if (stored.prefs.sortStrategy) this.sortStrategy = stored.prefs.sortStrategy;
    if (stored.prefs.homeZone) this.homeZone = stored.prefs.homeZone;

    if (stored.lastBoard && stored.lastBoard.timezones.length > 0) {
      this.timezones = stored.lastBoard.timezones;
      this.homeZone = stored.lastBoard.homeZone || stored.lastBoard.timezones[0];
      if (stored.lastBoard.meeting) {
        this.meeting = stored.lastBoard.meeting;
      }
    }
  }

  /**
   * Cross-tab live synchronization when another browser tab modifies storage.
   */
  rehydrateFromStorage() {
    if (typeof window === 'undefined') return;
    const stored = loadPersisted();
    if (!stored) return;

    this.recents = stored.recents || [];
    this.presets = stored.presets || [];

    const params = new URLSearchParams(window.location.search);
    let domChanged = false;

    // Only rehydrate preferences if not explicitly set by the current URL
    if (!params.has('theme') && stored.prefs.theme && stored.prefs.theme !== this.theme) {
      this.theme = stored.prefs.theme;
      domChanged = true;
    }
    if (!params.has('palette') && stored.prefs.palette && stored.prefs.palette !== this.palette) {
      this.palette = stored.prefs.palette;
      domChanged = true;
    }
    if (domChanged) {
      this.applyDomAttributes();
    }
    if (!params.has('fmt') && stored.prefs.timeFormat && stored.prefs.timeFormat !== this.timeFormat) {
      this.timeFormat = stored.prefs.timeFormat;
    }
    if (!params.has('sort') && stored.prefs.sortStrategy && stored.prefs.sortStrategy !== this.sortStrategy) {
      this.sortStrategy = stored.prefs.sortStrategy;
    }
  }

  initFromUrl() {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    const tzParam = params.get('tz');
    if (tzParam) {
      const parsed = Array.from(
        new Set(
          tzParam
            .split(',')
            .map((t) => t.trim())
            .filter((tz) => Boolean(tz) && DateTime.now().setZone(tz).isValid)
        )
      );
      if (parsed.length > 0) {
        this.timezones = parsed;
        this.homeZone = parsed[0];
      } else {
        const system = this.homeZone || getSystemTimezone();
        this.homeZone = system;
        this.timezones = [system];
      }
    } else if (this.timezones.length === 0) {
      // Default initial list if URL is bare and storage has no board
      const system = this.homeZone || getSystemTimezone();
      this.homeZone = system;
      const defaults = [system, 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
      this.timezones = Array.from(new Set(defaults));
    }

    const dateParam = params.get('date');
    if (dateParam && DateTime.fromISO(dateParam).isValid) {
      this.selectedDate = dateParam;
    }

    const fmtParam = params.get('fmt');
    if (fmtParam === '12h' || fmtParam === '24h') {
      this.timeFormat = fmtParam;
    }

    const paletteParam = params.get('palette') as Palette;
    if (['gray', 'teal', 'indigo', 'pink', 'blue', 'purple'].includes(paletteParam)) {
      this.palette = paletteParam;
    }

    const themeParam = params.get('theme') as Theme;
    if (themeParam === 'dark' || themeParam === 'light') {
      this.theme = themeParam;
    } else if (!this.initialized && !this.persistedHasTheme && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
      this.theme = 'dark';
    }

    const sortParam = params.get('sort') as SortStrategy;
    if (['custom', 'offset-asc', 'offset-desc', 'name'].includes(sortParam)) {
      this.sortStrategy = sortParam;
    }

    const meetParam = params.get('meet');
    if (meetParam) {
      const [start, end] = meetParam.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end) && start >= 0 && end <= 24 && end > start) {
        this.meeting = { startHourIndex: start, endHourIndex: end };
      }
    } else if (tzParam) {
      // Shared links specifying timezones without meeting explicitly clear meeting
      this.meeting = null;
    }

    this.initialized = true;
  }

  syncToUrl() {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams();
    if (this.timezones.length > 0) {
      params.set('tz', this.timezones.join(','));
    }
    params.set('date', this.selectedDate);
    params.set('fmt', this.timeFormat);
    params.set('palette', this.palette);
    params.set('theme', this.theme);
    if (this.sortStrategy !== 'custom') {
      params.set('sort', this.sortStrategy);
    }
    if (this.meeting) {
      params.set('meet', `${this.meeting.startHourIndex}-${this.meeting.endHourIndex}`);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
  }

  /**
   * Debounced persistence to avoid spamming localStorage during continuous interactions
   */
  schedulePersist() {
    if (typeof window === 'undefined') return;
    if (this.persistTimeout) {
      clearTimeout(this.persistTimeout);
    }
    this.persistTimeout = setTimeout(() => {
      this.persistNow();
    }, 300);
  }

  persistNow() {
    if (typeof window === 'undefined') return;
    const state: PersistedState = {
      version: 1,
      prefs: {
        theme: this.theme,
        palette: this.palette,
        timeFormat: this.timeFormat,
        sortStrategy: this.sortStrategy,
        homeZone: this.homeZone
      },
      lastBoard: {
        timezones: [...this.timezones],
        homeZone: this.homeZone,
        meeting: this.meeting ? { ...this.meeting } : null
      },
      recents: [...this.recents],
      presets: [...this.presets]
    };
    savePersisted(state);
  }

  private applyDomAttributes() {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', this.theme);
    document.documentElement.setAttribute('data-palette', this.palette);
  }

  get sortedTimezones(): string[] {
    const list = [...this.timezones];
    const now = DateTime.now();

    switch (this.sortStrategy) {
      case 'offset-asc':
        return list.sort((a, b) => (now.setZone(a).offset ?? 0) - (now.setZone(b).offset ?? 0));
      case 'offset-desc':
        return list.sort((a, b) => (now.setZone(b).offset ?? 0) - (now.setZone(a).offset ?? 0));
      case 'name':
        return list.sort((a, b) => a.localeCompare(b));
      case 'custom':
      default:
        return list;
    }
  }

  addTimezone(ianaName: string) {
    if (!this.timezones.includes(ianaName)) {
      this.timezones = [...this.timezones, ianaName];
      this.recents = updateRecentsList(this.recents, ianaName);
      this.syncToUrl();
      this.schedulePersist();
    } else {
      this.recents = updateRecentsList(this.recents, ianaName);
      this.schedulePersist();
    }
  }

  removeTimezone(ianaName: string) {
    if (this.timezones.length <= 1) return; // Keep at least one
    this.timezones = this.timezones.filter((tz) => tz !== ianaName);
    if (this.homeZone === ianaName) {
      this.homeZone = this.timezones[0];
    }
    this.syncToUrl();
    this.schedulePersist();
  }

  setHome(ianaName: string) {
    const remaining = this.timezones.filter((tz) => tz !== ianaName);
    this.timezones = [ianaName, ...remaining];
    this.homeZone = ianaName;
    this.syncToUrl();
    this.schedulePersist();
  }

  moveTimezone(index: number, direction: 'up' | 'down') {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= this.timezones.length) return;

    const updated = [...this.timezones];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    this.timezones = updated;
    this.homeZone = updated[0];
    this.sortStrategy = 'custom';
    this.syncToUrl();
    this.schedulePersist();
  }

  setTimeFormat(fmt: TimeFormat) {
    this.timeFormat = fmt;
    this.syncToUrl();
    this.schedulePersist();
  }

  setPalette(palette: Palette) {
    this.palette = palette;
    this.applyDomAttributes();
    this.syncToUrl();
    this.schedulePersist();
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyDomAttributes();
    this.syncToUrl();
    this.schedulePersist();
  }

  setSortStrategy(sort: SortStrategy) {
    this.sortStrategy = sort;
    this.syncToUrl();
    this.schedulePersist();
  }

  setSelectedDate(isoDate: string) {
    this.selectedDate = isoDate;
    this.syncToUrl();
  }

  prevDay() {
    const dt = DateTime.fromISO(this.selectedDate).minus({ days: 1 });
    this.setSelectedDate(dt.toISODate()!);
  }

  nextDay() {
    const dt = DateTime.fromISO(this.selectedDate).plus({ days: 1 });
    this.setSelectedDate(dt.toISODate()!);
  }

  today() {
    this.setSelectedDate(DateTime.now().toISODate()!);
  }

  setMeeting(meeting: MeetingSelection | null, syncUrl = true) {
    this.meeting = meeting;
    if (syncUrl) {
      this.syncToUrl();
    }
    this.schedulePersist();
  }

  clearMeeting() {
    this.meeting = null;
    this.syncToUrl();
    this.schedulePersist();
  }

  // --- Presets & Backup Management ---

  savePreset(name?: string, pinCurrentDate = false): SavedPreset {
    const defaultName = `Board ${this.presets.length + 1}`;
    const presetName = name?.trim() || defaultName;
    const newPreset: SavedPreset = {
      id:
        typeof crypto !== 'undefined' && crypto.randomUUID
          ? crypto.randomUUID()
          : `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: presetName,
      timezones: [...this.timezones],
      homeZone: this.homeZone,
      meeting: this.meeting ? { ...this.meeting } : null,
      pinnedDate: pinCurrentDate ? this.selectedDate : null,
      createdAt: Date.now()
    };
    this.presets = [newPreset, ...this.presets];
    this.schedulePersist();
    return newPreset;
  }

  deletePreset(id: string) {
    this.presets = this.presets.filter((p) => p.id !== id);
    this.schedulePersist();
  }

  renamePreset(id: string, newName: string): boolean {
    const trimmed = newName.trim();
    if (!trimmed) return false;
    const exists = this.presets.some((p) => p.id === id);
    if (!exists) return false;
    this.presets = this.presets.map((p) => (p.id === id ? { ...p, name: trimmed } : p));
    this.schedulePersist();
    return true;
  }

  loadPreset(preset: SavedPreset) {
    if (preset.timezones.length > 0) {
      this.timezones = [...preset.timezones];
      this.homeZone = preset.homeZone || preset.timezones[0];
    }
    this.meeting = preset.meeting ? { ...preset.meeting } : null;
    if (preset.pinnedDate && DateTime.fromISO(preset.pinnedDate).isValid) {
      this.selectedDate = preset.pinnedDate;
    } else {
      this.selectedDate = DateTime.now().toISODate()!;
    }
    this.syncToUrl();
    this.schedulePersist();
  }

  importBackup(imported: PersistedState) {
    this.recents = imported.recents || [];
    this.presets = imported.presets || [];
    if (imported.prefs.theme) {
      this.theme = imported.prefs.theme;
    }
    if (imported.prefs.palette) {
      this.palette = imported.prefs.palette;
    }
    this.applyDomAttributes();
    if (imported.prefs.timeFormat) {
      this.timeFormat = imported.prefs.timeFormat;
    }
    if (imported.prefs.sortStrategy) {
      this.sortStrategy = imported.prefs.sortStrategy;
    }
    if (imported.prefs.homeZone) {
      this.homeZone = imported.prefs.homeZone;
    }
    if (imported.lastBoard && imported.lastBoard.timezones.length > 0) {
      this.timezones = [...imported.lastBoard.timezones];
      this.homeZone = imported.lastBoard.homeZone || this.timezones[0];
      this.meeting = imported.lastBoard.meeting ? { ...imported.lastBoard.meeting } : null;
    }
    this.syncToUrl();
    this.persistNow();
  }

  getExportState(): PersistedState {
    return {
      version: 1,
      prefs: {
        theme: this.theme,
        palette: this.palette,
        timeFormat: this.timeFormat,
        sortStrategy: this.sortStrategy,
        homeZone: this.homeZone
      },
      lastBoard: {
        timezones: [...this.timezones],
        homeZone: this.homeZone,
        meeting: this.meeting ? { ...this.meeting } : null
      },
      recents: [...this.recents],
      presets: [...this.presets]
    };
  }
}

export const syncState = new TimeSyncState();
