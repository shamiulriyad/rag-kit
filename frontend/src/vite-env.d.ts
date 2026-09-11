/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the .NET backend. React talks only to this, never to Python directly. */
  readonly VITE_API_URL?: string
  /** Client-side pre-upload size hint/check; keep in step with Upload:MaxBytes (.NET)
   * and MAX_UPLOAD_MB (Python). Used in DocumentsPage.tsx. */
  readonly VITE_MAX_UPLOAD_MB?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
