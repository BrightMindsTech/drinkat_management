/**
 * Structured retrieval index for FDA Food Code 2026.
 * Source: https://www.fda.gov/media/194741/download?attachment
 * This is a U.S. model code. It is not automatically local law for DRINKAT.
 */
import type { QcInspectionDomain } from '@/lib/qc-domains';

export const FDA_FOOD_CODE_2026 = {
  title: 'FDA Food Code 2026',
  issuer: 'U.S. Public Health Service / Food and Drug Administration',
  url: 'https://www.fda.gov/media/194741/download?attachment',
  legalNote:
    'The Food Code is a model for adoption by local, state, and federal jurisdictions. It is not automatically applicable as DRINKAT or host-country law.',
} as const;

export type FdaCitation = {
  section: string;
  title: string;
  summary: string;
  domains: Array<QcInspectionDomain | 'opening_checklist' | 'closing_checklist'>;
  keywords: string[];
};

export const FDA_FOOD_CODE_2026_INDEX: FdaCitation[] = [
  {
    section: '2-201.11',
    title: 'Responsibilities of Permit Holder, Person in Charge and Conditional Employees',
    summary:
      'Food employees and conditional employees must report symptoms and diagnoses transmissible through food. The person in charge must exclude or restrict as specified in 2-201.12 and 2-201.13.',
    domains: ['food_safety', 'brand_standards'],
    keywords: ['illness', 'sick', 'vomit', 'diarrhea', 'jaundice', 'exclude', 'report'],
  },
  {
    section: '2-301.12',
    title: 'Cleaning Procedure',
    summary:
      'Food employees shall clean hands and exposed portions of arms for at least 20 seconds at a handwashing sink equipped as specified under 5-202.12 and Subpart 6-301, using the rinse–soap–rub 10–15 seconds–rinse–dry sequence.',
    domains: ['food_safety', 'barista_qc', 'kitchen_qc', 'opening_checklist'],
    keywords: ['handwash', 'hands', 'soap', '20 seconds', 'wash'],
  },
  {
    section: '2-301.14',
    title: 'When to Wash',
    summary:
      'Wash immediately before food preparation and after toilet use, handling soiled equipment, switching from raw to ready-to-eat food, before donning gloves for food work, and after other activities that contaminate hands.',
    domains: ['food_safety', 'barista_qc', 'kitchen_qc'],
    keywords: ['when to wash', 'gloves', 'toilet', 'raw', 'ready-to-eat'],
  },
  {
    section: '2-301.15',
    title: 'Where to Wash',
    summary:
      'Hands shall be cleaned in a handwashing sink or approved automatic facility, not in a food-prep, warewashing, or mop sink.',
    domains: ['food_safety', 'cleaning'],
    keywords: ['where to wash', 'handwashing sink', 'mop sink'],
  },
  {
    section: '2-401.11',
    title: 'Eating, Drinking, or Using Tobacco Products',
    summary:
      'Employees shall eat, drink, or use tobacco only in designated areas. A food employee may drink from a closed beverage container if it is handled to prevent contamination.',
    domains: ['brand_standards', 'barista_qc'],
    keywords: ['drink', 'eat', 'tobacco', 'closed beverage'],
  },
  {
    section: '2-402.11',
    title: 'Hair Restraints — Effectiveness',
    summary:
      'Food employees shall wear hair restraints that keep hair from contacting exposed food, clean equipment, utensils, linens, and unwrapped single-service articles, with limited exceptions for beverage/wait staff presenting minimal risk.',
    domains: ['brand_standards'],
    keywords: ['hair', 'hat', 'net', 'beard', 'grooming'],
  },
  {
    section: '2-304.11',
    title: 'Outer Clothing — Clean Condition',
    summary: 'Food employees shall wear clean outer clothing to prevent contamination of food, equipment, utensils, linens, and single-service/use articles.',
    domains: ['brand_standards'],
    keywords: ['uniform', 'clothing', 'clean outer'],
  },
  {
    section: '3-301.11',
    title: 'Preventing Contamination from Hands',
    summary:
      'Food employees shall wash as specified under 2-301.12. Bare-hand contact with exposed ready-to-eat food is restricted except under documented alternative procedures in 3-301.11(D)–(E).',
    domains: ['barista_qc', 'kitchen_qc', 'food_safety', 'product_quality'],
    keywords: ['bare hand', 'ready-to-eat', 'gloves', 'garnish'],
  },
  {
    section: '3-301.12',
    title: 'Preventing Contamination When Tasting',
    summary: 'A food employee may not use a utensil more than once to taste food that is to be sold or served.',
    domains: ['kitchen_qc', 'barista_qc', 'product_quality'],
    keywords: ['tasting', 'utensil', 'double dip'],
  },
  {
    section: '3-302.11',
    title: 'Packaged and Unpackaged Food — Separation, Packaging, and Segregation',
    summary:
      'Protect food from cross contamination by separating raw animal foods from ready-to-eat foods during storage, preparation, holding, and display, and by cleaning/sanitizing as specified under 4-602.11(A) and 4-703.11.',
    domains: ['kitchen_qc', 'food_safety'],
    keywords: ['cross contamination', 'raw', 'separate', 'poultry', 'ready-to-eat'],
  },
  {
    section: '3-302.12',
    title: 'Food Storage Containers, Identified with Common Name of Food',
    summary:
      'Working containers of food or ingredients removed from original packages shall be identified with the common name of the food, except unmistakably recognizable items.',
    domains: ['kitchen_qc', 'product_quality', 'barista_qc'],
    keywords: ['label', 'container', 'common name', 'syrup', 'milk'],
  },
  {
    section: '3-401.11',
    title: 'Raw Animal Foods — Cooking',
    summary:
      'Raw animal foods shall be cooked to Code time/temperature combinations, including 63°C/145°F for 15 seconds (certain fish/intact meat/immediate-service raw eggs), 68°C/155°F for 17 seconds (certain comminuted foods), and 74°C/165°F instantaneous (poultry and stuffed foods), with listed alternatives.',
    domains: ['kitchen_qc', 'food_safety'],
    keywords: ['cook', 'temperature', 'poultry', '165', 'meat'],
  },
  {
    section: '3-501.16',
    title: 'Time/Temperature Control for Safety Food, Hot and Cold Holding',
    summary:
      'Except during preparation, cooking, cooling, or when time is used as a public health control under 3-501.19, TCS food shall be maintained at 57°C (135°F) or above or at 5°C (41°F) or less.',
    domains: ['food_safety', 'kitchen_qc', 'equipment', 'barista_qc'],
    keywords: ['cold hold', 'hot hold', '41', '135', 'refrigerat', 'milk'],
  },
  {
    section: '3-501.17',
    title: 'Ready-to-Eat TCS Food — Date Marking',
    summary:
      'Refrigerated RTE TCS food prepared and held more than 24 hours shall be clearly marked and held at 5°C (41°F) or less for a maximum of seven days, counting the day of preparation as Day 1. Opened commercially processed RTE TCS food follows the same combination.',
    domains: ['food_safety', 'kitchen_qc', 'product_quality'],
    keywords: ['date mark', 'seven days', 'ready-to-eat', 'discard'],
  },
  {
    section: '3-501.18',
    title: 'Ready-to-Eat TCS Food — Disposition',
    summary: 'Discard RTE TCS food that exceeds the 3-501.17 time/temperature combination, lacks a date mark, or is marked beyond the allowed combination.',
    domains: ['food_safety', 'kitchen_qc'],
    keywords: ['discard', 'expired', 'date'],
  },
  {
    section: '3-602.12(C)',
    title: 'Other Forms of Information — Major Food Allergens',
    summary:
      'The permit holder shall notify consumers by written notification of the presence of major food allergens as an ingredient in unpackaged food items served or sold to the consumer.',
    domains: ['food_safety', 'product_quality', 'brand_standards'],
    keywords: ['allergen', 'label', 'milk', 'nuts', 'written notification'],
  },
  {
    section: '3-603.11',
    title: 'Consumer Advisory',
    summary:
      'If animal food is served raw or undercooked, consumers shall be informed of the significantly increased risk by disclosure and reminder using written means.',
    domains: ['food_safety', 'product_quality', 'kitchen_qc'],
    keywords: ['raw', 'undercooked', 'advisory', 'menu'],
  },
  {
    section: '4-204.112',
    title: 'Temperature Measuring Devices',
    summary: 'Temperature measuring devices shall be designed and located as specified for equipment used for TCS food.',
    domains: ['equipment', 'food_safety'],
    keywords: ['thermometer', 'temperature measuring'],
  },
  {
    section: '4-302.14',
    title: 'Sanitizing Solutions, Testing Devices',
    summary: 'A test kit or other device that accurately measures the concentration of sanitizing solutions shall be provided.',
    domains: ['cleaning', 'equipment'],
    keywords: ['test kit', 'sanitizer concentration'],
  },
  {
    section: '4-501.114',
    title: 'Manual and Mechanical Warewashing Equipment, Chemical Sanitization',
    summary:
      'A chemical sanitizer used in a sanitizing solution shall meet 7-204.11, be used per EPA-registered label instructions, and follow the Code’s chlorine/pH/temperature chart or other listed chemical methods.',
    domains: ['cleaning', 'equipment'],
    keywords: ['sanitizer', 'chlorine', 'ppm', 'warewash'],
  },
  {
    section: '4-602.11',
    title: 'Equipment Food-Contact Surfaces and Utensils — Frequency',
    summary:
      'Food-contact surfaces and utensils shall be cleaned before changing raw animal food types, when changing from raw to RTE, at least every four hours when used with TCS food (with listed exceptions), and whenever contamination may have occurred.',
    domains: ['equipment', 'cleaning', 'barista_qc', 'kitchen_qc'],
    keywords: ['food-contact', 'every four hours', 'espresso', 'blender', 'utensil'],
  },
  {
    section: '4-703.11',
    title: 'Hot Water and Chemical — Sanitizing Methods',
    summary:
      'After cleaning, food-contact surfaces shall be sanitized by hot water or chemical methods. Chemical contact times shall follow EPA-registered labels; chlorine solutions generally require at least 10 seconds except listed alternatives.',
    domains: ['cleaning', 'equipment'],
    keywords: ['sanitize', 'contact time', 'hot water'],
  },
  {
    section: '5-202.12',
    title: 'Handwashing Sink, Installation',
    summary: 'A handwashing sink shall be equipped to provide water at a temperature of at least 38°C (100°F) through a mixing valve or combination faucet.',
    domains: ['food_safety', 'equipment', 'opening_checklist'],
    keywords: ['handwashing sink', '100', 'warm water'],
  },
  {
    section: '6-301.11',
    title: 'Handwashing Cleanser, Availability',
    summary: 'Each handwashing sink or group of two adjacent sinks shall be provided with hand cleaning liquid, powder, or bar soap.',
    domains: ['food_safety', 'cleaning', 'opening_checklist'],
    keywords: ['soap', 'handwash stocked', 'cleanser'],
  },
  {
    section: '6-301.12',
    title: 'Hand Drying Provision',
    summary:
      'Each handwashing sink shall be provided with individual disposable towels, a continuous clean-towel system, a heated-air dryer, or an air-knife dryer.',
    domains: ['food_safety', 'cleaning', 'opening_checklist'],
    keywords: ['paper towel', 'hand drying', 'dryer'],
  },
  {
    section: '6-301.14',
    title: 'Handwashing Signage',
    summary: 'A sign or poster that notifies food employees to wash their hands shall be provided at all employee handwashing sinks and shall be clearly visible.',
    domains: ['food_safety', 'brand_standards', 'opening_checklist'],
    keywords: ['sign', 'poster', 'handwashing signage'],
  },
  {
    section: '6-501.12',
    title: 'Cleaning, Frequency and Restrictions',
    summary:
      'Physical facilities shall be cleaned as often as necessary to keep them clean. Except for spills, cleaning shall be done when the least amount of food is exposed, such as after closing.',
    domains: ['cleaning', 'closing_checklist'],
    keywords: ['floors', 'facility clean', 'after closing'],
  },
  {
    section: '5-501 / 6-501',
    title: 'Refuse and Physical Facilities',
    summary:
      'Refuse receptacles and premises shall be maintained so that food, equipment, utensils, linens, and single-service articles are protected. Distressed merchandise is segregated under 6-404.11.',
    domains: ['cleaning', 'food_safety'],
    keywords: ['waste', 'bins', 'refuse', 'trash'],
  },
];

