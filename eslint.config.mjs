import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

export default defineConfig([
    ...nextVitals,
    {
        rules: {
            // Effects here load data or read localStorage and set loading/result
            // state; that pattern is deliberate across the app.
            "react-hooks/set-state-in-effect": "off",
        },
    },
    globalIgnores([".next/**", "out/**", "dist/**", "build/**", "next-env.d.ts", "wiki/**", ".scratch/**"]),
]);
