// @ts-nocheck
import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

/**
 * @file Integration tests for articlesService.
 *
 * Verifies the service layer functions (getAllArticles, getArticleById,
 * createArticle, deleteArticleById) using a mocked pg-promise connection module.
 *
 * Scenarios covered:
 * - Fetching all articles (happy path + error propagation)
 * - Fetching a single article by ID (found / not found)
 * - Creating an article (happy path + error propagation)
 * - Deleting an article (found / not found + error propagation)
 */

// Mock the db connection module (default export with methods)
vi.mock("../../../src/db/connection", () => {
    return {
        default: {
            any: vi.fn(),
            oneOrNone: vi.fn(),
            one: vi.fn(),
        },
    };
});

// Import the mocked db and the service under test
import db from "../../../src/db/connection";
import {
    getAllArticles,
    getArticleById,
    createArticle,
    deleteArticleById,
} from "../../../src/services/articlesService";

// handy helpers
const asMock = <T extends Function>(fn: unknown) => fn as T;

describe("articlesService (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getAllArticles", () => {
        // Should return all articles from db.any, ordered by created_at DESC
        it("getAllArticles -> returns rows from db.any", async () => {
            // arrange
            asMock<Mock>(db.any).mockResolvedValue([
                {
                    id: 1,
                    title: "Hello",
                    summary: "S",
                    content: "C",
                    categories: ["x"],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ]);

            // act
            const rows = await getAllArticles();

            // assert
            expect(db.any).toHaveBeenCalledTimes(1);
            // SQL check (don’t over-brittle this—just verify core pieces)
            const sql = asMock<Mock>(db.any).mock.calls[0][0] as string;
            expect(sql).toContain("SELECT * FROM zachtothegym.articles");
            expect(sql).toContain("ORDER BY created_at DESC");

            expect(rows).toEqual([
                expect.objectContaining({ id: 1, title: "Hello" }),
            ]);
        });

        // Should propagate errors thrown by db.any
        it("getAllArticles -> propagates db errors", async () => {
            asMock<Mock>(db.any).mockRejectedValue(new Error("db-down"));
            await expect(getAllArticles()).rejects.toThrow("db-down");
        });
    });

    describe("getArticleById", () => {
        // Should fetch an article by ID and return the row
        it("getArticleById -> returns row from db.oneOrNone", async () => {
            asMock<Mock>(db.oneOrNone).mockResolvedValue({
                id: 2,
                title: "A",
            });
            const row = await getArticleById(2);
            expect(db.oneOrNone).toHaveBeenCalledWith(
                expect.stringContaining("WHERE id = $1"),
                [2]
            );
            expect(row).toEqual(expect.objectContaining({ id: 2 }));
        });

        // Should return null if the article is not found
        it("getArticleById -> returns null if not found", async () => {
            asMock<Mock>(db.oneOrNone).mockResolvedValue(null);
            const row = await getArticleById(99);
            expect(row).toBeNull();
        });
    });

    describe("createArticle", () => {
        // Should insert a new article and return the created row
        it("createArticle -> inserts and returns new article", async () => {
            asMock<Mock>(db.one).mockResolvedValue({
                id: 3,
                title: "T",
                summary: "S",
                content: "C",
                categories: ["cat1"],
            });
            const row = await createArticle("T", "S", "C", ["cat1"]);
            expect(db.one).toHaveBeenCalledWith(
                expect.stringContaining("INSERT INTO zachtothegym.articles"),
                ["T", "S", "C", ["cat1"]]
            );
            expect(row).toEqual(expect.objectContaining({ id: 3, title: "T" }));
        });

        // Should propagate errors thrown by db.one
        it("createArticle -> propagates db errors", async () => {
            asMock<Mock>(db.one).mockRejectedValue(new Error("fail"));
            await expect(
                createArticle("T", "S", "C", ["cat1"])
            ).rejects.toThrow("fail");
        });
    });

    describe("deleteArticleById", () => {
        // Should delete an article by ID and return the deleted row
        it("deleteArticleById -> deletes and returns the article if found", async () => {
            asMock<Mock>(db.oneOrNone).mockResolvedValue({
                id: 4,
                title: "To Delete",
            });
            const row = await deleteArticleById(4);
            expect(db.oneOrNone).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM zachtothegym.articles"),
                [4]
            );
            expect(row).toEqual(
                expect.objectContaining({ id: 4, title: "To Delete" })
            );
        });

        // Should return null when trying to delete a non-existent article
        it("deleteArticleById -> returns null if not found", async () => {
            asMock<Mock>(db.oneOrNone).mockResolvedValue(null);
            const row = await deleteArticleById(999);
            expect(row).toBeNull();
        });

        // Should propagate errors thrown by db.oneOrNone
        it("deleteArticleById -> propagates db errors", async () => {
            asMock<Mock>(db.oneOrNone).mockRejectedValue(
                new Error("fail-delete")
            );
            await expect(deleteArticleById(1)).rejects.toThrow("fail-delete");
        });
    });
});
