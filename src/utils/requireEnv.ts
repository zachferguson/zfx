/**
 * Reads a required environment variable or throws a descriptive error.
 *
 * @param {string} key - Environment variable name.
 * @returns {string} The variable value if present.
 * @throws {Error} When the variable is missing.
 */
export function requireEnv(key: string): string {
    const v = process.env[key];
    if (!v) throw new Error(`${key} is missing`);
    return v;
}

export default requireEnv;
