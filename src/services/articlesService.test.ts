import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

// 1) Mock the db connection module (default export with methods)
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
import {
    getAllArticles,
    getArticleById,
    createArticle,
} from "./articlesService";

// handy helpers
const asMock = <T extends Function>(fn: unknown) => fn as unknown as T;

describe("articlesService", () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

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

    it("getAllArticles -> propagates db errors", async () => {
        asMock<Mock>(db.any).mockRejectedValue(new Error("db-down"));
        await expect(getAllArticles()).rejects.toThrow("db-down");
    });

    it("getArticleById -> passes id and returns row", async () => {
        asMock<Mock>(db.oneOrNone).mockResolvedValue({
            id: 42,
            title: "Life",
        });

        const row = await getArticleById(42);

        expect(db.oneOrNone).toHaveBeenCalledTimes(1);
        const [sql, params] = asMock<Mock>(db.oneOrNone).mock.calls[0];
        expect(sql).toContain(
            "SELECT * FROM zachtothegym.articles WHERE id = $1"
        );
        expect(params).toEqual([42]);

        expect(row).toEqual(expect.objectContaining({ id: 42 }));
    });

    it("getArticleById -> returns null when not found", async () => {
        asMock<Mock>(db.oneOrNone).mockResolvedValue(null);
        const row = await getArticleById(999);
        expect(row).toBeNull();
    });

    it("createArticle -> sends parameterized INSERT and returns created row", async () => {
        asMock<Mock>(db.one).mockResolvedValue({
            id: 7,
            title: "T",
            summary: "S",
            content: "C",
            categories: ["cat"],
        });

        const title = "T";
        const summary = "S";
        const content = "C";
        const categories = ["cat"];

        const created = await createArticle(
            title,
            summary,
            content,
            categories
        );

        expect(db.one).toHaveBeenCalledTimes(1);
        const [sql, params] = asMock<Mock>(db.one).mock.calls[0];

        // sanity-check the SQL and placeholders
        expect(sql).toContain("INSERT INTO zachtothegym.articles");
        expect(sql).toContain("(title, summary, content, categories)");
        expect(sql).toContain("VALUES ($1, $2, $3, $4)");
        expect(sql).toContain("RETURNING *");

        // check params order & values
        expect(params).toEqual([title, summary, content, categories]);

        expect(created).toEqual(
            expect.objectContaining({ id: 7, title: "T", categories: ["cat"] })
        );
    });

    it("createArticle -> propagates db errors", async () => {
        asMock<Mock>(db.one).mockRejectedValue(new Error("insert-fail"));
        await expect(createArticle("t", "s", "c", [])).rejects.toThrow(
            "insert-fail"
        );
    });
});
