import { describe, it, expect, vi, beforeEach } from "vitest";
// Global mock for express-validator's validationResult
vi.mock("express-validator", async () => {
    const actual =
        await vi.importActual<typeof import("express-validator")>(
            "express-validator"
        );
    return {
        ...actual,
        validationResult: vi.fn(),
    };
});
import { validationResult } from "express-validator";
import { Request, Response } from "express";
import { createZachtothegymController } from "../../../src/controllers/zachtothegymController";
import { ZACHTOTHEGYM_ERRORS } from "../../../src/config/zachtothegymErrors";

function mockRes() {
    const res: Partial<Response> = {};
    res.status = vi.fn().mockReturnThis();
    res.json = vi.fn().mockReturnThis();
    return res as Response;
}

describe("zachtothegymController unit", () => {
    let controller: ReturnType<typeof createZachtothegymController>;
    let services: {
        getAllBlogs: ReturnType<typeof vi.fn>;
        getBlogById: ReturnType<typeof vi.fn>;
        createBlog: ReturnType<typeof vi.fn>;
        getAllArticles: ReturnType<typeof vi.fn>;
        getArticleById: ReturnType<typeof vi.fn>;
        createArticle: ReturnType<typeof vi.fn>;
        saveDailyMetrics: ReturnType<typeof vi.fn>;
        getMetricsInRange: ReturnType<typeof vi.fn>;
    };
    beforeEach(() => {
        vi.restoreAllMocks();
        // By default, validationResult returns isEmpty true (no validation errors)
        (
            validationResult as unknown as ReturnType<typeof vi.fn>
        ).mockImplementation(() => ({
            isEmpty: () => true,
            array: () => [],
        }));

        services = {
            getAllBlogs: vi.fn(),
            getBlogById: vi.fn(),
            createBlog: vi.fn(),
            getAllArticles: vi.fn(),
            getArticleById: vi.fn(),
            createArticle: vi.fn(),
            saveDailyMetrics: vi.fn(),
            getMetricsInRange: vi.fn(),
        };
        controller = createZachtothegymController(services);
    });

    describe("getBlogs", () => {
        it("returns 200 and blogs on success", async () => {
            const req = {} as Request;
            const res = mockRes();
            services.getAllBlogs.mockResolvedValue([
                {
                    id: 1,
                    title: "Test Blog",
                    content: "Content",
                    categories: [],
                    created_at: new Date(),
                    updated_at: new Date(),
                },
            ]);
            await controller.getBlogs(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ id: 1, title: "Test Blog" }),
            ]);
        });
        it("returns 500 on error", async () => {
            const req = {} as Request;
            const res = mockRes();
            services.getAllBlogs.mockRejectedValue(new Error("fail"));
            await controller.getBlogs(req, res);
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
            await controller.getSingleBlogById(req, res);
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
            services.getBlogById.mockResolvedValue(null);
            await controller.getSingleBlogById(req, res);
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
            services.getBlogById.mockResolvedValue(blog);
            await controller.getSingleBlogById(req, res);
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
            services.getBlogById.mockRejectedValue(new Error("fail"));
            await controller.getSingleBlogById(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
    // Consolidated createNewBlog tests (merged from both duplicate blocks)
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
            await controller.createNewBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
            // Some blocks check for errors array, some don't; keep the more complete assertion
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ errors: ["Invalid"] })
            );
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
            services.createBlog.mockResolvedValue(blog);
            await controller.createNewBlog(req, res);
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
            services.createBlog.mockRejectedValue(new Error("fail"));
            await controller.createNewBlog(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });

    describe("getArticles", () => {
        it("returns 200 and articles on success", async () => {
            const req = {} as Request;
            const res = mockRes();
            services.getAllArticles.mockResolvedValue([
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
            await controller.getArticles(req, res);
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith([
                expect.objectContaining({ id: 1, title: "A" }),
            ]);
        });
        it("returns 500 on error", async () => {
            const req = {} as Request;
            const res = mockRes();
            services.getAllArticles.mockRejectedValue(new Error("fail"));
            await controller.getArticles(req, res);
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
            await controller.getSingleArticleById(req, res);
            expect(res.status).toHaveBeenCalledWith(400);
        });
    });

    describe("createNewArticle", () => {
        it("returns 400 if validation fails", async () => {
            const req = { body: {} } as Request;
            const res = mockRes();
            (
                validationResult as unknown as ReturnType<typeof vi.fn>
            ).mockImplementationOnce(() => ({
                isEmpty: () => false,
                array: () => [{ msg: "Invalid" }],
            }));
            await controller.createNewArticle(req, res);
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
                array: () => [],
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
            services.createArticle.mockResolvedValue(article);
            await controller.createNewArticle(req, res);
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
                array: () => [],
            }));
            services.createArticle.mockRejectedValue(new Error("fail"));
            await controller.createNewArticle(req, res);
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
            await controller.addDailyMetrics(req, res);
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
            services.saveDailyMetrics.mockResolvedValue(undefined);
            await controller.addDailyMetrics(req, res);
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
            services.saveDailyMetrics.mockRejectedValue(new Error("fail"));
            await controller.addDailyMetrics(req, res);
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
            await controller.getDailyMetrics(req, res);
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
            services.getMetricsInRange.mockResolvedValue([
                { date: "2023-01-01", weight: 180, bmi: 25 },
            ]);
            await controller.getDailyMetrics(req, res);
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
            services.getMetricsInRange.mockRejectedValue(new Error("fail"));
            await controller.getDailyMetrics(req, res);
            expect(res.status).toHaveBeenCalledWith(500);
        });
    });
});
