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

export type AuthMiddlewareHandlers = {
    verifyToken: (req: AuthRequest, res: Response, next: NextFunction) => void;
};

export function createZachtothegymRouter(
    controller: ZTGControllerHandlers,
    mw: AuthMiddlewareHandlers
) {
    const router = Router();

    /**
     * Gets all blogs.
     * @route GET /blogs
     */
    router.get("/blogs", controller.getBlogs);

    /**
     * Gets a single blog by ID.
     * @route GET /blogs/:id
     */
    router.get(
        "/blogs/:id",
        validateGetSingleBlogById,
        controller.getSingleBlogById
    );

    /**
     * Creates a new blog.
     * @route POST /blogs
     */
    router.post(
        "/blogs",
        mw.verifyToken,
        validateCreateNewBlog,
        controller.createNewBlog
    );

    /**
     * Gets all articles.
     * @route GET /articles
     */
    router.get("/articles", controller.getArticles);

    /**
     * Gets a single article by ID.
     * @route GET /articles/:id
     */
    router.get(
        "/articles/:id",
        validateGetSingleArticleById,
        controller.getSingleArticleById
    );

    /**
     * Creates a new article.
     * @route POST /articles
     */
    router.post(
        "/articles",
        mw.verifyToken,
        validateCreateNewArticle,
        controller.createNewArticle
    );

    /**
     * Adds daily metrics.
     * @route POST /daily-metrics
     */
    router.post(
        "/daily-metrics",
        mw.verifyToken,
        validateAddDailyMetrics,
        controller.addDailyMetrics
    );

    /**
     * Gets daily metrics in a date range.
     * @route GET /daily-metrics
     */
    router.get(
        "/daily-metrics",
        validateGetDailyMetrics,
        controller.getDailyMetrics
    );

    return router;
}

// For convenience, allow default export = factory (matches Printify pattern)
export default createZachtothegymRouter;
