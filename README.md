# SYSTM Website (build output)

This repository holds the **compiled production build** exported from the Vercel deployment of `systm-site`.
It is not the source code: no `src/`, no `convex/`, no `node_modules`, and the serverless functions (lambdas) are not included.

- `src/.next` and `src/.vercel/output`: build output
- `src/.env.example`: environment variable reference (no values)

Secrets (`ADMIN_API_KEY`, `ADMIN_SESSION_SECRET`, ...) are intentionally not included.
