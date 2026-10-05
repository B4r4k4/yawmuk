# نقاط التلاقي مع المسيحية والشرح المبسط لغير المسلم — ملاحظات البحث

> الحالة: **مسودة ذكاء اصطناعي (ai_draft)** — تحتاج مراجعة عالم مسلم ومراجع مطّلع على المسيحية قبل النشر.
> التاريخ: 2026-10-05. المرجع: قسم «⚠️ تحديث 2026-10-05» في `docs/TEAM_BRIEF.md`.

## 1. ما الذي أُضيف

لكل حكم من الأحكام الـ18 في `content/rulings/*.json` أُضيف حقلان فقط:

- `newcomer_explainer` `{ar, en}`: 3–5 جمل لقارئ غير مسلم — ما موقف الإسلام ولماذا، مع ذكر الخلاف حين يوجد.
- `common_ground` `{summary, bible[], differences}`: نقاط التلاقي مع المسيحية، ونصوص كتابية حرفية (KJV + فاندايك)، والفروق بأمانة واحترام.

لم يُعدَّل أي حقل آخر (تحققتُ آلياً بمقارنة كل حكم بنسخته السابقة بعد حذف الحقلين الجديدين: لا فرق).

**الأدوات**

- البيانات: `tools/audit/common_ground_data.json` — فيها جدول `verses` (كل نص كتابي مع مصادره ونتائج المطابقة) وجدول `rulings` (النصوص التحريرية لكل حكم، وتشير إلى الآيات بمرجعها فقط).
- السكربت: `node tools/audit/apply_common_ground.cjs` — يعيد ضبط الحقلين من ملف البيانات في كل تشغيل (idempotent؛ التشغيل الثاني لا يكتب شيئاً)، ويرفض أي مرجع كتابي غير موجود في جدول `verses` المتحقق منه، ويتحقق من صلاحية JSON بعد الكتابة.
- كل عنصر في `bible` يحمل الحقول المحددة في العقد (`ref_en, ref_ar, text_en, text_ar, source_url`) **وحقلاً إضافياً `source_url_ar`** لأن النصين من مصدرين مختلفين؛ `source_url` = مصدر نص KJV، و`source_url_ar` = مصدر نص فاندايك. (اقتراح للمحرك أدناه.)

## 2. المنهجية

### 2.1 المحتوى الإسلامي (newcomer_explainer وجانب الإسلام في common_ground)
- لم يُستعمل إلا ما هو موجود في ملف الحكم نفسه: الآيات والأحاديث والمذاهب وقرارات المجامع المذكورة فيه. لا دليل جديد.
- كل اقتباس حرفي لحديث بالعربية مطابق لـ `text_ar` في الحكم (فحصت: «مطل الغني ظلم»، «من غشنا فليس منا»، «دع ما يريبك إلى ما لا يريبك»، «أليست نفساً»، «تهادوا تحابوا»، «فصل ما بين الحرام والحلال الدف والصوت»، «هذا لكم، وهذا أُهدي لي… فهلّا جلس في بيت أبيه أو بيت أمه، فينظر يُهدى له أم لا»، «ولتكن وديعة عندك، فإن جاء طالبها يوماً من الدهر فأدّها إليه»). الاقتباسات الإنجليزية من `translation_en` في الحكم.
- لم يُكتب نص قرآني حرفي بالعربية في الحقول الجديدة؛ يُشار إلى الآيات برقمها مع إعادة صياغة المعنى (والاقتباس الإنجليزي الوحيد لـ 5:5 مأخوذ من ترجمة Sahih International الموجودة في الحكم).
- الحِكَم والمقاصد صيغت بلغة «يذكر العلماء» وبحدود عامة معروفة (العدل ومنع الاستغلال في الربا، حفظ الأمانة، سدّ الذرائع…)، وما نصّ عليه القرآن نفسه من علة (المائدة 91 في الميسر) نُسب إليه.
- حيث الحكم `disputed`/`depends` أو فيه خلاف معتبر، ذُكر الخلاف صراحة كما هو في الحكم.

