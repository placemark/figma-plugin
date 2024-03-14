/* eslint-env node */
module.exports = {
  extends: ["plugin:@figma/figma-plugins/recommended"],
  ignorePatterns: ["dist"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  root: true,
};
