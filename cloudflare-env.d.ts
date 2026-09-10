declare namespace Cloudflare {
  interface Env {
    GEMINI_API_KEY?: string;
    ADMIN_EMAILS?: string;
    ADMIN_SETUP_TOKEN?: string;
    ADMIN_VAULT_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
