/**
 * Centralized error messages for zachtothegym-related controllers.
 *
 * Used by: `zachtothegymValidators`, `zachtothegymController`
 */

/**
 * ZTG error messages keyed by code.
 */
export const ZACHTOTHEGYM_ERRORS = {
    /** Failed to fetch blogs. */
    FAILED_FETCH_BLOGS: "Failed to fetch blogs.",
    /** Blog ID is invalid. */
    INVALID_BLOG_ID: "Invalid blog ID.",
    /** Blog not found. */
    BLOG_NOT_FOUND: "Blog not found.",
    /** Failed to fetch a single blog. */
    FAILED_FETCH_BLOG: "Failed to fetch blog.",
    /** Failed to create a new blog. */
    FAILED_CREATE_BLOG: "Failed to create blog.",
    /** Missing required blog fields. */
    MISSING_BLOG_FIELDS: "Title and content are required.",

    /** Failed to fetch articles. */
    FAILED_FETCH_ARTICLES: "Failed to fetch articles.",
    /** Article ID is invalid. */
    INVALID_ARTICLE_ID: "Invalid article ID.",
    /** Article not found. */
    ARTICLE_NOT_FOUND: "Article not found.",
    /** Failed to fetch a single article. */
    FAILED_FETCH_ARTICLE: "Failed to fetch article.",
    /** Failed to create a new article. */
    FAILED_CREATE_ARTICLE: "Error creating article.",
    /** Missing required article fields. */
    MISSING_ARTICLE_FIELDS: "Missing required fields.",

    /** Missing date for daily metrics save. */
    MISSING_METRICS_DATE: "Date is required.",
    /** Server error saving metrics. */
    FAILED_SAVE_METRICS: "Server error.",
    /** Missing start/end range for metrics query. */
    MISSING_METRICS_RANGE: "Start and end dates are required.",
    /** Server error fetching metrics. */
    FAILED_FETCH_METRICS: "Server error.",
};
