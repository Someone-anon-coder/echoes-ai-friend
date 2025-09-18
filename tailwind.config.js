/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./{index,App,types,constants,firebaseConfig}.tsx",
    "./{components,services,utils}/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
