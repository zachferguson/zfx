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
    type ZTGControllerHandlers,
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

export type AuthMiddlewareHandlers = {
    verifyToken: typeof verifyToken;
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
/**
 * Default router using the default-wired controller handlers and verifyToken.
 */
const defaultRouter = createZachtothegymRouter(
    {
        getBlogs,
        getSingleBlogById,
        createNewBlog,
        getArticles,
        getSingleArticleById,
        createNewArticle,
        addDailyMetrics,
        getDailyMetrics,
    },
    { verifyToken }
);

export default defaultRouter;
