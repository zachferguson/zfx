import { Request, Response } from "express";

// mock data (will replace with database calls later)
const blogs = [
    {
        id: 1,
        title: "Blog 1",
        content: "Content for Blog 1",
        category: "Fitness",
    },
    {
        id: 2,
        title: "Blog 2",
        content: "Content for Blog 2",
        category: "Health",
    },
];

const articles = [
    {
        id: 1,
        title: "Article 1",
        summary: "Summary for Article 1",
        content: "Content for Article 1",
    },
    {
        id: 2,
        title: "Article 2",
        summary: "Summary for Article 2",
        content: "Content for Article 2",
    },
];

export const getBlogs = (req: Request, res: Response): void => {
    res.json(blogs);
};

export const getBlogById = (req: Request, res: Response): void => {
    const blogId = Number(req.params.id);
    const blog = blogs.find((blog) => blog.id === blogId);
    if (!blog) {
        res.status(404).json({ message: "Blog not found" });
    }
    res.json(blog);
};

export const getArticles = (req: Request, res: Response): void => {
    res.json(articles);
};

export const getArticleById = (req: Request, res: Response): void => {
    const articleId = Number(req.params.id);
    const article = articles.find((article) => article.id === articleId);
    if (!article) {
        res.status(404).json({ message: "Article not found" });
    }
    res.json(article);
};
