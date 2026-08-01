import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        // Identité visuelle — vert émeraude en couleur principale (marque, CTA, statuts validés),
        // carmin réservé aux alertes/erreurs, or aux badges VIP/premium.
        carmin: {
          50: "#fdf2f2",
          100: "#fbe0e1",
          200: "#f5b8ba",
          300: "#ea8a8d",
          400: "#dc5459",
          500: "#c1272d", // Alertes/erreurs, actions destructrices
          600: "#9b111e",
          700: "#7d0f1a",
          800: "#5f0c14",
          900: "#450a0f",
        },
        emerald: {
          50: "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981", // Couleur principale — marque, CTA, succès, pelouse, accès validé
          600: "#059669",
          700: "#047857",
          800: "#006233",
          900: "#064e3b",
        },
        gold: {
          50: "#fdfaf0",
          100: "#faf1d6",
          200: "#f3e0a8",
          300: "#e9c968",
          400: "#dfb84a",
          500: "#d4af37", // Or/bronze — VIP, loges, titres premium
          600: "#b3901f",
          700: "#8a6f18",
          800: "#5f4c10",
          900: "#3d310a",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
      },
    },
  },
  plugins: [],
};
export default config;
