export const toRegex = (pattern: string): RegExp => {
  const word = '[a-z]+';
  pattern = pattern.replace(/#(?:\.#)+/g, '#');
  pattern = pattern.replace(/\*/g, word);
  if (pattern === '#') return new RegExp(`(?:${word}(?:\\.${word})*)?`);
  pattern = pattern.replace(/^#\./, `(?:${word}\\.)*`);
  pattern = pattern.replace(/\.#/g, `(?:\\.${word})*`);
  pattern = pattern.replace(/(?<!\\)\./g, '\\.');
  return new RegExp(`^${pattern}$`);
};
