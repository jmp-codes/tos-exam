# Bloom AI v3.3 — Bloom's taxonomy level classifier for TOS Builder

A small classifier that reads an exam question and predicts its Bloom's (revised) level:
Remembering, Understanding, Applying, Analyzing, Evaluating, Creating. It maps these to the
three TOS columns (Remembering/Understanding, Applying/Analyzing, Synthesizing/Evaluating).

It trains and runs entirely in the browser (no server, no API key, works offline).

## Files
- `bloom-model.js`: the model: sentence patterns, construction reader, features, training and prediction.
- `generate.py`: builds `data/generated.tsv` from sentence-pattern templates × subject concepts.
- `suite.js`: trains once and scores any test file (single-level or two-level).
- `data/*.txt`: starter training questions, one file per level, one question per line (`*_2.txt` = version 2 additions).
- `hard.tsv`, `blind.tsv`, `blind2.tsv`, `blind3.tsv`, `tricky.tsv`, `tricky2.tsv`: test sets (level<TAB>question).
- `blind2.js`: scores blind set 2. Run: `node blind2.js`
- `bloom-starter-dataset.json`: everything above combined, as shipped inside TOS Builder.
- `eval.js`: 5-fold cross-validation vs. the keyword baseline. Run: `node eval.js 40 0.5 0.001`
- `blind.js`: trains on data/ and scores the blind set. Run: `node blind.js`
- `qtype.js`: question-type detector (14 formats). Run the tests: `node types-eval.js` and `node types-eval.js types-blind.tsv`
- `filetext.js`: reads lesson files offline (PDF, .docx, .pptx, .txt) and splits them into sections by headings. Test: `node filetext-test.js`
- `types-test.tsv`, `types-blind.tsv`: labeled question-type test sets (type<TAB>question; `\n` marks a new line)

## How it works
1. **Sentence patterns (`PATTERNS`, 40+ in English and Filipino):** recognize how a question is built,
   e.g. "Which of the following is …" (Remembering), "Which best explains …" (Understanding),
   "If [numbers] … how many …" (Applying), "What is the output of …" (Analyzing),
   "Is it … ? Justify." (Evaluating), "Design an original …" (Creating).
