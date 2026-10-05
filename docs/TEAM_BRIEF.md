# «يومك» — لعبة 3D في فقه المعاملات للمسلم في أمريكا
## الوثيقة المرجعية لفريق الوكلاء (Contracts) — يملكها الوكيل المشرف

> كل وكيل يقرأ هذا الملف كاملاً قبل البدء. لا يعدّل أي وكيل هذا الملف؛ أي اقتراح تغيير يُكتب في تقريره النهائي للمشرف.

### الفكرة
لعبة ويب ثلاثية الأبعاد (Three.js، تعمل في المتصفح على الحاسوب والهاتف) تتابع يوماً عادياً لـ **«آدم»**، شاب مسلم (28 سنة، مهندس برمجيات مبتدئ ويكمل دراسة مسائية في كلية مجتمع) يعيش في مدينة أمريكية متوسطة (Columbus, Ohio) وسط مجتمع غالبه غير مسلم. يمرّ اللاعب بست محطات، وفي كل محطة مواقف يختار فيها تصرفاً، ثم تظهر **بطاقة حكم** موثقة بالقرآن والحديث والمذاهب الأربعة والمجامع الفقهية المعاصرة.

مبادئ إلزامية (من وثيقة التحدي):
1. **الفصل بين القصة والمعلومة الدينية**: الحوار تخييلي، أما الحكم والدليل فيأتيان حصراً من ملفات `content/rulings/`.
2. **لا اختلاق**: لا يُكتب نص آية أو حديث إلا منقولاً حرفياً من مصدر موثوق مع الرقم ورابط المصدر ودرجة الحديث. إن لم يُتحقق من نص يُترك الحقل فارغاً ويُذكر ذلك في `notes_for_reviewer`.
3. **عرض الخلاف بأمانة**: المذاهب الأربعة بأقوالها المعتمدة، مع الإشارة إلى المرجع (كتاب معتمد في المذهب أو موسوعة فقهية).
4. **الإحالة**: كل حكم يعتمد على تفاصيل شخصية يتضمن متى يجب سؤال مختص.
5. واجهة **عربية (RTL) وإنجليزية**.

### المراحل
| المرحلة | المحتوى | المخرجات |
|---|---|---|
| 1 — الأساس | بحث شرعي + سيناريو + محرك اللعبة | `content/rulings/*.json`، `content/script/*.json`، `src/engine/*`، `reports/phase-1.pdf` |
| 2 — المشاهد | بناء 6 مشاهد 3D وربطها بالسيناريو + تدقيق شرعي مستقل | `src/scenes/*.js`، `docs/audit/*`، `reports/phase-2.pdf` |
| 3 — التكامل والجودة | دمج، اختبارات، تدقيق نهائي، نشر، توثيق | `dist/`، `tests/`، `README.md`، `reports/phase-3.pdf` |

### هيكل المجلدات (كل وكيل يكتب فقط في المسارات المخصصة له)
```
content/rulings/<location>.json   ← وكلاء البحث الشرعي
content/script/<location>.json    ← السيناريست
content/sources.json              ← وكيل التدقيق الشرعي (سجل المصادر الموحد) — المرحلة 2
src/engine/**  index.html  package.json  vite.config.js ← وكيل المحرك
src/scenes/<location>.js          ← وكيل المشهد الخاص بكل مكان
docs/research/<agent>.md          ← ملاحظات البحث
docs/audit/*.md                   ← التدقيق
docs/phase-N/*.md                 ← تقارير الوكلاء لكل مرحلة
reports/phase-N.pdf               ← وكيل التوثيق
```
المواقع (location ids): `home`, `work`, `school`, `street`, `public_events`, `private_events`.

### كتالوج المواقف (18 موقفاً — المعرّف ثابت ولا يُغيَّر)
| id | الموقف |
|---|---|
| `home.mortgage` | شراء بيت: قرض عقاري ربوي مقابل التمويل الإسلامي (مرابحة/مشاركة متناقصة/إجارة) |
| `home.food_ingredients` | طعام البيت: لحم أهل الكتاب من السوبرماركت، الجيلاتين، الكحول في المنكّهات (vanilla extract) |
| `home.credit_card` | بطاقة الائتمان و«اشترِ الآن وادفع لاحقاً»: الفوائد وغرامات التأخير، والاستعمال مع السداد الكامل |
| `work.alcohol_pork_job` | وظيفة جانبية في مطعم: تقديم الخمر أو لحم الخنزير، أو توصيلها، أو العمل كمبرمج لشركة خمور |
| `work.retirement_401k` | خطة التقاعد 401(k) ومطابقة صاحب العمل: صناديق الفائدة مقابل صناديق الأسهم المتوافقة مع الشريعة، وأحكام الأسهم |
| `work.honesty_gifts` | الأمانة في العمل: هدايا الموردين (حديث ابن اللتبية)، تسجيل ساعات غير معمولة، استعمال موارد الشركة |
| `school.cheating` | الغش في الامتحان ومساعدة زميل على الغش، وبيع الواجبات/ الكتابة بالذكاء الاصطناعي دون إفصاح |
| `school.student_loan` | القرض الطلابي الفيدرالي بفائدة، وبدائله (منح، عمل، صناديق قرض حسن)، وقول الضرورة والحاجة |
| `school.mixed_social` | الخلوة والتعامل مع الجنس الآخر في مجموعة الدراسة، ومصافحة الأستاذة (الخلاف المذهبي) |
| `street.lost_wallet` | اللقطة: محفظة فيها نقود وبطاقات — التعريف، المدة، التصرف بعدها (أحكام المذاهب الأربعة)، ودور الشرطة |
| `street.lottery` | تذاكر اليانصيب والكشط (scratch cards) والمراهنات الرياضية على التطبيقات |
| `street.buying_selling` | بيع وشراء في الشارع: بيع سلعة مستعملة مع إخفاء العيب، الغبن، الإكرامية (tip)، ونشر تقييم كاذب |
| `public_events.holiday_greetings` | الكريسماس وعيد الشكر: التهنئة، حضور حفل المكتب، تبادل الهدايا (الأقوال القديمة والمعاصرة) |
| `public_events.alcohol_table` | حفلة الشركة: الجلوس على مائدة يُدار عليها الخمر، والبديل المقبول |
| `public_events.raffle` | سحب خيري (raffle) بتذاكر مدفوعة مقابل جوائز مجانية بلا شرط |
| `private_events.wedding` | زواج صديق مسلم: المهر، الوليمة، الإشهار، والموسيقى (الخلاف) — وحضور زفاف فيه منكرات |
| `private_events.neighbor_funeral` | وفاة جار غير مسلم: التعزية، حضور الجنازة، الدعاء، ومواساة الأسرة |
| `private_events.gifts_birthday` | قبول هدية من زميل غير مسلم، وحضور حفل عيد ميلاد طفل الجار، وقبول الهدايا المحتوية على محرم |

