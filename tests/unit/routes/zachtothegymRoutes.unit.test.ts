import { describe, it, expect, vi, beforeEach } from "vitest";
import express from "express";
import request from "supertest";

const h = vi.hoisted(() => ({
    ctrl: {
        getBlogs: vi.fn((_req, res) => res.json([{ id: 1, title: "Hello" }])),
        getSingleBlogById: vi.fn((req, res) =>
            res.json({ id: Number(req.params.id) })
        ),
        createNewBlog: vi.fn((_req, res) => res.status(201).json({ ok: true })),
        getArticles: vi.fn((_req, res) => res.json([{ id: 1, title: "A1" }])),
        getSingleArticleById: vi.fn((req, res) =>
            res.json({ id: Number(req.params.id) })
        ),
        createNewArticle: vi.fn((_req, res) =>
            res.status(201).json({ ok: true })
        ),
        addDailyMetrics: vi.fn((_req, res) =>
            res.status(200).json({ ok: true })
        ),
        getDailyMetrics: vi.fn((_req, res) =>
            res.json([{ date: "2025-09-01" }])
        ),
    },
    mw: {
        verifyToken: vi.fn((_req, _res, next) => next()),
    },
}));

import createRouter from "../../../src/routes/zachtothegymRoutes";

function makeApp() {
    const app = express();
    app.use(express.json());
    const router = createRouter(h.ctrl, h.mw);
    app.use("/zachtothegym", router);
    return app;
}

describe("zachtothegymRoutes (unit)", () => {
    let app: express.Express;
    beforeEach(() => {
        app = makeApp();
        vi.clearAllMocks();
    });

    it("GET /zachtothegym/blogs routes to controller.getBlogs", async () => {
        const res = await request(app).get("/zachtothegym/blogs");
        expect(res.status).toBe(200);
        expect(res.body).toEqual([{ id: 1, title: "Hello" }]);
        expect(h.ctrl.getBlogs).toHaveBeenCalledTimes(1);
    });

    it("POST /zachtothegym/blogs calls verifyToken then createNewBlog", async () => {
        const res = await request(app)
            .post("/zachtothegym/blogs")
            .send({ title: "New", content: "Body" });
        expect(res.status).toBe(201);
        expect(h.mw.verifyToken).toHaveBeenCalledTimes(1);
        expect(h.ctrl.createNewBlog).toHaveBeenCalledTimes(1);
    });
});
