// eslint.config.mjs
// https://github.com/eslint/eslint/issues/17400

import js from "@eslint/js";
import html from "@html-eslint/eslint-plugin";
import parser from "@html-eslint/parser";

export default [
  {
    rules: {
      "semi": "error",
      "prefer-const": "error",
      "no-var": "error",
      "indent": ["error", 2],
    },
  },
  {
    ignores: [
      "**/node_modules/**", 
      "dist/**/*",
    ],
  },
  {
    files: ["**/*.html"],
    plugins: {
      "@html-eslint": html,
    },
    languageOptions: {
      parser,
    },
    rules: {
      "@html-eslint/indent": ["error", 2],
    },
  },
];