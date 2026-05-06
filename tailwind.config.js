/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dbe7ff",
          500: "#3b6df0",
          600: "#2a55c8",
          700: "#1f409a",
          900: "#0d1f4d",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "Pretendard", "Apple SD Gothic Neo", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};