### 2.2 النصوص الكتابية
- **لم يُكتب أي نص كتابي من الذاكرة.** كل نص جُلب آلياً (Node `fetch`) يوم 2026-10-05 ونُسخ كما جاء في الاستجابة، مع توحيد المسافات فقط (إزالة الأسطر الجديدة والمسافات المكررة وفراغ البداية/النهاية).
- **الإنجليزية (KJV)**: جُلبت من ثلاثة مصادر مستقلة وقورنت:
  1. `bible-api.com` (`?translation=kjv`) — المصدر المعتمد في `source_url`.
  2. `api.getbible.net/v2/kjv/{book}/{chapter}.json`.
  3. `bolls.life/get-text/KJV/{book}/{chapter}/` (بعد حذف وسوم أرقام سترونغ).
  النتيجة: تطابق الثلاثة حرفياً في 24 آية؛ وفي 9 آيات كانت الفروق شكلية فقط: كتابة LORD بالحروف الكبيرة (getbible يكتبها Lord)، أو مسافة زائدة قبل الفاصلة، أو حاشية هامشية ملحقة في bolls (مثل «Heb. the seeing»). اعتُمدت صيغة bible-api (بـ LORD كما في طبعات KJV). **استثناء واحد**: تثنية 22: 3 — bible-api كتب «all lost things» بينما getbible وbolls كتبا «all lost thing» (وهو نص طبعة 1769 القياسية)، فاعتُمدت صيغة الأغلبية وصار `source_url` لهذه الآية رابط getbible.
- **العربية (فاندايك)**: جُلبت من مصدرين:
  1. `api.getbible.net/v2/arabicsv/...` (الترجمة باسم "Smith and Van Dyke"، abbreviation `arabicsv`) — المصدر المعتمد في `source_url_ar`.
  2. `bolls.life/get-text/SVD/...`.
  التشكيل والهمزات يختلفان أحياناً بين الطبعتين (مثل لَا/لاَ، ٱ/ا)، فقورن **الرسم المجرد** (بعد حذف الحركات وتوحيد الألف والهمزة والتاء المربوطة وعلامات الترقيم): تطابق في الآيات الـ34 كلها. اعتُمد نص getbible المشكول حرفياً.
  - لم أستعمل biblegateway للعربية (نسخته ليست فاندايك كما نبّه الموجّه)، ولا bible.eu (نسخة NAV/كتاب الحياة).
- محاولات لم تنجح: biblegateway.com وst-takla.org عبر WebFetch (ECONNRESET)، وkingjamesbibleonline.org (403). لذلك اعتمدتُ على الواجهات البرمجية الثلاث أعلاه. بحث ويب واحد أكّد نص تثنية 22: 3 العربي من مصدر ثالث (نتيجة بحث تعرض «وَهكَذَا تَفْعَلُ بِكُلِّ مَفْقُودٍ لأَخِيكَ يُفْقَدُ مِنْهُ وَتَجِدُهُ… لاَ يَحِلُّ لَكَ أَنْ تَتَغَاضَى»).
- النتائج الخام لكل مصدر محفوظة داخل `tools/audit/common_ground_data.json` → `verses[ref].verification` لتمكين المراجع من إعادة الفحص.

### 2.3 مصادر حقائق مسيحية ذُكرت في `differences`/`summary`
- التعليم المسيحي للكنيسة الكاثوليكية §2413 (ألعاب الحظ «ليست مخالفة للعدل في ذاتها» ما لم تحرم الإنسان مما يحتاجه) — تأكد عبر بحث ويب (نتائج تشير إلى usccb.org flipbook الصفحة 582).
- الكنيسة الميثودية المتحدة: «Gambling is a menace to society…» والدعوة إلى الامتناع بما فيه اليانصيب العام — تأكد عبر بحث ويب (umc.org: Book of Resolutions: Gambling، وAsk The UMC).
- «قاعدة بيلي غراهام» (Modesto Manifesto، 1948: عدم السفر أو اللقاء أو الأكل منفرداً مع امرأة غير زوجته) — تأكد عبر بحث ويب (christianhistoryinstitute.org، thegospelcoalition.org).
- بقية الحقائق العامة (أن أغلب المسيحيين يرون شريعة الأطعمة غير ملزمة ويستشهدون بمرقس 7 وأعمال 10؛ أن السبتيين والكنيسة الإثيوبية الأرثوذكسية يتجنبون الخنزير؛ أن أغلب الكنائس تبيح الشرب المعتدل وتستعمل الخمر في العشاء الرباني؛ قبول الكنائس للفائدة المعتدلة تاريخياً؛ إعلانات الزواج banns؛ الصلاة على الميت؛ مثل الوزنات متى 25: 27؛ إجازة تثنية 23: 20 للربا من الأجنبي) معلومات عامة **لم أجلب لها مصدراً في هذه المهمة** — يجب أن يؤكدها المراجع المطلع على المسيحية. الآيات المذكورة بالمرجع فقط في `differences` (مرقس 7، أعمال 10، تثنية 23: 20، متى 25: 27) **لم تُقتبس نصوصها** عمداً.

