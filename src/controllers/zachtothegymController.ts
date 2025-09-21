import { Request, Response } from "express";
import type { ParamsDictionary } from "express-serve-static-core";
import {
    getAllBlogs as getAllBlogsFn,
    getBlogById as getBlogByIdFn,
    createBlog as createBlogFn,
} from "../services/blogsService";
import {
    getAllArticles as getAllArticlesFn,
    getArticleById as getArticleByIdFn,
    createArticle as createArticleFn,
} from "../services/articlesService";
import {
    saveDailyMetrics as saveDailyMetricsFn,
    getMetricsInRange as getMetricsInRangeFn,
} from "../services/metricsService";
import { DailyMetrics } from "../types/dailyMetrics";
import { ZACHTOTHEGYM_ERRORS } from "../config/zachtothegymErrors";
import { validationResult, type ValidationError } from "express-validator";

type BlogIdParams = { id: string } & ParamsDictionary;
type ArticleIdParams = { id: string } & ParamsDictionary;
type MetricsQuery = { start: string; end: string };

export type ZTGServices = {
    getAllBlogs: typeof getAllBlogsFn;
    getBlogById: typeof getBlogByIdFn;
    createBlog: typeof createBlogFn;
    getAllArticles: typeof getAllArticlesFn;
    getArticleById: typeof getArticleByIdFn;
    createArticle: typeof createArticleFn;
    saveDailyMetrics: typeof saveDailyMetricsFn;
    getMetricsInRange: typeof getMetricsInRangeFn;
};

export type ZTGControllerHandlers = {
    getBlogs: (_: Request, res: Response) => Promise<void>;
    getSingleBlogById: (req: Request, res: Response) => Promise<void>;
    createNewBlog: (req: Request, res: Response) => Promise<void>;
    getArticles: (_: Request, res: Response) => Promise<void>;
    getSingleArticleById: (req: Request, res: Response) => Promise<void>;
    createNewArticle: (req: Request, res: Response) => Promise<void>;
    addDailyMetrics: (req: Request, res: Response) => Promise<void>;
    getDailyMetrics: (req: Request, res: Response) => Promise<void>;
};

export function createZachtothegymController(
    services: ZTGServices
): ZTGControllerHandlers {
    return {
        /** Gets all blogs */
        getBlogs: async (_: Request, res: Response) => {
            try {
                const blogs = await services.getAllBlogs();
                res.status(200).json(blogs);
                return;
            } catch (_e) {
                res.status(500).json({
                    error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_BLOGS,
                });
                return;
            }
        },
        /** Gets a single blog by ID */
        getSingleBlogById: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    errors: errors
                        .array()
                        .map((e: ValidationError) => String(e.msg)),
                });
                return;
            }
            const blogId = Number((req.params as Partial<BlogIdParams>).id);
            try {
                const blog = await services.getBlogById(blogId);
                if (!blog) {
                    res.status(404).json({
                        error: ZACHTOTHEGYM_ERRORS.BLOG_NOT_FOUND,
                    });
                    return;
                }
                res.status(200).json(blog);
                return;
            } catch (_e) {
                res.status(500).json({
                    error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_BLOG,
                });
                return;
            }
        },
        /** Creates a new blog */
        createNewBlog: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    errors: errors
                        .array()
                        .map((e: ValidationError) => String(e.msg)),
                });
                return;
            }
            const { title, content, categories } = req.body as {
                title: string;
                content: string;
                categories: string[];
            };
            try {
                const newBlog = await services.createBlog(
                    title,
                    content,
                    categories
                );
                res.status(201).json(newBlog);
                return;
            } catch (_e) {
                res.status(500).json({
                    error: ZACHTOTHEGYM_ERRORS.FAILED_CREATE_BLOG,
                });
                return;
            }
        },
        /** Gets all articles */
        getArticles: async (_: Request, res: Response) => {
            try {
                const articles = await services.getAllArticles();
                res.status(200).json(articles);
                return;
            } catch (_e) {
                res.status(500).json({
                    error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_ARTICLES,
                });
                return;
            }
        },
        /** Gets a single article by ID */
        getSingleArticleById: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    errors: errors
                        .array()
                        .map((e: ValidationError) => String(e.msg)),
                });
                return;
            }
            const articleId = Number(
                (req.params as Partial<ArticleIdParams>).id
            );
            try {
                const article = await services.getArticleById(articleId);
                if (!article) {
                    res.status(404).json({
                        error: ZACHTOTHEGYM_ERRORS.ARTICLE_NOT_FOUND,
                    });
                    return;
                }
                res.status(200).json(article);
                return;
            } catch (_e) {
                res.status(500).json({
                    error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_ARTICLE,
                });
                return;
            }
        },
        /** Creates a new article */
        createNewArticle: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    errors: errors
                        .array()
                        .map((e: ValidationError) => String(e.msg)),
                });
                return;
            }
            const { title, summary, content, categories } = req.body as {
                title: string;
                summary: string;
                content: string;
                categories: string[];
            };
            try {
                const newArticle = await services.createArticle(
                    title,
                    summary,
                    content,
                    categories
                );
                res.status(201).json(newArticle);
                return;
            } catch (_e) {
                res.status(500).json({
                    error: ZACHTOTHEGYM_ERRORS.FAILED_CREATE_ARTICLE,
                });
                return;
            }
        },
        /** Adds daily metrics */
        addDailyMetrics: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    errors: errors
                        .array()
                        .map((e: ValidationError) => String(e.msg)),
                });
                return;
            }
            const metrics: DailyMetrics = req.body as DailyMetrics;
            try {
                await services.saveDailyMetrics(metrics);
                res.status(200).json({
                    message: "Daily metrics saved successfully.",
                });
                return;
            } catch (_e) {
                console.error("Error inserting daily metrics:", _e);
                res.status(500).json({
                    error: ZACHTOTHEGYM_ERRORS.FAILED_SAVE_METRICS,
                });
                return;
            }
        },
        /** Gets daily metrics by range */
        getDailyMetrics: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                res.status(400).json({
                    errors: errors
                        .array()
                        .map((e: ValidationError) => String(e.msg)),
                });
                return;
            }
            const { start, end } = req.query as unknown as MetricsQuery;
            try {
                const results = await services.getMetricsInRange(start, end);
                res.status(200).json(results);
                return;
            } catch (_e) {
                console.error("Error fetching daily metrics:", _e);
                res.status(500).json({
                    error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_METRICS,
                });
                return;
            }
        },
    };
}
