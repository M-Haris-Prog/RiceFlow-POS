import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Server-side scripts for the cPanel hosting. They must use require() (what cPanel's Node loader expects)
    // and are not part of the website, so the website's lint rules don't apply. The upload package is also generated.
    "deploy/**",
    "dist-cpanel/**",
  ]),
]);

export default eslintConfig;
