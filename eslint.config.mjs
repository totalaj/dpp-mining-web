/* eslint-disable */
import pluginJs from "@eslint/js"
import tseslint from "typescript-eslint"

/** @type {import('eslint').Linter.Config[]} */
export default [
    { files: ["**/*.{js,cjs,ts,html}"] },
    { languageOptions: {
        parserOptions: {
          projectService: true,
          tsconfigRootDir: import.meta.dirname,
        },
      },
    },
    pluginJs.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    { rules: {
        // "tseslint/no-unused-vars": "warn",
        "semi": ["warn", "never"],
        "constructor-super": "error",
        "getter-return": "error",
        "no-const-assign": "error",
        "no-irregular-whitespace": "error",
        "no-unused-vars": "warn",
        "default-case": "error",
        "default-case-last": "error",
        "eqeqeq": "error",
        "no-empty": "error",
        "no-empty-function": "error",
        "no-shadow": "warn",
        "no-var": "error",
        "prefer-const": "error",
        "consistent-return": "warn",
        "@typescript-eslint/explicit-function-return-type": "error",
        "@typescript-eslint/consistent-type-exports": "warn",
        "@typescript-eslint/dot-notation": "warn",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-unnecessary-condition": "warn",
        "@typescript-eslint/no-empty-function": "warn",
        "@typescript-eslint/explicit-member-accessibility": "warn",
        "@typescript-eslint/naming-convention": ["warn",
        {
          "selector": "default",
          "format": ["snake_case"]
        },
        {
          "selector": "memberLike",
          "modifiers": ["private"],
          "format": ["snake_case"],
          "leadingUnderscore": "require"
        },
        {
          "selector": ["class", "typeLike"],
          "format": ["PascalCase"]
        }
        ]
    }}
]
