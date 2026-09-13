import Fuse from 'fuse.js';
import { getTimezone, getCountry, getAllTimezones } from 'countries-and-timezones';
import { DateTime } from 'luxon';
import { parseTimezoneId } from './timezone';

export interface TimezoneSearchItem {
  id: string;
  city: string;
  region: string;
  country: string;
  countries: string[];
  countryCodes: string[];
  tzNames: string[];
  offsetStr: string;
  aliases: string[];
}

// Popular timezone aliases / search aids
const COMMON_ALIASES: Record<string, string[]> = {
  // North America
  'America/New_York': [
    'nyc',
    'new york city',
    'ny',
    'boston',
    'philadelphia',
    'miami',
    'atlanta',
    'washington dc',
    'dc',
    'florida',
    'est',
    'edt',
    'usa',
    'us'
  ],
  'America/Detroit': ['michigan', 'detroit'],
  'America/Chicago': [
    'chicago',
    'cst',
    'cdt',
    'illinois',
    'dallas',
    'houston',
    'austin',
    'texas',
    'minneapolis',
    'usa',
    'us'
  ],
  'America/Denver': ['denver', 'colorado', 'salt lake city', 'utah', 'mst', 'mdt', 'usa', 'us'],
  'America/Phoenix': ['phoenix', 'arizona', 'mst', 'usa', 'us'],
  'America/Los_Angeles': [
    'la',
    'los angeles',
    'sf',
    'san francisco',
    'silicon valley',
    'san jose',
    'seattle',
    'san diego',
    'california',
    'pst',
    'pdt',
    'usa',
    'us'
  ],
  'America/Anchorage': ['alaska', 'anchorage', 'akst', 'akdt'],
  'Pacific/Honolulu': ['hawaii', 'honolulu', 'hst'],
  'America/Toronto': ['toronto', 'ottawa', 'montreal', 'canada', 'ontario', 'quebec'],
  'America/Vancouver': ['vancouver', 'british columbia', 'bc', 'canada'],
  'America/Edmonton': ['calgary', 'edmonton', 'alberta', 'canada'],
  'America/Winnipeg': ['winnipeg', 'manitoba', 'canada'],
  'America/Halifax': ['halifax', 'nova scotia', 'canada'],
  'America/St_Johns': ['newfoundland', 'st johns', 'canada'],
  'America/Mexico_City': ['mexico city', 'cdmx', 'guadalajara', 'monterrey', 'mexico'],

  // Europe
  'Europe/London': [
    'london',
    'uk',
    'united kingdom',
    'england',
    'britain',
    'great britain',
    'scotland',
    'wales',
    'edinburgh',
    'manchester',
    'birmingham',
    'gmt',
    'bst'
  ],
  'Europe/Dublin': ['dublin', 'ireland', 'irish'],
  'Europe/Paris': ['paris', 'france', 'lyon', 'marseille', 'cet', 'cest'],
  'Europe/Berlin': [
    'berlin',
    'frankfurt',
    'munich',
    'hamburg',
    'cologne',
    'germany',
    'deutschland',
    'cet',
    'cest'
  ],
  'Europe/Rome': ['rome', 'milan', 'naples', 'italy', 'italia'],
  'Europe/Madrid': ['madrid', 'barcelona', 'valencia', 'spain', 'espana'],
  'Europe/Amsterdam': ['amsterdam', 'rotterdam', 'netherlands', 'holland', 'dutch'],
  'Europe/Brussels': ['brussels', 'belgium'],
  'Europe/Zurich': ['zurich', 'geneva', 'basel', 'switzerland', 'swiss'],
  'Europe/Vienna': ['vienna', 'austria'],
  'Europe/Stockholm': ['stockholm', 'gothenburg', 'sweden'],
  'Europe/Oslo': ['oslo', 'norway'],
  'Europe/Copenhagen': ['copenhagen', 'denmark'],
  'Europe/Helsinki': ['helsinki', 'finland'],
  'Europe/Warsaw': ['warsaw', 'krakow', 'poland'],
  'Europe/Prague': ['prague', 'czech republic', 'czechia'],
  'Europe/Budapest': ['budapest', 'hungary'],
  'Europe/Bucharest': ['bucharest', 'romania'],
  'Europe/Athens': ['athens', 'greece'],
  'Europe/Istanbul': ['istanbul', 'ankara', 'turkey', 'turkiye'],
  'Europe/Kyiv': ['kyiv', 'kiev', 'ukraine'],
  'Europe/Moscow': ['moscow', 'saint petersburg', 'russia', 'msk'],
  'Europe/Lisbon': ['lisbon', 'porto', 'portugal'],

  // Asia
  'Asia/Shanghai': [
    'china',
    'prc',
    'beijing',
    'peking',
    'guangzhou',
    'shenzhen',
    'hangzhou',
    'cst'
  ],
  'Asia/Urumqi': ['urumqi', 'xinjiang', 'china'],
  'Asia/Hong_Kong': ['hong kong', 'hk', 'hkt'],
  'Asia/Taipei': ['taipei', 'taiwan'],
  'Asia/Tokyo': ['tokyo', 'japan', 'kyoto', 'osaka', 'yokohama', 'nagoya', 'sapporo', 'jst'],
  'Asia/Seoul': ['seoul', 'korea', 'south korea', 'busan', 'incheon', 'kst'],
  'Asia/Pyongyang': ['pyongyang', 'north korea'],
  'Asia/Singapore': ['singapore', 'sg', 'sgt'],
  'Asia/Kuala_Lumpur': ['kuala lumpur', 'kl', 'malaysia', 'penang'],
  'Asia/Jakarta': ['jakarta', 'indonesia', 'java', 'bali', 'wib', 'surabaya', 'bandung'],
  'Asia/Makassar': ['makassar', 'bali', 'wita', 'indonesia'],
  'Asia/Jayapura': ['jayapura', 'wit', 'papua', 'indonesia'],
  'Asia/Bangkok': [
    'bangkok',
    'thailand',
    'thai',
    'vietnam',
    'hanoi',
    'ho chi minh',
    'saigon',
    'cambodia',
    'phnom penh',
    'laos',
    'vientiane'
  ],
  'Asia/Ho_Chi_Minh': ['ho chi minh', 'saigon', 'hanoi', 'vietnam', 'ict'],
  'Asia/Manila': ['manila', 'philippines', 'cebu'],
  'Asia/Kolkata': [
    'india',
    'mumbai',
    'delhi',
    'new delhi',
    'bangalore',
    'bengaluru',
    'hyderabad',
    'chennai',
    'kolkata',
    'calcutta',
    'ist'
  ],
  'Asia/Karachi': ['karachi', 'lahore', 'islamabad', 'pakistan', 'pkt'],
  'Asia/Dhaka': ['dhaka', 'bangladesh', 'bdt'],
  'Asia/Colombo': ['colombo', 'sri lanka'],
  'Asia/Kathmandu': ['nepal', 'kathmandu'],
  'Asia/Dubai': ['dubai', 'abu dhabi', 'uae', 'united arab emirates', 'gst'],
  'Asia/Riyadh': ['riyadh', 'jeddah', 'mecca', 'medina', 'saudi arabia', 'ast'],
  'Asia/Doha': ['doha', 'qatar'],
  'Asia/Kuwait': ['kuwait city', 'kuwait'],
  'Asia/Jerusalem': ['jerusalem', 'tel aviv', 'israel', 'ist'],
  'Asia/Beirut': ['beirut', 'lebanon'],
  'Asia/Amman': ['amman', 'jordan'],
  'Asia/Almaty': ['almaty', 'astana', 'kazakhstan'],
  'Asia/Tashkent': ['tashkent', 'uzbekistan'],

  // Australia & Oceania
  'Australia/Sydney': ['sydney', 'canberra', 'new south wales', 'nsw', 'australia', 'aest', 'aedt'],
  'Australia/Melbourne': ['melbourne', 'victoria', 'australia'],
  'Australia/Brisbane': ['brisbane', 'queensland', 'gold coast', 'australia', 'aest'],
  'Australia/Adelaide': ['adelaide', 'south australia', 'acst', 'acdt'],
  'Australia/Perth': ['perth', 'western australia', 'australia', 'awst'],
  'Pacific/Auckland': ['auckland', 'wellington', 'christchurch', 'new zealand', 'nz', 'nzst', 'nzdt'],
  'Pacific/Fiji': ['fiji', 'suva'],

  // Latin America
  'America/Sao_Paulo': ['sao paulo', 'rio de janeiro', 'brasilia', 'brazil', 'brasil', 'brt'],
  'America/Buenos_Aires': ['buenos aires', 'argentina', 'art'],
  'America/Santiago': ['santiago', 'chile', 'clt', 'clst'],
  'America/Bogota': ['bogota', 'medellin', 'colombia', 'cot'],
  'America/Lima': ['lima', 'peru', 'pet'],
  'America/Caracas': ['caracas', 'venezuela'],

  // Africa
  'Africa/Cairo': ['cairo', 'alexandria', 'egypt', 'eet', 'eest'],
  'Africa/Johannesburg': ['johannesburg', 'cape town', 'pretoria', 'south africa', 'sast'],
  'Africa/Lagos': ['lagos', 'abuja', 'nigeria', 'wat'],
  'Africa/Nairobi': ['nairobi', 'kenya', 'eat'],
  'Africa/Casablanca': ['casablanca', 'rabat', 'morocco', 'wet']
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
    timezones = Object.keys(getAllTimezones());
    if (timezones.length === 0) {
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
        'Asia/Seoul',
        'Asia/Hong_Kong',
        'Asia/Kolkata',
        'Asia/Jakarta',
        'Asia/Dubai',
        'Australia/Sydney',
        'Pacific/Auckland'
      ];
    }
  }

  const now = new Date();
  const luxonNow = DateTime.now();

  let regionNames: Intl.DisplayNames | null = null;
  try {
    regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
  } catch {
    regionNames = null;
  }

  cachedSearchItems = timezones.map((id) => {
    const { region, city } = parseTimezoneId(id);

    // Country mapping from countries-and-timezones
    const tzData = getTimezone(id);
    const countryCodes = tzData?.countries || [];

    const countrySet = new Set<string>();
    for (const code of countryCodes) {
      if (regionNames) {
        try {
          const name = regionNames.of(code);
          if (name) countrySet.add(name);
        } catch {
          // ignore
        }
      }
      const cObj = getCountry(code);
      if (cObj?.name) countrySet.add(cObj.name);
    }

    const countries = Array.from(countrySet);
    const primaryCountry = countries[0] || '';

    // Extract localized timezone names (e.g., "China Standard Time", "Korean Standard Time")
    const tzNames: string[] = [];
    try {
      const generic = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'longGeneric' })
        .formatToParts(now)
        .find((p) => p.type === 'timeZoneName')?.value;
      if (generic && !generic.startsWith('GMT') && !generic.startsWith('UTC')) {
        tzNames.push(generic);
      }

      const standard = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'long' })
        .formatToParts(now)
        .find((p) => p.type === 'timeZoneName')?.value;
      if (standard && !standard.startsWith('GMT') && !standard.startsWith('UTC') && !tzNames.includes(standard)) {
        tzNames.push(standard);
      }
    } catch {
      // ignore
    }

    const zonedNow = luxonNow.setZone(id);
    const offsetStr = zonedNow.isValid ? `UTC${zonedNow.toFormat('ZZ')}` : 'UTC';
    const aliases = COMMON_ALIASES[id] || [];

    return {
      id,
      city,
      region,
      country: primaryCountry,
      countries,
      countryCodes,
      tzNames,
      offsetStr,
      aliases
    };
  });

  return cachedSearchItems;
}

function getFuse(): Fuse<TimezoneSearchItem> {
  if (!fuseInstance) {
    const items = getAllSearchableTimezones();
    fuseInstance = new Fuse(items, {
      keys: [
        { name: 'city', weight: 0.5 },
        { name: 'aliases', weight: 0.35 },
        { name: 'countries', weight: 0.35 },
        { name: 'country', weight: 0.3 },
        { name: 'tzNames', weight: 0.25 },
        { name: 'countryCodes', weight: 0.2 },
        { name: 'id', weight: 0.15 }
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
