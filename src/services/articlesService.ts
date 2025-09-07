import db from "../db/connection";
import type { Article } from "../types/articlesModel";
import type { IDatabase, ITask } from "pg-promise";

// Any pg-promise connection-like object: the global db or a tx/task context.
type DbOrTx = IDatabase<unknown> | ITask<unknown>;
const useDb = (t?: DbOrTx) => t ?? db;

/**
 * Fetches all articles from the database, ordered by creation date descending.
 * @returns {Promise<Article[]>} Array of articles
 */
export const getAllArticles = async (cx?: DbOrTx): Promise<Article[]> => {
    const query =
        "SELECT * FROM zachtothegym.articles ORDER BY created_at DESC";
    return useDb(cx).any(query);
};

/**
 * Fetches a single article by its ID.
 * @param {number} id - The article ID
 * @returns {Promise<Article | null>} The article if found, otherwise null
 */
export const getArticleById = async (
    id: number,
    cx?: DbOrTx
): Promise<Article | null> => {
    const query = "SELECT * FROM zachtothegym.articles WHERE id = $1";
    return useDb(cx).oneOrNone(query, [id]);
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
    categories: string[],
    cx?: DbOrTx
): Promise<Article> => {
    const query = `
    INSERT INTO zachtothegym.articles (title, summary, content, categories)
    VALUES ($1, $2, $3, $4)
    RETURNING *`;
    return useDb(cx).one(query, [title, summary, content, categories]);
};

/**
 * Deletes an article by ID.
 * Hard-deletes the row and returns the deleted article (or null if not found).
 * @param {number} id - The article ID
 * @returns {Promise<Article | null>} The deleted row, or null if no row matched
 */
export const deleteArticleById = async (
    id: number,
    cx?: DbOrTx
): Promise<Article | null> => {
    const query = `
    DELETE FROM zachtothegym.articles
    WHERE id = $1
    RETURNING *`;
    return useDb(cx).oneOrNone(query, [id]);
};
