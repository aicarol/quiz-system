export function shuffleArray(array) {
  const shuffled = [...array];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function getAccuracy(stats) {
  if (!stats || stats.total === 0) return "0%";
  return `${((stats.correct / stats.total) * 100).toFixed(1)}%`;
}