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

## Next steps (research ideas)
- Collect and label real exam questions from faculty (with two raters to measure agreement).
- Compare this model with a small transformer (e.g., DistilBERT) fine-tuned on the same data.
- Use the collected rewrite pairs to fine-tune a small open model (e.g., Qwen or Llama) for rewriting.
