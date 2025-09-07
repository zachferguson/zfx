import db from "../../../src/db/connection";
import {
    getAllBlogs,
    getBlogById,
    createBlog,
    deleteBlogById,
} from "../../../src/services/blogsService";
import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

vi.mock("../../../src/db/connection", () => {
    return {
        default: {
            any: vi.fn(),
            oneOrNone: vi.fn(),
            one: vi.fn(),
        },
    };
});

const asMock = <T extends Function>(fn: unknown) => fn as unknown as Mock;

describe("blogsService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    // Should return all blogs from db.any, ordered by created_at DESC
    it("getAllBlogs -> returns rows from db.any", async () => {
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

    // Should propagate errors thrown by db.any
    it("getAllBlogs -> propagates db errors", async () => {
        asMock<Mock>(db.any).mockRejectedValue(new Error("db-down"));
        await expect(getAllBlogs()).rejects.toThrow("db-down");
    });

    // Should fetch a blog by ID and return the row
    it("getBlogById -> passes id and returns row", async () => {
        asMock<Mock>(db.oneOrNone).mockResolvedValue({ id: 42, title: "Life" });
        const row = await getBlogById(42);
        expect(db.oneOrNone).toHaveBeenCalledTimes(1);
        const [sql, params] = asMock<Mock>(db.oneOrNone).mock.calls[0];
        expect(sql).toContain("SELECT * FROM zachtothegym.blogs WHERE id = $1");
        expect(params).toEqual([42]);
        expect(row).toEqual(expect.objectContaining({ id: 42 }));
    });

    // Should return null if the blog is not found
    it("getBlogById -> returns null for missing row", async () => {
        asMock<Mock>(db.oneOrNone).mockResolvedValue(null);
        const row = await getBlogById(999);
        expect(row).toBeNull();
    });

    // Should return null if the blog is not found
    it("getBlogById -> returns null for missing row", async () => {
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
            expect.objectContaining({ id: 7, title: "T", categories: ["cat"] })
        );
    });

    // Should propagate errors thrown by db.one
    it("createBlog -> propagates db errors", async () => {
        asMock<Mock>(db.one).mockRejectedValue(new Error("insert-fail"));
        await expect(createBlog("T", "C", ["cat"])).rejects.toThrow(
            "insert-fail"
        );
    });
    // Should delete a blog by ID and return the deleted row
    it("deleteBlogById -> deletes and returns the blog if found", async () => {
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

    // Should return null when trying to delete a non-existent blog
    it("deleteBlogById -> returns null if not found", async () => {
        asMock<Mock>(db.oneOrNone).mockResolvedValue(null);
        const row = await deleteBlogById(999);
        expect(row).toBeNull();
    });

    // Should propagate errors thrown by db.oneOrNone
    it("deleteBlogById -> propagates db errors", async () => {
        asMock<Mock>(db.oneOrNone).mockRejectedValue(
            new Error("fail-delete-blog")
        );
        await expect(deleteBlogById(1)).rejects.toThrow("fail-delete-blog");
    });
});
