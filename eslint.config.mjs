import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    files: ["**/*.js"], // Add this line to ensure it looks for .js files
  },
  pluginJs.configs.recommended,
];
