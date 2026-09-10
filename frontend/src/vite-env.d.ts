/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL of the .NET backend. React talks only to this, never to Python directly. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
