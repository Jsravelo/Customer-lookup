import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ZenMaid brand palette, from zenmaid-webapp _variables.scss
        zen: {
          50: '#eaf6f6', // --colorTertiaryLight
          100: '#d8fafa', // dashboard bg
          200: '#9be9eb', // mainnav popover
          300: '#64d1d2',
          400: '#00cccc', // --colorTertiary (turquoise)
          500: '#00a3a5', // --colorPrimary
          600: '#04848b', // welcome bg
          700: '#1d8181', // --colorSecondary
          800: '#254f4f', // --labelPrimary (text)
          900: '#011d2b',
        },
      },
      fontFamily: {
        sans: ['var(--font-mulish)', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config
