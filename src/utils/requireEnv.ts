/**
 * Reads a required environment variable or throws a descriptive error.
 */
export function requireEnv(key: string): string {
    const v = process.env[key];
    if (!v) throw new Error(`${key} is missing`);
    return v;
}

export default requireEnv;
