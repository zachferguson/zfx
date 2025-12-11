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
import { validationResult } from "express-validator";
import { sendError } from "../utils/sendError";

type BlogIdParams = { id: string } & ParamsDictionary;
type ArticleIdParams = { id: string } & ParamsDictionary;
type MetricsQuery = { start: string; end: string };

/**
 * Functions required by the Zachtothegym controller.
 */
export type ZTGServices = {
    /** Fetches all blogs. */
    getAllBlogs: typeof getAllBlogsFn;
    /** Fetches a single blog by id. */
    getBlogById: typeof getBlogByIdFn;
    /** Creates a new blog. */
    createBlog: typeof createBlogFn;
    /** Fetches all articles. */
    getAllArticles: typeof getAllArticlesFn;
    /** Fetches a single article by id. */
    getArticleById: typeof getArticleByIdFn;
    /** Creates a new article. */
    createArticle: typeof createArticleFn;
    /** Saves daily metrics payload. */
    saveDailyMetrics: typeof saveDailyMetricsFn;
    /** Retrieves metrics within a date range. */
    getMetricsInRange: typeof getMetricsInRangeFn;
};

/**
 * Map of Zachtothegym controller handlers.
 */
export type ZTGControllerHandlers = {
    /** Responds with all blogs. */
    getBlogs: (_: Request, res: Response) => Promise<void>;
    /** Responds with a single blog by id. */
    getSingleBlogById: (req: Request, res: Response) => Promise<void>;
    /** Creates and returns a new blog. */
    createNewBlog: (req: Request, res: Response) => Promise<void>;
    /** Responds with all articles. */
    getArticles: (_: Request, res: Response) => Promise<void>;
    /** Responds with a single article by id. */
    getSingleArticleById: (req: Request, res: Response) => Promise<void>;
    /** Creates and returns a new article. */
    createNewArticle: (req: Request, res: Response) => Promise<void>;
    /** Saves daily metrics. */
    addDailyMetrics: (req: Request, res: Response) => Promise<void>;
    /** Responds with metrics within a date range. */
    getDailyMetrics: (req: Request, res: Response) => Promise<void>;
};

/**
 * Creates handlers for Zachtothegym endpoints.
 *
 * @param {ZTGServices} services - Service functions for blogs, articles, and metrics.
 * @returns {ZTGControllerHandlers} Object with handler functions.
 */
