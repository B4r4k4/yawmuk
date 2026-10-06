// The micro-study's 5-item concept test. Copied VERBATIM from the reviewed `check_question` of five situations in
// content/script/*.json — no new religious text is written here. Each item cites its ruling_id; `correct` is the index
// of the option flagged correct in the source. tests/study.test.mjs fails if any item drifts from its source.
// Concepts: riba (interest), maysir (gambling), luqata (lost property), honesty (cheating), when to ask a scholar.
// A tawhid item was considered, but the game has no reviewed tawhid card, so none is invented.
// Every item also offers "I don't know" (value -1, scored incorrect) to reduce guessing.
// Pure module (no DOM, no CSS): imported by the browser UI and by netlify/functions/study.mjs for server-side scoring.

export const ITEMS = 
[
  {
    "id": "riba",
    "ruling_id": "home.credit_card",
    "q": {
      "ar": "ما الذي يجعل المسلم يتردد في عروض «0% لمدة 12 شهراً»؟",
      "en": "What makes a Muslim hesitant about '0% for 12 months' deals?"
    },
    "options": [
      {
        "ar": "أن الإسلام يحرّم شراء الهواتف بالتقسيط",
        "en": "Islam forbids buying phones in installments"
      },
      {
        "ar": "أن العقد قد يتضمن فائدة أو غرامة تأخير، والفائدة محرمة في الإسلام",
        "en": "The contract may include interest or late penalties, and interest is prohibited in Islam"
      },
      {
        "ar": "أن المسلمين لا يستعملون البنوك",
        "en": "Muslims don't use banks"
      }
    ],
    "correct": 1
  },
  {
    "id": "maysir",
    "ruling_id": "street.lottery",
    "q": {
      "ar": "لماذا يتجنب المسلمون اليانصيب والمراهنات؟",
      "en": "Why do Muslims avoid lotteries and betting?"
    },
    "options": [
      {
        "ar": "لأنها قمار: دفع مال مقابل احتمال ربح أو خسارة يتوقف على الحظ، وهو محرم في الإسلام",
        "en": "Because it's gambling: paying money for a chance to win or lose based on luck, which Islam prohibits"
      },
      {
        "ar": "لأنها تُباع في محطات الوقود",
        "en": "Because they're sold at gas stations"
      },
      {
        "ar": "لأن المسلمين لا يحبون الرياضة",
        "en": "Because Muslims don't like sports"
      }
    ],
    "correct": 0
  },
  {
    "id": "luqata",
    "ruling_id": "street.lost_wallet",
    "q": {
      "ar": "ما الواجب على المسلم إن وجد مالاً ضائعاً له قيمة؟",
      "en": "What must a Muslim do on finding valuable lost property?"
    },
    "options": [
      {
        "ar": "أن يحتفظ به إن لم يره أحد",
        "en": "Keep it if nobody saw"
      },
      {
        "ar": "أن يحفظه ويجتهد في إيصاله لصاحبه أو التعريف به عبر جهة موثوقة",
        "en": "Keep it safe and make a real effort to return it or announce it through a reliable channel"
      },
      {
        "ar": "أن يتصدق به فوراً",
        "en": "Give it to charity right away"
      }
    ],
    "correct": 1
  },
  {
    "id": "honesty",
    "ruling_id": "school.cheating",
    "q": {
      "ar": "لماذا يرفض المسلم الملتزم الغش حتى في اختبار صغير؟",
      "en": "Why does a practicing Muslim refuse to cheat even on a small quiz?"
    },
    "options": [
      {
        "ar": "لأن الإسلام يحرّم الغش والخداع مهما صغر، ويحرّم الإعانة عليه",
        "en": "Because Islam prohibits cheating and deception however small, and helping others do it"
      },
      {
        "ar": "لأنه يخاف من الأستاذة فقط",
        "en": "Only because he's afraid of the professor"
      },
      {
        "ar": "لأن الدراسة في الكليات الأمريكية ممنوعة أصلاً",
        "en": "Because studying at American colleges is forbidden anyway"
      }
    ],
    "correct": 0
  },
  {
    "id": "ask_scholar",
    "ruling_id": "private_events.neighbor_funeral",
    "q": {
      "ar": "ما الذي يتفق عليه علماء المسلمين في التعامل مع جار غير مسلم فقد قريباً له؟",
      "en": "What do Muslim scholars agree on regarding a non-Muslim neighbor who's lost a loved one?"
    },
    "options": [
      {
        "ar": "الإحسان إليه ومساعدته عملياً من حق الجوار، وتفاصيل التعزية وحضور الجنازة فيها خلاف يُسأل عنه عالم",
        "en": "Kindness and practical help are part of neighborliness; the details of condolences and attending the funeral are debated, so a scholar is asked"
      },
      {
        "ar": "لا علاقة للمسلم بأحزان جيرانه غير المسلمين",
        "en": "A Muslim has nothing to do with non-Muslim neighbors' grief"
      },
      {
        "ar": "يجب على المسلم المشاركة في كل طقوس الجنازة الدينية",
        "en": "A Muslim must join every religious funeral rite"
      }
    ],
    "correct": 0
  }
];

export const DONT_KNOW = { ar: 'لا أعرف', en: "I don't know" };

/** Pre-test shows ITEMS in this order; the post-test uses a fixed rotation (same concepts, different order). */
export const PRE_ORDER = [0, 1, 2, 3, 4];
export const POST_ORDER = [3, 0, 4, 1, 2];

/** answers: map itemId -> option index (or -1 = "I don't know"). Returns the number correct (0..5). */
export function scoreAnswers(answers) {
  if (!answers || typeof answers !== 'object') return 0;
  let n = 0;
  for (const it of ITEMS) if (answers[it.id] === it.correct) n += 1;
  return n;
}

/** Keeps only the 5 known item ids with an in-range integer (or -1). Returns null unless all 5 are answered. */
export function cleanAnswers(answers) {
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return null;
  const out = {};
  for (const it of ITEMS) {
    const v = answers[it.id];
    if (!Number.isInteger(v) || v < -1 || v >= it.options.length) return null;
    out[it.id] = v;
  }
  return out;
}
