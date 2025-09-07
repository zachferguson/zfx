import { body, param, query } from "express-validator";
import { ZACHTOTHEGYM_ERRORS } from "../config/zachtothegymErrors";

/**
 * Validation chain for getting a single blog by ID.
 * Expects a positive integer 'id' param. Returns validation error INVALID_BLOG_ID if invalid.
 */
export const validateGetSingleBlogById = [
    param("id")
        .isInt({ gt: 0 })
        .withMessage(ZACHTOTHEGYM_ERRORS.INVALID_BLOG_ID),
];

/**
 * Validation chain for creating a new blog.
 * Expects non-empty 'title' and 'content' fields in the body. Returns validation error MISSING_BLOG_FIELDS if missing.
 */
export const validateCreateNewBlog = [
    body("title")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_BLOG_FIELDS),
    body("content")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_BLOG_FIELDS),
];

/**
 * Validation chain for getting a single article by ID.
 * Expects a positive integer 'id' param. Returns validation error INVALID_ARTICLE_ID if invalid.
 */
export const validateGetSingleArticleById = [
    param("id")
        .isInt({ gt: 0 })
        .withMessage(ZACHTOTHEGYM_ERRORS.INVALID_ARTICLE_ID),
];

/**
 * Validation chain for creating a new article.
 * Expects non-empty 'title', 'summary', 'content', and 'categories' fields in the body. Returns validation error MISSING_ARTICLE_FIELDS if missing.
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

/**
 * Validation chain for adding daily metrics.
 * Expects non-empty 'date' field in the body. Returns validation error MISSING_METRICS_DATE if missing.
 */
export const validateAddDailyMetrics = [
    body("date")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_METRICS_DATE),
];

/**
 * Validation chain for getting daily metrics in a date range.
 * Expects non-empty 'start' and 'end' query params. Returns validation error MISSING_METRICS_RANGE if missing.
 */
export const validateGetDailyMetrics = [
    query("start")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_METRICS_RANGE),
    query("end")
        .notEmpty()
        .withMessage(ZACHTOTHEGYM_ERRORS.MISSING_METRICS_RANGE),
];
