import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          500: "#2563eb",
          600: "#2563eb",
          700: "#1d4ed8",
          900: "#1e3a8a",
        },
        sidebar: "#1a1a2e",
      },
    },
  },
  plugins: [],
};

export default config;
