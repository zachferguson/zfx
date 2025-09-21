import db from "../../../src/db/connection";
import {
    getAllBlogs,
    getBlogById,
    createBlog,
    deleteBlogById,
} from "../../../src/services/blogsService";
import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

/**
 * @file Unit tests for blogsService.
 *
 * These tests verify the behavior of all blogsService functions, using a mocked database connection.
 *
 * Scenarios covered:
 * - getAllBlogs: returns all blogs, propagates db errors
 * - getBlogById: fetches by id, returns null if not found
 * - createBlog: inserts and returns new blog, propagates db errors
 * - deleteBlogById: deletes and returns blog, returns null if not found, propagates db errors
 */

vi.mock("../../../src/db/connection", () => {
    return {
        default: {
            any: vi.fn(),
            oneOrNone: vi.fn(),
            one: vi.fn(),
        },
    };
});

/**
 * Helper to cast a function to a Vitest Mock type.
 */
const asMock = <T extends Function>(fn: unknown) => fn as Mock;

describe("blogsService (unit)", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe("getAllBlogs", () => {
        it("returns rows from db.any", async () => {
            asMock<Mock>(db.any).mockResolvedValue([
                {
                    id: 1,
                    title: "Hello",
                    content: "Body",
                    categories: ["x"],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                },
            ]);
            const rows = await getAllBlogs();
            expect(db.any).toHaveBeenCalledTimes(1);
            const sql = asMock<Mock>(db.any).mock.calls[0][0] as string;
            expect(sql).toContain("SELECT * FROM zachtothegym.blogs");
            expect(sql).toContain("ORDER BY created_at DESC");
            expect(rows).toEqual([
                expect.objectContaining({ id: 1, title: "Hello" }),
            ]);
        });
        it("propagates db errors", async () => {
            asMock<Mock>(db.any).mockRejectedValue(new Error("db-down"));
            await expect(getAllBlogs()).rejects.toThrow("db-down");
        });
    });

    describe("getBlogById", () => {
        it("passes id and returns row", async () => {
            asMock<Mock>(db.oneOrNone).mockResolvedValue({
                id: 42,
                title: "Life",
            });
            const row = await getBlogById(42);
            expect(db.oneOrNone).toHaveBeenCalledTimes(1);
            const [sql, params] = asMock<Mock>(db.oneOrNone).mock.calls[0];
            expect(sql).toContain(
                "SELECT * FROM zachtothegym.blogs WHERE id = $1"
            );
            expect(params).toEqual([42]);
            expect(row).toEqual(expect.objectContaining({ id: 42 }));
        });
        it("returns null for missing row", async () => {
            asMock<Mock>(db.oneOrNone).mockResolvedValue(null);
            const row = await getBlogById(999);
            expect(row).toBeNull();
        });
    });

    describe("createBlog", () => {
        it("inserts and returns new blog", async () => {
            asMock<Mock>(db.one).mockResolvedValue({
                id: 7,
                title: "T",
                content: "C",
                categories: ["cat"],
            });
            const title = "T";
            const content = "C";
            const categories = ["cat"];
            const created = await createBlog(title, content, categories);
            expect(db.one).toHaveBeenCalledTimes(1);
            const [sql, params] = asMock<Mock>(db.one).mock.calls[0];
            expect(sql).toContain("INSERT INTO zachtothegym.blogs");
            expect(sql).toContain("(title, content, categories)");
            expect(sql).toContain("VALUES ($1, $2, $3)");
            expect(sql).toContain("RETURNING *");
            expect(params).toEqual([title, content, categories]);
            expect(created).toEqual(
                expect.objectContaining({
                    id: 7,
                    title: "T",
                    categories: ["cat"],
                })
            );
        });
        it("propagates db errors", async () => {
            asMock<Mock>(db.one).mockRejectedValue(new Error("insert-fail"));
            await expect(createBlog("T", "C", ["cat"])).rejects.toThrow(
                "insert-fail"
            );
        });
    });

    describe("deleteBlogById", () => {
        it("deletes and returns the blog if found", async () => {
            asMock<Mock>(db.oneOrNone).mockResolvedValue({
                id: 5,
                title: "To Delete Blog",
            });
            const row = await deleteBlogById(5);
            expect(db.oneOrNone).toHaveBeenCalledWith(
                expect.stringContaining("DELETE FROM zachtothegym.blogs"),
                [5]
            );
            expect(row).toEqual(
                expect.objectContaining({ id: 5, title: "To Delete Blog" })
            );
        });
        it("returns null if not found", async () => {
            asMock<Mock>(db.oneOrNone).mockResolvedValue(null);
            const row = await deleteBlogById(999);
            expect(row).toBeNull();
        });
        it("propagates db errors", async () => {
            asMock<Mock>(db.oneOrNone).mockRejectedValue(
                new Error("fail-delete-blog")
            );
            await expect(deleteBlogById(1)).rejects.toThrow("fail-delete-blog");
        });
    });
});
