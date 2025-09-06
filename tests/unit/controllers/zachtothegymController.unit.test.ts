import { describe, it, expect, vi, beforeEach } from "vitest";
// Global mock for express-validator's validationResult
vi.mock("express-validator", async () => {
    const actual = await vi.importActual<typeof import("express-validator")>(
        "express-validator"
    );
    return {
        ...actual,
        validationResult: vi.fn(),
    };
});
import { validationResult } from "express-validator";
import { Request, Response } from "express";
import * as BlogsSvc from "../../../src/services/blogsService";
import * as ArticlesSvc from "../../../src/services/articlesService";
import * as MetricsSvc from "../../../src/services/metricsService";
import * as Controller from "../../../src/controllers/zachtothegymController";
import { ZACHTOTHEGYM_ERRORS } from "../../../src/config/zachtothegymErrors";

function mockRes() {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnThis();
    res.json = vi.fn().mockReturnThis();
    return res as Response;
}

describe("zachtothegymController unit", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        // By default, validationResult returns isEmpty true (no validation errors)
        (
            validationResult as unknown as ReturnType<typeof vi.fn>
        ).mockImplementation(() => ({
            isEmpty: () => true,
            array: () => [],
        }));
    });

    describe("getBlogs", () => {
        it("returns 200 and blogs on success", async () => {
            const req = {} as Request;
            const res = mockRes();
            vi.spyOn(BlogsSvc, "getAllBlogs").mockResolvedValue([
                {
                    id: 1,
                    title: "Test Blog",
                    content: "Content",
                    categories: [],
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ]);
            await Controller.getBlogs(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ id: 1, title: "Test Blog" }),
            ]);
        });
        it("returns 500 on error", async () => {
            const req = {} as Request;
            const res = mockRes();
            vi.spyOn(BlogsSvc, "getAllBlogs").mockRejectedValue(
                new Error("fail")
            );
            await Controller.getBlogs(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
            expect(res.json).toHaveBeenCalledWith({
                error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_BLOGS,
            });
        });
    });

    describe("getSingleBlogById", () => {
        it("returns 400 if validation fails", async () => {
            const req = { params: { id: "1" } } as unknown as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));
            await Controller.getSingleBlogById(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: ["Invalid"],
            });
        });
        it("returns 404 if not found", async () => {
            const req = { params: { id: "2" } } as unknown as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            vi.spyOn(BlogsSvc, "getBlogById").mockResolvedValue(null);
            await Controller.getSingleBlogById(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
        it("returns 200 and blog if found", async () => {
            const req = { params: { id: "3" } } as unknown as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            const blog = {
                id: 3,
                title: "Blog",
                content: "Content",
                categories: ["cat1"],
                created_at: new Date(),
                updated_at: new Date(),
            };
            vi.spyOn(BlogsSvc, "getBlogById").mockResolvedValue(blog);
            await Controller.getSingleBlogById(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ id: 3, title: "Blog" })
            );
        });
        it("returns 500 on error", async () => {
            const req = { params: { id: "4" } } as unknown as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            vi.spyOn(BlogsSvc, "getBlogById").mockRejectedValue(
                new Error("fail")
            );
            await Controller.getSingleBlogById(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
    describe("createNewBlog", () => {
        it("returns 400 if validation fails", async () => {
            const req = { body: {} } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));
            await Controller.createNewBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            expect(res.json).toHaveBeenCalledWith({
                errors: ["Invalid"],
            });
        });
        it("returns 201 and blog on success", async () => {
            const req = {
                body: { title: "T", content: "C", categories: [] },
            } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            const blog = {
                id: 1,
                title: "T",
                content: "C",
                categories: [],
                created_at: new Date(),
                updated_at: new Date(),
            };
            vi.spyOn(BlogsSvc, "createBlog").mockResolvedValue(blog);
            await Controller.createNewBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1, title: "T" })
            );
        });
        it("returns 500 on error", async () => {
            const req = {
                body: { title: "T", content: "C", categories: [] },
            } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            vi.spyOn(BlogsSvc, "createBlog").mockRejectedValue(
                new Error("fail")
            );
            await Controller.createNewBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("getArticles", () => {
        it("returns 200 and articles on success", async () => {
            const req = {} as Request;
            const res = mockRes();
            vi.spyOn(ArticlesSvc, "getAllArticles").mockResolvedValue([
                {
                    id: 1,
                    title: "A",
                    summary: "S",
                    content: "C",
                    categories: [],
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ]);
            await Controller.getArticles(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ id: 1, title: "A" }),
            ]);
        });
        it("returns 500 on error", async () => {
            const req = {} as Request;
            const res = mockRes();
            vi.spyOn(ArticlesSvc, "getAllArticles").mockRejectedValue(
                new Error("fail")
            );
            await Controller.getArticles(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("getSingleArticleById", () => {
        it("returns 400 if validation fails", async () => {
            const req = { params: { id: "1" } } as unknown as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));
            await Controller.getSingleArticleById(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
        it("returns 400 if validation fails", async () => {
            const req = { body: {} } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));
            await Controller.createNewBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
        it("returns 201 and new blog on success", async () => {
            const req = {
                body: { title: "T", content: "C", categories: [] },
            } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            const blog = {
                id: 1,
                title: "T",
                content: "C",
                categories: [],
                created_at: new Date(),
                updated_at: new Date(),
            };
            vi.spyOn(BlogsSvc, "createBlog").mockResolvedValue(blog);
            await Controller.createNewBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1, title: "T" })
            );
        });
        it("returns 500 on error", async () => {
            const req = {
                body: { title: "T", content: "C", categories: [] },
            } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            vi.spyOn(BlogsSvc, "createBlog").mockRejectedValue(
                new Error("fail")
            );
            await Controller.createNewBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
        it("returns 400 if validation fails", async () => {
            const req = { body: {} } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));
            await Controller.createNewArticle(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
        it("returns 201 and new article on success", async () => {
            const req = {
                body: {
                    title: "T",
                    summary: "S",
                    content: "C",
                    categories: [],
                },
            } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            const article = {
                id: 1,
                title: "T",
                summary: "S",
                content: "C",
                categories: [],
                created_at: new Date(),
                updated_at: new Date(),
            };
            vi.spyOn(ArticlesSvc, "createArticle").mockResolvedValue(article);
            await Controller.createNewArticle(req, res);
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ id: 1, title: "T" })
            );
        });
        it("returns 500 on error", async () => {
            const req = {
                body: {
                    title: "T",
                    summary: "S",
                    content: "C",
                    categories: [],
                },
            } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            vi.spyOn(ArticlesSvc, "createArticle").mockRejectedValue(
                new Error("fail")
            );
            await Controller.createNewArticle(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("addDailyMetrics", () => {
        it("returns 400 if validation fails", async () => {
            const req = { body: {} } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));
            await Controller.addDailyMetrics(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
        it("returns 200 on success", async () => {
            const req = { body: { date: "2023-01-01", value: 1 } } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            vi.spyOn(MetricsSvc, "saveDailyMetrics").mockResolvedValue(
                undefined
            );
            await Controller.addDailyMetrics(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                message: expect.any(String),
            });
        });
        it("returns 500 on error", async () => {
            const req = { body: { date: "2023-01-01", value: 1 } } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            vi.spyOn(MetricsSvc, "saveDailyMetrics").mockRejectedValue(
                new Error("fail")
            );
            await Controller.addDailyMetrics(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("getDailyMetrics", () => {
        it("returns 400 if validation fails", async () => {
            const req = { query: {} } as unknown as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));
            await Controller.getDailyMetrics(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
        it("returns 200 and metrics on success", async () => {
            const req = {
                query: { start: "2023-01-01", end: "2023-01-31" },
            } as unknown as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            vi.spyOn(MetricsSvc, "getMetricsInRange").mockResolvedValue([
                { date: "2023-01-01", weight: 180, bmi: 25 },
            ]);
            await Controller.getDailyMetrics(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([
                { date: "2023-01-01", weight: 180, bmi: 25 },
            ]);
        });
        it("returns 500 on error", async () => {
            const req = {
                query: { start: "2023-01-01", end: "2023-01-31" },
            } as unknown as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => true,
            }));
            vi.spyOn(MetricsSvc, "getMetricsInRange").mockRejectedValue(
                new Error("fail")
            );
            await Controller.getDailyMetrics(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
