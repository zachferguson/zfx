import js from "@eslint/js";
import jsdoc from "eslint-plugin-jsdoc";
import tseslint from "typescript-eslint";
import unusedImports from "eslint-plugin-unused-imports";
import globals from "globals";

const tsTypeAware = tseslint.configs.recommendedTypeChecked.map((cfg) => ({
    ...cfg,
    files: ["src/**/*.{ts,tsx}", "tests/**/*.{ts,tsx}"],
    languageOptions: {
        ...cfg.languageOptions,
        parser: tseslint.parser,
        parserOptions: {
            ...(cfg.languageOptions?.parserOptions ?? {}),
            // Keep using your main tsconfig; if you later make a tsconfig.eslint.json, point to that instead.
            project: "./tsconfig.json",
            tsconfigRootDir: process.cwd(),
        },
        // Add Node globals so you don’t get “process is not defined”
        globals: { ...globals.node },
    },
}));

export default [
    // Don’t lint the config itself; also ignore dist & vitest config
    {
        ignores: [
            "dist/**",
            "coverage/**",
            "vitest.config.*",
            "eslint.config.*",
            "docs/**",
        ],
    },

    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...tsTypeAware,

    // Project-wide TS niceties
    {
        files: ["**/*.{ts,tsx}"],
        plugins: { "unused-imports": unusedImports },
        rules: {
            "unused-imports/no-unused-imports": "error",
            "@typescript-eslint/no-unused-vars": [
                "error",
                {
                    argsIgnorePattern: "^_",
                    varsIgnorePattern: "^_",
                    caughtErrors: "all",
                    caughtErrorsIgnorePattern: "^_",
                },
            ],
        },
    },

    // Routes: allow async handlers as callbacks (no void-return nagging)
    {
        files: ["src/routes/**/*.ts"],
        rules: {
            "@typescript-eslint/no-misused-promises": [
                "error",
                { checksVoidReturn: false },
            ],
        },
    },

    // 🔹 JSDoc requirements for your real code (src)
    {
        files: ["src/**/*.{ts,tsx}"],
        plugins: { jsdoc },
        rules: {
            "jsdoc/require-jsdoc": [
                "warn",
                {
                    publicOnly: true,
                    require: {
                        FunctionDeclaration: true,
                        MethodDefinition: true,
                        ClassDeclaration: true,
                        ArrowFunctionExpression: false,
                        FunctionExpression: false,
                    },
                },
            ],
            "jsdoc/require-param": "warn",
            "jsdoc/require-returns": "warn",
        },
    },

    // Tests: relax noisy rules for mocks/spies & require()
    {
        files: ["tests/**/*.{ts,tsx}"],
        rules: {
            "@typescript-eslint/no-unsafe-return": "off",
            "@typescript-eslint/no-unsafe-call": "off",
            "@typescript-eslint/no-unsafe-member-access": "off",
            "@typescript-eslint/no-unsafe-assignment": "off",
            "@typescript-eslint/no-unsafe-argument": "off",
            "@typescript-eslint/no-unsafe-function-type": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "@typescript-eslint/no-misused-promises": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-unused-vars": "off",
            "@typescript-eslint/unbound-method": "off", // ← only once now (no duplicate)
            "@typescript-eslint/no-require-imports": "off",
            "jsdoc/require-jsdoc": "off",
        },
    },
];
