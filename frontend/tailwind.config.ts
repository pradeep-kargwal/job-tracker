import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#6366f1",
                    dark: "#4f46e5",
                    light: "#818cf8",
                },
                secondary: "#0ea5e9",
                accent: "#f59e0b",
                success: "#10b981",
                warning: "#f59e0b",
                error: "#ef4444",
                surface: "#ffffff",
                background: "#f8fafc",
                "text-primary": "#1e293b",
                "text-secondary": "#64748b",
                border: "#e2e8f0",
            },
            fontFamily: {
                sans: ["Inter", "sans-serif"],
                mono: ["JetBrains Mono", "monospace"],
            },
            boxShadow: {
                card: "0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)",
                "card-hover": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
            },
        },
    },
    plugins: [],
};

export default config;
