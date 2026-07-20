/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./src/app/**/*.{js,ts,jsx,tsx,mdx}', './src/components/**/*.{js,ts,jsx,tsx,mdx}', './src/context/**/*.{js,ts,jsx,tsx,mdx}', './src/hooks/**/*.{js,ts,jsx,tsx,mdx}', './src/lib/**/*.{js,ts,jsx,tsx,mdx}', './src/pages/**/*.{js,ts,jsx,tsx,mdx}', './src/sections/**/*.{js,ts,jsx,tsx,mdx}'],
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
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
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
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Driven by CSS variables so the whole palette can be swapped for dark
        // mode without touching the ~1700 colour utilities in the components.
        // `<alpha-value>` keeps opacity modifiers (bg-study-brown/10) working.
        study: {
          bg: "rgb(var(--study-bg) / <alpha-value>)",
          // The surface cards and modals sit on. Was a literal `bg-white`.
          card: "rgb(var(--study-card) / <alpha-value>)",
          brown: "rgb(var(--study-brown) / <alpha-value>)",
          green: "rgb(var(--study-green) / <alpha-value>)",
          orange: "rgb(var(--study-orange) / <alpha-value>)",
          red: "rgb(var(--study-red) / <alpha-value>)",
          // Primary text colour — inverts in dark mode.
          dark: "rgb(var(--study-dark) / <alpha-value>)",
          gray: "rgb(var(--study-gray) / <alpha-value>)",
          lightgray: "rgb(var(--study-lightgray) / <alpha-value>)",
          // Modal scrims. A separate token because they must stay dark in both
          // themes — reusing `dark` here would make them light-on-dark once it
          // inverts, and every modal backdrop would glow.
          overlay: "rgb(var(--study-overlay) / <alpha-value>)",
          // Solid surface for white text (tooltips, pyramid top tier). Unlike
          // `dark`, it stays a dark surface in both themes.
          inverse: "rgb(var(--study-inverse) / <alpha-value>)",
        }
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
      },
      boxShadow: {
        xs: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