### عقد بيانات الحكم — `content/rulings/<location>.json`
مصفوفة JSON من كائنات بهذا الشكل (كل الحقول النصية ثنائية اللغة):
```json
{
  "id": "home.mortgage",
  "location": "home",
  "title": {"ar": "", "en": ""},
  "question": {"ar": "", "en": ""},
  "verdict": "haram | halal | makruh | mubah | mustahab | wajib | disputed | depends",
  "summary": {"ar": "", "en": ""},
  "quran": [{"surah": 2, "surah_name_ar": "البقرة", "ayah": "275", "text_ar": "نص عثماني حرفي", "translation_en": "Sahih International", "source_url": "https://quran.com/2/275"}],
  "hadith": [{"text_ar": "نص حرفي", "translation_en": "", "collection": "صحيح مسلم", "number": "1598", "narrator": "جابر بن عبد الله", "grade": "صحيح", "grader": "", "source_url": "https://sunnah.com/... أو https://dorar.net/..."}],
  "madhahib": {
    "hanafi":  {"position_ar": "", "position_en": "", "reference": "اسم الكتاب المعتمد/الموسوعة + الجزء/الصفحة إن أمكن"},
    "maliki":  {"position_ar": "", "position_en": "", "reference": ""},
    "shafii":  {"position_ar": "", "position_en": "", "reference": ""},
    "hanbali": {"position_ar": "", "position_en": "", "reference": ""}
  },
  "contemporary": [{"body": "مجمع الفقه الإسلامي الدولي / المجمع الفقهي برابطة العالم الإسلامي / AMJA / Fiqh Council of North America / المجلس الأوروبي للإفتاء", "decision_ref": "رقم القرار والدورة", "position_ar": "", "position_en": "", "source_url": ""}],
  "practical_guidance": {"ar": ["خطوة عملية"], "en": ["practical step"]},
  "halal_alternatives": {"ar": [], "en": []},
  "refer_to_scholar_when": {"ar": "", "en": ""},
  "confidence": "high | medium | low",
  "review_status": "ai_draft",
  "notes_for_reviewer": ""
}
```

### عقد السيناريو — `content/script/<location>.json`
```json
{
  "location": "home",
  "title": {"ar": "", "en": ""},
  "time_of_day": "07:00",
  "intro": {"ar": "", "en": ""},
  "situations": [{
    "ruling_id": "home.mortgage",
    "hotspot": "laptop",
    "npc": {"id": "sara", "name": {"ar": "", "en": ""}, "role": {"ar": "", "en": ""}},
    "setup": {"ar": "", "en": ""},
    "dialogue": [{"speaker": "sara | adam | narrator", "ar": "", "en": ""}],
    "choices": [{"id": "a", "label": {"ar": "", "en": ""}, "quality": "best | acceptable | wrong", "consequence": {"ar": "", "en": ""}, "points": 10}],
    "check_question": {"q": {"ar": "", "en": ""}, "options": [{"ar": "", "en": "", "correct": true}]}
  }],
  "outro": {"ar": "", "en": ""},
  "next_location": "work"
}
```
السيناريست **لا يكتب نص آيات أو أحاديث** إطلاقاً؛ يحيل فقط بـ `ruling_id`، والمحرك يعرض بطاقة الحكم بعد الاختيار.
قيم `hotspot` المسموحة لكل مكان تُعرّف في `docs/hotspots.md` (يكتبها السيناريست في المرحلة 1، ويلتزم بها وكلاء المشاهد).

### عقد المشهد — `src/scenes/<location>.js`
```js
// هندسة إجرائية فقط (Three.js primitives) — بلا ملفات نماذج خارجية.
export default {
  id: 'home',
  title: { ar: 'المنزل', en: 'Home' },
  build(ctx) {             // ctx = { THREE, mats, makeNPC, makeLabel } يوفرها المحرك (انظر src/engine/README.md)
    return {
      group,                // THREE.Group — الأرضية عند y=0، وحدة القياس = متر
      spawn: { position: [x, 0, z], yaw: 0 },
      colliders: [{ min: [x,y,z], max: [x,y,z] }],    // صناديق تصادم AABB
      hotspots: [{ id: 'laptop', position: [x,y,z], radius: 1.5, label: {ar:'', en:''} }],
      npcs: [{ id: 'sara', position: [x,0,z], yaw: 0, look: { skin:'#c68642', shirt:'#3a6ea5', hijab: true } }],
      exit: { position: [x,0,z], radius: 1.5 },          // باب الانتقال للمحطة التالية
      lights: 'day | evening | night',
      update(dt, t) {}, dispose() {}
    };
  }
};
```
