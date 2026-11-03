import { createEmptyCard, fsrs, generatorParameters, Rating, type Card, type Grade } from 'ts-fsrs';

/** Lernstand einer Karte, so wie er in der Tabelle review_card steht (Zeiten in ms). */
export type StoredCard = {
  item_id: string;
  mode: string;
  state: number;
  due: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  last_review: number | null;
  scheduled_days: number;
  learning_steps: number;
};

const scheduler = fsrs(
  generatorParameters({
    // 90 % Wahrscheinlichkeit, eine Karte bei der Wiederholung noch zu wissen.
    request_retention: 0.9,
    maximum_interval: 365,
    enable_fuzz: true,
  }),
);

export function toFsrsCard(stored: StoredCard | undefined, now: Date): Card {
  if (!stored) return createEmptyCard(now);
  const lastReview = stored.last_review != null ? new Date(stored.last_review) : undefined;
  return {
    due: new Date(stored.due),
    stability: stored.stability,
    difficulty: stored.difficulty,
    elapsed_days: lastReview ? Math.max(0, Math.floor((now.getTime() - lastReview.getTime()) / 86_400_000)) : 0,
    scheduled_days: stored.scheduled_days,
    learning_steps: stored.learning_steps,
    reps: stored.reps,
    lapses: stored.lapses,
    state: stored.state,
    last_review: lastReview,
  };
}

export function fromFsrsCard(itemId: string, mode: string, card: Card): StoredCard {
  return {
    item_id: itemId,
    mode,
    state: card.state,
    due: card.due.getTime(),
    stability: card.stability,
    difficulty: card.difficulty,
    reps: card.reps,
    lapses: card.lapses,
    last_review: card.last_review ? card.last_review.getTime() : null,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
  };
}

/** Bewertung aus der Antwort: richtig = „Gut“, falsch = „Nochmal“. */
export function gradeFor(correct: boolean): Grade {
  return correct ? Rating.Good : Rating.Again;
}

/** Berechnet den neuen Lernstand nach einer Antwort. */
export function reviewCard(
  itemId: string,
  mode: string,
  stored: StoredCard | undefined,
  correct: boolean,
  now: Date,
): { card: StoredCard; grade: Grade } {
  const grade = gradeFor(correct);
  const next = scheduler.next(toFsrsCard(stored, now), now, grade);
  return { card: fromFsrsCard(itemId, mode, next.card), grade };
}
