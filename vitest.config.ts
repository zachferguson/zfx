import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        setupFiles: ["dotenv/config"],
        include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
        exclude: ["node_modules", "dist", "**/helpers/**", "**/fixtures/**"],
        coverage: {
            reporter: ["text", "html", "lcov"],
            include: ["src/**/*.ts", "tests/**/*.ts"],
            exclude: [
                "**/*.d.ts",
                "node_modules",
                "dist",
                "**/test/**",
                "**/tests/**",
                "**/fixtures/**",
                "**/helpers/**",
            ],
        },
    },
});
