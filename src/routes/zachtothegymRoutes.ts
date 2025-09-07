import { Router } from "express";
import {
    getBlogs,
    getSingleBlogById,
    createNewBlog,
    getArticles,
    getSingleArticleById,
    createNewArticle,
    addDailyMetrics,
    getDailyMetrics,
} from "../controllers/zachtothegymController";
import {
    validateGetSingleBlogById,
    validateCreateNewBlog,
    validateGetSingleArticleById,
    validateCreateNewArticle,
    validateAddDailyMetrics,
    validateGetDailyMetrics,
} from "../validators/zachtothegymValidators";
import { verifyToken } from "../middleware/authenticationMiddleware";

const router = Router();

/**
 * Gets all blogs.
 * @route GET /blogs
 */
router.get("/blogs", getBlogs);

/**
 * Gets a single blog by ID.
 * @route GET /blogs/:id
 */
router.get("/blogs/:id", validateGetSingleBlogById, getSingleBlogById);

/**
 * Creates a new blog.
 * @route POST /blogs
 */
router.post("/blogs", verifyToken, validateCreateNewBlog, createNewBlog);

/**
 * Gets all articles.
 * @route GET /articles
 */
router.get("/articles", getArticles);

/**
 * Gets a single article by ID.
 * @route GET /articles/:id
 */
router.get("/articles/:id", validateGetSingleArticleById, getSingleArticleById);

/**
 * Creates a new article.
 * @route POST /articles
 */
router.post(
    "/articles",
    verifyToken,
    validateCreateNewArticle,
    createNewArticle
);

/**
 * Adds daily metrics.
 * @route POST /daily-metrics
 */
router.post(
    "/daily-metrics",
    verifyToken,
    validateAddDailyMetrics,
    addDailyMetrics
);

/**
 * Gets daily metrics in a date range.
 * @route GET /daily-metrics
 */
router.get("/daily-metrics", validateGetDailyMetrics, getDailyMetrics);

export default router;
