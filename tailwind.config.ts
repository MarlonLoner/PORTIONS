import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        navy: {
          950: "#061526",
          900: "#0a1f35",
          800: "#123451",
          700: "#1d4d72"
        },
        clinical: {
          50: "#f4f9fc",
          100: "#e7f2f8",
          200: "#cde6f2",
          500: "#4b9ec9",
          700: "#28739a",
          800: "#1f5f80",
          900: "#184c66"
        },
        emerald: {
          500: "#10b981",
          600: "#059669"
        }
      },
      boxShadow: {
        soft: "0 18px 50px rgba(6, 21, 38, 0.075)"
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "Inter", "system-ui", "sans-serif"]
      }
    }
  },
  plugins: []
};

export default config;