export const createZachtothegymController = (
    services: ZTGServices
): ZTGControllerHandlers => {
    return {
        /**
         * Gets all blogs.
         *
         * @see GET /blogs
         * @param {Request} _ - Express request (no params/body expected).
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks On success: 200 with array of blogs. On server error: 500 `{ error }`.
         */
        getBlogs: async (_: Request, res: Response) => {
            try {
                const blogs = await services.getAllBlogs();
                res.status(200).json(blogs);
                return;
            } catch (_e) {
                sendError(res, 500, ZACHTOTHEGYM_ERRORS.FAILED_FETCH_BLOGS);
                return;
            }
        },
        /**
         * Gets a single blog by ID.
         *
         * @see GET /blogs/:id
         * @param {Request} req - Express request; params `{ id }`.
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks On success: 200 with blog. On validation error: 400 `{ errors }`. On not found: 404 `{ error }`. On server error: 500 `{ error }`.
         */
        getSingleBlogById: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(
                    res,
                    400,
                    errors.array().map((e) => String(e.msg))
                );
                return;
            }
            const blogId = Number((req.params as Partial<BlogIdParams>).id);
            try {
                const blog = await services.getBlogById(blogId);
                if (!blog) {
                    sendError(res, 404, ZACHTOTHEGYM_ERRORS.BLOG_NOT_FOUND);
                    return;
                }
                res.status(200).json(blog);
                return;
            } catch (_e) {
                sendError(res, 500, ZACHTOTHEGYM_ERRORS.FAILED_FETCH_BLOG);
                return;
            }
        },
        /**
         * Creates a new blog.
         *
         * @see POST /blogs
         * @param {Request} req - Express request; body `{ title, content, categories }`.
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks On success: 201 with created blog. On validation error: 400 `{ errors }`. On server error: 500 `{ error }`.
         */
        createNewBlog: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(
                    res,
                    400,
                    errors.array().map((e) => String(e.msg))
                );
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
                sendError(res, 500, ZACHTOTHEGYM_ERRORS.FAILED_CREATE_BLOG);
                return;
            }
        },
        /**
         * Gets all articles.
         *
         * @see GET /articles
         * @param {Request} _ - Express request (no params/body expected).
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks On success: 200 with array of articles. On server error: 500 `{ error }`.
         */
        getArticles: async (_: Request, res: Response) => {
            try {
                const articles = await services.getAllArticles();
                res.status(200).json(articles);
                return;
            } catch (_e) {
                sendError(res, 500, ZACHTOTHEGYM_ERRORS.FAILED_FETCH_ARTICLES);
                return;
            }
        },
        /**
         * Gets a single article by ID.
         *
         * @see GET /articles/:id
         * @param {Request} req - Express request; params `{ id }`.
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks On success: 200 with article. On validation error: 400 `{ errors }`. On not found: 404 `{ error }`. On server error: 500 `{ error }`.
         */
        getSingleArticleById: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(
                    res,
                    400,
                    errors.array().map((e) => String(e.msg))
                );
                return;
            }
            const articleId = Number(
                (req.params as Partial<ArticleIdParams>).id
            );
            try {
                const article = await services.getArticleById(articleId);
                if (!article) {
                    sendError(res, 404, ZACHTOTHEGYM_ERRORS.ARTICLE_NOT_FOUND);
                    return;
                }
                res.status(200).json(article);
                return;
            } catch (_e) {
                sendError(res, 500, ZACHTOTHEGYM_ERRORS.FAILED_FETCH_ARTICLE);
                return;
            }
        },
        /**
         * Creates a new article.
         *
         * @see POST /articles
         * @param {Request} req - Express request; body `{ title, summary, content, categories }`.
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks On success: 201 with created article. On validation error: 400 `{ errors }`. On server error: 500 `{ error }`.
         */
        createNewArticle: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(
                    res,
                    400,
                    errors.array().map((e) => String(e.msg))
                );
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
                sendError(res, 500, ZACHTOTHEGYM_ERRORS.FAILED_CREATE_ARTICLE);
                return;
            }
        },
        /**
         * Adds daily metrics.
         *
         * @see POST /daily-metrics
         * @param {Request} req - Express request; body `DailyMetrics`.
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks On success: 200 `{ message }`. On validation error: 400 `{ errors }`. On server error: 500 `{ error }`.
         */
        addDailyMetrics: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(
                    res,
                    400,
                    errors.array().map((e) => String(e.msg))
                );
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
                sendError(res, 500, ZACHTOTHEGYM_ERRORS.FAILED_SAVE_METRICS);
                return;
            }
        },
        /**
         * Gets daily metrics by range.
         *
         * @see GET /daily-metrics
         * @param {Request} req - Express request; query `{ start, end }` as ISO strings.
         * @param {Response} res - Express response object.
         * @returns {Promise<void>} Sends response via `res`; no return value.
         * @remarks On success: 200 with metrics array. On validation error: 400 `{ errors }`. On server error: 500 `{ error }`.
         */
        getDailyMetrics: async (req: Request, res: Response) => {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                sendError(
                    res,
                    400,
                    errors.array().map((e) => String(e.msg))
                );
                return;
            }
            const { start, end } = req.query as unknown as MetricsQuery;
            try {
                const results = await services.getMetricsInRange(start, end);
                res.status(200).json(results);
                return;
            } catch (_e) {
                console.error("Error fetching daily metrics:", _e);
                sendError(res, 500, ZACHTOTHEGYM_ERRORS.FAILED_FETCH_METRICS);
                return;
            }
        },
    };
};
