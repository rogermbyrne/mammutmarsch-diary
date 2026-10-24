/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        forest: '#193D35',
        leaf: '#3A956C',
        sage: '#D8EDE1',
        lime: '#C4EAA4',
        paper: '#F8F9F5',
        ink: '#24332C',
        cream: '#FBF7EE',
        amber: { soft: '#FDF1D8', ink: '#8A5A00', line: '#E8B45A' },
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Segoe UI"', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'],
      },
      boxShadow: { soft: '0 1px 2px rgba(25,61,53,0.06), 0 6px 20px rgba(25,61,53,0.07)' },
    },
  },
  plugins: [],
}
