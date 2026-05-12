import type { Config } from "tailwindcss";

/**
 * Esus quickstart design tokens.
 *
 *   brand        — primary action / link color. Cyan family (#0891b2),
 *                  matches the Esus admin console so screenshots in
 *                  marketing material feel consistent.
 *
 * Everything else uses Tailwind's neutral / emerald / amber / rose
 * defaults — picking up the named families keeps `text-emerald-600`
 * etc. working everywhere without alias indirection.
 */
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          50: "#ecfeff",
          100: "#cffafe",
          200: "#a5f3fc",
          300: "#67e8f9",
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
          700: "#0e7490",
          800: "#155e75",
          900: "#164e63",
        },
      },
      boxShadow: {
        // Subtle ambient elevation for cards. Lighter than Tailwind
        // defaults so the UI doesn't feel heavy.
        card: "0 1px 2px 0 rgb(15 23 42 / 0.04), 0 1px 3px 0 rgb(15 23 42 / 0.06)",
        "card-hover":
          "0 4px 6px -1px rgb(15 23 42 / 0.06), 0 2px 4px -2px rgb(15 23 42 / 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
