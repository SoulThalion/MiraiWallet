/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts}'],
  darkMode: ['class', '.dark'],
  theme: {
    extend: {
      colors: {
        brand: {
          blue:        '#1A8CFF',
          'blue-dark': '#0047CC',
          green:       '#2EC776',
          'green-dark':'#1A9B58',
          gold:        '#F5C842',
        },
        dark: {
          bg:   '#06101E',
          card: '#0C1A2E',
          surf: '#112238',
          elev: '#162C44',
          txt:  '#EEF5FF',
          txt2: '#6A9CC4',
          txt3: '#2E4A68',
        },
        light: {
          bg:   '#F4F7FB',
          card: '#FFFFFF',
          surf: '#EAF0F8',
          elev: '#DDEAF6',
          txt:  '#0D1F38',
          txt2: '#4A6E95',
          txt3: '#9BB5CC',
        }
      },
      fontFamily: {
        sans:    ['"DM Sans"', 'sans-serif'],
        display: ['Nunito', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 4px 20px rgba(0,71,204,0.35)',
      }
    }
  },
  plugins: []
}
