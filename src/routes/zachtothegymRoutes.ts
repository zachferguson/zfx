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
import { verifyToken } from "../middleware/authMiddleware";

const router = Router();

// Blogs
router.get("/blogs", getBlogs);
router.get("/blogs/:id", getSingleBlogById);
router.post("/blogs", verifyToken, createNewBlog);

// Articles
router.get("/articles", getArticles);
router.get("/articles/:id", getSingleArticleById);
router.post("/articles", verifyToken, createNewArticle);

// Daily Metrics
router.post("/daily-metrics", verifyToken, addDailyMetrics);
router.get("/daily-metrics", getDailyMetrics);

export default router;
