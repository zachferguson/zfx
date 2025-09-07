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
import { validationResult } from "express-validator";
import {
    validateGetSingleBlogById,
    validateCreateNewBlog,
    validateGetSingleArticleById,
    validateCreateNewArticle,
    validateAddDailyMetrics,
    validateGetDailyMetrics,
} from "../validators/zachtothegymValidators";

/**
 * Gets all blogs.
 *
 * @route GET /blogs
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note On success, responds with 200 and an array of blogs. On error, responds with 500 and an error message.
 */
export const getBlogs = async (req: Request, res: Response) => {
    try {
        const blogs = await getAllBlogs();
        res.status(200).json(blogs);
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
 * @returns {Promise<void>} Sends response via res object.
 * @note On success, responds with 200 and a blog object. On error, responds with 400 (validation), 404 (not found), or 500 (server error) and an error message.
 */
export const getSingleBlogById = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array().map((e) => e.msg) });
        return;
    }
    const blogId = Number(req.params.id);
    try {
        const blog = await getBlogById(blogId);
        if (!blog) {
            res.status(404).json({ error: ZACHTOTHEGYM_ERRORS.BLOG_NOT_FOUND });
            return;
        }
        res.status(200).json(blog);
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
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const createNewBlog = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array().map((e) => e.msg) });
        return;
    }
    const { title, content, categories } = req.body;
    try {
        const newBlog = await createBlog(title, content, categories);
        res.status(201).json(newBlog);
        return;
    } catch (e) {
        res.status(500).json({ error: ZACHTOTHEGYM_ERRORS.FAILED_CREATE_BLOG });
        return;
    }
};

/**
 * Gets all articles.
 *
 * @route GET /articles
 * @param {Request} req - Express request object
 * @param {Response} res - Express response object
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const getArticles = async (req: Request, res: Response) => {
    try {
        const articles = await getAllArticles();
        res.status(200).json(articles);
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
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const getSingleArticleById = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array().map((e) => e.msg) });
        return;
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
        res.status(200).json(article);
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
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const createNewArticle = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array().map((e) => e.msg) });
        return;
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
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const addDailyMetrics = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array().map((e) => e.msg) });
        return;
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
 * @returns {Promise<void>} Sends response via res object.
 * @note In TypeScript, Express handlers should omit the return type for flexibility. See project docs or Swagger for response details.
 */
export const getDailyMetrics = async (req: Request, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array().map((e) => e.msg) });
        return;
    }
    const { start, end } = req.query as { start: string; end: string };
    try {
        const results = await getMetricsInRange(start, end);
        res.status(200).json(results);
        return;
    } catch (err) {
        console.error("Error fetching daily metrics:", err);
        res.status(500).json({
            error: ZACHTOTHEGYM_ERRORS.FAILED_FETCH_METRICS,
        });
        return;
    }
};
