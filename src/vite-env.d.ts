// This file is for client-side type definitions.
// By augmenting the NodeJS namespace, we add the API_KEY property to the
// `process.env` type. This avoids redeclaring the `process` global, which
// caused conflicts with Node.js's native `process` object type in files
// like `vite.config.ts`. This approach makes the `API_KEY` type available
// project-wide without causing compilation errors.
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      API_KEY: string;
      GOOGLE_API_KEY: string;
      GOOGLE_CLIENT_ID: string;
    }
  }
}

// Adding an empty export statement turns this file into a module,
// which is a good practice for ambient declaration files to avoid polluting the global scope unintentionally.
export {};