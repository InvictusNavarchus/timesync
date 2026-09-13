import Fuse from 'fuse.js';
import { DateTime } from 'luxon';
import { parseTimezoneId } from './timezone';

export interface TimezoneSearchItem {
  id: string;
  city: string;
  region: string;
  offsetStr: string;
}

// Popular timezone aliases / search aids
const COMMON_ALIASES: Record<string, string[]> = {
  'America/New_York': ['nyc', 'new york city', 'ny', 'est', 'edt'],
  'America/Los_Angeles': ['la', 'los angeles', 'sf', 'san francisco', 'pst', 'pdt', 'california'],
  'America/Chicago': ['chicago', 'cst', 'cdt', 'illinois'],
  'America/Toronto': ['toronto', 'canada'],
  'Europe/London': ['london', 'uk', 'gmt', 'bst', 'england'],
  'Europe/Paris': ['paris', 'france', 'cet', 'cest'],
  'Europe/Berlin': ['berlin', 'germany'],
  'Asia/Tokyo': ['tokyo', 'japan', 'jst'],
  'Asia/Singapore': ['singapore', 'sg', 'sgt'],
  'Asia/Jakarta': ['jakarta', 'indonesia', 'wib'],
  'Asia/Dubai': ['dubai', 'uae'],
  'Asia/Hong_Kong': ['hong kong', 'hk', 'hkt'],
  'Asia/Kolkata': ['india', 'mumbai', 'delhi', 'bangalore', 'ist'],
  'Asia/Kathmandu': ['nepal', 'kathmandu'],
  'Australia/Sydney': ['sydney', 'australia', 'aest', 'aedt'],
  'Australia/Melbourne': ['melbourne'],
  'Pacific/Auckland': ['auckland', 'new zealand', 'nz']
};

let cachedSearchItems: TimezoneSearchItem[] | null = null;
let fuseInstance: Fuse<TimezoneSearchItem> | null = null;

export function getAllSearchableTimezones(): TimezoneSearchItem[] {
  if (cachedSearchItems) return cachedSearchItems;

  let timezones: string[] = [];
  try {
    timezones = Intl.supportedValuesOf('timeZone');
  } catch {
    // Fallback if supportedValuesOf is unavailable
    timezones = [
      'UTC',
      'Europe/London',
      'Europe/Paris',
      'Europe/Berlin',
      'America/New_York',
      'America/Chicago',
      'America/Denver',
      'America/Los_Angeles',
      'Asia/Tokyo',
      'Asia/Singapore',
      'Asia/Shanghai',
      'Asia/Hong_Kong',
      'Asia/Kolkata',
      'Asia/Jakarta',
      'Asia/Dubai',
      'Australia/Sydney',
      'Pacific/Auckland'
    ];
  }

  const now = DateTime.now();

  cachedSearchItems = timezones.map((id) => {
    const { region, city } = parseTimezoneId(id);
    const zonedNow = now.setZone(id);
    const offsetStr = zonedNow.isValid ? `UTC${zonedNow.toFormat('ZZ')}` : 'UTC';

    return {
      id,
      city,
      region,
      offsetStr
    };
  });

  return cachedSearchItems;
}

function getFuse(): Fuse<TimezoneSearchItem> {
  if (!fuseInstance) {
    const items = getAllSearchableTimezones();
    fuseInstance = new Fuse(items, {
      keys: [
        { name: 'city', weight: 0.6 },
        { name: 'region', weight: 0.2 },
        { name: 'id', weight: 0.2 },
        {
          name: 'aliases',
          weight: 0.4,
          getFn: (item) => COMMON_ALIASES[item.id] || []
        }
      ],
      threshold: 0.3,
      ignoreLocation: true
    });
  }
  return fuseInstance;
}

export function searchTimezones(query: string, limit = 20): TimezoneSearchItem[] {
  const q = query.trim();
  const all = getAllSearchableTimezones();
  if (!q) {
    return all.slice(0, limit);
  }

  const fuse = getFuse();
  const results = fuse.search(q, { limit });
  return results.map((r) => r.item);
}
