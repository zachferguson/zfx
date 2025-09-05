import { describe, it, expect, beforeEach, vi } from "vitest";
import express from "express";
import request from "supertest";

/**
 * Mock the controller and middleware modules the router imports.
 * We export vi.fn() handlers so we can assert calls and tweak behavior per test.
 */
vi.mock("../controllers/zachtothegymController", () => {
    return {
        getBlogs: vi.fn((req, res) => res.json([{ id: 1, title: "Hello" }])),
        getSingleBlogById: vi.fn((req, res) =>
            res.json({ id: Number(req.params.id) })
        ),
        createNewBlog: vi.fn((req, res) => res.status(201).json({ ok: true })),

        getArticles: vi.fn((req, res) => res.json([{ id: 1, title: "A1" }])),
        getSingleArticleById: vi.fn((req, res) =>
            res.json({ id: Number(req.params.id) })
        ),
        createNewArticle: vi.fn((req, res) =>
            res.status(201).json({ ok: true })
        ),

        addDailyMetrics: vi.fn((req, res) =>
            res.status(200).json({ ok: true })
        ),
        getDailyMetrics: vi.fn((req, res) =>
            res.json([{ date: "2025-09-01" }])
        ),
    };
});

vi.mock("../middleware/authenticationMiddleware", () => ({
    verifyToken: vi.fn((_req, _res, next) => next()),
}));

// Import AFTER mocks so router gets the mocked deps
import router from "./zachtothegymRoutes";
import * as Controller from "../controllers/zachtothegymController";
import { verifyToken } from "../middleware/authenticationMiddleware";

function makeApp() {
    const app = express();
    app.use(express.json());
    app.use("/zachtothegym", router);
    return app;
}

describe("zachtothegym router", () => {
    let app: express.Express;

    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    // ---- public routes ----

    it("GET /zachtothegym/blogs hits getBlogs", async () => {
        const res = await request(app).get("/zachtothegym/blogs");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 1, title: "Hello" }]);
        expect(Controller.getBlogs).toHaveBeenCalledTimes(1);
        expect(verifyToken).not.toHaveBeenCalled(); // not protected
    });

    it("GET /zachtothegym/blogs/:id passes :id and hits getSingleBlogById", async () => {
        const res = await request(app).get("/zachtothegym/blogs/42");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 42 });
        expect(Controller.getSingleBlogById).toHaveBeenCalledTimes(1);
    });

    it("GET /zachtothegym/articles hits getArticles", async () => {
        const res = await request(app).get("/zachtothegym/articles");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 1, title: "A1" }]);
        expect(Controller.getArticles).toHaveBeenCalledTimes(1);
    });

    it("GET /zachtothegym/articles/:id hits getSingleArticleById", async () => {
        const res = await request(app).get("/zachtothegym/articles/7");
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ id: 7 });
        expect(Controller.getSingleArticleById).toHaveBeenCalledTimes(1);
    });

    it("GET /zachtothegym/daily-metrics hits getDailyMetrics", async () => {
        const res = await request(app).get("/zachtothegym/daily-metrics");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ date: "2025-09-01" }]);
        expect(Controller.getDailyMetrics).toHaveBeenCalledTimes(1);
        expect(verifyToken).not.toHaveBeenCalled();
    });

    // ---- protected routes (verifyToken) ----

    it("POST /zachtothegym/blogs calls verifyToken then createNewBlog", async () => {
        const res = await request(app)
            .post("/zachtothegym/blogs")
            .send({ title: "New", content: "Body" });

        expect(res.status).toBe(201);
        expect(verifyToken).toHaveBeenCalledTimes(1);
        expect(Controller.createNewBlog).toHaveBeenCalledTimes(1);
    });

    it("POST /zachtothegym/articles calls verifyToken then createNewArticle", async () => {
        const res = await request(app)
            .post("/zachtothegym/articles")
            .send({ title: "T", summary: "S", content: "C", categories: [] });

        expect(res.status).toBe(201);
        expect(verifyToken).toHaveBeenCalledTimes(1);
        expect(Controller.createNewArticle).toHaveBeenCalledTimes(1);
    });

    it("POST /zachtothegym/daily-metrics calls verifyToken then addDailyMetrics", async () => {
        const res = await request(app)
            .post("/zachtothegym/daily-metrics")
            .send({ date: "2025-09-01" });

        expect(res.status).toBe(200);
        expect(verifyToken).toHaveBeenCalledTimes(1);
        expect(Controller.addDailyMetrics).toHaveBeenCalledTimes(1);
    });

    it("verifyToken can block: returns 401 and skips handler", async () => {
        (
            verifyToken as unknown as ReturnType<typeof vi.fn>
        ).mockImplementationOnce((req, res) =>
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
