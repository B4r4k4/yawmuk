// Static game configuration shared by the engine. Content (rulings / script) is NOT here.

export const LOCATIONS = ['home', 'work', 'school', 'street', 'public_events', 'private_events'];

export const LOCATION_TITLES = {
  home: { ar: 'المنزل', en: 'Home' },
  work: { ar: 'العمل', en: 'Work' },
  school: { ar: 'الكلية', en: 'College' },
  street: { ar: 'الشارع', en: 'Street' },
  public_events: { ar: 'مناسبات عامة', en: 'Public events' },
  private_events: { ar: 'مناسبات خاصة', en: 'Private events' },
  // places without situations (the walkable hub and free-to-visit buildings)
  town: { ar: 'الحيّ', en: 'The neighbourhood' },
  mosque: { ar: 'المسجد', en: 'Mosque' },
  bank: { ar: 'البنك الإسلامي', en: 'Islamic bank' }
};

// The walkable hub and the buildings that carry no situations (no script, never part of the journey order).
// LOCATIONS above stays the 6 journey stops (planner order, catalog, tests); PLACES are reachable from the hub.
export const HUB = 'town';

// Global look (key art: public/brand/imagery/keyart-town-golden-hour.jpg). 'golden' = every scene uses the
// golden-hour light preset and ignores its own sky/fog colours; only a scene that explicitly asks for 'night'
// (the winter-night street) keeps it. The town adds the golden sky backdrop. Set to null to restore the
// per-scene presets (day/evening/night by the script's time of day) and the old flat sky.
export const LIGHTING = 'golden';
export const PLACES = [HUB, 'mosque', 'bank'];
/** Every scene the player can be in: the 6 journey stops + the hub + free places. */
export const ALL_LOCATIONS = [...LOCATIONS, ...PLACES];
export const isPlace = (loc) => PLACES.includes(loc);

// Fixed situation catalog from docs/TEAM_BRIEF.md (ids never change).
export const CATALOG = [
  ['home.mortgage', 'شراء بيت: القرض العقاري والتمويل الإسلامي', 'Buying a home: mortgage vs. Islamic finance'],
  ['home.food_ingredients', 'طعام البيت: اللحوم والجيلاتين والكحول في المنكّهات', 'Home food: meat, gelatin, alcohol in flavorings'],
  ['home.credit_card', 'بطاقة الائتمان و«اشترِ الآن وادفع لاحقاً»', 'Credit cards & Buy-Now-Pay-Later'],
  ['work.alcohol_pork_job', 'وظيفة في مطعم: تقديم الخمر أو الخنزير', 'Restaurant job: serving alcohol or pork'],
  ['work.retirement_401k', 'خطة التقاعد 401(k)', '401(k) retirement plan'],
  ['work.honesty_gifts', 'الأمانة في العمل وهدايا الموردين', 'Honesty at work & vendor gifts'],
  ['school.cheating', 'الغش في الامتحان والواجبات', 'Cheating on exams & assignments'],
  ['school.student_loan', 'القرض الطلابي بفائدة وبدائله', 'Interest-based student loans & alternatives'],
  ['school.mixed_social', 'الاختلاط والمصافحة في الدراسة', 'Mixed study groups & handshakes'],
  ['street.lost_wallet', 'اللقطة: محفظة مفقودة', 'Lost & found: a wallet on the street'],
  ['street.lottery', 'اليانصيب والمراهنات', 'Lottery, scratch cards & sports betting'],
  ['street.buying_selling', 'البيع والشراء: العيب والغبن والإكرامية', 'Buying & selling: defects, fraud, tips'],
  ['public_events.holiday_greetings', 'التهنئة بالكريسماس وعيد الشكر', 'Christmas & Thanksgiving greetings'],
  ['public_events.alcohol_table', 'مائدة يُدار عليها الخمر', 'A table where alcohol is served'],
  ['public_events.raffle', 'السحب الخيري (raffle)', 'Charity raffles'],
  ['private_events.wedding', 'زواج صديق مسلم', "A Muslim friend's wedding"],
  ['private_events.neighbor_funeral', 'وفاة جار غير مسلم', 'Death of a non-Muslim neighbor'],
  ['private_events.gifts_birthday', 'الهدايا وأعياد الميلاد', 'Gifts & birthday parties']
].map(([id, ar, en]) => ({ id, location: id.split('.')[0], title: { ar, en } }));

