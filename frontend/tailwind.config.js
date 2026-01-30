/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
    "*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        // Custom colors for requirement modal
        modal: {
          bg: "#FAFFFD",
          border: "#E3DBDB",
          divider: "#E6E6E6",
        },
        label: {
          text: "#1C2024",
        },
        "custom-yellow": {
          DEFAULT: "#F1D929",
          foreground: "#080705",
        },
        "type-chip": {
          bg: "rgba(0, 71, 241, 0.0705882)",
          text: "#1F2D5C",
        },
      },
      backgroundColor: {
        "input-white": "rgba(255, 255, 255, 0.9)",
        "cancel-btn": "#F6F6F6",
      },
      borderColor: {
        "input-light": "rgba(0, 9, 50, 0.121569)",
        "input-dark": "rgba(0, 6, 46, 0.196078)",
      },
      boxShadow: {
        modal: "0px 0px 20px 10px rgba(0, 0, 0, 0.1)",
        "input-inset":
          "inset 0px 1.5px 2px rgba(0, 0, 0, 0.1), inset 0px 1.5px 2px rgba(0, 0, 85, 0.0235294)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
