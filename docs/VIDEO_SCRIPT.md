# «يومك» Yawmuk: demo video shot list (≤ 115 seconds) · سيناريو الفيديو

> **Hard limit: 2:00** (participant guide). We aim for **1:55 (115 s)** to leave a margin. Record from the **live Cloud Run deployment** at 1920×1080 in Chrome, with the Arabic UI by default and English subtitles. Use one Arabic voice-over. Cut every loading wait. Keep the cursor slow.
>
> **Before recording:** use a fresh browser profile (no saved progress). Check that `ANTHROPIC_API_KEY` is live (the guide answers with "AI answer from reviewed material"). Allow microphone access for the site. Set graphics to "high". Log into `/experts` in a **second tab**, and never show the passcode on screen. Submit nothing personal.
>
> **Honesty rules for the edit:** every screen is a real capture of the live build, with no mock-ups of our own product. Do not speed up AI answers without a visible "⏩" mark. Do not show numbers on `/results.html` unless they are real (it may say "insufficient data", which is fine to show). Keep the closing disclaimer.

| # | Time | Seconds | On screen (exact action) | Voice-over (AR) | Subtitle (EN) |
|---|---|---|---|---|---|
| 1 | 0:00–0:08 | 8 | Logo → `?scene=town&nointro=1`: Adam walks out of his house into the neighbourhood; doors labelled Mosque, Bank, School, Work. | «يومك»: يومٌ واحد في حيٍّ واحد، تخرج فيه من بيتك إلى عملك ومدرستك ومسجدك. | Yawmuk: one day, one neighbourhood: from your home to work, school and the mosque. |
| 2 | 0:08–0:22 | 14 | Walk into the mosque. The HUD prayer widget counts down; press **E** at the prayer board → the day's five times → «استماع للأذان / Play the adhan». (If a real prayer time falls during recording, capture the automatic adhan banner instead.) | مواقيت الصلاة تُحسب على جهازك، ويُرفع الأذان في وقته. | Prayer times are computed on your device, and the adhan plays on time. |
| 3 | 0:22–0:34 | 12 | Press **E** at the Quran stand → Al-Fatiha with translation of meanings; tap an ayah; recitation plays; zoom on the source line (KFGQPC / quranenc.com). | المصحف المرتّل مع ترجمة المعاني، والنص من مجمع الملك فهد، ولا يُكتب منه حرفٌ بالذكاء الاصطناعي. | Recited Quran with translation of meanings; the text is from the King Fahd Complex, and AI writes none of it. |
| 4 | 0:34–0:44 | 10 | Walk to the bank → **E** at the advisor desk → murabaha card, then the zakat calculator with typed amounts. | وفي البنك: عقود التمويل الإسلامي، كل قول منسوب إلى جهته، وحاسبة للزكاة. | At the bank: Islamic finance contracts, each position attributed, and a zakat calculator. |
| 5 | 0:44–0:58 | 14 | `?scene=home`: Omar declines an interest loan → Adam's choice → **ruling card**: plain words, verbatim Quran with link, hadith with number + grade, four madhhabs. | كل موقف ينتهي ببطاقة حكم: آيات وأحاديث بنصها الموثّق ورقمها ودرجتها، والمذاهب الأربعة جنباً إلى جنب. | Each situation ends with a ruling card: verified Quran and hadith with number and grade, and the four madhhabs side by side. |
| 6 | 0:58–1:14 | 16 | Press **؟ Ask** → 🎤 and say aloud *"لماذا يتجنب المسلمون الفائدة؟"* → the transcript appears → the answer with its cited passages, read aloud by the browser. | اسأل بصوتك. يجيب المرشد من المصادر المراجَعة وحدها، ويُريك ما اعتمد عليه. | Ask by voice. The guide answers only from reviewed sources and shows what it relied on. |
| 7 | 1:14–1:26 | 12 | Type *"My wife and I want to take a mortgage in Ohio, is it okay for us?"* → no AI answer → fixed referral → **«Ask a scholar»** → submit → ticket code. | أما سؤالك عن حالتك الخاصة فلا يُفتي فيه الذكاء الاصطناعي، بل يُحال إلى أهل العلم. | A question about your own case is never answered by AI. It goes to qualified scholars. |
| 8 | 1:26–1:40 | 14 | Second tab `/experts`: the question arrives with level د and related cards → the scholar writes an answer with a source → Save → back in the game, the ticket shows the answer and the reviewer's name. | في لوحة المراجعة يجيب العالم بنفسه ومع المصدر، ويعود الجواب إلى السائل. | In the review dashboard a scholar answers, with sources, and the answer returns to the player. |
| 9 | 1:40–1:48 | 8 | `/results.html` (real live aggregates or "insufficient data"), then a terminal flash of `npm test` passing. | ونقيس الأثر بتجربة اختيارية قبل اللعب وبعده، ونختبر كل حالة حرجة آلياً. | We measure the benefit with an opt-in pre/post study and test every critical case automatically. |
| 10 | 1:48–1:55 | 7 | Closing card: logo · {{LIVE_URL}} · github.com/B4r4k4/yawmuk · *"AI-prepared drafts pending scholarly review. Not a fatwa."* | «يومك»: تعرَّف على الإسلام في يومك. | Yawmuk: discover Islam in your day. |
| | **Total** | **115** | | | |

## Capture checklist

- [ ] Town walk-out from the house (AR UI)
- [ ] Mosque: prayer widget + prayer board + adhan ("Play the adhan", or the automatic banner at a real prayer time) + Quran panel (ayah tap + recitation + source line)
- [ ] Bank: advisor card + zakat calculator
- [ ] Home: dialogue → choice → ruling card (Quran, hadith, madhhabs)
- [ ] Voice question (microphone indicator visible), answer with cited passages
- [ ] Personal question → referral → «Ask a scholar» submit → ticket
- [ ] `/experts` (passcode **off-screen**): question with level د → answer with source → ticket shows answer
- [ ] `/results.html` and `npm test` summary
- [ ] Closing card with the disclaimer

## Notes

- Do not show API keys, the Cloud Run console, the Secret Manager page, the dashboard passcode, browser bookmarks or anyone's personal data.
- Music: none, or a CC0 instrumental credited in the README. Do not put music under the adhan or the Quran recitation.
- If a live AI call is slow on the day, re-take it. Do not fake it. If the provider is down, the game's fallback (the reviewed passage shown verbatim) is an honest alternative take.
