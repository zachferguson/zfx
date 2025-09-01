import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

// 1) Mock the db connection module (default export with methods used here)
vi.mock("../db/connection", () => {
    return {
        default: {
            any: vi.fn(),
            oneOrNone: vi.fn(),
            one: vi.fn(),
        },
    };
});

// 2) Import the mocked db and the service under test
import db from "../db/connection";
import { getAllBlogs, getBlogById, createBlog } from "./blogsService";

// tiny helper so TS is happy when accessing .mock.calls & mockResolvedValue
const asMock = <T extends Function>(fn: unknown) => fn as unknown as Mock;

describe("blogsService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("getAllBlogs -> returns rows from db.any", async () => {
        asMock(db.any).mockResolvedValue([
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
        const sql = asMock(db.any).mock.calls[0][0] as string;
        expect(sql).toContain("SELECT * FROM zachtothegym.blogs");
        expect(sql).toContain("ORDER BY created_at DESC");

        expect(rows).toEqual([
            expect.objectContaining({ id: 1, title: "Hello" }),
        ]);
    });

    it("getAllBlogs -> propagates db errors", async () => {
        asMock(db.any).mockRejectedValue(new Error("db-down"));
        await expect(getAllBlogs()).rejects.toThrow("db-down");
    });

    it("getBlogById -> passes id and returns row", async () => {
        asMock(db.oneOrNone).mockResolvedValue({ id: 42, title: "Life" });

        const row = await getBlogById(42);

        expect(db.oneOrNone).toHaveBeenCalledTimes(1);
        const [sql, params] = asMock(db.oneOrNone).mock.calls[0];
        expect(sql).toContain("SELECT * FROM zachtothegym.blogs WHERE id = $1");
        expect(params).toEqual([42]);

        expect(row).toEqual(expect.objectContaining({ id: 42 }));
    });

    it("getBlogById -> returns null when not found", async () => {
        asMock(db.oneOrNone).mockResolvedValue(null);
        const row = await getBlogById(999);
        expect(row).toBeNull();
    });

    it("createBlog -> sends parameterized INSERT and returns created row", async () => {
        asMock(db.one).mockResolvedValue({
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
        const [sql, params] = asMock(db.one).mock.calls[0];

        expect(sql).toContain("INSERT INTO zachtothegym.blogs");
        expect(sql).toContain("(title, content, categories)");
        expect(sql).toContain("VALUES($1, $2, $3)");
        expect(sql).toContain("RETURNING *");

        expect(params).toEqual([title, content, categories]);

        expect(created).toEqual(
            expect.objectContaining({ id: 7, title: "T", categories: ["cat"] })
        );
    });

    it("createBlog -> propagates db errors", async () => {
        asMock(db.one).mockRejectedValue(new Error("insert-fail"));
        await expect(createBlog("t", "c", [])).rejects.toThrow("insert-fail");
    });
});
