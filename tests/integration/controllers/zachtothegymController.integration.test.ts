import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

import * as BlogsSvc from "../../../src/services/blogsService";
import * as ArticlesSvc from "../../../src/services/articlesService";
import * as MetricsSvc from "../../../src/services/metricsService";

import {
    getBlogs,
    getSingleBlogById,
    createNewBlog,
    getArticles,
    getSingleArticleById,
    createNewArticle,
    addDailyMetrics,
    getDailyMetrics,
} from "../../../src/controllers/zachtothegymController";
import {
    validateGetSingleBlogById,
    validateCreateNewBlog,
    validateGetSingleArticleById,
    validateCreateNewArticle,
    validateAddDailyMetrics,
    validateGetDailyMetrics,
} from "../../../src/validators/zachtothegymValidators";

function makeApp() {
    const app = express();
    app.use(express.json());

    app.get("/blogs", getBlogs);
    app.get("/blogs/:id", validateGetSingleBlogById, getSingleBlogById);
    app.post("/blogs", validateCreateNewBlog, createNewBlog);

    app.get("/articles", getArticles);
    app.get(
        "/articles/:id",
        validateGetSingleArticleById,
        getSingleArticleById
    );
    app.post("/articles", validateCreateNewArticle, createNewArticle);

    app.post("/metrics/daily", validateAddDailyMetrics, addDailyMetrics);
    app.get("/metrics/daily", validateGetDailyMetrics, getDailyMetrics);

    return app;
}