2. **Construction reader (`construct`):** looks past the first verb to what the whole sentence demands.
   The highest real demand wins ("Compare … and recommend one" → Evaluating), routine products stay
   routine ("Create a truth table" → Applying), and nested demands count ("Describe how you would
   design …" → Creating). When it fires it has the final say (98% precise on the training questions).
3b. **Two-level questions (`demands`):** splits a question into its separate demands ("… and decide …",
   "… then explain …") and reads each part. The main level is the highest level required (Bloom's rule);
   the next demand down is reported as "also involves". Teachers can confirm or set the second level;
   it is saved in the dataset (`also`) and trained at 1/3 the weight of the main level.
3. **Features:** words, word pairs, question openings, the matched patterns and the reader's verdict,
   plus flags for numbers, code, fill-in blanks and "justify/why" prompts.
4. **Model:** multinomial logistic regression trained with SGD (40 epochs, L2 = 0.001), in a background
   Web Worker so the page stays responsive; the trained model is cached in the browser.
5. **Learning from teachers:** questions a teacher labels (Set level / ✓ Correct) are added with 3× weight;
   "Retrain" rebuilds the model. Accepted AI rewrites are saved as before → after pairs.

## Question generator (`qgen.js`, v2)
Generates draft questions from a sentence or paragraph at a chosen Bloom's level, offline.
1. **Reads the text** for definitions, names ("A is known as B"), dates ("signed in 1898"), lists, step sequences
   (listed steps or First/Then/Finally), examples ("For example, …", "such as …", quoted examples), classifications
   ("X is a type of Y"), formulas with their variables ("V = I * R, where V is the voltage in volts …"), causes and
   effects ("X leads to Y", "because", "Without X, …", "X occurs when …"), relationships ("When X increases, Y
   decreases"), comparisons ("unlike", "whereas", "X is faster than Y"), purposes ("X is used to …") and limitations
   ("However, it …"). Basic Filipino support.
2. **Writes questions from 70+ patterns**, each with an id (e.g. `A.form.compute`, `A.purp.situation`). New in v2:
   number problems computed from formulas (with common-slip wrong answers), "someone needs to … which should be used?"
   situations, "Which is an example of …", "Which is NOT one of …", "What is the most likely result of …",
   cause chains ("Trace how X eventually leads to Z"), ordering steps/events, and formula-effect analysis.
   Multiple-choice wrong answers come from the same kind of item in the text, with a small subject word bank
   as backup.
3. **Checks every draft** with Bloom AI. Level labels follow the revised taxonomy (giving examples and predicting
   results = Understanding; ordering from memory = Remembering).
4. **Learns from teachers:** each pattern keeps shown/kept counts, and kept patterns rank higher. When a teacher
   edits a draft, the edit is turned into a reusable pattern ({term}, {a}, {b}, {cause}, {effect}, {example}, {ctx})
   and marked "Your pattern" on new texts. Patterns and stats are included in the dataset export.

| 15 new test paragraphs (`qgen-test2.txt`) | v1 | v2 |
|---|---|---|
| Drafts per paragraph | 35.0 | 29.5 (fewer misreadings, e.g. formulas no longer treated as definitions) |
| Confirmed at the requested level by Bloom AI | 96% | 98% |
| Multiple-choice questions | 43 | 63 |
| Number problems with computed answers | 0 | 20 |
| Applying questions | 49 | 55 |

To support the new question shapes, 81 construction examples were added to the classifier data (`data/*_3.txt`);
the classifier's own scores were unchanged or slightly better (cross-validation 96.7%, blind sets 98% / 100%,
trick set 97%). Run `node qgen-eval.js ./qgen.js all` to see every draft.

## Accuracy round (v3.3): target ≥ 92% on every test
New tests were written **before** any changes, including a sealed 60-question test that was fingerprinted
(`sealed.sha256`) and opened only once at the end. Failures were fixed with general reader rules (routine products
like matrices/SQL statements, arithmetic "result of 17 mod 5", "what is wrong", named fallacies, false premises,
assumptions, single points of failure, "which side you support", rate/rank at the start of a demand, running code
with given inputs, "list all the subsets", "misapplied", "and then …").

| Test (questions the model never trained on) | Before | After |
|---|---|---|
| blind4, 99 mixed (used for tuning) | 99.0% | 100% |
| tricky3, 40 misleading-verb (used for tuning) | 82.5% | 100% |
| dual2, 40 two-level: both levels found (used for tuning) | 85.0% | 100% |
| **blind5, 60 mixed, written after tuning, scored once** | | **100%** |
| **tricky4, 30 misleading-verb, written after tuning, scored once** | | **96.7%** |
| **dual3, 30 two-level, written after tuning: both levels found** | | **96.7%** |
| **Sealed final test, 60 mixed, opened once** | | **100%** |
| 5-fold cross-validation, 3 columns | 96.7% | 96.6% |

Untuned questions overall (blind5 + tricky4 + sealed): 149 of 150 = 99.3% (95% confidence interval roughly
96–100%). On all three two-level sets, the main level matches the highest-level rule 100% of the time; the lower
"main level" figures printed by `suite.js` come from test labels that break that rule. 99.9% cannot be claimed:
it would need thousands of test questions, and teachers themselves often disagree on a question's level.
Run `node suite.js <file> --show` to reproduce any row.

## Results
Training data: 1,451 hand-written questions (IT, discrete math, statistics, sciences, English,
social science, Philippine history; many formats; about 90 in Filipino) + 2,520 questions generated
from sentence patterns (`generate.py`, weighted 0.5). Scores count a match on the three TOS columns,
on questions the model did not train on.

| Test | Keyword check | v2 (words only) | **v3 (patterns + reader)** |
|---|---|---|---|
| Trick questions with a misleading first verb (`tricky2.tsv`, 36, unseen) | 28% | 50% | **97%** |
| Blind set 2 (60 mixed, incl. Filipino) | 42% | 95% | **98%** |
| Blind set 3 (60 mixed, incl. Filipino) | 50% | 97% | **100%** |
| 5-fold cross-validation (1,451 hand-written) | 75% | 94% | **96%** |

Two-level questions (`dual.tsv`, 24, written before the feature): both levels found (any order) 88%;
main level correct 92% by the highest-level rule (75% against the original labels, 4 of which broke that rule).
Run `node dual.js x` to see each result.

`tricky.tsv` was used while designing the reader rules, so its 100% is not a fair test; `tricky2.tsv`
was written before the rules and is the honest measure. The shipped model also trains on all test sets.
Run `node eval.js 40 0.5 0.001` to reproduce the cross-validation.

Limitations: the starter questions were written by an AI (Claude), not collected from real exams,
so real-world accuracy will be lower until teacher-labeled questions are added. A question's true
level also depends on what was taught; a problem copied from a class example may be only Remembering.

## Question types (`qtype.js`, v1) — create and determine

**Determine.** `QType.detect(question)` names the format of any question and gives the reason:
multiple choice, true or false, modified true or false, fill in the blank, identification, enumeration,
matching type, sequencing, analogy, problem solving, code tracing / output, situational / case,
short answer and essay. It reads the stem's construction (for example "Column A", an underlined word,
`A : B :: C : ?`, a blank `____`, "Enumerate…", numbers plus "compute / how many", code symbols,
"Situation:" or "X needs to … Which…") and the choices or columns when the question has them.
Each type carries the standard directions used in the Word export (Test I, Test II, …).

**Create.** The generator (`qgen.js` v2.1) now writes, besides multiple choice, true or false, fill in the blank,
short answer and essay:
- identification ("Identify the term being described: …"), with the English and Filipino forms
- modified true or false (the term is underlined; false versions carry the correct term in the key)
- matching type (Column A descriptions, Column B terms plus an extra distractor when one is available)
- enumeration, sequencing (steps and dated events), analogy (`example : category :: example : ____`)
- problem solving (number problems with computed answers) and situational / case items

Bloom's model v3.4 adds an analogy construction (Understanding), and a blank inside an analogy is no longer
read as fill-in-the-blank recall.

| Test | Result |
|---|---|
| types-test.tsv (59 questions, written with the rules) | 100% |
| types-blind.tsv (38 questions, written after the rules were fixed, not tuned on) | 100% |
| Generated questions on 15 paragraphs: detector agrees with the generator's type | 100% (480 questions) |
| Generated questions: Bloom's level confirmed by the classifier | 98% |
| Bloom's classifier after the change: blind5 / tricky4 / sealed | 100% / 100% / 100% |

Both type test sets were written by the developer, so real-world accuracy on teachers' own questions
will be lower. Label real questions to measure it honestly.

## Questions from an uploaded lesson file (`filetext.js`)

In the Generate tab, **Upload a lesson file** reads a PDF, Word (.docx), PowerPoint (.pptx) or text file on the
teacher's own device (nothing is sent online). The text is split into sections using the file's headings
(Word heading styles, slide titles, or larger/bold lines in a PDF), and the teacher ticks which sections to use.
The checked text goes into the generator, and each draft shows the section and sentence it came from.

The PDF reader is built in (no library): it inflates compressed streams (Flate, ASCII85, hex), reads
object streams, maps glyphs to letters with ToUnicode maps or WinAnsi/Differences encodings, rebuilds lines,
paragraphs and headings from text positions, and drops repeated page headers, footers and page numbers.
Limits: scanned PDFs (pictures of pages) have no text to read, password-protected PDFs can't be opened,
old .doc/.ppt files must be saved as .docx/.pptx first, and multi-column layouts may mix columns.

Tested on PDFs made by LibreOffice/Word export, Chrome "Save as PDF" (CID fonts) and ReportLab, plus
.docx, .pptx and .txt versions of the same lesson: all six gave the same sections and the same 114 questions,
112 (98%) confirmed at their level; a 4-page, 15-topic PDF gave 526 questions, 95% confirmed.

## Settings library (`QGen.SETTINGS`, v2.2)

Applied, analysis, evaluation and creation questions need a real place to happen in. When the teacher leaves the
"Setting" box blank, the generator takes a different setting for each question from a library of 94 Philippine
places in 8 groups (school and campus, barangay and local government, health services, small business and market,
farming and fisheries, tourism and transport, offices and companies, home and daily life) plus 12 Filipino ones.
It picks the groups that fit the lesson's subject (for example, math lessons get stores, homes and farms) unless the
teacher chooses the groups. Teachers can add their own settings; these are used first, saved with the teacher's
data, and included in the dataset export. Typing a setting in the box still uses that one setting for every question.

## Build the exam from the TOS (app, "Build exam from TOS" tab)

The teacher uploads one lesson file per TOS topic. For each topic and each column (R/U, Ap/An, E/C) the app
generates exactly the number of items the TOS plans, about half at each of the column's two levels (the higher
level gets the extra one), using only the question types the teacher ticks. Drafts are picked so the level checker
confirms them first, then spread across terms, templates, source sentences and types, and placed on the planned
item numbers. Items the teacher added or edited are kept; earlier drafts are replaced on "Regenerate". When a
lesson is too short, the leftover items are listed as still needing a question.
Test with the sample chapters in `fixtures/` (ch3-boolean.txt, ch4-counting.pdf, ch5-probability.txt): 59 of 59
empty items filled on a 60-item minor TOS, all 59 matching their planned column, no duplicate questions.

