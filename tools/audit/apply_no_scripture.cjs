// Project-owner decision 2026-10-06: remove every Bible/Torah/Gospel text and reference from the project.
// Rewrites common_ground {summary, differences} for all 18 rulings in tools/audit/common_ground_data.json as short,
// general statements of shared values and differences (no quotations, no book/chapter/verse, no "the Bible says"),
// deletes the verses table and Bible metadata, then the caller runs apply_common_ground.cjs.
// Idempotent. Every text is checked with scripture_guard.cjs before writing.
const fs = require('fs');
const path = require('path');
const { findScripture } = require('./scripture_guard.cjs');
const F = path.join(__dirname, 'common_ground_data.json');
const d = JSON.parse(fs.readFileSync(F, 'utf8'));

const CG = {
  'home.mortgage': {
    summary: {
      ar: 'يشترك التقليدان في النظر إلى إقراض المحتاج على أنه باب رحمة لا باب تكسّب؛ فقد ظلت الكنيسة قروناً طويلة تدين الربا والإقراض بفائدة، ولا سيما إقراض الفقير.',
      en: 'Both traditions see lending to someone in need as an act of mercy rather than a business opportunity; for many centuries the Church condemned usury and lending at interest, especially to the poor.',
    },
    differences: {
      ar: 'مع الزمن قبلت أغلب الكنائس الفائدة المعتدلة في الإقراض التجاري وصارت تقصر وصف الربا على الفائدة الفاحشة أو الاستغلالية، فأغلب المسيحيين اليوم يرون القرض العقاري العادي مشروعاً، بينما يعدّ جمهور علماء المسلمين كل زيادة مشروطة على القرض ربا.',
      en: 'Over time most churches came to accept moderate interest in commercial lending and reserved the word usury for excessive or exploitative rates, so most Christians today see an ordinary mortgage as legitimate, whereas mainstream Islamic scholarship treats any stipulated increase on a loan as riba.',
    },
  },
  'home.food_ingredients': {
    summary: {
      ar: 'أحكام الطعام ليست غريبة على التقاليد الإبراهيمية: فالشريعة اليهودية تحرّم الخنزير، وبعض الجماعات المسيحية ما زالت تتجنبه وتتجنب الدم. والإسلام من جهته يبيح طعام أهل الكتاب، وهذا جسر حقيقي على مائدة الأسرة.',
      en: 'Food rules are not foreign to the Abrahamic traditions: Jewish dietary law forbids pork, and some Christian communities still avoid pork and blood. Islam, for its part, treats the food of Christians as lawful, which is a real bridge at the family table.',
    },
    differences: {
      ar: 'يرى أغلب المسيحيين أن أحكام الأطعمة القديمة لم تعد ملزمة لهم، مع أن بعض الجماعات كالسبتيين (الأدفنتست) والكنيسة الأرثوذكسية الإثيوبية ما زالت تتجنب الخنزير. كما يبيح أغلب المسيحيين الشرب المعتدل، بينما يحرّم الإسلام الخمر قليلها وكثيرها.',
      en: 'Most Christians consider the ancient food laws no longer binding on them, though some communities such as Seventh-day Adventists and the Ethiopian Orthodox Church still avoid pork. Most Christians also allow moderate drinking, whereas Islam forbids alcohol in any amount.',
    },
  },
  'home.credit_card': {
    summary: {
      ar: 'يحذّر التقليدان من الوقوع في الدَّين ويمدحان المبادرة إلى سداده؛ فالأخلاق المسيحية تعدّ المماطلة في ردّ الدين ظلماً، كما يعدّ الإسلام مماطلة القادر على السداد ظلماً.',
      en: 'Both traditions warn against sliding into debt and praise repaying promptly; Christian ethics counts failing to repay what one owes as a wrong, just as Islam calls a well-off debtor\'s delay an injustice.',
    },
    differences: {
      ar: 'لا يرى أغلب المسيحيين في دفع فائدة البطاقة العادية إثماً في ذاته، وإن كان كثير من المرشدين الماليين المسيحيين ينصحون بتجنب ديون الاستهلاك؛ أما في الإسلام فالإشكال في الفائدة نفسها لا في ثقل الدَّين فقط.',
      en: 'Most Christians do not consider paying ordinary card interest sinful in itself, though many Christian financial teachers urge avoiding consumer debt; in Islam the problem is the interest itself, not only the burden of debt.',
    },
  },
  'work.alcohol_pork_job': {
    summary: {
      ar: 'تعلّم الأخلاق المسيحية أيضاً أن يراعي الإنسان أثر عمله في غيره ولا يعينه على ما يضره، ولذلك يتفهم كثير من المسيحيين زميلاً يعتذر عن عمل بدافع الضمير.',
      en: 'Christian ethics also teaches caring about how one\'s actions affect others and not helping them toward harm, so many Christians readily understand a coworker who steps back from a task out of conscience.',
    },
    differences: {
      ar: 'تبيح أغلب التقاليد المسيحية الشرب المعتدل ولا ترى إثماً في تقديم الخمر أو لحم الخنزير، والخمر تُستعمل في سرّ العشاء الرباني، مع أن بعض الطوائف تدعو إلى الامتناع التام. أما الإسلام فيمتد تحريمه إلى سلسلة التقديم والبيع كلها لا إلى السُّكر وحده.',
      en: 'Most Christian traditions permit moderate drinking and see no sin in serving alcohol or pork, and wine is used in Holy Communion, though some denominations encourage total abstinence. Islam\'s prohibition extends to the whole chain of serving and selling, not only to drunkenness.',
    },
  },
  'work.retirement_401k': {
    summary: {
      ar: 'الاستثمار وفق القيم مألوف لكثير من المسيحيين أيضاً: فكنائس وصناديق مسيحية كثيرة تستبعد قطاعات كالقمار والخمور والتبغ، وقد عدّ التقليد المسيحي الربا قروناً خطأً أخلاقياً.',
      en: 'Values-based investing is familiar to many Christians too: many churches and Christian funds screen out industries such as gambling, alcohol or tobacco, and for centuries Christian tradition treated usury as a moral wrong.',
    },
    differences: {
      ar: 'يرى أغلب المسيحيين اليوم السندات والمدخرات ذات الفائدة مشروعة، فالحدّ الذي يرسمه الإسلام عند صناديق الفائدة لا نظير له غالباً في الممارسة المسيحية المعاصرة.',
      en: 'Most Christians today regard bonds and interest-bearing savings as legitimate, so the line Islam draws at interest-bearing funds usually has no counterpart in contemporary Christian practice.',
    },
  },
  'work.honesty_gifts': {
    summary: {
      ar: 'الأمانة في العمل أرض مشتركة واسعة: فالأخلاق المسيحية أيضاً تدين الرشوة لأنها تفسد الحكم، وتقدّر الأمانة في الأمور الصغيرة والكبيرة.',
      en: 'Honesty at work is wide common ground: Christian ethics also condemns bribery because it corrupts judgment, and values faithfulness in small and great matters alike.',
    },
    differences: {
      ar: 'لا فرق جوهري في المبدأ. وإنما فصّل الفقه الإسلامي، استناداً إلى حديث ابن اللتبية، أن ما يُهدى للموظف بسبب منصبه يعود لجهة العمل، بينما يتبع المسيحيون عادة المبادئ الأخلاقية العامة وسياسة جهة العمل.',
      en: 'There is no real difference in principle. Islamic law, based on the hadith of Ibn al-Lutbiyya, spells out that a gift received because of one\'s post belongs to the employer, while Christians usually follow general ethical principles together with their employer\'s policy.',
    },
  },
  'school.cheating': {
    summary: {
      ar: 'اتفاق تام: فالأخلاق المسيحية أيضاً تدين الكذب والخداع، والأمانة الأكاديمية قيمة يشترك فيها آدم وأصدقاؤه المسلمون كاملة.',
      en: 'Complete agreement: Christian ethics also condemns lying and deception, and academic honesty is a value Adam and his Muslim friends fully share.',
    },
    differences: { ar: 'لا يوجد فرق يُذكر في هذه المسألة.', en: 'There is no meaningful difference on this issue.' },
  },
  'school.student_loan': {
    summary: {
      ar: 'دان التقليد المسيحي طويلاً أخذ الفائدة من الفقير، وكثير من المسيحيين اليوم يشاركون القلق على الطلاب المثقلين بالديون.',
      en: 'Christian tradition long condemned taking interest from the poor, and many Christians today share the concern about students weighed down by debt.',
    },
    differences: {
      ar: 'لا يرى أغلب المسيحيين اليوم الاقتراض بفائدة إثماً في ذاته، وإن حذّر كثير من المرشدين المسيحيين من الديون الثقيلة؛ أما في الإسلام فالإشكال في الفائدة نفسها ولو كان الدَّين محتملاً.',
      en: 'Most Christians today do not see borrowing at interest as sinful in itself, though many Christian advisers warn against heavy debt; in Islam the issue is the interest itself, even when the debt is manageable.',
    },
  },
  'school.mixed_social': {
    summary: {
      ar: 'حفظ العين والقلب أرض مشتركة: فالأخلاق المسيحية أيضاً تعدّ النظر بشهوة خطأً أخلاقياً، وبعض المسيحيين يتجنبون الانفراد بغير الزوج أو الزوجة من الجنس الآخر (ما يُعرف بقاعدة بيلي غراهام).',
      en: 'Guarding the eyes and the heart is shared ground: Christian ethics also treats lustful looking as a moral wrong, and some Christians avoid being alone with someone of the opposite sex other than their spouse (often called the Billy Graham rule).',
    },
    differences: {
      ar: 'يرى أغلب المسيحيين المصافحة مجاملة عادية لا إشكال دينياً فيها، والاختلاط الاجتماعي عندهم غير مقيّد في الغالب؛ أما أحكام الإسلام في اللمس والخلوة فأكثر تحديداً، ويكفي آدم أن يتبع ما يرتاح له صديقه.',
      en: 'Most Christians see a handshake as ordinary courtesy with no religious issue, and mixed social settings are generally unrestricted; Islam\'s rules on touch and seclusion are more specific, and Adam can simply follow his friend\'s lead.',
    },
  },
  'street.lost_wallet': {
    summary: {
      ar: 'من أوضح نقاط التلاقي: فالأخلاق اليهودية والمسيحية أيضاً تأمر بحفظ مال الآخرين الضائع وردّه إلى صاحبه وعدم التغاضي عنه، وهو قريب جداً من تعليم الإسلام بأن اللقطة أمانة تُردّ متى جاء صاحبها.',
      en: 'One of the clearest meeting points: Jewish and Christian ethics also teach keeping a neighbour\'s lost property safe, returning it to its owner and not looking away — very close to Islam\'s teaching that a found item is a trust to be returned whenever its owner comes.',
    },
    differences: {
      ar: 'الفرق في التفاصيل فقط: فالفقه الإسلامي يحدد مدة للتعريف (سنة عند الجمهور) وأحكاماً لما بعدها، بينما تكتفي الأخلاق المسيحية بالمبدأ العام؛ واليوم يسلّم المسيحيون والمسلمون في أمريكا مثل هذه المفقودات للشرطة غالباً.',
      en: 'The difference is only in detail: Islamic law sets an announcement period (a year for the majority) and rules for what follows, while Christian ethics gives the general principle; today Christians and Muslims in the US alike usually hand such items to the police.',
    },
  },
  'street.lottery': {
    summary: {
      ar: 'تحذّر الأخلاق المسيحية من الطمع ومحبة المال، وتقدّر الكسب بالعمل الشريف، ولهذه المعاني تحذّر كنائس كثيرة من القمار.',
      en: 'Christian ethics warns against greed and the love of money and values wealth earned by honest work, and many churches discourage gambling for these reasons.',
    },
    differences: {
      ar: 'تتنوع المواقف المسيحية: فالكنيسة الميثودية المتحدة مثلاً ترى القمار مضراً بالمجتمع وتدعو إلى الامتناع عنه بما فيه اليانصيب العام، بينما يقرر التعليم الكاثوليكي أن ألعاب الحظ ليست ظلماً في ذاتها ما لم تحرم الإنسان مما يحتاجه هو وغيره؛ أما الإسلام فيحرّمها مطلقاً.',
      en: 'Christian views vary: the United Methodist Church, for example, regards gambling as harmful to society and urges abstaining from it, including public lotteries, while Catholic teaching holds that games of chance are not unjust in themselves unless they deprive someone of what he and others need; Islam forbids them outright.',
    },
  },
  'street.buying_selling': {
    summary: {
      ar: 'تلاقٍ قوي: فالأخلاق اليهودية والمسيحية أيضاً تحرّم الغش في البيع والشراء والتطفيف في الموازين وشهادة الزور، وهذا يشمل التقييمات الكاذبة كما يشملها التعليم الإسلامي.',
      en: 'Strong common ground: Jewish and Christian ethics also forbid cheating in buying and selling, dishonest measures and false testimony, which covers fake reviews just as Islamic teaching does.',
    },
    differences: {
      ar: 'لا فرق يُذكر في المبدأ؛ ويضيف الفقه الإسلامي قواعد تفصيلية كخيار العيب الذي يعطي المشتري حق الرد.',
      en: 'No meaningful difference in principle; Islamic law adds detailed rules such as the buyer\'s option to return an item for a hidden defect.',
    },
  },
  'public_events.holiday_greetings': {
    summary: {
      ar: 'يدعو التقليدان إلى مسالمة جميع الناس وإلى شكر الله على نعمه؛ والصديق المسلم الذي يعتذر عن الجانب الديني من العيد ثم يقدّم تمنياته الطيبة أو هديته يتصرف بالاحترام نفسه للإيمان الذي يعرفه المسيحيون المتدينون.',
      en: 'Both traditions call for living peaceably with all people and for giving thanks to God; a Muslim friend who sits out the religious part of a holiday yet offers warm wishes or a gift is acting from the same respect for faith that devout Christians recognise.',
    },
    differences: {
      ar: 'يحتفل المسيحيون في عيد الميلاد بتجسّد المسيح وميلاده بوصفه ابن الله، أما المسلمون فيكرمون عيسى نبياً ومسيحاً وُلد من مريم العذراء ولا يعتقدون ألوهيته. واحتراماً للإيمانين تعرض اللعبة المسلمين وهم يتبادلون اللطف والهدايا دون المشاركة في العبادة، لا على سبيل المناظرة.',
      en: 'At Christmas, Christians celebrate the incarnation and birth of Jesus as the Son of God; Muslims honour Jesus as a prophet and the Messiah born of the Virgin Mary but do not believe he is divine. Out of respect for both faiths, the game shows Muslims sharing kindness and gifts without joining worship, not as a matter for debate.',
    },
  },
  'public_events.alcohol_table': {
    summary: {
      ar: 'تحذّر الأخلاق المسيحية أيضاً من السُّكر، ويرى كثير من المسيحيين أن من الحسن ترك الشرب مراعاةً لضمير صديق — وهو مبدأ يستطيع آدم أن يطبّقه حين يجلس مع صديقه المسلم على طاولة بلا خمر.',
      en: 'Christian ethics also warns against drunkenness, and many Christians hold that it is good to forgo a drink out of consideration for a friend\'s conscience — a principle Adam can live out by joining his Muslim friend at an alcohol-free table.',
    },
    differences: {
      ar: 'تبيح أغلب الكنائس الشرب المعتدل وتنهى عن السُّكر، والخمر تُستعمل في سرّ العشاء الرباني، مع أن بعض الطوائف تدعو إلى الامتناع التام؛ أما الإسلام فيحرّم الخمر قليلها وكثيرها، ولذلك يتجنب المسلم مجلس الشرب نفسه.',
      en: 'Most churches permit moderate drinking while forbidding drunkenness, and wine is used in Holy Communion, though some denominations promote total abstinence; Islam forbids alcohol in any amount, which is why a Muslim avoids the drinking table itself.',
    },
  },
  'public_events.raffle': {
    summary: {
      ar: 'يحب التقليدان العطاء الخيري لذاته ويقدّران العطاء عن طيب نفس، وهذا يوافق تفضيل الإسلام للتبرع المباشر على شراء التذكرة.',
      en: 'Both traditions love charitable giving for its own sake and value giving freely and gladly, which fits the Islamic preference for a direct donation over buying a ticket.',
    },
    differences: {
      ar: 'السحوبات الخيرية وأمسيات البنغو وسيلة شائعة لجمع التبرعات في بعض الكنائس (كثير من الأبرشيات الكاثوليكية مثلاً)، بينما تعارض كنائس أخرى كالميثودية المتحدة القمار بكل صوره؛ أما في الإسلام فالسحب المدفوع قمار مهما كانت غايته نبيلة.',
      en: 'Raffles and bingo nights are common fundraisers in some churches (many Catholic parishes, for example), while other churches such as the United Methodist Church oppose gambling in all its forms; in Islam a paid raffle is gambling however good the cause.',
    },
  },
  'private_events.wedding': {
    summary: {
      ar: 'المسيحيون أيضاً يكرّمون الزواج ويعلنونه علناً (تاريخياً بإذاعة إعلانات الزواج في الكنيسة)، ويقدّر التقليدان الكرم مع الفقراء في الولائم، وهذا قريب من ذمّ الإسلام لوليمة تُقصي الفقراء.',
      en: 'Christians too hold marriage in honour and announce it publicly (historically through the reading of banns in church), and both traditions value generosity to the poor at feasts — close to Islam\'s criticism of a wedding feast that leaves out the poor.',
    },
    differences: {
      ar: 'الزواج في كثير من التقاليد المسيحية سرّ كنسي أو عهد مقدس يُعقد في الكنيسة، أما في الإسلام فهو عقد بشهود لا يشترط أن يكون في المسجد؛ والمهر لا نظير مباشراً له في أغلب الأعراس المسيحية المعاصرة؛ والموسيقى بالآلات، الشائعة في الأعراس المسيحية، مسألة خلافية بين علماء المسلمين.',
      en: 'In many Christian traditions marriage is a sacrament or holy covenant made in church, whereas in Islam it is a contract with witnesses that need not take place in a mosque; the mahr has no direct counterpart in most modern Christian weddings; and instrumental music, common at Christian weddings, is a matter of scholarly debate in Islam.',
    },
  },
  'private_events.neighbor_funeral': {
    summary: {
      ar: 'مواساة المحزونين والوقوف مع أسرة الفقيد قيمة مشتركة عميقة في التقليدين؛ وحضور الجار المسلم يصدر عن الرحمة نفسها.',
      en: 'Comforting the bereaved and standing with a grieving family is a deeply shared value in both traditions; a Muslim neighbour who comes to pay respects is acting from that same compassion.',
    },
    differences: {
      ar: 'يصلّي كثير من المسيحيين للميت أو يستودعونه الله في الجنازة، أما الحاضر المسلم فيلتزم الاحترام والهدوء أثناء الطقوس ويدعو لأهل الفقيد لا بالمغفرة للميت. وهذا الفرق نابع من الاعتقاد، لا من نقص في المحبة أو الاحترام.',
      en: 'Many Christians pray for the deceased or commend them to God at the funeral, while a Muslim attending stays respectful and quiet during the rites and prays for the family rather than for the deceased\'s forgiveness. This difference comes from belief, not from any lack of love or respect.',
    },
  },
  'private_events.gifts_birthday': {
    summary: {
      ar: 'الكرم أرض مشتركة: ففي التقليدين معاً العطاء فضيلة، والهدية طريق إلى المحبة بين الجيران.',
      en: 'Generosity is shared ground: in both traditions giving is a virtue, and gifts are a way to build love between neighbours.',
    },
    differences: {
      ar: 'يحتفل أغلب المسيحيين بأعياد الميلاد الشخصية بلا تحفظ، أما في الإسلام فالمسألة خلافية. والصديق المسلم الذي يعتذر عن هدية فيها خمر يتبع دينه ولا يرفض صاحب الهدية.',
      en: 'Most Christians celebrate birthdays freely, while in Islam the question is debated. A Muslim friend who declines a gift of wine is following his faith, not rejecting the giver.',
    },
  },
};

