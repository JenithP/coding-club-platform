/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        cream: {
          50: "#fbf8f3",
          100: "#f5f1e9",
          200: "#ede6d8",
        },
        lavender: {
          50: "#f4f1fb",
          100: "#eeedfe",
          200: "#cecbf6",
          300: "#afa9ec",
          400: "#7f77dd",
          500: "#534ab7",
          600: "#3c3489",
          700: "#26215c",
        },
        peach: {
          50: "#fdf2ec",
          100: "#faece7",
          200: "#f5d6c8",
          300: "#f0997b",
          400: "#f09595",
          500: "#d85a30",
        },
        mint: {
          50: "#f0faf6",
          100: "#e1f5ee",
          200: "#9fe1cb",
          300: "#5dcaa5",
          400: "#1d9e75",
          500: "#085041",
        },
        sand: {
          100: "#fafaf8",
          200: "#f5f4f0",
          300: "#e0dfd8",
          400: "#bfbcb1",
        },
      },
      fontFamily: {
        sans: [
          "Pretendard",
          "Noto Sans KR",
          "ui-sans-serif",
          "system-ui",
          "Apple SD Gothic Neo",
          "sans-serif",
        ],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      boxShadow: {
        soft: "0 4px 24px -8px rgba(83, 74, 183, 0.15)",
        glow: "0 0 0 4px rgba(207, 203, 246, 0.45)",
      },
      borderRadius: {
        xl: "14px",
        "2xl": "18px",
      },
      backgroundImage: {
        "soft-blush":
          "radial-gradient(circle at 20% 10%, #fbe8e6 0%, transparent 45%), radial-gradient(circle at 90% 0%, #ece7fb 0%, transparent 50%), radial-gradient(circle at 50% 110%, #fdf3e3 0%, transparent 60%)",
      },
    },
  },
  plugins: [],
};