describe("zachtothegym controller integration", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.restoreAllMocks();
    });

    // ---- Blogs ----
    it("GET /blogs -> 200 with list", async () => {
        vi.spyOn(BlogsSvc, "getAllBlogs").mockResolvedValue([
            {
                id: 1,
                title: "Hello",
                content: "",
                categories: [],
                created_at: new Date(),
                updated_at: new Date(),
            },
        ]);
        const res = await request(app).get("/blogs");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([
            expect.objectContaining({ id: 1, title: "Hello" }),
        ]);
        expect(BlogsSvc.getAllBlogs).toHaveBeenCalledTimes(1);
    });

    it("GET /blogs -> 500 on service error", async () => {
        vi.spyOn(BlogsSvc, "getAllBlogs").mockRejectedValue(new Error("boom"));
        const res = await request(app).get("/blogs");
        expect(res.status).toBe(500);
        expect(res.body.error).toBeDefined();
    });

    it("GET /blogs/:id -> 400 invalid id", async () => {
        const spy = vi.spyOn(BlogsSvc, "getBlogById");
        const res = await request(app).get("/blogs/not-a-number");
        expect(res.status).toBe(400);
        expect(res.body.errors).toContain("Invalid blog ID.");
        expect(spy).not.toHaveBeenCalled();
    });

    it("GET /blogs/:id -> 404 not found", async () => {
        vi.spyOn(BlogsSvc, "getBlogById").mockResolvedValue(undefined as any);
        const res = await request(app).get("/blogs/123");
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Blog not found.");
    });

    it("GET /blogs/:id -> 200 when found", async () => {
        vi.spyOn(BlogsSvc, "getBlogById").mockResolvedValue({
            id: 2,
            title: "Found",
        } as any);
        const res = await request(app).get("/blogs/2");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 2, title: "Found" });
    });

    it("POST /blogs -> 400 missing title/content", async () => {
        const spy = vi.spyOn(BlogsSvc, "createBlog");
        const res = await request(app).post("/blogs").send({ title: "" });
        expect(res.status).toBe(400);
        expect(res.body.errors).toContain("Title and content are required.");
        expect(spy).not.toHaveBeenCalled();
    });

    it("POST /blogs -> 201 creates", async () => {
        vi.spyOn(BlogsSvc, "createBlog").mockResolvedValue({
            id: 10,
            title: "New",
        } as any);
        const res = await request(app)
            .post("/blogs")
            .send({ title: "New", content: "Body", categories: ["x"] });
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ id: 10, title: "New" });
        expect(BlogsSvc.createBlog).toHaveBeenCalledWith("New", "Body", ["x"]);
    });

    // ---- Articles ----
    it("GET /articles -> 200 with list", async () => {
        vi.spyOn(ArticlesSvc, "getAllArticles").mockResolvedValue([
            { id: 1, title: "A1" },
        ] as any);
        const res = await request(app).get("/articles");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 1, title: "A1" }]);
    });

    it("GET /articles/:id -> 400 invalid id", async () => {
        const spy = vi.spyOn(ArticlesSvc, "getArticleById");
        const res = await request(app).get("/articles/banana");
        expect(res.status).toBe(400);
        expect(res.body.errors).toContain("Invalid article ID.");
        expect(spy).not.toHaveBeenCalled();
    });

    it("GET /articles/:id -> 404 not found", async () => {
        vi.spyOn(ArticlesSvc, "getArticleById").mockResolvedValue(null as any);
        const res = await request(app).get("/articles/99");
        expect(res.status).toBe(404);
        expect(res.body.error).toBe("Article not found.");
    });

    it("GET /articles/:id -> 200 when found", async () => {
        vi.spyOn(ArticlesSvc, "getArticleById").mockResolvedValue({
            id: 7,
            title: "Found",
        } as any);
        const res = await request(app).get("/articles/7");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 7, title: "Found" });
    });

    it("POST /articles -> 400 missing fields", async () => {
        const spy = vi.spyOn(ArticlesSvc, "createArticle");
        const res = await request(app).post("/articles").send({ title: "T" });
        expect(res.status).toBe(400);
        expect(res.body.errors).toContain("Missing required fields.");
        expect(spy).not.toHaveBeenCalled();
    });

    it("POST /articles -> 201 creates", async () => {
        vi.spyOn(ArticlesSvc, "createArticle").mockResolvedValue({
            id: 5,
            title: "T",
        } as any);
        const res = await request(app)
            .post("/articles")
            .send({
                title: "T",
                summary: "S",
                content: "C",
                categories: ["cat"],
            });
        expect(res.status).toBe(201);
        expect(res.body).toEqual({ id: 5, title: "T" });
        expect(ArticlesSvc.createArticle).toHaveBeenCalledWith("T", "S", "C", [
            "cat",
        ]);
    });

    // ---- Metrics ----
    it("POST /metrics/daily -> 400 when date missing", async () => {
        const spy = vi.spyOn(MetricsSvc, "saveDailyMetrics");
        const res = await request(app)
            .post("/metrics/daily")
            .send({ steps: 1000 });
        expect(res.status).toBe(400);
        expect(res.body.errors).toContain("Date is required.");
        expect(spy).not.toHaveBeenCalled();
    });

    it("POST /metrics/daily -> 200 when saved", async () => {
        vi.spyOn(MetricsSvc, "saveDailyMetrics").mockResolvedValue(
            undefined as any
        );
        const res = await request(app)
            .post("/metrics/daily")
            .send({ date: "2025-09-01", steps: 1000 });
        expect(res.status).toBe(200);
        expect(res.body.message).toBe("Daily metrics saved successfully.");
        expect(MetricsSvc.saveDailyMetrics).toHaveBeenCalledWith({
            date: "2025-09-01",
            steps: 1000,
        });
    });

    it("GET /metrics/daily -> 400 when start/end missing", async () => {
        const spy = vi.spyOn(MetricsSvc, "getMetricsInRange");
        const res = await request(app).get("/metrics/daily");
        expect(res.status).toBe(400);
        expect(res.body.errors).toContain("Start and end dates are required.");
        expect(spy).not.toHaveBeenCalled();
    });

    it("GET /metrics/daily -> 200 with results", async () => {
        vi.spyOn(MetricsSvc, "getMetricsInRange").mockResolvedValue([
            { date: "2025-09-01" },
        ] as any);
        const res = await request(app).get(
            "/metrics/daily?start=2025-08-01&end=2025-09-01"
        );
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ date: "2025-09-01" }]);
        expect(MetricsSvc.getMetricsInRange).toHaveBeenCalledWith(
            "2025-08-01",
            "2025-09-01"
        );
    });

    it("GET /articles -> 500 when service throws", async () => {
        vi.spyOn(ArticlesSvc, "getAllArticles").mockRejectedValue(
            new Error("db-blip")
        );
        const res = await request(app).get("/articles");
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to fetch articles.");
    });

    it("GET /blogs/:id -> 500 when service throws", async () => {
        vi.spyOn(BlogsSvc, "getBlogById").mockRejectedValue(
            new Error("kaboom")
        );
        const res = await request(app).get("/blogs/1");
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to fetch blog.");
    });

    it("POST /blogs -> 500 when createBlog throws", async () => {
        vi.spyOn(BlogsSvc, "createBlog").mockRejectedValue(
            new Error("insert-fail")
        );
        const res = await request(app)
            .post("/blogs")
            .send({ title: "T", content: "C", categories: [] });
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to create blog.");
    });

    it("GET /articles/:id -> 500 when service throws", async () => {
        vi.spyOn(ArticlesSvc, "getArticleById").mockRejectedValue(
            new Error("boom")
        );
        const res = await request(app).get("/articles/1");
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Failed to fetch article.");
    });

    it("POST /articles -> 500 when createArticle throws", async () => {
        vi.spyOn(ArticlesSvc, "createArticle").mockRejectedValue(
            new Error("insert-fail")
        );
        const res = await request(app).post("/articles").send({
            title: "T",
            summary: "S",
            content: "C",
            categories: [],
        });
        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Error creating article.");
    });

    it("POST /metrics/daily -> 500 when saveDailyMetrics throws", async () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(MetricsSvc, "saveDailyMetrics").mockRejectedValue(
            new Error("upsert-fail")
        );

        const res = await request(app)
            .post("/metrics/daily")
            .send({ date: "2025-09-01", steps: 1000 });

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Server error.");
        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
    });

    it("GET /metrics/daily -> 500 when getMetricsInRange throws", async () => {
        const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
        vi.spyOn(MetricsSvc, "getMetricsInRange").mockRejectedValue(
            new Error("range-fail")
        );

        const res = await request(app).get(
            "/metrics/daily?start=2025-08-01&end=2025-09-01"
        );

        expect(res.status).toBe(500);
        expect(res.body.error).toBe("Server error.");
        expect(errSpy).toHaveBeenCalled();
        errSpy.mockRestore();
    });
});
