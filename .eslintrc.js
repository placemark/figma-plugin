/* eslint-env node */
module.exports = {
  extends: [
    "plugin:@typescript-eslint/recommended",
    "plugin:@figma/figma-plugins/recommended",
  ],
  ignorePatterns: ["dist"],
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: "./tsconfig.json",
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
  },
  root: true,
};