export function citationsForDomain(domain: FdaCitation['domains'][number]): FdaCitation[] {
  return FDA_FOOD_CODE_2026_INDEX.filter((c) => c.domains.includes(domain));
}

/** Expand AR/EN food-safety questions so the English FDA index still retrieves. */
export function expandSopSearchQuery(question: string): string {
  const aliases: Array<{ match: RegExp; add: string }> = [
    { match: /غسل|اليدين|يدي/u, add: 'handwash hands soap wash 2-301.12 6-301' },
    { match: /مرض|إسهال|تقيؤ|مريض/u, add: 'illness sick vomit diarrhea 2-201.11' },
    { match: /حساس/u, add: 'allergen 3-602.12' },
    { match: /تبريد|بارد|ثلاج/u, add: 'cold hold refrigerator 3-501.16' },
    { match: /حرار|طبخ|دواج/u, add: 'cook temperature poultry 3-401.11' },
    { match: /تعقيم|مطهر|تنظيف/u, add: 'sanitize sanitizer clean 4-703.11 4-602.11' },
    { match: /حليب/u, add: 'milk dairy 3-501.16' },
    { match: /شعر|زي|ملابس/u, add: 'hair uniform clothing 2-402.11 2-304.11' },
    { match: /نفايات|قمام/u, add: 'waste refuse 5-501' },
    { match: /تاريخ/u, add: 'date mark seven days 3-501.17' },
    { match: /متى.*غسل|when to wash|wash hands/i, add: '2-301.14 when to wash' },
  ];
  const extra = aliases.filter((a) => a.match.test(question)).map((a) => a.add);
  return [question, ...extra].join(' ');
}

export function searchFdaIndex(question: string): FdaCitation[] {
  const words = expandSopSearchQuery(question)
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 2);
  return FDA_FOOD_CODE_2026_INDEX.map((c) => {
    const hay = `${c.section} ${c.title} ${c.summary} ${c.keywords.join(' ')}`.toLowerCase();
    const score = words.filter((w) => hay.includes(w)).length;
    return { c, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);
}
