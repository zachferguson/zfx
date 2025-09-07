import { describe, it, expect, beforeEach, vi, Mock } from "vitest";

// 1) Mock the db connection module (default export with methods)
vi.mock("../../../src/db/connection", () => {
    return {
        default: {
            any: vi.fn(),
            oneOrNone: vi.fn(),
            one: vi.fn(),
        },
    };
});

// 2) Import the mocked db and the service under test
import db from "../../../src/db/connection";
import {
    getAllArticles,
    getArticleById,
    createArticle,
} from "../../../src/services/articlesService";

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

    it("getArticleById -> returns null if not found", async () => {
        asMock<Mock>(db.oneOrNone).mockResolvedValue(null);
        const row = await getArticleById(99);
        expect(row).toBeNull();
    });

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

    it("createArticle -> propagates db errors", async () => {
        asMock<Mock>(db.one).mockRejectedValue(new Error("fail"));
        await expect(createArticle("T", "S", "C", ["cat1"])).rejects.toThrow(
            "fail"
        );
    });
});