## 3. جدول النصوص الكتابية المتحقق منها

34 آية متحقق منها؛ 33 منها مستعملة (خروج 22: 25 مستعملة في حكمين، فمجموع الاستشهادات 34)، ولاويين 25: 37 متحقق منها لكنها **أُسقطت عمداً** (انظر 4.3).

\* «نعم» = تطابق حرفي بعد توحيد المسافات، أو فرق شكلي فقط موصوف في 2.2؛ تثنية 22: 3 حُسمت بالأغلبية.

| # | المرجع | Ref | الأحكام | KJV (المصدر المعتمد) | فاندايك (المصدر المعتمد) | مطابقة KJV عبر 3 مصادر | مطابقة الرسم العربي عبر مصدرين |
|---|---|---|---|---|---|---|---|
| 1 | خروج 22: 25 | Exodus 22:25 | home.mortgage<br>school.student_loan | https://bible-api.com/Exodus+22:25?translation=kjv | https://api.getbible.net/v2/arabicsv/2/22.json | نعم* | نعم |
| 2 | تثنية 23: 19 | Deuteronomy 23:19 | home.mortgage | https://bible-api.com/Deuteronomy+23:19?translation=kjv | https://api.getbible.net/v2/arabicsv/5/23.json | نعم* | نعم |
| 3 | لاويين 11: 7 | Leviticus 11:7 | home.food_ingredients | https://bible-api.com/Leviticus+11:7?translation=kjv | https://api.getbible.net/v2/arabicsv/3/11.json | نعم* | نعم |
| 4 | أعمال الرسل 15: 29 | Acts 15:29 | home.food_ingredients | https://bible-api.com/Acts+15:29?translation=kjv | https://api.getbible.net/v2/arabicsv/44/15.json | نعم* | نعم |
| 5 | رومية 13: 8 | Romans 13:8 | home.credit_card | https://bible-api.com/Romans+13:8?translation=kjv | https://api.getbible.net/v2/arabicsv/45/13.json | نعم* | نعم |
| 6 | مزمور 37: 21 | Psalms 37:21 | home.credit_card | https://bible-api.com/Psalms+37:21?translation=kjv | https://api.getbible.net/v2/arabicsv/19/37.json | نعم* | نعم |
| 7 | حبقوق 2: 15 | Habakkuk 2:15 | work.alcohol_pork_job | https://bible-api.com/Habakkuk+2:15?translation=kjv | https://api.getbible.net/v2/arabicsv/35/2.json | نعم* | نعم |
| 8 | مزمور 15: 5 | Psalms 15:5 | work.retirement_401k | https://bible-api.com/Psalms+15:5?translation=kjv | https://api.getbible.net/v2/arabicsv/19/15.json | نعم* | نعم |
| 9 | خروج 23: 8 | Exodus 23:8 | work.honesty_gifts | https://bible-api.com/Exodus+23:8?translation=kjv | https://api.getbible.net/v2/arabicsv/2/23.json | نعم* | نعم |
| 10 | لوقا 16: 10 | Luke 16:10 | work.honesty_gifts | https://bible-api.com/Luke+16:10?translation=kjv | https://api.getbible.net/v2/arabicsv/42/16.json | نعم* | نعم |
| 11 | أمثال 12: 22 | Proverbs 12:22 | school.cheating | https://bible-api.com/Proverbs+12:22?translation=kjv | https://api.getbible.net/v2/arabicsv/20/12.json | نعم* | نعم |
| 12 | كولوسي 3: 9 | Colossians 3:9 | school.cheating | https://bible-api.com/Colossians+3:9?translation=kjv | https://api.getbible.net/v2/arabicsv/51/3.json | نعم* | نعم |
| 13 | لاويين 25: 37 | Leviticus 25:37 | (غير مستعمل) | https://bible-api.com/Leviticus+25:37?translation=kjv | https://api.getbible.net/v2/arabicsv/3/25.json | نعم* | نعم |
| 14 | أمثال 22: 7 | Proverbs 22:7 | school.student_loan | https://bible-api.com/Proverbs+22:7?translation=kjv | https://api.getbible.net/v2/arabicsv/20/22.json | نعم* | نعم |
| 15 | أيوب 31: 1 | Job 31:1 | school.mixed_social | https://bible-api.com/Job+31:1?translation=kjv | https://api.getbible.net/v2/arabicsv/18/31.json | نعم* | نعم |
| 16 | متى 5: 28 | Matthew 5:28 | school.mixed_social | https://bible-api.com/Matthew+5:28?translation=kjv | https://api.getbible.net/v2/arabicsv/40/5.json | نعم* | نعم |
| 17 | تثنية 22: 2 | Deuteronomy 22:2 | street.lost_wallet | https://bible-api.com/Deuteronomy+22:2?translation=kjv | https://api.getbible.net/v2/arabicsv/5/22.json | نعم* | نعم |
| 18 | تثنية 22: 3 | Deuteronomy 22:3 | street.lost_wallet | https://api.getbible.net/v2/kjv/5/22.json | https://api.getbible.net/v2/arabicsv/5/22.json | نعم* | نعم |
| 19 | أمثال 13: 11 | Proverbs 13:11 | street.lottery | https://bible-api.com/Proverbs+13:11?translation=kjv | https://api.getbible.net/v2/arabicsv/20/13.json | نعم* | نعم |
| 20 | عبرانيين 13: 5 | Hebrews 13:5 | street.lottery | https://bible-api.com/Hebrews+13:5?translation=kjv | https://api.getbible.net/v2/arabicsv/58/13.json | نعم* | نعم |
| 21 | لاويين 25: 14 | Leviticus 25:14 | street.buying_selling | https://bible-api.com/Leviticus+25:14?translation=kjv | https://api.getbible.net/v2/arabicsv/3/25.json | نعم* | نعم |
| 22 | أمثال 11: 1 | Proverbs 11:1 | street.buying_selling | https://bible-api.com/Proverbs+11:1?translation=kjv | https://api.getbible.net/v2/arabicsv/20/11.json | نعم* | نعم |
| 23 | خروج 20: 16 | Exodus 20:16 | street.buying_selling | https://bible-api.com/Exodus+20:16?translation=kjv | https://api.getbible.net/v2/arabicsv/2/20.json | نعم* | نعم |
| 24 | رومية 12: 18 | Romans 12:18 | public_events.holiday_greetings | https://bible-api.com/Romans+12:18?translation=kjv | https://api.getbible.net/v2/arabicsv/45/12.json | نعم* | نعم |
| 25 | مزمور 107: 1 | Psalms 107:1 | public_events.holiday_greetings | https://bible-api.com/Psalms+107:1?translation=kjv | https://api.getbible.net/v2/arabicsv/19/107.json | نعم* | نعم |
| 26 | أمثال 20: 1 | Proverbs 20:1 | public_events.alcohol_table | https://bible-api.com/Proverbs+20:1?translation=kjv | https://api.getbible.net/v2/arabicsv/20/20.json | نعم* | نعم |
| 27 | أفسس 5: 18 | Ephesians 5:18 | public_events.alcohol_table | https://bible-api.com/Ephesians+5:18?translation=kjv | https://api.getbible.net/v2/arabicsv/49/5.json | نعم* | نعم |
| 28 | رومية 14: 21 | Romans 14:21 | public_events.alcohol_table | https://bible-api.com/Romans+14:21?translation=kjv | https://api.getbible.net/v2/arabicsv/45/14.json | نعم* | نعم |
| 29 | كورنثوس الثانية 9: 7 | 2 Corinthians 9:7 | public_events.raffle | https://bible-api.com/2%20Corinthians+9:7?translation=kjv | https://api.getbible.net/v2/arabicsv/47/9.json | نعم* | نعم |
| 30 | لوقا 14: 13 | Luke 14:13 | private_events.wedding | https://bible-api.com/Luke+14:13?translation=kjv | https://api.getbible.net/v2/arabicsv/42/14.json | نعم* | نعم |
| 31 | عبرانيين 13: 4 | Hebrews 13:4 | private_events.wedding | https://bible-api.com/Hebrews+13:4?translation=kjv | https://api.getbible.net/v2/arabicsv/58/13.json | نعم* | نعم |
| 32 | رومية 12: 15 | Romans 12:15 | private_events.neighbor_funeral | https://bible-api.com/Romans+12:15?translation=kjv | https://api.getbible.net/v2/arabicsv/45/12.json | نعم* | نعم |
| 33 | جامعة 7: 2 | Ecclesiastes 7:2 | private_events.neighbor_funeral | https://bible-api.com/Ecclesiastes+7:2?translation=kjv | https://api.getbible.net/v2/arabicsv/21/7.json | نعم* | نعم |
| 34 | أعمال الرسل 20: 35 | Acts 20:35 | private_events.gifts_birthday | https://bible-api.com/Acts+20:35?translation=kjv | https://api.getbible.net/v2/arabicsv/44/20.json | نعم* | نعم |

