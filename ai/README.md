# Bloom AI — Bloom's taxonomy level classifier for TOS Builder

A small classifier that reads an exam question and predicts its Bloom's (revised) level:
Remembering, Understanding, Applying, Analyzing, Evaluating, Creating. It maps these to the
three TOS columns (Remembering/Understanding, Applying/Analyzing, Synthesizing/Evaluating).

It trains and runs entirely in the browser (no server, no API key, works offline).

## Files
- `bloom-model.js`: the model (features + multinomial logistic regression, train and predict).
- `data/*.txt`: starter training questions, one file per level, one question per line.
- `hard.tsv`, `blind.tsv`: exam-style test sets (level<TAB>question).
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

## Results (starter data, measured before the test sets were added to training)
| Test | Our AI (6 levels) | Our AI (3 TOS columns) | Keyword check (3 columns) |
|---|---|---|---|
| 5-fold cross-validation, 776 questions | 88.7% | 92.8% | 77.1% |
| Blind exam-style set, 30 new questions | 90% | 93% | 40% |

Limitations: the starter questions were written by an AI (Claude), not collected from real exams,
so real-world accuracy will be lower until teacher-labeled questions are added. A question's true
level also depends on what was taught; a problem copied from a class example may be only Remembering.

## Next steps (research ideas)
- Collect and label real exam questions from faculty (with two raters to measure agreement).
- Compare this model with a small transformer (e.g., DistilBERT) fine-tuned on the same data.
- Use the collected rewrite pairs to fine-tune a small open model (e.g., Qwen or Llama) for rewriting.
