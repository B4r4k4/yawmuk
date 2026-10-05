# Script fixes after the Phase 1 sharia audit (section 5)
Source: `docs/audit/phase1_audit.md` §5 + supervisor instructions. Validator re-run: 18 situations, 0 errors; all JSON valid.

| # | ruling_id | Change |
|---|---|---|
| 1 | `work.alcohol_pork_job` | Choice **a** (brewery app) → `wrong` / 0 (was `acceptable` / 5). Consequence keeps Imam Hamza: many scholars forbid it as close help in selling alcohol, some contemporary scholars see it as a remote cause, safer to avoid when an alternative exists; Adam backs out. Choice **c** (server) label + consequence now say **pork ribs** explicitly, alongside beer. |
| 2 | `home.credit_card` | Choice **b** (debit card, save, pay cash) → `best` / 10 with a positive consequence. Choice **c** (credit card with full autopay) → `acceptable` / 5 with a neutral consequence noting contemporary disagreement (some prohibit signing an interest-clause contract, others permit it for need with full payment always). |
| 3 | `private_events.wedding` | Setup now has the DJ *setting up* the mixed dance floor for after dinner, with drinking expected later (so leaving beforehand is possible). Choice **a** (`best`): congratulate, eat, take photos, then excuse yourself kindly before the dancing and drinking. Choice **b** (stay until the end despite mixed dancing and drinking) → `wrong` / 0, music-only justification removed. Choice **c** (leave without congratulating + public shaming) stays `wrong`. Narrator line adjusted. |
| 4 | `street.lost_wallet` | Choice **c** no longer leaves the wallet with the gas-station cashier (not the place it was found, not a trusted custodian, officer present). Now: keep it safe at home and return it in person to the license address next day → `acceptable` / 5, with a consequence showing that handing it to the officer would have been faster and more reliable. |
| 5 | `private_events.gifts_birthday` | Removed "keep it for yourself, I know it's your favorite" (choice **a**) → "I don't drink, so let me hand the wine back to you". Maria's reply no longer says "more for me". Maria's dialogue line no longer calls the wine her favorite. |
| 6 | `public_events.alcohol_table` | "cider" → "sparkling apple juice" / "juice table" (EN). Arabic already says عصير التفاح الفوار. |
| 7 | `street.lottery` | Choice **c** (promotional "free bet") stays `wrong`. Consequence rewritten to match the ruling: signing up on a betting platform with a bank card and ID, built to lure deposits, is **not** a no-purchase-necessary free sweepstakes (which the ruling permits). No longer claims "the ruling card explains why". |

Open item for rulings agents (from audit §5 #3): the `street.lottery` ruling card could add one sentence on promotional free bets inside sports-betting apps.
