import { Request, Response } from "express";
import {
    getAllBlogs,
    getBlogById,
    createBlog,
} from "../../services/blogsService";
import {
    getAllArticles,
    getArticleById,
    createArticle,
} from "../../services/articlesService";

export const getBlogs = async (req: Request, res: Response): Promise<void> => {
    try {
        const blogs = await getAllBlogs();
        res.json(blogs);
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch blogs", e });
    }
};

export const getSingleBlogById = async (
    req: Request,
    res: Response
): Promise<void> => {
    const blogId = Number(req.params.id);
    if (isNaN(blogId)) {
        res.status(400).json({ message: "Invalid blog ID" });
    }
    try {
        const blog = await getBlogById(blogId);
        if (!blog) {
            res.status(404).json({ message: "Blog not found" });
        }
        res.json(blog);
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch blog", e });
    }
};

export const createNewBlog = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { title, content, categories } = req.body;
    if (!title || !content) {
        res.status(400).json({ message: "Title and content are required" });
    }
    try {
        const newBlog = await createBlog(title, content, categories);
        res.status(201).json(newBlog);
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
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch articles", e });
    }
};

export const getSingleArticleById = async (
    req: Request,
    res: Response
): Promise<void> => {
    const articleId = Number(req.params.id);
    if (isNaN(articleId)) {
        res.status(400).json({ message: "Invalid article ID" });
    }
    try {
        const article = await getArticleById(articleId);
        if (!article) {
            res.status(404).json({ message: "Article not found" });
        }
        res.json(article);
    } catch (e) {
        res.status(500).json({ message: "Failed to fetch article", e });
    }
};

export const createNewArticle = async (
    req: Request,
    res: Response
): Promise<void> => {
    const { title, summary, content, categories } = req.body;
    if (!title || !summary || !content || !categories) {
        res.status(400).json({ message: "Missing required fields." });
    }
    try {
        const newArticle = await createArticle(
            title,
            summary,
            content,
            categories
        );
        res.status(201).json(newArticle);
    } catch (e) {
        res.status(500).json({ message: "Error creating article.", e });
    }
};
