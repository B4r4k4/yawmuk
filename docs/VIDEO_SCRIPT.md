# «يومك» Yawmuk — سيناريو الفيديو التوضيحي (دقيقتان) · 2-minute demo video script

> Hard limit: **≤ 2:00** (participant guide p. 14 and 33). Record from the live deployment at 1920×1080, Arabic UI by default; switch to English once to show bilingual support. Voice-over in Arabic with English subtitles (or the reverse). Keep the cursor slow; cut loading waits.
>
> Before recording: fresh browser profile (no saved progress), `ANTHROPIC_API_KEY` set on Netlify so the planner and Ask panel use Claude, graphics quality "high".

| Time | On screen | Voice-over (AR) | Subtitle (EN) |
|---|---|---|---|
| **0:00–0:10** | Loading screen → start screen with the title «يومك» | كيف تعرف ما يقوله الإسلام عن قرض البيت، أو حفلة العمل، أو محفظة وجدتها في الشارع؟ | How do you learn what Islam says about a mortgage, a work party, or a wallet you found? |
| **0:10–0:22** | Quick cuts: a long fatwa page, then a chatbot answer with no source (blurred mock-ups, no real brands) | الفتاوى طويلة، والمقاطع بلا مصادر، والمحادثات الآلية قد تخترع حديثاً ولا تقول لك: اسأل عالماً. | Fatwas are long, clips are unsourced, and chatbots may invent a hadith and never say "ask a scholar". |
| **0:22–0:35** | Start → AI journey planner: type "money and work"; the route appears | «يومك» لعبة ثلاثية الأبعاد في المتصفح. تبدأ بكتابة ما يهمك، فيرتّب الذكاء الاصطناعي رحلتك بين ثمانية عشر موقفاً. | Yawmuk is a browser 3D game. Say what interests you, and AI plans your route through 18 situations. |
| **0:35–0:50** | Walk through the home scene (joystick/WASD), approach Omar, dialogue appears | تعيش أسبوعاً مع آدم وجيرانه المسلمين في أوهايو. عمر يرفض قرضاً بفائدة… لماذا؟ | You spend a week with Adam and his Muslim neighbours in Ohio. Omar turns down an interest loan. Why? |
| **0:50–1:00** | Choices panel → pick the respectful question → consequence + points | تختار كيف يسأل آدم. اللعبة تكافئ السؤال المحترم الفضولي، لا الصور النمطية. | You choose how Adam asks. The game rewards respectful curiosity, not stereotypes. |
| **1:00–1:18** | Ruling card: verdict + "in plain words" → scroll to Quran (verbatim, link) → hadith (number, grade) → four madhhabs side by side | ثم بطاقة الحكم: الحكم بكلمات بسيطة، والآيات والأحاديث بنصها الحرفي الموثّق برقمها ودرجتها ورابطها، والمذاهب الأربعة جنباً إلى جنب. | Then the ruling card: plain words, verbatim verified Quran and hadith with number, grade and link, and the four madhhabs side by side. |
| **1:18–1:35** | Ask panel: ask a covered question → answer with citation chips; then ask a personal question ("my own loan…") → abstains and refers to a scholar | اسأل عن الموقف: يجيب الذكاء الاصطناعي من المصادر الموثّقة فقط، ويستشهد بها. وإن لم تغطِّ المصادر سؤالك، يمتنع ويحيلك إلى عالم. | Ask about the situation: AI answers only from verified sources, with citations. If they don't cover it, it abstains and refers you to a scholar. |
| **1:35–1:45** | Switch language to English; phone view (390×844) of the same card | بالعربية والإنجليزية، على الحاسوب والجوال، بلا حساب ولا تخزين لمعتقدك. | Arabic and English, desktop and phone, no account, nothing about your beliefs stored. |
| **1:45–1:55** | End screen: what Adam learned, next topic, mosque open-house referral; then a terminal with `npm test` passing and `npm run audit` | في النهاية: ما تعلّمته، وموضوعك التالي، ودعوة لزيارة مسجد قريب. وكل نص شرعي يُدقَّق آلياً حرفاً بحرف. | At the end: what you learned, your next topic, an invitation to a local mosque. Every scripture text is machine-checked letter by letter. |
| **1:55–2:00** | Title card: «يومك» · live URL · GitHub · "AI drafts pending scholarly review — not a fatwa" | «يومك»: تعلَّم الإسلام في يومك. | Yawmuk: learn Islam in your day. |

## Shot list (capture checklist)

- [ ] Loading + start screen (AR)
- [ ] Planner input + returned route (AI on); optional second take with `?arm=fixed`
- [ ] Home scene walk, Omar dialogue, choices, consequence
- [ ] Ruling card: top, Quran, hadith, madhhabs
- [ ] Ask panel: covered question (with citations) and a personal question (abstain + refer)
- [ ] Language switch to EN; phone viewport (DevTools 390×844 or a real phone)
- [ ] End screen with mosque referral
- [ ] Terminal: `npm test` summary and `npm run audit` (sped up)
- [ ] Closing card with `{{LIVE_URL}}`, github.com/B4r4k4/yawmuk and the review disclaimer

## Notes

- Do not show any real person's data, API keys, the Netlify dashboard environment page, or browser bookmarks.
- Keep the disclaimer visible at the end: the rulings are AI-prepared drafts **pending scholarly review**; the game is an educational tool, not a fatwa.
- Music: none, or a CC0 instrumental track (credit it in the README if used).
