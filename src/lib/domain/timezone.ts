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
 * Seasonal standard and daylight abbreviations [standard, daylight]
 */
export const KNOWN_ABBRS: Record<string, [std: string, dst: string]> = {
  // UTC
  'UTC': ['UTC', 'UTC'],
  'Etc/UTC': ['UTC', 'UTC'],

  // UK & Ireland
  'Europe/London': ['GMT', 'BST'],
  'Europe/Dublin': ['GMT', 'IST'],

  // Western & Central Europe (CET in winter, CEST in summer)
  'Europe/Paris': ['CET', 'CEST'],
  'Europe/Berlin': ['CET', 'CEST'],
  'Europe/Rome': ['CET', 'CEST'],
  'Europe/Madrid': ['CET', 'CEST'],
  'Europe/Amsterdam': ['CET', 'CEST'],
  'Europe/Brussels': ['CET', 'CEST'],
  'Europe/Zurich': ['CET', 'CEST'],
  'Europe/Vienna': ['CET', 'CEST'],
  'Europe/Warsaw': ['CET', 'CEST'],
  'Europe/Prague': ['CET', 'CEST'],
  'Europe/Budapest': ['CET', 'CEST'],
  'Europe/Stockholm': ['CET', 'CEST'],
  'Europe/Oslo': ['CET', 'CEST'],
  'Europe/Copenhagen': ['CET', 'CEST'],
  'Europe/Lisbon': ['WET', 'WEST'],

  // Eastern Europe (EET in winter, EEST in summer)
  'Europe/Athens': ['EET', 'EEST'],
  'Europe/Bucharest': ['EET', 'EEST'],
  'Europe/Helsinki': ['EET', 'EEST'],
  'Europe/Kyiv': ['EET', 'EEST'],
  'Europe/Kiev': ['EET', 'EEST'],

  // Russia & Middle East
  'Europe/Moscow': ['MSK', 'MSK'],
  'Europe/Istanbul': ['TRT', 'TRT'],
  'Asia/Jerusalem': ['IST', 'IDT'],
  'Asia/Beirut': ['EET', 'EEST'],
  'Asia/Amman': ['UTC+3', 'UTC+3'],
  'Asia/Dubai': ['GST', 'GST'],
  'Asia/Riyadh': ['AST', 'AST'],

  // Asia (No DST)
  'Asia/Tokyo': ['JST', 'JST'],
  'Asia/Seoul': ['KST', 'KST'],
  'Asia/Shanghai': ['CST', 'CST'],
  'Asia/Hong_Kong': ['HKT', 'HKT'],
  'Asia/Taipei': ['CST', 'CST'],
  'Asia/Singapore': ['SGT', 'SGT'],
  'Asia/Kuala_Lumpur': ['MYT', 'MYT'],
  'Asia/Kolkata': ['IST', 'IST'],
  'Asia/Calcutta': ['IST', 'IST'],
  'Asia/Karachi': ['PKT', 'PKT'],
  'Asia/Dhaka': ['BDT', 'BDT'],
  'Asia/Kathmandu': ['NPT', 'NPT'],
  'Asia/Katmandu': ['NPT', 'NPT'],
  'Asia/Colombo': ['IST', 'IST'],
  'Asia/Jakarta': ['WIB', 'WIB'],
  'Asia/Makassar': ['WITA', 'WITA'],
  'Asia/Jayapura': ['WIT', 'WIT'],
  'Asia/Bangkok': ['ICT', 'ICT'],
  'Asia/Ho_Chi_Minh': ['ICT', 'ICT'],
  'Asia/Manila': ['PHT', 'PHT'],

  // Australia & New Zealand (Southern hemisphere: Oct–Apr is DST)
  'Australia/Sydney': ['AEST', 'AEDT'],
  'Australia/Melbourne': ['AEST', 'AEDT'],
  'Australia/Hobart': ['AEST', 'AEDT'],
  'Australia/Brisbane': ['AEST', 'AEST'], // Queensland does not observe DST
  'Australia/Adelaide': ['ACST', 'ACDT'],
  'Australia/Darwin': ['ACST', 'ACST'],   // Northern Territory does not observe DST
  'Australia/Perth': ['AWST', 'AWST'],    // Western Australia does not observe DST
  'Pacific/Auckland': ['NZST', 'NZDT'],
  'Pacific/Guam': ['ChST', 'ChST'],

  // Latin America
  'America/Sao_Paulo': ['BRT', 'BRT'],
  'America/Argentina/Buenos_Aires': ['ART', 'ART'],
  'America/Buenos_Aires': ['ART', 'ART'],
  'America/Santiago': ['CLT', 'CLST'],
  'America/Bogota': ['COT', 'COT'],
  'America/Lima': ['PET', 'PET'],

  // Africa & Atlantic
  'Atlantic/Reykjavik': ['GMT', 'GMT'],
  'Africa/Cairo': ['EET', 'EEST'],        // Egypt observes DST
  'Africa/Johannesburg': ['SAST', 'SAST'],
  'Africa/Lagos': ['WAT', 'WAT'],
  'Africa/Nairobi': ['EAT', 'EAT'],
  'Africa/Casablanca': ['+01', '+00']
};

