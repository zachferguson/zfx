// Utility functions for HTML escaping and related helpers

/**
 * Escapes HTML special characters in a string to prevent XSS and formatting issues.
 * @param s The string to escape
 * @returns The escaped string
 */
export function escapeHtml(s: string): string {
    return s.replace(
        /[&<>"']/g,
        (ch) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            }[ch as "&" | "<" | ">" | '"' | "'"] as string)
    );
}
