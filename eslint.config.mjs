import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

// The website (src/site, plan 051) is plain HTML built by scripts/site.mjs, not a Next app: its Next rules
// (Link, Head, Image, stylesheets) don't apply.
const nextRules = nextVitals.find(config => config.plugins?.["@next/next"]).plugins["@next/next"].rules;
const nextRulesOff = Object.fromEntries(Object.keys(nextRules).map(rule => [`@next/next/${rule}`, "off"]));

export default defineConfig([
    ...nextVitals,
    {
        rules: {
            // Effects here load data or read localStorage and set loading/result
            // state; that pattern is deliberate across the app.
            "react-hooks/set-state-in-effect": "off",
        },
    },
    {
        // Everything the website bundles stays free of Next and Clerk.
        files: ["src/site/**", "src/components/Wordmark.tsx", "src/lib/theme.ts", "src/lib/contentProfiles.ts"],
        rules: {
            "no-restricted-imports": ["error", { patterns: [{ group: ["next", "next/*", "@clerk/*"], message: "The website (src/site) is static HTML: no Next or Clerk." }] }],
        },
    },
    { files: ["src/site/**"], rules: nextRulesOff },
    globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts", ".scratch/**"]),
]);