const ids = Object.keys(d.rulings);
const missing = ids.filter(id => !CG[id]);
if (missing.length) throw new Error('no new common_ground for: ' + missing.join(', '));
for (const id of ids) {
  for (const part of ['summary', 'differences']) for (const lang of ['ar', 'en']) {
    const t = CG[id][part][lang];
    const hit = findScripture(t);
    if (hit) throw new Error(`${id}.${part}.${lang} still contains a scriptural reference: ${hit}`);
    if (/«|»|"/.test(t)) throw new Error(`${id}.${part}.${lang} contains a quotation mark`);
  }
  d.rulings[id].common_ground = { summary: CG[id].summary, differences: CG[id].differences };
  const ex = d.rulings[id].newcomer_explainer;
  for (const lang of ['ar', 'en']) { const h = findScripture(ex[lang]); if (h) throw new Error(`${id}.newcomer_explainer.${lang}: ${h}`); }
}
delete d.verses;
d._meta = {
  purpose: 'newcomer_explainer + common_ground {summary, differences} for each ruling. Applied by apply_common_ground.cjs.',
  policy: 'Project-owner decision 2026-10-06: no Bible/Torah/Gospel text or reference anywhere (no bible field, no book/chapter/verse, no quotations). common_ground is a short general statement of shared values and differences. Enforced by tools/audit/scripture_guard.cjs in apply_common_ground.cjs and verify.mjs.',
  review_status: 'ai_draft',
};
fs.writeFileSync(F, JSON.stringify(d, null, 2) + '\n');
console.log(`common_ground rewritten for ${ids.length} rulings; verses table removed`);
