export type TimeFormat = '12h' | '24h';
export type Palette = 'gray' | 'teal' | 'indigo' | 'pink';
export type Theme = 'light' | 'dark';
export type SortStrategy = 'custom' | 'offset-asc' | 'offset-desc' | 'name';

export type CircleType = 'dawn' | 'midday' | 'dusk' | 'night' | 'newday';

export interface DialCell {
  hour24: number;
  minute: number;       // Supports fractional offsets (e.g., 0, 30, 45)
  timeLabel: string;    // "14" or "2" or "14:45"
  period?: 'AM' | 'PM';
  isNewDay: boolean;
  dayLabel?: string;    // "Mon, Oct 12"
  circleType: CircleType;
}

export interface TimezoneRowData {
  id: string;           // Canonical IANA timezone, e.g. "America/New_York"
  city: string;         // "New York"
  region: string;       // "America"
  abbr: string;         // "EDT"
  offsetHours: number;  // -4
  diffFromHomeHours: number; // e.g. +6 or +5.75
  diffFromHomeFormatted: string; // "+6h", "-4.5h", "0h"
  currentLocalTime: string;  // "14:30" or "2:30 PM"
  dials: DialCell[];
}

export interface MeetingSelection {
  startHourIndex: number;  // 0 to 23.5 (in 0.5 increments = 48 steps)
  endHourIndex: number;    // 0.5 to 24.0
}
