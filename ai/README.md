# Bloom AI — Bloom's taxonomy level classifier for TOS Builder

A small classifier that reads an exam question and predicts its Bloom's (revised) level:
Remembering, Understanding, Applying, Analyzing, Evaluating, Creating. It maps these to the
three TOS columns (Remembering/Understanding, Applying/Analyzing, Synthesizing/Evaluating).

It trains and runs entirely in the browser (no server, no API key, works offline).

## Files
- `bloom-model.js`: the model (features + multinomial logistic regression, train and predict).
- `data/*.txt`: starter training questions, one file per level, one question per line (`*_2.txt` = version 2 additions).
- `hard.tsv`, `blind.tsv`, `blind2.tsv`: exam-style test sets (level<TAB>question).
- `blind2.js`: scores blind set 2. Run: `node blind2.js`
- `bloom-starter-dataset.json`: everything above combined, as shipped inside TOS Builder.
- `eval.js`: 5-fold cross-validation vs. the keyword baseline. Run: `node eval.js 40 0.5 0.001`
- `blind.js`: trains on data/ and scores the blind set. Run: `node blind.js`

## How it works
1. **Features:** words, word pairs, the first 1–3 words (how the question opens), and flags for
   numbers, code, fill-in blanks (____) and "justify/why"-type prompts. Normalized to unit length.
2. **Model:** multinomial logistic regression trained with SGD (40 epochs, L2 = 0.001). About 0.3 s to train.
3. **Learning from teachers:** questions a teacher labels in TOS Builder (Set level / ✓ Correct)
   are added with 3× weight, and "Retrain" rebuilds the model in the browser.
4. **Rewrite pairs:** every AI rewrite a teacher accepts is saved as (original, level) → (new, level).
   These are the training data for a future rewriting model.

## Results
Version 2 (broadened): 1,571 starter questions covering IT, discrete math, statistics, the
sciences, English, social science and Philippine history, in varied formats (fill-in-the-blank,
true/false, multiple choice, code output, scenarios, essays), including about 90 in Filipino.
Scores are for questions the model did not train on, counting a match on the three TOS columns.

| Test | Version 1 (776 questions) | Version 2 (1,511 questions) | Keyword check |
|---|---|---|---|
| 5-fold cross-validation | 92.8% | 94.4% | 74.9% |
| Blind set 1, 30 exam-style questions | 93% | (used in training) | 40% |
| Blind set 2, 60 mixed questions incl. Filipino | 88% | **95%** | 42% |
| Filipino questions in blind set 2 (18) | 72% | 100% | n/a |

The shipped model trains on all 1,571 questions, including the test sets.

Limitations: the starter questions were written by an AI (Claude), not collected from real exams,
so real-world accuracy will be lower until teacher-labeled questions are added. A question's true
level also depends on what was taught; a problem copied from a class example may be only Remembering.

## Next steps (research ideas)
- Collect and label real exam questions from faculty (with two raters to measure agreement).
- Compare this model with a small transformer (e.g., DistilBERT) fine-tuned on the same data.
- Use the collected rewrite pairs to fine-tune a small open model (e.g., Qwen or Llama) for rewriting.
