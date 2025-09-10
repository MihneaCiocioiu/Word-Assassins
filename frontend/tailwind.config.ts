import type { Config } from "tailwindcss";

export default {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        'text': '#0f172a',
        'background': '#f8fafc',
        'primary': '#1f2937',
        'secondary': '#e5e7eb',
        'accent': '#10b981',
      },
    },
  },
  plugins: [],
} satisfies Config;
