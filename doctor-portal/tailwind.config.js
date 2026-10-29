/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0f172a', // slate-900 (Dark clinical theme)
        surface: '#1e293b',    // slate-800
        border: '#334155',     // slate-700
        primary: {
          DEFAULT: '#0ea5e9',  // sky-500 (Clinical blue accent)
          hover: '#0284c7',    // sky-600
        },
        success: '#10b981',    // emerald-500 (Trusted green)
        warning: '#f59e0b',    // amber-500
        danger: '#ef4444',     // red-500 (Emergency)
        text: {
          primary: '#f8fafc',  // slate-50
          secondary: '#cbd5e1',// slate-300
          muted: '#94a3b8',    // slate-400
        }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
