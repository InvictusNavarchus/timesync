import { DateTime } from 'luxon';
import type { DialCell, TimezoneRowData, TimeFormat, CircleType, MeetingSelection } from './types';

/**
 * Categorize the hour into daylight phases for color coding
 */
export function getCircleType(hour: number): CircleType {
  if (hour >= 6 && hour < 8) return 'dawn';
  if (hour >= 8 && hour < 18) return 'midday';
  if (hour >= 18 && hour < 22) return 'dusk';
  return 'night';
}

/**
 * Split canonical IANA timezone into region and city names
 * e.g. "America/New_York" -> { region: "America", city: "New York" }
 */
export function parseTimezoneId(id: string): { region: string; city: string } {
  if (!id) return { region: 'UTC', city: 'UTC' };
  const parts = id.split('/');
  if (parts.length === 1) {
    return { region: 'Etc', city: parts[0].replace(/_/g, ' ') };
  }
  const city = parts[parts.length - 1].replace(/_/g, ' ');
  const region = parts.slice(0, -1).join('/').replace(/_/g, ' ');
  return { region, city };
}

/**
 * Format hourly offset difference cleanly (e.g., "+1", "-13", "0")
 */
export function formatDiffHours(diff: number): string {
  if (diff === 0) return '0';
  const sign = diff > 0 ? '+' : '';
  const rounded = Number.isInteger(diff) ? diff.toString() : diff.toFixed(1);
  return `${sign}${rounded}`;
}

/**
 * Resolve client system timezone safely
 */
export function getSystemTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

/**
 * Return 4 consecutive dates starting from the given ISO date
 */
export function getConsecutiveDates(baseDateIso: string, count = 4): {
  iso: string;
  dayNum: string;
  dow: string;
  month: string;
}[] {
  const base = DateTime.fromISO(baseDateIso);
  const validBase = base.isValid ? base : DateTime.now();

  const dates = [];
  for (let i = 0; i < count; i++) {
    const dt = validBase.plus({ days: i });
    dates.push({
      iso: dt.toISODate()!,
      dayNum: dt.toFormat('d'),
      dow: dt.toFormat('ccc'),
      month: dt.toFormat('LLL')
    });
  }
  return dates;
}

/**
 * Build 24 dial cells projected from the home timezone anchor date
 */
export function buildRowDials(
  targetZone: string,
  homeAnchorDate: DateTime,
  format: TimeFormat,
  isHome = false
): DialCell[] {
  const dials: DialCell[] = [];
  let prevDay: number | null = null;

  for (let i = 0; i < 24; i++) {
    // Project step from home anchor
    const homeStep = homeAnchorDate.plus({ hours: i });
    const targetTime = homeStep.setZone(targetZone);

    // Day transition occurs on index 0 for home, or when calendar day rolls over into a new day
    const isNewDay = isHome
      ? i === 0
      : (prevDay !== null && targetTime.day !== prevDay) || (i === 0 && targetTime.hour === 0);
    const dayLabel = isNewDay ? targetTime.toFormat('ccc, LLL d') : undefined;
    const monthLabel = isNewDay ? targetTime.toFormat('LLL') : undefined;
    const dayNum = isNewDay ? targetTime.toFormat('d') : undefined;
    const dowLabel = isNewDay ? targetTime.toFormat('ccc') : undefined;

    // Time label formatting
    let timeLabel = '';
    if (format === '24h') {
      timeLabel = targetTime.minute > 0
        ? targetTime.toFormat('HH:mm')
        : targetTime.toFormat('H');
    } else {
      timeLabel = targetTime.minute > 0
        ? targetTime.toFormat('h:mm')
        : targetTime.toFormat('h');
    }

    // New day cells get 'newday' styling
    const circleType: CircleType = isNewDay ? 'newday' : getCircleType(targetTime.hour);

    dials.push({
      hour24: targetTime.hour,
      minute: targetTime.minute,
      timeLabel,
      period: targetTime.toFormat('a') as 'AM' | 'PM',
      isNewDay,
      dayLabel,
      monthLabel,
      dayNum,
      dowLabel,
      circleType
    });

    prevDay = targetTime.day;
  }

  return dials;
}

/**
 * Calculate full display metadata for a timezone row
 */
export function getTimezoneRowData(
  timezoneId: string,
  homeZone: string,
  selectedDate: string,
  format: TimeFormat,
  meeting?: MeetingSelection | null
): TimezoneRowData {
  const { region, city } = parseTimezoneId(timezoneId);
  const nowTarget = DateTime.now().setZone(timezoneId);
  const nowHome = DateTime.now().setZone(homeZone);

  const offsetHours = nowTarget.offset / 60;
  const diffFromHomeHours = (nowTarget.offset - nowHome.offset) / 60;
  const diffFromHomeFormatted = formatDiffHours(diffFromHomeHours);

  const timeFmt = format === '24h' ? 'HH:mm' : 'hh:mm a';
  const currentLocalTime = nowTarget.toFormat(timeFmt);
  const currentDateFormatted = nowTarget.toFormat('ccc, LLL d');

  const abbr = nowTarget.toFormat('ZZZZ');

  const anchorDate = DateTime.fromISO(selectedDate, { zone: homeZone }).startOf('day');
  const isHome = timezoneId === homeZone;
  const dials = buildRowDials(timezoneId, anchorDate, format, isHome);

  let meetingTimeRange: TimezoneRowData['meetingTimeRange'];
  if (meeting) {
    const startDt = anchorDate.plus({ hours: meeting.startHourIndex }).setZone(timezoneId);
    const endDt = anchorDate.plus({ hours: meeting.endHourIndex }).setZone(timezoneId);
    meetingTimeRange = {
      start: startDt.toFormat(timeFmt),
      end: endDt.toFormat(timeFmt),
      date: startDt.toFormat('ccc, LLL d')
    };
  }

  return {
    id: timezoneId,
    city,
    region,
    abbr,
    offsetHours,
    diffFromHomeHours,
    diffFromHomeFormatted,
    currentLocalTime,
    currentDateFormatted,
    meetingTimeRange,
    dials
  };
}
