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

// Default-wired handlers that rebuild services per-call so spies/mocks apply
function getDefaultServices(): ZTGServices {
    return {
        getAllBlogs: getAllBlogsFn,
        getBlogById: getBlogByIdFn,
        createBlog: createBlogFn,
        getAllArticles: getAllArticlesFn,
        getArticleById: getArticleByIdFn,
        createArticle: createArticleFn,
        saveDailyMetrics: saveDailyMetricsFn,
        getMetricsInRange: getMetricsInRangeFn,
    };
}

export const getBlogs = async (req: Request, res: Response) =>
    createZachtothegymController(getDefaultServices()).getBlogs(req, res);
export const getSingleBlogById = async (req: Request, res: Response) =>
    createZachtothegymController(getDefaultServices()).getSingleBlogById(
        req,
        res
    );
export const createNewBlog = async (req: Request, res: Response) =>
    createZachtothegymController(getDefaultServices()).createNewBlog(req, res);
export const getArticles = async (req: Request, res: Response) =>
    createZachtothegymController(getDefaultServices()).getArticles(req, res);
export const getSingleArticleById = async (req: Request, res: Response) =>
    createZachtothegymController(getDefaultServices()).getSingleArticleById(
        req,
        res
    );
export const createNewArticle = async (req: Request, res: Response) =>
    createZachtothegymController(getDefaultServices()).createNewArticle(
        req,
        res
    );
export const addDailyMetrics = async (req: Request, res: Response) =>
    createZachtothegymController(getDefaultServices()).addDailyMetrics(
        req,
        res
    );
export const getDailyMetrics = async (req: Request, res: Response) =>
    createZachtothegymController(getDefaultServices()).getDailyMetrics(
        req,
        res
    );

/**
 * Gets a single blog by ID.
 *
 * @route GET /blogs/:id
 * @param {Request} req - Express request object, expects blog id in params
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note On success, responds with 200 and a blog object. On error, responds with 400 (validation), 404 (not found), or 500 (server error) and an error message.
 */

/**
 * Creates a new blog.
 *
 * @route POST /blogs
 * @param {Request} req - Express request object, expects title, content, categories in body
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */

/**
 * Gets all articles.
 *
 * @route GET /articles
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */

/**
 * Gets a single article by ID.
 *
 * @route GET /articles/:id
 * @param {Request} req - Express request object, expects article id in params
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */

/**
 * Creates a new article.
 *
 * @route POST /articles
 * @param {Request} req - Express request object, expects title, summary, content, categories in body
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */

/**
 * Adds daily metrics.
 *
 * @route POST /metrics
 * @param {Request} req - Express request object, expects DailyMetrics in body
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */

/**
 * Gets daily metrics in a date range.
 *
 * @route GET /metrics?start=YYYY-MM-DD&end=YYYY-MM-DD
 * @param {Request} req - Express request object, expects start and end query params
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
