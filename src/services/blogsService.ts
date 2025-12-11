import db from "../db/connection";
import type { IDatabase, ITask } from "pg-promise";
import { Blog } from "../types/blogsModel";

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
 * Gets all blogs.
 *
 * @param {DbOrTx} [cx] - Optional pg-promise context.
 * @returns {Promise<Blog[]>} Array of blogs ordered by `created_at` descending.
 */
export const getAllBlogs = async (cx?: DbOrTx): Promise<Blog[]> => {
    const query = `SELECT * FROM zachtothegym.blogs ORDER BY created_at DESC`;
    return useDb(cx).any(query);
};

/**
 * Gets a single blog by ID.
 *
 * @param {number} id - Blog ID.
 * @param {DbOrTx} [cx] - Optional pg-promise context.
 * @returns {Promise<Blog | null>} The blog if found; otherwise `null`.
 */
export const getBlogById = async (
    id: number,
    cx?: DbOrTx
): Promise<Blog | null> => {
    const query = `SELECT * FROM zachtothegym.blogs WHERE id = $1`;
    return useDb(cx).oneOrNone(query, [id]);
};

/**
 * Creates a new blog.
 *
 * @param {string} title - Blog title.
 * @param {string} content - Blog content.
 * @param {string[]} categories - Blog categories.
 * @param {DbOrTx} [cx] - Optional pg-promise context.
 * @returns {Promise<Blog>} The created blog.
 * @remarks Returns the inserted row via `RETURNING *`.
 */
export const createBlog = async (
    title: string,
    content: string,
    categories: string[],
    cx?: DbOrTx
): Promise<Blog> => {
    const query = `
        INSERT INTO zachtothegym.blogs (title, content, categories)
        VALUES ($1, $2, $3) RETURNING *
    `;
    return useDb(cx).one(query, [title, content, categories]);
};

/**
 * Deletes a blog by ID.
 *
 * @param {number} id - Blog ID.
 * @param {DbOrTx} [cx] - Optional pg-promise context.
 * @returns {Promise<Blog | null>} The deleted row if matched; otherwise `null`.
 * @remarks Performs a hard delete and returns the removed row via `RETURNING *`.
 */
export const deleteBlogById = async (
    id: number,
    cx?: DbOrTx
): Promise<Blog | null> => {
    const query = `
        DELETE FROM zachtothegym.blogs
        WHERE id = $1
        RETURNING *
    `;
    return useDb(cx).oneOrNone(query, [id]);
};
