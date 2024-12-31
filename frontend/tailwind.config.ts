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
        'text': '#0f0604',
        'background': '#fefbfa',
        'primary': '#d26746',
        'secondary': '#e4d08f',
        'accent': '#d9db6b',
      },
    },
  },
  plugins: [],
} satisfies Config;