QGen v2.3 also reads factorial formulas (P = n! / (n - r)!, C = n! / (r! * (n - r)!)), keeps "part ≤ whole" in
number problems, uses factorial-style wrong answers, and no longer treats a heading word as a proper noun.

## Multiple choice (and other types) at every Bloom's level (QGen v2.4, BloomAI v3.5)

The generator now writes objective items above Remembering, each with a full answer key:

| Level | Multiple choice | True or false | Situational |
|---|---|---|---|
| Understanding | concept illustrated by an example; main purpose; best description | "X and Y mean the same thing" | |
| Applying | tool for a task; next step of a procedure; process in use; computed answers | computed result; prediction in a situation | tool for a need |
| Analyzing | odd one out; difference between two ideas; most likely cause; relationship; effect of doubling a variable | difference; cause; effect of a change | most likely cause |
| Evaluating | best choice and why; most effective way to reduce a problem; judging a classmate's definition, example, answer, step order or claim | "best choice, because…"; over-broad claims | which suggestion is better, and why |
| Creating | hypothesis to test; investigation design; plan combining two tools; plan to reduce a problem; formula rearranged; new checklist order | | plan for a situation |

Wrong choices are built to be plausible (swapped definitions, true-but-irrelevant reasons, reversed
relationships, common computation slips) and are checked so no other choice is also right when two tools
have overlapping purposes. Articles follow the lesson's own wording ("demand", "the stomata").

