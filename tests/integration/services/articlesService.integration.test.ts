import { describe, it, expect } from "vitest";
import {
    getAllArticles,
    getArticleById,
    createArticle,
} from "../../../src/services/articlesService";

if (!process.env.DATABASE_URL) {
    describe.skip("articlesService integration", () => {
        it("skipped because DATABASE_URL is not set", () => {
            it("skipped", () => {});
        });
    });
} else {
    describe("articlesService integration", () => {
        it("getAllArticles runs without throwing (integration smoke test)", async () => {
            await expect(getAllArticles()).resolves.not.toThrow();
        });

        it("getArticleById runs without throwing (integration smoke test)", async () => {
            await expect(getArticleById(1)).resolves.not.toThrow();
        });

        // TODO: Integration test for createArticle requires a real DB with proper permissions.
        // For now, this is skipped/mocked. Set up a test DB or use a mock in the future.
        it("createArticle runs without throwing (integration smoke test)", async () => {
            await expect(
                createArticle("T", "S", "C", ["cat1"])
            ).resolves.not.toThrow();
        });
    });
}
