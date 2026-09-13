export type TimeFormat = '12h' | '24h';
export type Palette = 'gray' | 'teal' | 'indigo' | 'pink' | 'blue' | 'purple';
export type Theme = 'light' | 'dark';
export type SortStrategy = 'custom' | 'offset-asc' | 'offset-desc' | 'name';

export type CircleType = 'dawn' | 'midday' | 'dusk' | 'night' | 'newday';

export interface DialCell {
  hour24: number;
  minute: number;       // Supports fractional offsets (e.g., 0, 30, 45)
  timeLabel: string;    // "14" or "2" or "14:45"
  period?: 'AM' | 'PM';
  isNewDay: boolean;
  dayLabel?: string;    // "Sun, Sep 13"
  monthLabel?: string;  // "Sep"
  dayNum?: string;      // "13"
  dowLabel?: string;    // "Sun"
  circleType: CircleType;
}

export interface TimezoneRowData {
  id: string;           // Canonical IANA timezone, e.g. "America/New_York"
  city: string;         // "New York"
  region: string;       // "America"
  abbr: string;         // "EDT"
  offsetHours: number;  // -4
  diffFromHomeHours: number; // e.g. +6 or +5.75
  diffFromHomeFormatted: string; // "+6", "-13", "0"
  currentLocalTime: string;  // "14:30" or "2:30 PM"
  currentDateFormatted: string; // "Sun, Sep 13"
  meetingTimeRange?: {
    start: string;
    end: string;
    date: string;
    startDate?: string;
    endDate?: string;
    isMultiDay?: boolean;
  };
  dials: DialCell[];
}

export interface MeetingSelection {
  startHourIndex: number;  // 0 to 23.5 (in 0.5 increments = 48 steps)
  endHourIndex: number;    // 0.5 to 24.0
}
