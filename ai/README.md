# Bloom AI v3.3 — Bloom's taxonomy level classifier for TOS Builder

A small classifier that reads an exam question and predicts its Bloom's (revised) level:
Remembering, Understanding, Applying, Analyzing, Evaluating, Creating. It maps these to the
three TOS columns (Remembering/Understanding, Applying/Analyzing, Synthesizing/Evaluating).

It trains and runs entirely in the browser (no server, no API key, works offline).

## Files
- `bloom-model.js`: the model: sentence patterns, construction reader, features, training and prediction.
- `bloom-model.v2.js`: the previous version, kept for comparison.
- `generate.py`: builds `data/generated.tsv` from sentence-pattern templates × subject concepts.
- `suite.js`: trains once and scores any test file (single-level or two-level).
- `compare.js`: compares keyword check, v2 and v3 on the blind and trick sets.
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
Run `node compare.js 0.5 x x tricky2.tsv` and `node eval.js 40 0.5 0.001` to reproduce.

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

## Next steps (research ideas)
- Collect and label real exam questions from faculty (with two raters to measure agreement).
- Compare this model with a small transformer (e.g., DistilBERT) fine-tuned on the same data.
- Use the collected rewrite pairs to fine-tune a small open model (e.g., Qwen or Llama) for rewriting.
