/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx}'],
  prefix: 'j2s-',
  theme: {
    extend: {
      colors: {
        primary: 'var(--j2s-primary, #5B2D8E)',
        'primary-dark': 'var(--j2s-primary-dark, #4A2272)',
        'primary-light': 'var(--j2s-primary-light, #7B4DAE)',
        secondary: 'var(--j2s-secondary, #F5A623)',
        'secondary-dark': 'var(--j2s-secondary-dark, #E09010)',
        accent: 'var(--j2s-accent, #F9B233)',
        'chat-bg': 'var(--j2s-chat-bg, #F9F7F4)',
        'user-bubble': 'var(--j2s-user-bubble, #5B2D8E)',
        'bot-bubble': 'var(--j2s-bot-bubble, #FFFFFF)',
      },
      fontFamily: {
        sans: ['Open Sans', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        heading: ['Poppins', 'Montserrat', 'sans-serif'],
      },
      borderRadius: {
        pill: '25px',
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false, // Don't reset host page styles
  },
};
