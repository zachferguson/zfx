// src/services/blogsService.ts
import db from "../db/connection";
import type { IDatabase, ITask } from "pg-promise";
import { Blog } from "../types/blogsModel";

// Any pg-promise connection-like object: the global db or a tx/task context.
type DbOrTx = IDatabase<unknown> | ITask<unknown>;
const useDb = (t?: DbOrTx) => t ?? db;

/**
 * Retrieves all blogs from the database, ordered by creation date descending.
 */
export const getAllBlogs = async (cx?: DbOrTx): Promise<Blog[]> => {
    const query = `SELECT * FROM zachtothegym.blogs ORDER BY created_at DESC`;
    return useDb(cx).any(query);
};

/**
 * Retrieves a single blog by its ID.
 */
export const getBlogById = async (
    id: number,
    cx?: DbOrTx
): Promise<Blog | null> => {
    const query = `SELECT * FROM zachtothegym.blogs WHERE id = $1`;
    return useDb(cx).oneOrNone(query, [id]);
};

/**
 * Creates a new blog entry in the database.
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
 * Deletes a blog by ID and returns the deleted row, or null if not found.
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