## 4. نقاط تحتاج مراجعة

### 4.1 للعالم المسلم
1. **صياغة الحِكَم**: كل `newcomer_explainer` يذكر «لماذا» بلغة عامة؛ أرجو التأكد أن الحكمة المنسوبة «للعلماء» مقبولة ولا تُقدَّم كعلة منصوصة إلا في المائدة 91 (الميسر).
2. **holiday_greetings**: الجملة الأخيرة تذكر أن المسلمين يحبون عيسى ويجلّونه نبياً ولا يعتقدون ألوهيته — معلومة عقدية عامة بلا دليل مقتبس؛ هل تُبقى في الشرح أم تُنقل إلى `differences` فقط؟ والتعبير «مسيحاً وُلد من مريم العذراء» في `differences` كذلك.
3. **wedding**: صيغة «يُستحب للمدعو إجابة الدعوة بل هي واجبة عند الجمهور ما لم يكن فيها منكر» — مأخوذة من ملخص الحكم؛ أرجو التأكد أنها لا توهم التناقض.
4. **neighbor_funeral**: الجملة عن الاستغفار (التوبة 113) صيغت بلطف: «الاستغفار بعد الموت خاص بمن مات مسلماً». هل الصياغة دقيقة ولائقة لقارئ مسيحي في سياق حزن؟
5. **alcohol_job**: ذُكر أن بيع الخنزير «داخل في الحكم نفسه» استناداً إلى البخاري 2236 الموجود في الحكم؛ أرجو التأكد أن ملف الحكم يعالج الخنزير بالدرجة نفسها (الحكم يركز على الخمر).
6. **mixed_social**: «يضع كثير من المسلمين يدهم على صدورهم تحية بدلاً منها» وصف لعادة اجتماعية لا حكم؛ وذُكر أن المصافحة محرّمة «للمرأة الأجنبية الشابة» مع استثناءات، تبعاً لملخص الحكم.
7. **retirement_401k**: عبارة «السهم ملكية لجزء من تجارة حقيقية يشارك صاحبه في ربحها وخسارتها» تعليل شائع عند المعاصرين لكنه غير منصوص في ملف الحكم.
8. **cheating**: الجملة الأخيرة («أن تدل الشهادة على علم حقيقي يعتمد عليه الناس») تعليل من المحرر.

