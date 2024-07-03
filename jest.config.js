/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts$',
  verbose: true,
  silent: false,
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
};
