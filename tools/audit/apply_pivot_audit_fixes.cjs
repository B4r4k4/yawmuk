// Pivot audit (2026-10-05): confirmed corrections to newcomer_explainer / common_ground.
// Edits tools/audit/common_ground_data.json (the source of truth for those two fields), then
// run: node tools/audit/apply_common_ground.cjs   to push them into content/rulings/*.json.
// Every replacement asserts that its "from" text is present (or that the fix is already applied).
const fs = require('fs');
const path = require('path');
const F = path.join(__dirname, 'common_ground_data.json');
const d = JSON.parse(fs.readFileSync(F, 'utf8'));
const fix = (id, field, lang, from, to) => {
  const o = field === 'explainer' ? d.rulings[id].newcomer_explainer : d.rulings[id].common_ground[field];
  if (o[lang].includes(to)) return 'already';
  if (!o[lang].includes(from)) throw new Error(`${id}.${field}.${lang}: text not found: ${from.slice(0, 40)}`);
  o[lang] = o[lang].replace(from, to);
  return 'fixed';
};
const log = [];
// 1. credit_card: "Islam allows using a card" overstated a disputed point (IIFA 108 forbids an interest-conditioned card).
log.push(fix('home.credit_card', 'explainer', 'ar',
  'يجيز الإسلام استعمال البطاقة أو خدمة «اشترِ الآن وادفع لاحقاً» للتيسير، لكن',
  'الشراء بالتقسيط بلا فائدة جائز في الإسلام، وبطاقة الخصم (debit) لا إشكال فيها، لكن'));
log.push(fix('home.credit_card', 'explainer', 'en',
  "Islam allows using a card or a 'buy now, pay later' plan for convenience, but",
  'Buying in interest-free instalments is permissible in Islam and a debit card raises no issue, but'));
// 2. lost_wallet: the ruling says what happens after the year differs among the schools.
log.push(fix('street.lost_wallet', 'explainer', 'ar',
  'مع ضمانها لصاحبها إن ظهر يوماً.',
  'مع ضمانها لصاحبها إن ظهر يوماً، على تفصيل بين المذاهب.'));
log.push(fix('street.lost_wallet', 'explainer', 'en',
  'while still owing it to the owner if he ever appears.',
  'while still owing it to the owner if he ever appears, with details differing among the schools.'));
// 3. alcohol_table: the hasan grading belongs to Tirmidhi 2801; Abu Dawud himself called his own narration 3774 munkar.
log.push(fix('public_events.alcohol_table', 'explainer', 'ar',
  '(أبو داود 3774، ورواه الترمذي وحسّنه، مع كلام لبعض العلماء في إسناده)',
  '(الترمذي 2801 وحسّنه هو والألباني، مع كلام لبعض العلماء في إسناده؛ وله شاهد عند أبي داود 3774 مختلف فيه)'));
log.push(fix('public_events.alcohol_table', 'explainer', 'en',
  '(Abu Dawud 3774; also reported by al-Tirmidhi, who graded it hasan, though some scholars discuss its chain)',
  '(Tirmidhi 2801, graded hasan by al-Tirmidhi and al-Albani, though some scholars discuss its chain; a similar report in Abu Dawud 3774 is disputed)'));
// 4. wedding AR/EN mismatch ("recommended, rather obligatory") -> as in the ruling summary.
log.push(fix('private_events.wedding', 'explainer', 'ar',
  'ويُستحب للمدعو إجابة الدعوة بل هي واجبة عند الجمهور ما لم يكن فيها منكر',
  'وإجابة دعوتها واجبة عند الجمهور ما لم يكن فيها منكر لا يُقدر على تغييره'));
log.push(fix('private_events.wedding', 'explainer', 'en',
  'unless it involves wrongdoing.',
  'unless it involves wrongdoing one cannot change.'));
// 5. food_ingredients AR addressed the player ("your friends") while EN says "Adam's Muslim friends".
log.push(fix('home.food_ingredients', 'explainer', 'ar',
  'فقد تختلف اختيارات أصدقائك المسلمين',
  'فقد تختلف اختيارات أصدقاء آدم المسلمين'));
// 6. lottery: the ruling now distinguishes promotional "free bets" in betting apps from free sweepstakes.
log.push(fix('street.lottery', 'explainer', 'ar',
  'أما المسابقات المجانية التي لا يدفع فيها المشارك شيئاً فليست قماراً.',
  'أما المسابقات المجانية التي لا يدفع فيها المشارك شيئاً فليست قماراً، بخلاف «الرهان المجاني» في تطبيقات المراهنات، فهو رهان على نتيجة مباراة داخل منصة قمار، ولذلك يتجنبه المسلمون.'));
log.push(fix('street.lottery', 'explainer', 'en',
  'A free sweepstakes that requires no payment is not gambling.',
  'A free sweepstakes that requires no payment is not gambling, unlike a promotional "free bet" in a betting app, which is still a wager on a game inside a gambling platform, so Muslims avoid it.'));
fs.writeFileSync(F, JSON.stringify(d, null, 2) + '\n');
console.log(log.join(' '));
