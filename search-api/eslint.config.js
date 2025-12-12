import js from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";
import importPlugin from "eslint-plugin-import";

export default tseslint.config(
  { ignores: ["dist/**/*", "node_modules/**/*", "coverage/**/*"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["src/**/*.ts"],
    ignores: ["**/*.test.ts", "src/__tests__/**/*"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        ...globals.node,
        ...globals.es2022,
      },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
    },
    settings: {
      "import/resolver": {
        node: {
          extensions: [".js", ".ts"],
        },
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-this-alias": "warn",
      "no-console": "off",
      "prefer-const": "warn",
      "no-useless-escape": "warn",
      "no-case-declarations": "warn",
      "no-prototype-builtins": "warn",
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["../*", "../*/**"],
          message: "Use hash imports (#config/, #services/, etc.) instead of relative parent imports"
        }]
      }],
      "import/extensions": ["error", "ignorePackages", {
        js: "always",
        ts: "never",
      }],
    },
  }
);