The level checker learned the matching constructions (for example "Which … would you design", "Which … does not
belong", "best evaluates this claim", and true-or-false statements whose level comes from what they ask).

| Test | Result |
|---|---|
| mc-levels-test.tsv (72 MC stems; baseline before this round) | 62.5% → 100% (seen while writing the rules, so not a fair test) |
| mc-levels-blind.tsv (60 MC/TF stems written after the rules, sealed, never tuned on) | **96.7%** (58/60) |
| Generated MC, 4 fresh full lessons (fixtures/fresh-lessons.txt) | 145 items, 100% level-confirmed, MC at all 6 levels in 4/4 lessons, 0 answer-key problems |
| Generated MC, 15 short paragraphs + 4 chapters | 325 items, 99.1% confirmed, 0 answer-key problems |
| Earlier tests (blind4/5, tricky3/4, sealed, dual2/3) | unchanged or better (sealed 100%) |
| 5-fold cross-validation | 94.5% six-level, 96.4% three-column |
| Build exam, multiple choice only, 60-item TOS, 3 chapters | 58 of 60 items filled, all 58 multiple choice |

Question types made at each level on the 4 fresh lessons (count, and lessons that got one):

```
level            blank    case    enum   essay   ident   match      mc     mtf problem     seq   short      tf
Remembering      14(4)       -    5(4)       -   14(4)    4(4)   32(4)   13(4)       -    3(3)   15(4)   28(4)
Understanding        -       -       -       -       -       -   28(4)       -       -       -   61(4)    8(4)
Applying             -    7(4)       -       -       -       -   16(4)       -    2(1)       -   33(4)    6(4)
Analyzing            -    1(1)       -   43(4)       -       -   18(4)       -       -       -       -    8(4)
Evaluating           -    4(2)       -   42(4)       -       -   34(4)       -       -       -       -    9(4)
Creating             -    3(3)       -   50(4)       -       -   17(4)       -       -       -       -       -
(count, and in parentheses the number of the 4 lessons that got at least one)
```
Run: `node mc-eval.js fixtures/fresh-lessons.txt [show|miss]`, `node matrix.js fixtures/fresh-lessons.txt`.
Short paragraphs of one or two sentences cannot support every level; a full lesson usually can.


## Reading slide decks and outlines (QGen v2.5)

Slides are mostly headings with short bullets, which the sentence reader could not use. A structure reader
now runs first and understands:
- glossary bullets: "Term – description", "Term: description", "Term (ABC) – description", including
  descriptions that start with a verb ("Business Architecture – defines …" becomes "the domain that defines …"
  plus a purpose) or a clause ("Point-to-point – each message is …" becomes "the model in which …");
- a slide title that is the term, with bullets that say what it does ("Middleware" + "Hides …", "Enables …");
- a short bullet with an indented bullet under it (PowerPoint levels are read);
- "Phases/Steps/Stages of …" (ordered steps), "Types/Components/Layers of …" (lists),
  "Benefits/Advantages of …" (purposes), "Challenges/Limitations of …" (limitations);
- objectives, outline and summary slides are skipped so they don't become questions.

New multiple-choice patterns for deck-style lessons: which item of a group is most affected by a change
(Analyzing), which pair you would combine in a design (Creating), and more next-step and plan items. Wrong choices
leave out an item's parent or child from the same list (e.g. not "Remote Procedure Call" when the answer is
"Middleware"), and main-purpose choices mix real purposes instead of giving away the answer by wording.

