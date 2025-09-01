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

export const getBlogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const blogs = await getAllBlogs();
        res.json(blogs);
        return;
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch blogs", e });
        return;
    }
};

export const getSingleBlogById = async (
    req: Request,
    res: Response
): Promise<void> => {
    const rawId = req.params.id;
    const blogId = Number(rawId);
    if (isNaN(blogId)) {
        res.status(400).json({ message: "Invalid blog ID" });
        return;
    }
    try {
        const blog = await getBlogById(blogId);
        if (!blog) {
            res.status(404).json({ message: "Blog not found" });
            return;
        }
        res.json(blog);
        return;
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch blog", e });
        return;
    }
};

export const createNewBlog = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { title, content, categories } = req.body;
    if (!title || !content) {
        res.status(400).json({ message: "Title and content are required" });
        return;
    }
    try {
        const newBlog = await createBlog(title, content, categories);
        res.status(201).json(newBlog);
        return;
    } catch (e) {
        res.status(500).json({ message: "Failed to create blog", e });
    }
};

export const getArticles = async (
    req: Request,
    res: Response
): Promise<void> => {
    try {
        const articles = await getAllArticles();
        res.json(articles);
        return;
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch articles", e });
        return;
    }
};

export const getSingleArticleById = async (
    req: Request,
    res: Response
): Promise<void> => {
    const rawId = req.params.id;
    const articleId = Number(rawId);
    if (isNaN(articleId)) {
        res.status(400).json({ message: "Invalid article ID" });
        return;
    }
    try {
        const article = await getArticleById(articleId);
        if (!article) {
            res.status(404).json({ message: "Article not found" });
            return;
        }
        res.json(article);
        return;
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch article", e });
        return;
    }
};

export const createNewArticle = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { title, summary, content, categories } = req.body;
    if (!title || !summary || !content || !categories) {
        res.status(400).json({ message: "Missing required fields." });
        return;
    }
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
        res.status(500).json({ message: "Error creating article.", e });
        return;
    }
};

export const addDailyMetrics = async (
    req: Request,
    res: Response
): Promise<void> => {
    const metrics: DailyMetrics = req.body;

    if (!metrics.date) {
        res.status(400).json({ message: "Date is required." });
        return;
    }

    try {
        await saveDailyMetrics(metrics);
        res.status(200).json({ message: "Daily metrics saved successfully." });
        return;
    } catch (err) {
        console.error("Error inserting daily metrics:", err);
        res.status(500).json({ message: "Server error." });
        return;
    }
};

export const getDailyMetrics = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { start, end } = req.query as { start: string; end: string };

    if (!start || !end) {
        res.status(400).json({ message: "Start and end dates are required." });
        return;
    }

    try {
        const results = await getMetricsInRange(start, end);
        res.json(results);
        return;
    } catch (err) {
        console.error("Error fetching daily metrics:", err);
        res.status(500).json({ message: "Server error." });
        return;
    }
};
