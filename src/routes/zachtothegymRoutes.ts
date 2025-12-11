import { Router, type Response, type NextFunction } from "express";
import { type ZTGControllerHandlers } from "../controllers/zachtothegymController";
import {
    validateGetSingleBlogById,
    validateCreateNewBlog,
    validateGetSingleArticleById,
    validateCreateNewArticle,
    validateAddDailyMetrics,
    validateGetDailyMetrics,
} from "../validators/zachtothegymValidators";
// no default-wired middleware here; provided by wired file/tests via factory

import type { AuthRequest } from "../middleware/authenticationMiddleware";

/**
 * Authentication middleware handlers used by protected ZTG routes.
 */
export type AuthMiddlewareHandlers = {
    /** Verifies a Bearer token and attaches `user` to the request. */
    verifyToken: (req: AuthRequest, res: Response, next: NextFunction) => void;
};

/**
 * Creates the Zachtothegym router.
 *
 * @param {ZTGControllerHandlers} controller - Controller with blog, article, and metrics handlers.
 * @param {AuthMiddlewareHandlers} mw - Authentication middleware providing `verifyToken`.
 * @returns {import('express').Router} Express router for Zachtothegym endpoints.
 * @remarks Attaches validation middleware for each route; POST routes require Bearer token.
 */
export const createZachtothegymRouter = (
    controller: ZTGControllerHandlers,
    mw: AuthMiddlewareHandlers
) => {
    const router = Router();

    /**
     * Gets all blogs.
     * @see GET /blogs
     */
    router.get("/blogs", controller.getBlogs);

    /**
     * Gets a single blog by ID.
     * @see GET /blogs/:id
     */
    router.get(
        "/blogs/:id",
        validateGetSingleBlogById,
        controller.getSingleBlogById
    );

    /**
     * Creates a new blog.
     * @see POST /blogs
     */
    router.post(
        "/blogs",
        mw.verifyToken,
        validateCreateNewBlog,
        controller.createNewBlog
    );

    /**
     * Gets all articles.
     * @see GET /articles
     */
    router.get("/articles", controller.getArticles);

    /**
     * Gets a single article by ID.
     * @see GET /articles/:id
     */
    router.get(
        "/articles/:id",
        validateGetSingleArticleById,
        controller.getSingleArticleById
    );

    /**
     * Creates a new article.
     * @see POST /articles
     */
    router.post(
        "/articles",
        mw.verifyToken,
        validateCreateNewArticle,
        controller.createNewArticle
    );

    /**
     * Adds daily metrics.
     * @see POST /daily-metrics
     */
    router.post(
        "/daily-metrics",
        mw.verifyToken,
        validateAddDailyMetrics,
        controller.addDailyMetrics
    );

    /**
     * Gets daily metrics in a date range.
     * @see GET /daily-metrics
     */
    router.get(
        "/daily-metrics",
        validateGetDailyMetrics,
        controller.getDailyMetrics
    );

    return router;
};

// For convenience, allow default export = factory (matches Printify pattern)
export default createZachtothegymRouter;
