# Naseeb Mind

**[personality.naseebedu.com](https://personality.naseebedu.com)**, a free career and
personality test for Uzbek students aged 13-18, in their own language.

Most Uzbek teenagers choose a university direction with no structured information about
themselves at all. The advice they do get is a relative's opinion, or a translated Western
quiz that names a job and calls it destiny. Naseeb Mind is the alternative: six focused
challenges, no fee, and a result that opens options instead of closing them.

---

## What a student gets

A set of **six challenges** that can be completed in any order and across several sittings:

| Part | What it asks | Items |
|---|---|---|
| Personality | Big Five, adaptive | 25 or 35 questions |
| Interests | RIASEC, O\*NET-style, adaptive | 30+ questions |
| Work values | what makes work worth doing | 10 questions |
| School | ability, interest and effort by subject | 33 questions |
| What matters most | forced ranking of work needs | 20 cards |
| IQ & reasoning | ICAR-16 cognitive assessment | 16 questions |

Out comes one of **ten archetypes** with its own artwork, an interest profile, and ranked
directions drawn from **96 careers, 55 majors and 16 fields**. Ten take-away PDF guides,
one per archetype, are there to download.

The personality section is genuinely adaptive: everyone answers a fixed core, and only
students whose 2nd and 3rd traits land within 0.5 of each other get asked the extra ten.
Simulation put that design at 58.3% exact-archetype accuracy against 56.1% for a flat
35-item test, better, and shorter, for nine students in ten.

## The rules the code enforces

These are not style preferences. They are why the tool can be handed to a fifteen-year-old.

- **Personality can never block a career.** It is weighted `0.08` for careers and majors,
  and its term is floored at 0.5, a quiet student still sees entrepreneur; a creative one
  still sees software engineer. Interests lead (`0.50`), because what someone enjoys doing
  predicts occupational choice better than what they are graded on at fifteen.
- **No ordered Holland code is ever shown.** Nobody leaves believing they are an "SIA".
- **No fake precision.** Bands are 🟢 strong match, 🟡 worth exploring, 🔵 alternative,
  never "87% suitable".
- **No salaries, no demand ratings, no employment forecasts.** There is no Uzbek
  labour-market data behind them, and a fifteen-year-old would believe them.
- **The result screen ranks careers once**, from four signals, in one place. The archetype
  block above it is alphabetical and says in words that it is not a recommendation.
- **Data minimisation.** No full name, birthday, address, phone, ID or parent income.
  An email account stores progress and makes later results comparable.

## How it is built

Static files on GitHub Pages, with Supabase Auth and row-level-secured account storage.
There is **no framework or runtime build step**. `test.html` is the entire client app,
ES5 only, because it has to run on old Android phones over school Wi-Fi.

```
/                 20 pages GitHub Pages serves as URLs
/ru/  /en/        the same 16 pages, translated
/assets/          css, js, fonts, character artwork
/guides/          ten take-away PDFs
/tools/           Python generators + puppeteer suites, never served
```

Content lives in Python and is compiled to JS, so the result screen and the archetype pages
can never disagree. The site and all six challenges are available in Uzbek, Russian and
English; the translated instruments are clearly marked as not separately validated.

`tools/` holds the generators and the browser suites that drive a real Chrome to a real
result screen in all three languages, including when the content pack arrives late, or
never arrives at all. See [tools/README.md](tools/README.md).

---

Built for [NaseebEdu](https://naseebedu.com) schools. Free for every student who takes it.
