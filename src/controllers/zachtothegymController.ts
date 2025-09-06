import { Request, Response } from "express";
import { getAllBlogs, getBlogById, createBlog } from "../services/blogsService";
import {
    getAllArticles,
    getArticleById,
    createArticle,
} from "../services/articlesService";
import {
    saveDailyMetrics,
    getMetricsInRange,
} from "../services/metricsService";
import { DailyMetrics } from "../types/dailyMetrics";
import { ZACHTOTHEGYM_ERRORS } from "../config/zachtothegymErrors";
import { body, param, query, validationResult } from "express-validator";

/**
 * Gets all blogs.
 *
 * @route GET /blogs
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return value; sends response via res)
 * @note On success, responds with 200 and an array of blogs. On error, responds with 500 and an error message.
 */
export const getBlogs = async (req: Request, res: Response) => {
    try {
        const blogs = await getAllBlogs();
        res.json(blogs);
        return;
    } catch (e) {
        res.status(500).json({ error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_BLOGS });
        return;
    }
};

/**
 * Gets a single blog by ID.
 *
 * @route GET /blogs/:id
 * @param {Request} req - Express request object, expects blog id in params
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return value; sends response via res)
 * @note On success, responds with 200 and a blog object. On error, responds with 400 (validation), 404 (not found), or 500 (server error) and an error message.
 */
export const validateGetSingleBlogById = [
    param("id")
        .isInt({ gt: 0 })
        .withMessage(ZACHTOTHEGYM_ERRORS.INVALID_BLOG_ID),
];

export const getSingleBlogById = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const blogId = Number(req.params.id);
    try {
        const blog = await getBlogById(blogId);
        if (!blog) {
            res.status(404).json({ error: ZACHTOTHEGYM_ERRORS.BLOG_NOT_FOUND });
            return;
        }
        res.json(blog);
        return;
    } catch (e) {
        res.status(500).json({ error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_BLOG });
        return;
    }
};

/**
 * Creates a new blog.
 *
 * @route POST /blogs
 * @param {Request} req - Express request object, expects title, content, categories in body
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return type; see note)
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const validateCreateNewBlog = [
    body("title")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_BLOG_FIELDS),
    body("content")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_BLOG_FIELDS),
];

export const createNewBlog = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const { title, content, categories } = req.body;
    try {
        const newBlog = await createBlog(title, content, categories);
        res.status(201).json(newBlog);
        return;
    } catch (e) {
        res.status(500).json({ error: ZACHTOTHEGYM_ERRORS.FAILED_CREATE_BLOG });
    }
};

/**
 * Gets all articles.
 *
 * @route GET /articles
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return type; see note)
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const getArticles = async (req: Request, res: Response) => {
    try {
        const articles = await getAllArticles();
        res.json(articles);
        return;
    } catch (e) {
        res.status(500).json({
            error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_ARTICLES,
        });
        return;
    }
};

/**
 * Gets a single article by ID.
 *
 * @route GET /articles/:id
 * @param {Request} req - Express request object, expects article id in params
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return type; see note)
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const validateGetSingleArticleById = [
    param("id")
        .isInt({ gt: 0 })
        .withMessage(ZACHTOTHEGYM_ERRORS.INVALID_ARTICLE_ID),
];

export const getSingleArticleById = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const articleId = Number(req.params.id);
    try {
        const article = await getArticleById(articleId);
        if (!article) {
            res.status(404).json({
                error: ZACHTOTHEGYM_ERRORS.ARTICLE_NOT_FOUND,
            });
            return;
        }
        res.json(article);
        return;
    } catch (e) {
        res.status(500).json({
            error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_ARTICLE,
        });
        return;
    }
};

/**
 * Creates a new article.
 *
 * @route POST /articles
 * @param {Request} req - Express request object, expects title, summary, content, categories in body
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return type; see note)
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const validateCreateNewArticle = [
    body("title")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_ARTICLE_FIELDS),
    body("summary")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_ARTICLE_FIELDS),
    body("content")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_ARTICLE_FIELDS),
    body("categories")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_ARTICLE_FIELDS),
];

export const createNewArticle = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const { title, summary, content, categories } = req.body;
    try {
        const newArticle = await createArticle(
            title,
            summary,
            content,
            categories
        );
        res.status(201).json(newArticle);
        return;
    } catch (e) {
        res.status(500).json({
            error: ZACHTOTHEGYM_ERRORS.FAILED_CREATE_ARTICLE,
        });
        return;
    }
};

/**
 * Adds daily metrics.
 *
 * @route POST /metrics
 * @param {Request} req - Express request object, expects DailyMetrics in body
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return type; see note)
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const validateAddDailyMetrics = [
    body("date")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_METRICS_DATE),
];

export const addDailyMetrics = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const metrics: DailyMetrics = req.body;
    try {
        await saveDailyMetrics(metrics);
        res.status(200).json({ message: "Daily metrics saved successfully." });
        return;
    } catch (err) {
        console.error("Error inserting daily metrics:", err);
        res.status(500).json({
            error: ZACHTOTHEGYM_ERRORS.FAILED_SAVE_METRICS,
        });
        return;
    }
};

/**
 * Gets daily metrics in a date range.
 *
 * @route GET /metrics?start=YYYY-MM-DD&end=YYYY-MM-DD
 * @param {Request} req - Express request object, expects start and end query params
 * @param {Response} res - Express response object
 * @returns Express route handler (no explicit return type; see note)
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const validateGetDailyMetrics = [
    query("start")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_METRICS_RANGE),
    query("end")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_METRICS_RANGE),
];

export const getDailyMetrics = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res
            .status(400)
            .json({ errors: errors.array().map((e) => e.msg) });
    }
    const { start, end } = req.query as { start: string; end: string };
    try {
        const results = await getMetricsInRange(start, end);
        res.json(results);
        return;
    } catch (err) {
        console.error("Error fetching daily metrics:", err);
        res.status(500).json({
            error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_METRICS,
        });
        return;
    }
};
