import { createZachtothegymRouter } from "./zachtothegymRoutes";
import { createZachtothegymController } from "../controllers/zachtothegymController";
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
import { createAuthMiddleware } from "../middleware/authenticationMiddleware";

const requireEnv = (key: string): string => {
    const v = process.env[key];
    if (!v) {
        if (process.env.NODE_ENV === "test") {
            if (key === "JWT_SECRET") return "test-secret";
        }
        throw new Error(`${key} is missing`);
    }
    return v;
};

const jwtSecret = requireEnv("JWT_SECRET");
const controller = createZachtothegymController({
    getAllBlogs,
    getBlogById,
    createBlog,
    getAllArticles,
    getArticleById,
    createArticle,
    saveDailyMetrics,
    getMetricsInRange,
});
const mw = createAuthMiddleware(jwtSecret);
/** Fully wired Zachtothegym router (ready for `app.use`). */
const router = createZachtothegymRouter(controller, mw);
export default router;
