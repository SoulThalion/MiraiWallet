/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base del API, p. ej. http://localhost:3000/api/v1 (definir en `.env`) */
  readonly VITE_API_URL: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    bare?: boolean
  }
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}
