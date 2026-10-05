# Research notes: home + work rulings (6 situations)

Files: `content/rulings/home.json` (home.mortgage, home.food_ingredients, home.credit_card) and `content/rulings/work.json` (work.alcohol_pork_job, work.retirement_401k, work.honesty_gifts). Every entry has `review_status: "ai_draft"`.

## Method

1. **Quran.** The Uthmani text (Tanzil) and the Sahih International translation were pulled by script from `api.alquran.cloud/v1/ayah/{s}:{a}/editions/quran-uthmani,en.sahih`. They were inserted into the JSON automatically, never typed by hand. `source_url` points to quran.com. Two things were removed from the start of the text: the basmala that the API adds before the first ayah of al-Mutaffifin, and the hizb sign ۞.
2. **Hadith.** sunnah.com and dorar.net block direct fetching (Cloudflare/403). I worked around this as follows:
   - I downloaded the full Arabic and English editions (Bukhari, Muslim, Abu Dawud, Tirmidhi, Ibn Majah) from the open project `fawazahmed0/hadith-api` (jsDelivr), which is sourced from sunnah.com.
   - The matn is cut out by script, using start and end anchor phrases inside the original text, so it is verbatim. The isnad is dropped and the vowel marks are kept.
   - Numbers: Bukhari, Abu Dawud and Tirmidhi follow the standard numbering. For Muslim, the API's sequential numbering differs, so I checked the Fuad Abd al-Baqi number with web searches against the in-book reference (1598 = 22/132, 1832, 1833a, 101).
   - Grades for non-Sahihayn hadith come from the API data (Albani, Arna'ut, Zubair Ali Zai) and from the dorar.net API (`dorar_api.json`), e.g. Arna'ut on Abu Dawud 3674: "صحيح بطرقه وشواهده".
3. **Madhhabs.** I quoted a madhhab only after seeing its text in a source I opened, or in a fatwa that quotes it with a volume and page. Where neither was available, the reference field says so explicitly. For contemporary questions (cards, 401k), the field states "no text in the school" and gives the underlying principle.
4. **Contemporary bodies.** Most IIFA resolutions were read from the official English site iifa-aifi.org (63, 95 and 210 in full text; 10, 50, 51, 136 and 40-41 via summaries of the official page). AMJA resolutions and fatwas were read on amjaonline.org, including the full PDF of the food conference decisions.
5. **Nothing from memory.** Any claim I could not verify was either left out or recorded in `notes_for_reviewer`.

## Sources actually opened (or whose content was retrieved)

**Quran / hadith data**
- https://api.alquran.cloud (Tanzil Uthmani + en.sahih): 2:188, 2:275, 2:278, 2:279, 3:161, 4:29, 4:58, 5:2, 5:3, 5:5, 5:90, 6:119, 6:121, 83:1-3
- https://cdn.jsdelivr.net/gh/fawazahmed0/hadith-api@1/editions/ (ara/eng: bukhari, muslim, abudawud, tirmidhi, ibnmajah)
- https://dorar.net/dorar_api.json (grades for the riba curse, the wine curse and the Buraida hadith)

**IIFA (International Islamic Fiqh Academy)**
- 10 (10/2): https://iifa-aifi.org/en/32234.html (via search summary)
- 45 (7/5), deferral: https://iifa-aifi.org/en/32344.html
- 50 (1/6): https://iifa-aifi.org/en/32395.html
- 51 (2/6): https://iifa-aifi.org/en/32398.html
- 40-41 (2/5, 3/5): https://iifa-aifi.org/en/32332.html (search summary)
- 136 (2/15): https://iifa-aifi.org/en/32878.html (search summary)
- 63 (1/7), full text: https://iifa-aifi.org/en/32438.html
- 77 (8/8) and 87 (4/9), deferrals: https://iifa-aifi.org/en/32481.html, https://iifa-aifi.org/en/32514.html
- 95 (3/10), full text: https://iifa-aifi.org/en/32542.html
- 210 (6/22), full text: https://iifa-aifi.org/en/33099.html
- 108 (2/12), via quotation: https://islamqa.info/ar/97530

**AMJA**
- https://www.amjaonline.org/amja-resident-fatwa-committee-resolution-about-islamic-home-financing-companies-in-the-us/
- https://www.amjaonline.org/wp-content/uploads/2019/04/AMJA-13th-Annual-Conference-Final-Decisions-Food-and-Medicine-In-The-West-En.pdf (full text)
- https://www.amjaonline.org/fatwa/en/80196/are-credit-cards-haram
- https://www.amjaonline.org/fatwa/en/1871/investment-in-401k
- https://www.amjaonline.org/fatwa/en/1774/halal-mutual-funds-and-401k

**ECFR and others**
- https://fiqh.islamonline.net/en/purchasing-houses-with-usurious-loans-in-the-west/ (ECFR, Dublin 1999; session date from search results)
- https://fiqh.islamonline.net/en/buying-a-house-through-mortgage (Monzer Kahf, Detroit 1999)
- https://en.wikipedia.org/wiki/Fiqh_Council_of_North_America (no mention of mortgages)
- https://www.aliftaa.jo/decision-en/314/... (Jordanian Ifta Board resolution 128, gelatin)
- https://www.aliftaa.jo/en-fatwas/2037/rss.aspx and https://islamqa.org/shafii/darul-iftaa-jordan/226773/... (software for liquor companies)
- https://islamqa.org/hanafi/seekersguidance-hanafi/167441/creating-websites-selling-alcohol/
- https://seekersguidance.org/answers/hanafi-fiqh/is-it-permissible-to-deliver-haram-things-to-non-muslims/ (summary only)
- https://binbaz.org.sa/fatwas/23949/ (gifts to employees)
- https://cis.aaoifi.com/ar/?p=1714 (description of AAOIFI SS 21 only; the text is members-only)

**Classical texts and encyclopedias**
- Al-Mughni, Kitab al-Ijarat (full text on Wikisource): https://ar.wikisource.org/wiki/المغني_-_كتاب_الإجارات
- Mawsu'at al-Mafahim al-Islamiyya al-'Amma, entry "Dar al-Harb": https://shamela.ws/book/433/279
- Al-Jaziri, al-Fiqh 'ala al-Madhahib al-Arba'a, vol. 2 p. 27: https://shamela.ws/book/9849/679
- Al-Qattan, Taysir al-Tafsir (al-An'am 121): https://shamela.ws/book/29/503
- https://islamqa.info/ar/ref/126056 (quotations from al-Mughni 4/47 and al-Majmu' 9/488)
- https://islamqa.org/hanafi/askimam/84171/riba-in-darul-harb/ (al-Hidaya 3/86, al-Mabsut 14/98)
- https://islamqa.org/hanafi/daruliftaa/7905 and /7755 (Takmilat Fath al-Mulhim, as quoted there)
- Fatwas from Egypt's Dar al-Ifta (13073) and islamqa.info (297486), via search summaries

## Points that need a human scholar

1. **Brewery app (work.alcohol_pork_job), for the coordinator.** The evidence does not support marking this choice as categorically prohibited. Building an app for a brewery is indirect help (i'ana) with sin, and contemporary scholars disagree:
   - The Jordanian Ifta Board (fatwa 2037) prohibits writing software for liquor companies.
   - SeekersGuidance, from a Hanafi position, allows building a platform through which someone else sells, but says it becomes more disliked the closer the work gets to direct help.
   - The classical root of the disagreement: Abu Hanifa allowed being hired to carry wine, while his two companions and the majority prohibited it (al-Mughni).
   
   Suggestion: make declining the job "best", and make accepting it either "acceptable" with a consequence that explains the disagreement, or keep it "wrong" but reword it to "most scholars hold it prohibited, and avoiding it is safer". Serving, pouring and delivering alcohol stay "wrong" without hesitation.
2. **Hanafi texts.** Ibn Abidin's text on direct versus remote causation (tasabbub ba'id), and the dar al-harb texts, were taken from fatwa sites, not from an edition I could check directly.
3. **Maliki and Shafi'i references.** In several entries these are quoted through al-Mughni or a general encyclopedia, not from the schools' own books (al-Dasuqi, al-Mudawwana, Mughni al-Muhtaj).
4. **FCNA.** I could not confirm an official FCNA position on mortgages, so I attributed the Detroit 1999 conference statement only as "a fiqh conference".
5. **AMJA's evaluation of financing companies dates from 2014** and may be out of date.
6. **AAOIFI SS 21.** The 30%/5% thresholds come from secondary sources, because the standard's text is restricted to members.
7. **Vanilla extract.** Applying IIFA resolution 210 (alcohol as an industrial solvent) to vanilla extract is my own reasoning and needs a ruling. I did not open the FDA regulation, so no alcohol percentage is given.
8. **AMJA food conference.** The document's own title says the ninth conference, while its file name says the thirteenth; the year is not confirmed.
9. **Contemporary rulings not yet verified:** the Muslim World League Fiqh Council on shares, an IIFA resolution on lease-to-own (ijara muntahia bi-tamlik), and any official ruling on BNPL. None of them is cited in the JSON.
10. **Spelling of the name of AMJA's mufti on fatwa 80196** (Dr. Main Khalid Al-Qudah).
