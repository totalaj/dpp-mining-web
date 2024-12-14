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
        "no-empty-function": ["warn", { "allow": ["constructors"]}],
        "no-shadow": "warn",
        "no-var": "error",
        "prefer-const": "error",
        "consistent-return": "warn",
        "no-useless-constructor": "off",
        "@typescript-eslint/explicit-function-return-type": "error",
        "@typescript-eslint/consistent-type-exports": "warn",
        "@typescript-eslint/dot-notation": "warn",
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-empty-function": "warn",
        "@typescript-eslint/explicit-member-accessibility": ["warn", { "overrides": {"constructors": "no-public"}}],
        "@typescript-eslint/naming-convention": ["warn",
        {
          "selector": "default",
          "format": ["snake_case"]
        },
        {
          "selector": "import",
          "format": ["PascalCase"]
        },
        {
          "selector": ["property", "parameterProperty"],
          "modifiers": ["private"],
          "format": ["snake_case"],
          "leadingUnderscore": "require"
        },
        {
          "selector": "variable",
          "modifiers": ["global"],
          "format": ["UPPER_CASE"]
        },
        {
          "selector": "enumMember",
          "format": ["UPPER_CASE"]
        },
        {
          "selector": ["class", "typeLike"],
          "format": ["PascalCase"]
        },
        {
          "selector": ["classProperty"],
          "modifiers": ["readonly"],
          "format": ["UPPER_CASE"],
        }
        ]
    }}
]