### 4.2 للمراجع المطّلع على المسيحية
1. **دقة وصف المواقف المسيحية** (انظر 2.3): الفائدة وتطور موقف الكنائس، شريعة الأطعمة، الخمر، القمار (UMC وCCC 2413 مؤكدان)، السحوبات الخيرية في الأبرشيات الكاثوليكية، الزواج سرّاً/عهداً، الصلاة على الميت، إعلانات الزواج (banns)، «قاعدة بيلي غراهام».
2. **ملاءمة السياق** لبعض الآيات:
   - خروج 23: 8 — KJV تقول «gift» وفاندايك «رشوة»، والسياق قضائي (القضاء والشهادة). استُعملت في `work.honesty_gifts` لأن المسألة هدية بسبب المنصب؛ أرجو الحكم على مناسبتها.
   - حبقوق 2: 15 — سياقها ويل لمن يُسكر صاحبه لينظر عورته (سياق نبوي عن بابل)؛ استُعملت في `work.alcohol_pork_job` بمعنى «الإعانة على السكر». قد يراها المراجع بعيدة السياق؛ البديل حذفها وترك `bible: []` للحكم.
   - أعمال 15: 29 — تُفهم عند أغلب الكنائس الغربية تدبيراً مؤقتاً (ذُكر ذلك في `differences`).
   - مزمور 107: 1 في `public_events.holiday_greetings` مرتبط بعيد الشكر (الشكر لله)، ورومية 12: 18 بالمسالمة؛ التلاقي هنا قيمي عام لا في مسألة التهنئة نفسها.
   - أمثال 13: 11 وعبرانيين 13: 5 في اليانصيب، و2 كورنثوس 9: 7 في السحب الخيري: لا يوجد نص كتابي صريح في القمار، وهذا مذكور في `summary` صراحة.
   - متى 5: 28 وأيوب 31: 1 في `school.mixed_social`: التلاقي في غض البصر، لا في أحكام المصافحة والخلوة.