/**
 * Resolve display abbreviation for a timezone DateTime, preferring known seasonal
 * abbreviations and normalizing synthetic GMT offsets (e.g. GMT+7) to UTC (UTC+7).
 */
export function getTimezoneAbbr(dt: DateTime, timezoneId: string): string {
  const pair = KNOWN_ABBRS[timezoneId];
  let abbr = '';
  if (pair) {
    abbr = dt.isInDST ? pair[1] : pair[0];
  } else if (dt.isValid && dt.offsetNameShort) {
    abbr = dt.offsetNameShort;
  }

  if (!abbr || abbr.startsWith('GMT+') || abbr.startsWith('GMT-')) {
    if (!dt.isValid) return 'UTC';
    return dt.offset === 0 ? 'UTC' : `UTC${dt.toFormat('Z')}`;
  }

  return abbr;
}

/**
 * Format a compound abbreviation string displaying both the civil abbreviation
 * and UTC offset (e.g. "CEST · UTC+2", "EDT · UTC-4", "GMT · UTC"), collapsing
 * to a single label if the abbreviation is already a UTC offset or identical.
 */
export function formatCompoundAbbr(civilAbbr: string, dt: DateTime): string {
  if (!dt.isValid) return 'UTC';
  const utcOffset = dt.offset === 0 ? 'UTC' : `UTC${dt.toFormat('Z')}`;

  if (!civilAbbr || civilAbbr === utcOffset || civilAbbr.startsWith('UTC')) {
    return utcOffset;
  }

  return `${civilAbbr} · ${utcOffset}`;
}

/**
 * Calculate full display metadata for a timezone row
 */
export function getTimezoneRowData(
  timezoneId: string,
  homeZone: string,
  selectedDate: string,
  format: TimeFormat,
  meeting?: MeetingSelection | null,
  nowDateTime?: DateTime
): TimezoneRowData {
  const now = nowDateTime && nowDateTime.isValid ? nowDateTime : DateTime.now();

  let validTargetZone = timezoneId;
  let nowTarget = now.setZone(timezoneId);
  if (!nowTarget.isValid) {
    validTargetZone = 'UTC';
    nowTarget = now.setZone('UTC');
  }

  let validHomeZone = homeZone;
  let nowHome = now.setZone(homeZone);
  if (!nowHome.isValid) {
    validHomeZone = 'UTC';
    nowHome = now.setZone('UTC');
  }

  const { region, city } = parseTimezoneId(validTargetZone);

  const offsetHours = nowTarget.offset / 60;
  const diffFromHomeHours = (nowTarget.offset - nowHome.offset) / 60;
  const diffFromHomeFormatted = formatDiffHours(diffFromHomeHours);

  const timeFmt = format === '24h' ? 'HH:mm' : 'hh:mm a';
  const currentLocalTime = nowTarget.toFormat(timeFmt);
  const currentDateFormatted = nowTarget.toFormat('ccc, LLL d');

  const baseAbbr = getTimezoneAbbr(nowTarget, validTargetZone);
  const abbr = formatCompoundAbbr(baseAbbr, nowTarget);

  const anchorBase = DateTime.fromISO(selectedDate, { zone: validHomeZone });
  const anchorDate = (anchorBase.isValid ? anchorBase : nowHome).startOf('day');
  const isHome = validTargetZone === validHomeZone;
  const dials = buildRowDials(validTargetZone, anchorDate, format, isHome);

  let meetingTimeRange: TimezoneRowData['meetingTimeRange'];
  if (meeting) {
    const startDt = anchorDate.plus({ hours: meeting.startHourIndex }).setZone(validTargetZone);
    const endDt = anchorDate.plus({ hours: meeting.endHourIndex }).setZone(validTargetZone);
    const startDate = startDt.toFormat('ccc, LLL d');
    const endDate = endDt.toFormat('ccc, LLL d');
    const isMultiDay = !startDt.hasSame(endDt, 'day');
    meetingTimeRange = {
      start: startDt.toFormat(timeFmt),
      end: endDt.toFormat(timeFmt),
      date: isMultiDay ? `${startDate} – ${endDate}` : startDate,
      startDate,
      endDate,
      isMultiDay
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
