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
  abbr: string;
  descriptor: string;
  tzNames: string[];
  offsetStr: string;
  aliases: string[];
}

// Industry standard abbreviations for global zones where native ICU defaults to GMT+X
const KNOWN_ABBRS: Record<string, string> = {
  'Europe/London': 'BST',
  'Europe/Paris': 'CEST',
  'Europe/Berlin': 'CEST',
  'Europe/Rome': 'CEST',
  'Europe/Madrid': 'CEST',
  'Europe/Amsterdam': 'CEST',
  'Europe/Brussels': 'CEST',
  'Europe/Zurich': 'CEST',
  'Europe/Vienna': 'CEST',
  'Europe/Warsaw': 'CEST',
  'Europe/Prague': 'CEST',
  'Europe/Budapest': 'CEST',
  'Europe/Stockholm': 'CEST',
  'Europe/Oslo': 'CEST',
  'Europe/Copenhagen': 'CEST',
  'Europe/Athens': 'EEST',
  'Europe/Bucharest': 'EEST',
  'Europe/Helsinki': 'EEST',
  'Europe/Kyiv': 'EEST',
  'Europe/Moscow': 'MSK',
  'Asia/Tokyo': 'JST',
  'Asia/Seoul': 'KST',
  'Asia/Shanghai': 'CST',
  'Asia/Urumqi': 'CST',
  'Asia/Hong_Kong': 'HKT',
  'Asia/Taipei': 'CST',
  'Asia/Singapore': 'SGT',
  'Asia/Kolkata': 'IST',
  'Asia/Jakarta': 'WIB',
  'Asia/Makassar': 'WITA',
  'Asia/Jayapura': 'WIT',
  'Asia/Dubai': 'GST',
  'Asia/Riyadh': 'AST',
  'Asia/Bangkok': 'ICT',
  'Asia/Ho_Chi_Minh': 'ICT',
  'Australia/Sydney': 'AEST',
  'Australia/Melbourne': 'AEST',
  'Australia/Brisbane': 'AEST',
  'Australia/Adelaide': 'ACST',
  'Australia/Perth': 'AWST',
  'Pacific/Auckland': 'NZST'
};

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
    'eastern',
    'usa',
    'us'
  ],
  'America/Detroit': ['michigan', 'detroit', 'eastern'],
  'America/Chicago': [
    'chicago',
    'cst',
    'cdt',
    'central',
    'illinois',
    'dallas',
    'houston',
    'austin',
    'texas',
    'minneapolis',
    'usa',
    'us'
  ],
  'America/Denver': ['denver', 'colorado', 'salt lake city', 'utah', 'mst', 'mdt', 'mountain', 'usa', 'us'],
  'America/Phoenix': ['phoenix', 'arizona', 'mst', 'mountain', 'usa', 'us'],
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
    'pacific',
    'pt',
    'usa',
    'us'
  ],
  'America/Anchorage': ['alaska', 'anchorage', 'akst', 'akdt'],
  'Pacific/Honolulu': ['hawaii', 'honolulu', 'hst'],
  'America/Toronto': ['toronto', 'ottawa', 'montreal', 'canada', 'ontario', 'quebec', 'eastern'],
  'America/Vancouver': ['vancouver', 'british columbia', 'bc', 'canada', 'pacific'],
  'America/Edmonton': ['calgary', 'edmonton', 'alberta', 'canada', 'mountain'],
  'America/Winnipeg': ['winnipeg', 'manitoba', 'canada', 'central'],
  'America/Halifax': ['halifax', 'nova scotia', 'canada', 'atlantic'],
  'America/St_Johns': ['newfoundland', 'st johns', 'canada'],
  'America/Mexico_City': ['mexico city', 'cdmx', 'guadalajara', 'monterrey', 'mexico', 'central'],

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
  'Europe/Rome': ['rome', 'milan', 'naples', 'italy', 'italia', 'cet', 'cest'],
  'Europe/Madrid': ['madrid', 'barcelona', 'valencia', 'spain', 'espana', 'cet', 'cest'],
  'Europe/Amsterdam': ['amsterdam', 'rotterdam', 'netherlands', 'holland', 'dutch', 'cet', 'cest'],
  'Europe/Brussels': ['brussels', 'belgium', 'cet', 'cest'],
  'Europe/Zurich': ['zurich', 'geneva', 'basel', 'switzerland', 'swiss', 'cet', 'cest'],
  'Europe/Vienna': ['vienna', 'austria', 'cet', 'cest'],
  'Europe/Stockholm': ['stockholm', 'gothenburg', 'sweden', 'cet', 'cest'],
  'Europe/Oslo': ['oslo', 'norway', 'cet', 'cest'],
  'Europe/Copenhagen': ['copenhagen', 'denmark', 'cet', 'cest'],
  'Europe/Helsinki': ['helsinki', 'finland', 'eet', 'eest'],
  'Europe/Warsaw': ['warsaw', 'krakow', 'poland', 'cet', 'cest'],
  'Europe/Prague': ['prague', 'czech republic', 'czechia', 'cet', 'cest'],
  'Europe/Budapest': ['budapest', 'hungary', 'cet', 'cest'],
  'Europe/Bucharest': ['bucharest', 'romania', 'eet', 'eest'],
  'Europe/Athens': ['athens', 'greece', 'eet', 'eest'],
  'Europe/Istanbul': ['istanbul', 'ankara', 'turkey', 'turkiye'],
  'Europe/Kyiv': ['kyiv', 'kiev', 'ukraine', 'eet', 'eest'],
  'Europe/Moscow': ['moscow', 'saint petersburg', 'russia', 'msk'],
  'Europe/Lisbon': ['lisbon', 'porto', 'portugal', 'wet', 'west'],

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
  'Asia/Urumqi': ['urumqi', 'xinjiang', 'china', 'cst'],
  'Asia/Hong_Kong': ['hong kong', 'hk', 'hkt'],
  'Asia/Taipei': ['taipei', 'taiwan', 'cst'],
  'Asia/Tokyo': ['tokyo', 'japan', 'kyoto', 'osaka', 'yokohama', 'nagoya', 'sapporo', 'jst'],
  'Asia/Seoul': ['seoul', 'korea', 'south korea', 'busan', 'incheon', 'kst'],
  'Asia/Pyongyang': ['pyongyang', 'north korea'],
  'Asia/Singapore': ['singapore', 'sg', 'sgt'],
  'Asia/Kuala_Lumpur': ['kuala lumpur', 'kl', 'malaysia', 'penang', 'myt'],
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
    'vientiane',
    'ict'
  ],
  'Asia/Ho_Chi_Minh': ['ho chi minh', 'saigon', 'hanoi', 'vietnam', 'ict'],
  'Asia/Manila': ['manila', 'philippines', 'cebu', 'pht'],
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
  'Asia/Kathmandu': ['nepal', 'kathmandu', 'npt'],
  'Asia/Dubai': ['dubai', 'abu dhabi', 'uae', 'united arab emirates', 'gst'],
  'Asia/Riyadh': ['riyadh', 'jeddah', 'mecca', 'medina', 'saudi arabia', 'ast'],
  'Asia/Doha': ['doha', 'qatar'],
  'Asia/Kuwait': ['kuwait city', 'kuwait'],
  'Asia/Jerusalem': ['jerusalem', 'tel aviv', 'israel', 'ist', 'idt'],
  'Asia/Beirut': ['beirut', 'lebanon'],
  'Asia/Amman': ['amman', 'jordan'],
  'Asia/Almaty': ['almaty', 'astana', 'kazakhstan'],
  'Asia/Tashkent': ['tashkent', 'uzbekistan'],

  // Australia & Oceania
  'Australia/Sydney': ['sydney', 'canberra', 'new south wales', 'nsw', 'australia', 'aest', 'aedt'],
  'Australia/Melbourne': ['melbourne', 'victoria', 'australia', 'aest', 'aedt'],
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
  'Africa/Casablanca': ['casablanca', 'rabat', 'morocco', 'wet', 'west']
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

    // Extract localized generic and standard timezone names
    const tzNames: string[] = [];
    let descriptor = '';
    try {
      const generic = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'longGeneric' })
        .formatToParts(now)
        .find((p) => p.type === 'timeZoneName')?.value;
      if (generic && !generic.startsWith('GMT') && !generic.startsWith('UTC')) {
        tzNames.push(generic);
        descriptor = generic;
      }

      const standard = new Intl.DateTimeFormat('en-US', { timeZone: id, timeZoneName: 'long' })
        .formatToParts(now)
        .find((p) => p.type === 'timeZoneName')?.value;
      if (standard && !standard.startsWith('GMT') && !standard.startsWith('UTC') && !tzNames.includes(standard)) {
        tzNames.push(standard);
        if (!descriptor) descriptor = standard;
      }
    } catch {
      // ignore
    }

    const zonedNow = luxonNow.setZone(id);
    const offsetStr = zonedNow.isValid ? `UTC${zonedNow.toFormat('ZZ')}` : 'UTC';

    // Resolve abbreviation (e.g. EDT, PDT, BST, CEST, JST, CST, etc.)
    let abbr = KNOWN_ABBRS[id] || (zonedNow.isValid ? zonedNow.offsetNameShort : 'UTC');
    if (!abbr || abbr.startsWith('GMT+') || abbr.startsWith('GMT-')) {
      abbr = zonedNow.isValid ? `UTC${zonedNow.toFormat('Z')}` : 'UTC';
    }

    const aliases = COMMON_ALIASES[id] || [];

    return {
      id,
      city,
      region,
      country: primaryCountry,
      countries,
      countryCodes,
      abbr,
      descriptor,
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
        { name: 'city', weight: 0.45 },
        { name: 'abbr', weight: 0.4 },
        { name: 'descriptor', weight: 0.35 },
        { name: 'aliases', weight: 0.35 },
        { name: 'countries', weight: 0.3 },
        { name: 'country', weight: 0.25 },
        { name: 'tzNames', weight: 0.2 },
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
