import db from "../db/connection";
import { Article } from "../types/articlesModel";

export const getAllArticles = async (): Promise<Article[]> => {
    const query =
        "SELECT * FROM zachtothegym.articles ORDER BY created_at DESC";
    return db.any(query);
};

export const getArticleById = async (id: number): Promise<Article | null> => {
    const query = "SELECT * FROM zachtothegym.articles WHERE id = $1";
    return db.oneOrNone(query, [id]);
};

export const createArticle = async (
    title: string,
    summary: string,
    content: string,
    categories: string[]
): Promise<Article> => {
    const query = `
        INSERT INTO zachtothegym.articles (title, summary, content, categories)
        VALUES ($1, $2, $3, $4) RETURNING *`;
    return db.one(query, [title, summary, content, categories]);
};