| Test | Before | After |
|---|---|---|
| EA slide deck (fixtures/ea-lesson1.pptx), multiple choice made per level R/U/Ap/An/E/C | 4/6/1/3/4/3 | 22/24/15/16/26/20 |
| Middleware slide deck (fixtures/mw-lesson4.pptx), same | — | 16/20/13/14/32/16 |
| Both decks: level confirmed · answer-key problems | — | 99.6% · 0 |
| Build exam, MC only, 21-item topic from the EA deck | — | 21/21 filled |
| Earlier tests (fresh lessons, 19 lessons, sealed, mc-levels-blind) | | unchanged (100%, 99.1%, 100%, 96.7%) |

When a lesson still runs out, the app says so plainly and offers three choices: fill the empty items with other
question types, add another file to that topic (slides + handout + notes are combined), or leave them to write.

## Better scenario questions (QGen v2.6)

A blind review (a separate reviewer who did not know which version wrote which question) found that scenario
questions often put ideas in places that did not fit (IoT sensors in a payroll system, the null law in a milk tea
shop), used the wrong person (a student protecting consumers), repeated the answer's wording in the stem, or
claimed a level the question did not really demand. Changes:

- **Kinds of ideas.** Each idea is treated as a *tool* (something people use: indexes, firewalls, MQTT, subsidies),
  a *principle* (laws, theorems, counting rules), a *concept* (demand, photosynthesis) or a *historical entity*.
  Only tools get "use it in this system" scenarios; principles get problems to solve (choosing class officers,
  an alarm circuit); concepts get explanation and example items.
- **Settings that fit.** Systems are matched to the idea by keywords (database ideas → the enrollment database of a
  state university; IoT → the soil-moisture sensors of a rice farm; circuits → the control circuit of a vending
  machine; enterprise architecture → organizations). A setting never contains the idea itself.
- **The right person.** Roles are scored against the lesson (network administrator, database administrator,
  enterprise architect, integration developer, electronics technician, municipal agriculturist, school
  nutritionist…).
- **Needs stated as problems.** "Speed up searches in large tables" becomes "…reports that searches in large tables
  take too long", "block unauthorized access" becomes "…keeps finding cases of unauthorized access".
- **Reasons that are properties, not the stem repeated.** "Best choice, and why" options give each tool's defining
  property ("because they follow the Last In, First Out principle").
- **Real alternatives.** "Which is more appropriate, A or B?" is asked only for options the lesson presents as
  alternatives; two ideas the lesson compares are never used as each other's plain wrong answer; a new
  Evaluating item judges two options against a requirement the lesson compares them on.
- **Honest levels.** Items that only match a need to a definition were moved to the level they really test
  (e.g. matching two tools to two needs is Analyzing, not Creating); a true-or-false "best choice" item that was
  only recall was removed. Wrong choices are plausible actions instead of straw men.

| Blind review, 30 scenario questions each, fresh lessons (fixtures/fresh2-lessons.txt) | Before | After |
|---|---|---|
| Grammar correct | 23/30 | 29/30 |
| Scenario realistic | 17/30 | 28/30 |
| Answer key correct and unambiguous | 16/30 | 26/30 |
| Grammar, scenario and key all fine | 8/30 (27%) | 25/30 (83%) |
| Level judged as intended by the strict reviewer | 16/30 | 13/30 |

