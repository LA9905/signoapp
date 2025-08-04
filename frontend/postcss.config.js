// frontend/postcss.config.js
export default {
  plugins: {
    '@tailwindcss/postcss': {}, // ← nuevo plugin correcto
    autoprefixer: {},
  },
}
