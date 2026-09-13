import { DateTime } from 'luxon';
import type { TimeFormat, Palette, Theme, SortStrategy, MeetingSelection } from '../domain/types';
import { getSystemTimezone } from '../domain/timezone';

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

  private initialized = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.homeZone = getSystemTimezone();
      this.initFromUrl();
      this.applyDomAttributes();

      window.addEventListener('popstate', () => {
        this.initFromUrl();
        this.applyDomAttributes();
      });
    } else {
      this.timezones = ['UTC'];
    }
  }

  initFromUrl() {
    if (typeof window === 'undefined') return;

    const params = new URLSearchParams(window.location.search);

    const tzParam = params.get('tz');
    if (tzParam) {
      const parsed = tzParam.split(',').filter(Boolean);
      if (parsed.length > 0) {
        this.timezones = parsed;
        this.homeZone = parsed[0];
      }
    } else if (!this.initialized) {
      // Default initial list: home + a few major hubs
      const system = getSystemTimezone();
      this.homeZone = system;
      const defaults = [system, 'America/New_York', 'Europe/London', 'Asia/Tokyo', 'Australia/Sydney'];
      // Remove duplicate of home
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
    if (['gray', 'teal', 'indigo', 'pink'].includes(paletteParam)) {
      this.palette = paletteParam;
    }

    const themeParam = params.get('theme') as Theme;
    if (themeParam === 'dark' || themeParam === 'light') {
      this.theme = themeParam;
    } else if (!this.initialized && window.matchMedia?.('(prefers-color-scheme: dark)').matches) {
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
    if (this.theme === 'dark') {
      params.set('theme', 'dark');
    }
    if (this.sortStrategy !== 'custom') {
      params.set('sort', this.sortStrategy);
    }
    if (this.meeting) {
      params.set('meet', `${this.meeting.startHourIndex}-${this.meeting.endHourIndex}`);
    }

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState(null, '', newUrl);
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
      this.syncToUrl();
    }
  }

  removeTimezone(ianaName: string) {
    if (this.timezones.length <= 1) return; // Keep at least one
    this.timezones = this.timezones.filter((tz) => tz !== ianaName);
    if (this.homeZone === ianaName) {
      this.homeZone = this.timezones[0];
    }
    this.syncToUrl();
  }

  setHome(ianaName: string) {
    const remaining = this.timezones.filter((tz) => tz !== ianaName);
    this.timezones = [ianaName, ...remaining];
    this.homeZone = ianaName;
    this.syncToUrl();
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
  }

  setTimeFormat(fmt: TimeFormat) {
    this.timeFormat = fmt;
    this.syncToUrl();
  }

  setPalette(palette: Palette) {
    this.palette = palette;
    this.applyDomAttributes();
    this.syncToUrl();
  }

  toggleTheme() {
    this.theme = this.theme === 'light' ? 'dark' : 'light';
    this.applyDomAttributes();
    this.syncToUrl();
  }

  setSortStrategy(sort: SortStrategy) {
    this.sortStrategy = sort;
    this.syncToUrl();
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

  setMeeting(meeting: MeetingSelection | null) {
    this.meeting = meeting;
    this.syncToUrl();
  }

  clearMeeting() {
    this.meeting = null;
    this.syncToUrl();
  }
}

export const syncState = new TimeSyncState();
