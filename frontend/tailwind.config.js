/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#F5EFFA',
          100: '#E8DAF3',
          200: '#D1B5E7',
          300: '#B88FDB',
          400: '#9B66C8',
          500: '#7B4DAE',
          600: '#5B2D8E',
          700: '#4A2272',
          800: '#3A1A5A',
          900: '#291242',
        },
        secondary: {
          50:  '#FFF8EC',
          100: '#FFEFD0',
          200: '#FFD98A',
          300: '#F9B233',
          400: '#F5A623',
          500: '#E09010',
          600: '#C07A0A',
          700: '#9A6208',
          800: '#744A06',
          900: '#503304',
        },
        brand: {
          offwhite: '#F9F7F4',
          dark: '#2D2D2D',
          body: '#4A4A4A',
          muted: '#7A7A7A',
        },
      },
      fontFamily: {
        heading: ['Poppins', 'Montserrat', 'sans-serif'],
        body: ['Open Sans', 'Nunito', 'sans-serif'],
      },
      borderRadius: {
        'pill': '25px',
      },
      boxShadow: {
        'brand-sm': '0 2px 8px rgba(0, 0, 0, 0.06)',
        'brand-md': '0 4px 20px rgba(0, 0, 0, 0.10)',
        'brand-lg': '0 8px 32px rgba(0, 0, 0, 0.15)',
      },
    },
  },
  plugins: [],
};