export const VERDICTS = {
  haram: { ar: 'حرام', en: 'Haram (forbidden)', color: '#c0392b' },
  makruh: { ar: 'مكروه', en: 'Makruh (disliked)', color: '#d35400' },
  mubah: { ar: 'مباح', en: 'Mubah (permissible)', color: '#2e8b57' },
  halal: { ar: 'حلال', en: 'Halal (permitted)', color: '#1e8449' },
  mustahab: { ar: 'مستحب', en: 'Mustahab (recommended)', color: '#138d75' },
  wajib: { ar: 'واجب', en: 'Wajib (obligatory)', color: '#1f618d' },
  disputed: { ar: 'مختلف فيه', en: 'Disputed among scholars', color: '#b7950b' },
  depends: { ar: 'يختلف بحسب الحال', en: 'Depends on the case', color: '#2874a6' },
  unknown: { ar: 'قيد الإعداد', en: 'Pending', color: '#5d6d7e' }
};

export const QUALITY = {
  best: { ar: 'الخيار الأفضل', en: 'Best choice', color: '#1e8449' },
  acceptable: { ar: 'مقبول', en: 'Acceptable', color: '#b7950b' },
  wrong: { ar: 'خيار خاطئ', en: 'Wrong choice', color: '#c0392b' }
};

export const CHECK_BONUS = 5; // points for answering the check question correctly
export const STORAGE_KEY = 'yawmuk.progress.v1';

// Topic categories used by the end screen to suggest a next topic (themes cut across locations).
export const THEMES = {
  // nextTopic = index into ui_strings end.next_topics (0 Ramadan, 1 prayers, 2 Jesus & Mary, 3 Zakat)
  money: { nextTopic: 3, ar: 'المال والتمويل', en: 'Money & finance', ids: ['home.mortgage', 'home.credit_card', 'work.retirement_401k', 'school.student_loan', 'street.lottery', 'public_events.raffle'] },
  food: { nextTopic: 0, ar: 'الطعام والشراب', en: 'Food & drink', ids: ['home.food_ingredients', 'work.alcohol_pork_job', 'public_events.alcohol_table'] },
  honesty: { nextTopic: 1, ar: 'الأمانة والصدق', en: 'Honesty & trust', ids: ['work.honesty_gifts', 'school.cheating', 'street.lost_wallet', 'street.buying_selling'] },
  social: { nextTopic: 2, ar: 'العلاقات والمناسبات', en: 'Relationships & occasions', ids: ['school.mixed_social', 'public_events.holiday_greetings', 'private_events.wedding', 'private_events.neighbor_funeral', 'private_events.gifts_birthday'] }
};

// ---------------------------------------------------------------- context picker (start screen; optional, never asks belief)
// Topics the player may pick. Each maps onto situation ids (built from THEMES above + a few cross-cutting picks).
export const TOPICS = {
  money: { ar: 'المال', en: 'Money', ids: THEMES.money.ids },
  food: { ar: 'الطعام', en: 'Food', ids: THEMES.food.ids },
  work: { ar: 'العمل والأمانة', en: 'Work & honesty', ids: [...THEMES.honesty.ids, 'work.alcohol_pork_job', 'work.retirement_401k'] },
  social: { ar: 'العلاقات', en: 'Relationships', ids: THEMES.social.ids },
  celebrations: { ar: 'المناسبات', en: 'Celebrations', ids: ['public_events.holiday_greetings', 'private_events.wedding', 'private_events.gifts_birthday', 'public_events.raffle', 'public_events.alcohol_table'] }
};
// Day types: the locations such a day naturally starts with (a light ordering hint only).
export const DAY_TYPES = {
  office: { ar: 'يوم عمل', en: 'Office day', locations: ['work', 'street'] },
  student: { ar: 'يوم دراسة', en: 'Student day', locations: ['school', 'street'] },
  weekend: { ar: 'عطلة نهاية الأسبوع', en: 'Weekend', locations: ['home', 'public_events', 'private_events'] }
};

// ---------------------------------------------------------------- the player character
// Single place to change how Adam looks. Any makeNPC(look) option works (see src/engine/README.md):
// skin, shirt, pants, shoes, hair (false = bald), beard, glasses, suit, tie, kufi, height, build…
export const PLAYER = {
  name: { ar: 'آدم', en: 'Adam' }, // Adam Reed — character notes: docs/story_bible.md
  look: {
    skin: '#e8c4a0',
    hair: '#5a3b24',   // short brown hair
    beard: false,      // clean-shaven
    kufi: false,
    shirt: '#2f4a6d',  // navy shirt
    pants: '#5b6270',  // grey jeans
    shoes: '#6b4a2f',  // brown shoes
    glasses: false,
    height: 1.78,
    build: 1
  }
};
// A scene may return `playerLook: { suit: '#1f2d4d', … }` — it is merged over PLAYER.look for that scene only.