3. **النبرة**: النصوص تتجنب التفضيل والمناظرة؛ أرجو قراءة `differences` في `holiday_greetings` و`neighbor_funeral` خصوصاً بعين مسيحية.

### 4.3 قرارات تحريرية ونقاط تقنية
1. **لاويين 25: 37 أُسقطت عمداً** رغم التحقق منها: فاندايك تترجمها «وطعامك لا تعطِ بالمرابحة»، و«المرابحة» في اللعبة اسم عقد التمويل الإسلامي **الحلال** في `home.mortgage`؛ وضعها بجانب أحكام الربا قد يربك القارئ. بقيت في جدول `verses` بعلامة `used: false`.
2. **علامات التنصيص في فاندايك**: نص getbible يحمل علامات تنصيص الفقرة كما هي («...) فقد تبدأ آية بـ« دون إغلاق أو تنتهي بـ» دون فتح (مثل تثنية 23: 19، أعمال 15: 29، حبقوق 2: 15، أيوب 31: 1، أعمال 20: 35). أبقيتها حرفياً؛ يمكن للمحرك حذف العلامة غير المتوازنة عند العرض إن رأى الفريق ذلك (لا يمس الكلمات).
3. **آيات تنتهي بجملة ناقصة** (KJV تنتهي بفاصلة أو نقطتين لأن الجملة تكمل في الآية التالية): تثنية 23: 19 (تكملها 23: 20 التي تجيز الربا من الأجنبي — مذكورة في `differences`)، كولوسي 3: 9، لاويين 25: 14، أفسس 5: 18، لوقا 14: 13. هذا هو النص الحرفي.
4. **اقتراح للمحرك** (`src/engine/ui/rulingCard.js`، ليس من ملفاتي): دالة `bibleBlock` تعرض `source_url` دائماً، فعند عرض النص العربي يشير الرابط إلى مصدر KJV. اقتراح: استعمال `b.source_url_ar` حين `textLang === 'ar'`.
5. **نتيجة `npm test`**: 177 نجاح / 1 فشل — `tests/safety.test.mjs:169` («abstention: a citation with no verified text shows "not provided"…»): الاختبار ينسخ `rulings[0]` (home.mortgage) ويتوقع أن عدد `blockquote` = 0 و`figure` = 2، لكن البطاقة صارت تعرض آيتين كتابيتين داخل `figure.bible-verse > blockquote`. الفشل سببه افتراض في الاختبار لا خلل في البيانات؛ الإصلاح المقترح لمالك الاختبار: حذف `r.common_ground` من النسخة في هذا الاختبار، أو حصر العد في كتل القرآن والحديث. (لم أعدّل الاختبار.)

## 5. الأحكام بلا تلاقٍ كتابي
لا يوجد حكم بـ `bible: []`. لكن التلاقي **ضعيف/قيمي عام** (لا نص صريح في المسألة نفسها) في: `street.lottery`، `public_events.raffle`، `public_events.holiday_greetings`، وإلى حد ما `work.alcohol_pork_job` (حبقوق 2: 15) — وقد صُرّح بذلك في `summary` لكل منها. إن رأى المراجع أن أياً منها متكلف، فالحل حذف المرجع من `common_ground_data.json` → `rulings[id].common_ground.bible` وإعادة تشغيل السكربت.
