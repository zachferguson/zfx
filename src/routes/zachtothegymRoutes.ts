import { Router } from "express";
import {
    getBlogs,
    getBlogById,
    getArticles,
    getArticleById,
} from "../controllers/zachtothegymController";

const router = Router();

router.get("/blogs", getBlogs);
router.get("/blogs/:id", getBlogById);
router.get("/articles", getArticles);
router.get("/articles/:id", getArticleById);

export default router;
