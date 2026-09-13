import { DateTime } from 'luxon';
import type { DialCell, TimezoneRowData, TimeFormat, CircleType } from './types';

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
 * Format hourly offset difference nicely (e.g., "+5.5h", "-4h", "0h")
 */
export function formatDiffHours(diff: number): string {
  if (diff === 0) return '0h';
  const sign = diff > 0 ? '+' : '';
  const rounded = Number.isInteger(diff) ? diff.toString() : diff.toFixed(1);
  return `${sign}${rounded}h`;
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
 * Build 24 dial cells projected from the home timezone anchor date
 */
export function buildRowDials(
  targetZone: string,
  homeAnchorDate: DateTime,
  format: TimeFormat
): DialCell[] {
  const dials: DialCell[] = [];
  let prevDay: number | null = null;

  for (let i = 0; i < 24; i++) {
    // Project step from home anchor
    const homeStep = homeAnchorDate.plus({ hours: i });
    const targetTime = homeStep.setZone(targetZone);

    // Day transition occurs on index 0 (initial strip day) or when calendar day changes
    const isNewDay = i === 0 || (prevDay !== null && targetTime.day !== prevDay);
    const dayLabel = isNewDay ? targetTime.toFormat('ccc, LLL d') : undefined;

    // Time label formatting (preserve minutes for fractional timezones)
    let timeLabel = '';
    if (format === '24h') {
      timeLabel = targetTime.minute > 0
        ? targetTime.toFormat('HH:mm')
        : targetTime.toFormat('HH');
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
  format: TimeFormat
): TimezoneRowData {
  const { region, city } = parseTimezoneId(timezoneId);
  const nowTarget = DateTime.now().setZone(timezoneId);
  const nowHome = DateTime.now().setZone(homeZone);

  const offsetHours = nowTarget.offset / 60;
  const diffFromHomeHours = (nowTarget.offset - nowHome.offset) / 60;
  const diffFromHomeFormatted = formatDiffHours(diffFromHomeHours);

  const currentLocalTime = format === '24h'
    ? nowTarget.toFormat('HH:mm')
    : nowTarget.toFormat('h:mm a');

  const abbr = nowTarget.toFormat('ZZZZ');

  const anchorDate = DateTime.fromISO(selectedDate, { zone: homeZone }).startOf('day');
  const dials = buildRowDials(timezoneId, anchorDate, format);

  return {
    id: timezoneId,
    city,
    region,
    abbr,
    offsetHours,
    diffFromHomeHours,
    diffFromHomeFormatted,
    currentLocalTime,
    dials
  };
}
