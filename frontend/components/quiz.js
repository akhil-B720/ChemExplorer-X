export function gameModeMultiplier(streak) {
  if (streak >= 8) return 2.0;
  if (streak >= 5) return 1.6;
  if (streak >= 3) return 1.3;
  return 1.0;
}
