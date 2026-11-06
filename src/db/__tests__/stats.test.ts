import { dayKey, streakFromDays } from '../stats';

const DAY = 86_400_000;
const now = new Date(2026, 10, 3, 18, 0).getTime();
const days = (...offsets: number[]) => new Set(offsets.map((o) => dayKey(now - o * DAY)));

describe('Lernserie', () => {
  it('zählt aufeinanderfolgende Tage bis heute', () => {
    expect(streakFromDays(days(0, 1, 2), now)).toBe(3);
  });
  it('bleibt erhalten, wenn heute noch nicht geübt wurde', () => {
    expect(streakFromDays(days(1, 2), now)).toBe(2);
  });
  it('bricht bei einer Lücke ab', () => {
    expect(streakFromDays(days(0, 2, 3), now)).toBe(1);
    expect(streakFromDays(days(2, 3), now)).toBe(0);
  });
});
