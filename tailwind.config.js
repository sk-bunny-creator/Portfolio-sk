/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./*.{html,js}"
  ],
  theme: {
    extend: {
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        montserrat: ['Montserrat', 'sans-serif'],
        'patrick-hand': ['"Patrick Hand"', 'cursive'],
        // ADDED: New font family for the logo
        'plaster': ['Plaster', 'cursive'],
      },
      colors: {
        // CHANGE: Reflecting the new CSS variables for the "Slate" theme.
        // Replaced green with teal for the 'Play Game' button.
        'primary-blue': 'var(--accent-blue)',
        'primary-orange': 'var(--accent-orange)',
        'primary-purple': 'var(--accent-purple)',
        'primary-teal': 'var(--accent-teal)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'slate-bg': 'var(--slate-bg)',
      }
    },
  },
  plugins: [],
}