The reviewer was strict about levels: questions that can be answered by matching a need to the lesson's wording
count as recall. That is a real limit of an offline template generator, which cannot freely paraphrase; teachers
should reword a few higher-level items (the app learns from those edits). Our own level checker, which uses the
usual Bloom's constructions, confirms 99.7% of the multiple-choice items on 28 lessons. Construction checks:
`node scen-lint.js` (0 problems on 453 scenario items, 206 before), `node scen-dump.js` to read them all.

## Reading more, filling every item, and no "According to the lesson" (QGen v2.7)

**Questions stand on their own.** No stem or choice says "according to the lesson", "from the lesson" or "the lesson
says"; the generator already reads the whole uploaded file, so the wording is neutral (checked on 3,072 generated
questions: 0 mention the lesson). The TOS is never used as question material: it only decides how many questions each
topic gets, at which level, and on which item numbers.

**Reads more ways of stating facts.** New patterns: "X, also known as Y, …", "X, which forwards …, …", "X consists of /
is made up of / has A, B and C", "Network topologies include A, B and C", "X can be classified into A, B and C",
"A vs B: A is faster, while B is cheaper", "X spreads/occurs/fails when Y", "If Y, then Z", "One advantage/disadvantage
of X is that it …", and any "Term + action verb + object" sentence ("A firewall protects a network from …", "RAM stores
data temporarily …"). Definitions written as statements ("De Morgan's theorem states that …") stay statements.

**"Which statement is correct?" sets at every level.** Each fact gives a true and a false statement at the level it
tests (Remembering: facts; Understanding: meanings and predictions; Applying: computed results; Analyzing: conclusions
about causes, differences and relationships; Evaluating: judgments about claims and choices). Mixing statements from
different facts gives many more multiple-choice items from the same file, each with its own correct answer.

**Filling every planned item.** When the distinct questions run out, the exam builder uses the same facts again from
new angles (other settings, other numbers, other wording) before reporting a shortfall.

| Test | Result |
|---|---|
| Build exam, Multiple choice only, 60-item TOS, 3 chapters | 60/60 filled, 60/60 match their TOS column (was 57/60) |
| Same, with a 233-word lesson and two slide decks | 60/60 filled, 60/60 match |
| 28 lessons, multiple choice made | 856 items, 99.8% level-confirmed, 0 answer-key problems |
| Construction check (scen-lint) | 491 scenario items, 0 problems |
| Level checker on sealed tests | sealed 100%, mc-levels-blind 96.7% |

A file that is only a sentence or two still cannot fill a large topic; the app says so and offers other types,
another file, or leaving the items to the teacher.

## Answer-key check (QGen v2.8)

Earlier checks only confirmed that each answer letter pointed to a real choice. This round, independent reviewers
checked whether each keyed answer is actually correct according to the source file.

- The app never mixes up letters: in 13 of 13 checks the answer letter matched the answer text in the Generate tab,
  after saving to the exam, and after "Shuffle choices".
- Real slide decks were the weak spot. On a realistic 15-slide deck (fixtures/sia2-lesson1-real.pptx: sub-bullets,
  "Result:" labels, a case slide, an ADM cycle with lettered phases, pitfalls with dashes, an A-vs-B comparison)
  the reader misread several things, which is where wrong keys come from. Fixed:
  "X is the practice of A, B and C" read as a list instead of a definition; labels such as "Result:" read as terms;
  case and example slides read as facts; "Student records are …" read as the verb "records"; lettered cycle
  phases missed; "TOGAF (The Open Group Architecture Framework)" and "Used by …" descriptions missed; noun-phrase
  benefits missed; pitfalls "X – Y" now read as X leads to Y; "A is simpler than B …, but B is more scalable …";
  abbreviations (EA = Enterprise Architecture) treated as one idea; the file's own subject (in its title) is never
  used as a wrong choice; no text is cut off with "…".

| Review of keyed answers | Items | Wrong key | Two defensible answers | Stem makes no sense |
|---|---|---|---|---|
| Previous version, realistic deck (sample) | 100 | 2 | 0 | 5 |
| Test lessons (13 lessons, all templates) | 338 | 1 → fixed | 5 → fixed | 2 → fixed |
| This version, realistic deck (every item) | 430 | 0 | 3 → fixed | 12 → fixed |

## Next steps (research ideas)
- Collect and label real exam questions from faculty (with two raters to measure agreement).
- Compare this model with a small transformer (e.g., DistilBERT) fine-tuned on the same data.
- Use the collected rewrite pairs to fine-tune a small open model (e.g., Qwen or Llama) for rewriting.
