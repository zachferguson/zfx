# zfx

Primary API

## Architecture: factory-only + wired composition

- All controllers and routers are exported as factories. No default-wired instances in core modules.
- Middleware follows the same pattern. For auth, use `createAuthMiddleware(secret)` to obtain `{ verifyToken }`.
- "Wired" files (e.g., `src/routes/*Routes.wired.ts`) compose real dependencies (env, db, services) and export ready-to-use routers for `app.ts`.

### Auth middleware

- Import and construct via the factory:
    - `import { createAuthMiddleware } from "../middleware/authenticationMiddleware";`
    - `const { verifyToken } = createAuthMiddleware(process.env.JWT_SECRET!);`
- The legacy default `verifyToken` export has been removed to enforce explicit DI and avoid hidden env access.

### Tests

- Build controllers/routers with factories and inject mocks.
- When a test needs JWT verification, construct the middleware with a test secret:
    - `const { verifyToken } = createAuthMiddleware("test-secret");`
- Map express-validator errors to strings in handlers when asserting error arrays for consistency.

### App composition

- `src/app.ts` imports only wired routers (`*Routes.wired.ts`).
- Secrets and configuration are resolved in wired files or in app, not inside core modules.

## Development

- Lint: `npm run lint`
- Tests: `npm test`
