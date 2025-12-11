import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import security from "eslint-plugin-security";
import jsxA11y from "eslint-plugin-jsx-a11y";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "backend/**/*", "monitoring/**/*", "search-api/**/*", "tailwind.config.ts", "vite.config.ts"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ["./tsconfig.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "security": security,
      "jsx-a11y": jsxA11y,
      "import": importPlugin,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",

      // Security rules
      "security/detect-object-injection": "warn",
      "security/detect-non-literal-regexp": "warn",
      "security/detect-unsafe-regex": "error",
      "security/detect-buffer-noassert": "error",
      "security/detect-child-process": "warn",
      "security/detect-disable-mustache-escape": "error",
      "security/detect-eval-with-expression": "error",
      "security/detect-no-csrf-before-method-override": "error",
      "security/detect-non-literal-fs-filename": "warn",
      "security/detect-non-literal-require": "warn",
      "security/detect-possible-timing-attacks": "warn",
      "security/detect-pseudoRandomBytes": "error",

      // Additional TypeScript security rules
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",

      // Accessibility rules (jsx-a11y)
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "warn",
      "jsx-a11y/aria-activedescendant-has-tabindex": "error",
      "jsx-a11y/aria-props": "error",
      "jsx-a11y/aria-role": "error",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/heading-has-content": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/img-redundant-alt": "warn",
      "jsx-a11y/label-has-associated-control": "warn",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/role-has-required-aria-props": "error",
      "jsx-a11y/role-supports-aria-props": "error",

      // Import rules
      "import/order": ["warn", {
        "groups": [
          "builtin",
          "external",
          "internal",
          ["parent", "sibling"],
          "index",
          "object",
          "type"
        ],
        "pathGroups": [
          {
            "pattern": "react",
            "group": "external",
            "position": "before"
          },
          {
            "pattern": "@/**",
            "group": "internal"
          }
        ],
        "pathGroupsExcludedImportTypes": ["react"],
        "newlines-between": "never",
        "alphabetize": {
          "order": "asc",
          "caseInsensitive": true
        }
      }],
      "import/no-duplicates": "error",
      "import/no-unresolved": "off", // TypeScript handles this
      "import/named": "off", // TypeScript handles this
      "import/no-named-as-default": "warn",
      "import/no-named-as-default-member": "warn",
    },
  },
);
