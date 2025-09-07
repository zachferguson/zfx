import db from "../db/connection";
import { Article } from "../types/articlesModel";

/**
 * Fetches all articles from the database, ordered by creation date descending.
 * @returns {Promise<Article[]>} Array of articles
 */
export const getAllArticles = async (): Promise<Article[]> => {
    const query =
        "SELECT * FROM zachtothegym.articles ORDER BY created_at DESC";
    return db.any(query);
};

/**
 * Fetches a single article by its ID.
 * @param {number} id - The article ID
 * @returns {Promise<Article | null>} The article if found, otherwise null
 */
export const getArticleById = async (id: number): Promise<Article | null> => {
    const query = "SELECT * FROM zachtothegym.articles WHERE id = $1";
    return db.oneOrNone(query, [id]);
};

/**
 * Creates a new article in the database.
 * @param {string} title - The article title
 * @param {string} summary - The article summary
 * @param {string} content - The article content
 * @param {string[]} categories - The article categories
 * @returns {Promise<Article>} The created article
 */
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
