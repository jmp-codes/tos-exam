# Bloom AI v3.1 — Bloom's taxonomy level classifier for TOS Builder

A small classifier that reads an exam question and predicts its Bloom's (revised) level:
Remembering, Understanding, Applying, Analyzing, Evaluating, Creating. It maps these to the
three TOS columns (Remembering/Understanding, Applying/Analyzing, Synthesizing/Evaluating).

It trains and runs entirely in the browser (no server, no API key, works offline).

## Files
- `bloom-model.js`: the model: sentence patterns, construction reader, features, training and prediction.
- `bloom-model.v2.js`: the previous version, kept for comparison.
- `generate.py`: builds `data/generated.tsv` from sentence-pattern templates × subject concepts.
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

## Question generator (`qgen.js`)
Generates draft questions from a sentence or paragraph at a chosen Bloom's level, offline.
1. **Reads the text** for definitions ("X is …", "X refers to …", "Y is called X"), names ("A is known as B"),
   lists ("The types of X are a, b and c"), causes ("… because …", "X leads to Y"), comparisons ("Unlike X, Y …",
   "… whereas …"), purposes ("X is used to …") and key terms. Basic Filipino support ("Ang X ay …", "dahil",
   "Hindi tulad ng …", "Ang mga uri ng X ay …").
2. **Fills level patterns**, with different wording for tools/methods (e.g. normalization), concepts
   (e.g. photosynthesis) and historical names/entities (e.g. the Katipunan). Multiple-choice distractors come
   from other terms in the same text.
3. **Checks every draft** with Bloom AI; the page shows whether the level is confirmed.
Test (`node qgen-test.js x`) on 6 paragraphs (IT, discrete math, science, web services, Philippine history,
Filipino science): 206 drafts, 99% confirmed at the requested level by Bloom AI. Applying questions are the
hardest to generate from text alone (89% confirmed, and fewer of them), since text rarely contains problems
to solve. Questions teachers keep are saved (`generated` in the dataset export) as training data for a
future paragraph → question model.

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
