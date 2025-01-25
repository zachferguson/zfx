import { Router } from "express";
import {
    getBlogs,
    getSingleBlogById,
    createNewBlog,
    getArticles,
    getSingleArticleById,
    createNewArticle,
} from "../controllers/zachtothegym/zachtothegymController";
import { authenticateToken } from "../shared/auth/authMiddleware";
import { login, register } from "../controllers/zachtothegym/authController";

const router = Router();

// blogs
router.get("/blogs", getBlogs);
router.get("/blogs/:id", getSingleBlogById);
router.post("/blogs", authenticateToken, createNewBlog);

// articles
router.get("/articles", getArticles);
router.get("/articles/:id", getSingleArticleById);
router.post("/articles", authenticateToken, createNewArticle);

// auth
router.post("/auth/login", login);
router.post("/auth/register", register);

export default router;
