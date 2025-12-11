import db from "../db/connection";
import type { Article } from "../types/articlesModel";
import type { IDatabase, ITask } from "pg-promise";

// Any pg-promise connection-like object: the global db or a tx/task context.
/**
 * Connection context type: either the global pg-promise `db` or a transaction/task context.
 */
export type DbOrTx = IDatabase<unknown> | ITask<unknown>;

/**
 * Utility to select the provided connection/transaction or fall back to the global `db`.
 *
 * @param {DbOrTx} [t] - Optional pg-promise database/transaction context.
 * @returns {DbOrTx} Resolved connection context.
 */
const useDb = (t?: DbOrTx) => t ?? db;

/**
 * Gets all articles.
 *
 * @param {DbOrTx} [cx] - Optional pg-promise context.
 * @returns {Promise<Article[]>} Array of articles ordered by `created_at` descending.
 * @remarks Accepts optional pg-promise context for transactional use.
 */
export const getAllArticles = async (cx?: DbOrTx): Promise<Article[]> => {
    const query =
        "SELECT * FROM zachtothegym.articles ORDER BY created_at DESC";
    return useDb(cx).any(query);
};

/**
 * Gets a single article by ID.
 *
 * @param {number} id - Article ID.
 * @param {DbOrTx} [cx] - Optional pg-promise context.
 * @returns {Promise<Article | null>} The article if found; otherwise `null`.
 */
export const getArticleById = async (
    id: number,
    cx?: DbOrTx
): Promise<Article | null> => {
    const query = "SELECT * FROM zachtothegym.articles WHERE id = $1";
    return useDb(cx).oneOrNone(query, [id]);
};

/**
 * Creates a new article.
 *
 * @param {string} title - Article title.
 * @param {string} summary - Article summary.
 * @param {string} content - Article content.
 * @param {string[]} categories - Article categories.
 * @param {DbOrTx} [cx] - Optional pg-promise context.
 * @returns {Promise<Article>} The created article.
 * @remarks Returns the inserted row via `RETURNING *`.
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
 *
 * @param {number} id - Article ID.
 * @param {DbOrTx} [cx] - Optional pg-promise context.
 * @returns {Promise<Article | null>} The deleted row if matched; otherwise `null`.
 * @remarks Performs a hard delete and returns the removed row via `RETURNING *`.
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
