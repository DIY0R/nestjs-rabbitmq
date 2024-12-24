export const toRegex = (pattern: string): RegExp => {
  const word = '[a-z]+';
  const normalizedPattern = pattern.replace(/#(?:\.#)+/g, '#');
  const withWildcardReplaced = normalizedPattern.replace(/\*/g, word);
  if (withWildcardReplaced === '#') {
    return new RegExp(`(?:${word}(?:\\.${word})*)?`);
  }
  const withHashReplaced = withWildcardReplaced
    .replace(/^#\./, `(?:${word}\\.)*`)
    .replace(/\.#/g, `(?:\\.${word})*`);
  const escapedDots = withHashReplaced.replace(/(?<!\\)\./g, '\\.');
  return new RegExp(`^${escapedDots}$`);
};
