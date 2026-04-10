/**
 * Determines if the current environment is production.
 * Uses Netlify's CONTEXT variable (production, deploy-preview, branch-deploy)
 * or falls back to NODE_ENV.
 */
export function isProduction(): boolean {
  return (
    process.env.PROD === "true" ||
    process.env.CONTEXT === "production" ||
    process.env.NODE_ENV === "production"
  );
}
