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
          bg: "var(--semantic-bg-elevation-2)",
          border: "var(--semantic-stroke)",
          divider: "var(--semantic-stroke)",
        },
        label: {
          text: "var(--semantic-emphasis)",
        },
        "custom-yellow": {
          DEFAULT: "var(--semantic-button-primary-bg)",
          foreground: "var(--semantic-text)",
        },
        "type-chip": {
          bg: "var(--semantic-indicator-6)",
          text: "var(--semantic-indicator-2)",
        },
        primitive: {
          grey: {
            500: "var(--primitive-grey-500)",
            400: "var(--primitive-grey-400)",
            300: "var(--primitive-grey-300)",
            200: "var(--primitive-grey-200)",
            100: "var(--primitive-grey-100)",
          },
          black: {
            700: "var(--primitive-black-700)",
            600: "var(--primitive-black-600)",
            500: "var(--primitive-black-500)",
            400: "var(--primitive-black-400)",
            300: "var(--primitive-black-300)",
            200: "var(--primitive-black-200)",
            100: "var(--primitive-black-100)",
          },
          yellow: {
            100: "var(--primitive-yellow-100)",
            200: "var(--primitive-yellow-200)",
            300: "var(--primitive-yellow-300)",
            400: "var(--primitive-yellow-400)",
            500: "var(--primitive-yellow-500)",
          },
          orange: {
            100: "var(--primitive-orange-100)",
            200: "var(--primitive-orange-200)",
            300: "var(--primitive-orange-300)",
            400: "var(--primitive-orange-400)",
            500: "var(--primitive-orange-500)",
          },
          blue: {
            1: "var(--primitive-blue-1)",
            2: "var(--primitive-blue-2)",
          },
          green: {
            1: "var(--primitive-green-1)",
            2: "var(--primitive-green-2)",
          },
          red: {
            1: "var(--primitive-red-1)",
            2: "var(--primitive-red-2)",
          },
          purple: {
            1: "var(--primitive-purple-1)",
            2: "var(--primitive-purple-2)",
          },
        },
        semantic: {
          "bg-elevation-1": "var(--semantic-bg-elevation-1)",
          "bg-elevation-2": "var(--semantic-bg-elevation-2)",
          white: "var(--semantic-white)",
          black: "var(--semantic-black)",
          stroke: "var(--semantic-stroke)",
          highlight: "var(--semantic-highlight)",
          emphasis: "var(--semantic-emphasis)",
          text: "var(--semantic-text)",
          focus: "var(--semantic-focus)",
          indicator: {
            1: "var(--semantic-indicator-1)",
            2: "var(--semantic-indicator-2)",
            3: "var(--semantic-indicator-3)",
            4: "var(--semantic-indicator-4)",
            5: "var(--semantic-indicator-5)",
            6: "var(--semantic-indicator-6)",
            7: "var(--semantic-indicator-7)",
            8: "var(--semantic-indicator-8)",
          },
          success: {
            bg: "var(--semantic-success-bg)",
            fg: "var(--semantic-success-fg)",
          },
          error: {
            bg: "var(--semantic-error-bg)",
            fg: "var(--semantic-error-fg)",
          },
          button: {
            primary: {
              bg: "var(--semantic-button-primary-bg)",
            },
            secondary: {
              bg: "var(--semantic-button-secondary-bg)",
              stroke: "var(--semantic-button-secondary-stroke)",
            },
          },
        },
      },
      backgroundColor: {
        "input-white": "var(--semantic-bg-elevation-2)",
        "cancel-btn": "var(--semantic-bg-elevation-1)",
      },
      borderColor: {
        "input-light": "var(--semantic-stroke)",
        "input-dark": "var(--semantic-stroke)",
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
