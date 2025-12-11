import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

/**
 * @file Integration tests for zachtothegymRoutes.
 *
 * Verifies the zachtothegym routing layer with a real Express app, mocking controllers
 * and auth middleware while asserting that routes wire up correctly and middleware
 * behaves as expected.
 *
 * Scenarios covered:
 * - Public GET routes for blogs, articles, and daily metrics
 * - Protected POST routes for creating blogs/articles and adding daily metrics
 * - verifyToken middleware allowing or blocking access
 */

import createRouter from "../../../src/routes/zachtothegymRoutes";
const Controller = {
    getBlogs: vi.fn((_req, res) => res.json([{ id: 1, title: "Hello" }])),
    getSingleBlogById: vi.fn((req, res) =>
        res.json({ id: Number(req.params.id) })
    ),
    createNewBlog: vi.fn((_req, res) => res.status(201).json({ ok: true })),
    getArticles: vi.fn((_req, res) => res.json([{ id: 1, title: "A1" }])),
    getSingleArticleById: vi.fn((req, res) =>
        res.json({ id: Number(req.params.id) })
    ),
    createNewArticle: vi.fn((_req, res) => res.status(201).json({ ok: true })),
    addDailyMetrics: vi.fn((_req, res) => res.status(200).json({ ok: true })),
    getDailyMetrics: vi.fn((_req, res) => res.json([{ date: "2025-09-01" }])),
};
const verifyToken = vi.fn((_req, _res, next) => next());

function makeApp() {
    const app = express();
    app.use(express.json());
    const router = createRouter(Controller, { verifyToken });
    app.use("/zachtothegym", router);
    return app;
}

describe("zachtothegymRoutes (integration)", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    // ---- public routes ----
    describe("GET /zachtothegym/blogs", () => {
        // Should return 200 and call getBlogs
        it("GET /zachtothegym/blogs hits getBlogs", async () => {
            const res = await request(app).get("/zachtothegym/blogs");
            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ id: 1, title: "Hello" }]);
            expect(Controller.getBlogs).toHaveBeenCalledTimes(1);
            expect(verifyToken).not.toHaveBeenCalled(); // not protected
        });
    });

    describe("GET /zachtothegym/blogs/:id", () => {
        // Should pass :id and call getSingleBlogById
        it("GET /zachtothegym/blogs/:id passes :id and hits getSingleBlogById", async () => {
            const res = await request(app).get("/zachtothegym/blogs/42");
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ id: 42 });
            expect(Controller.getSingleBlogById).toHaveBeenCalledTimes(1);
        });
    });

    describe("GET /zachtothegym/articles", () => {
        // Should return 200 and call getArticles
        it("GET /zachtothegym/articles hits getArticles", async () => {
            const res = await request(app).get("/zachtothegym/articles");
            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ id: 1, title: "A1" }]);
            expect(Controller.getArticles).toHaveBeenCalledTimes(1);
        });
    });

    describe("GET /zachtothegym/articles/:id", () => {
        // Should pass :id and call getSingleArticleById
        it("GET /zachtothegym/articles/:id hits getSingleArticleById", async () => {
            const res = await request(app).get("/zachtothegym/articles/7");
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ id: 7 });
            expect(Controller.getSingleArticleById).toHaveBeenCalledTimes(1);
        });
    });

    describe("GET /zachtothegym/daily-metrics", () => {
        // Should return 200 and call getDailyMetrics
        it("GET /zachtothegym/daily-metrics hits getDailyMetrics", async () => {
            const res = await request(app).get("/zachtothegym/daily-metrics");
            expect(res.status).toBe(200);
            expect(res.body).toEqual([{ date: "2025-09-01" }]);
            expect(Controller.getDailyMetrics).toHaveBeenCalledTimes(1);
            expect(verifyToken).not.toHaveBeenCalled();
        });
    });

    // ---- protected routes (verifyToken) ----
    describe("POST /zachtothegym/blogs", () => {
        // Should call verifyToken then createNewBlog and return 201
        it("POST /zachtothegym/blogs calls verifyToken then createNewBlog", async () => {
            const res = await request(app)
                .post("/zachtothegym/blogs")
                .send({ title: "New", content: "Body" });

            expect(res.status).toBe(201);
            expect(verifyToken).toHaveBeenCalledTimes(1);
            expect(Controller.createNewBlog).toHaveBeenCalledTimes(1);
        });

        // Should allow verifyToken to block with 401 and skip handler
        it("verifyToken can block: returns 401 and skips handler", async () => {
            (
                verifyToken as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce((_req, res) =>
                res.status(401).json({ message: "Unauthorized" })
            );

            const res = await request(app)
                .post("/zachtothegym/blogs")
                .send({ title: "New", content: "Body" });

            expect(res.status).toBe(401);
            expect(res.body.message).toBe("Unauthorized");
            expect(Controller.createNewBlog).not.toHaveBeenCalled();
        });
    });

    describe("POST /zachtothegym/articles", () => {
        // Should call verifyToken then createNewArticle and return 201
        it("POST /zachtothegym/articles calls verifyToken then createNewArticle", async () => {
            const res = await request(app).post("/zachtothegym/articles").send({
                title: "T",
                summary: "S",
                content: "C",
                categories: [],
            });

            expect(res.status).toBe(201);
            expect(verifyToken).toHaveBeenCalledTimes(1);
            expect(Controller.createNewArticle).toHaveBeenCalledTimes(1);
        });
    });

    describe("POST /zachtothegym/daily-metrics", () => {
        // Should call verifyToken then addDailyMetrics and return 200
        it("POST /zachtothegym/daily-metrics calls verifyToken then addDailyMetrics", async () => {
            const res = await request(app)
                .post("/zachtothegym/daily-metrics")
                .send({ date: "2025-09-01" });

            expect(res.status).toBe(200);
            expect(verifyToken).toHaveBeenCalledTimes(1);
            expect(Controller.addDailyMetrics).toHaveBeenCalledTimes(1);
        });
    });
});
