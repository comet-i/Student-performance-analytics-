const c = (n) => `rgb(var(--${n}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx}", "./components/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        bg: c("bg"), panel: c("panel"), card: c("card"), line: c("line"),
        brand: c("brand"), ink: c("ink"), muted: c("muted"),
        ok: c("ok"), okbg: c("okbg"), bad: c("bad"), badbg: c("badbg"),
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        serif: ["var(--font-lora)", "Georgia", "serif"],
      },
    },
  },
};
