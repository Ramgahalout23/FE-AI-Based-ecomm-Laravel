/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Brand Colors — Professional Black & White
        brand: {
          black: '#1a1a1a',
          'black-hover': '#000000',
          'black-light': '#333333',
          white: '#ffffff',
          'white-off': '#f5f5f5',
          gray: '#888888',
          'gray-light': '#cccccc',
        },
        // Primary = Black
        primary: {
          DEFAULT: '#1a1a1a',
          light: '#333333',
          dark: '#000000',
          50: '#f5f5f5',
          100: '#e5e5e5',
          500: '#1a1a1a',
          600: '#000000',
          700: '#000000',
        },
        // Secondary = White/Gray
        secondary: {
          DEFAULT: '#ffffff',
          light: '#f5f5f5',
          dark: '#e5e5e5',
          container: '#fafafa',
          onContainer: '#1a1a1a',
        },
        // Accent = Gray accents
        accent: {
          gray: '#888888',
          'gray-light': '#cccccc',
          dark: '#1a1a1a',
        },
        // Surface / Background
        surface: {
          DEFAULT: '#fafafa',
          dim: '#f0f0f0',
          card: '#ffffff',
          dark: '#1a1a2e',
          'dark-light': '#2d2d44',
        },
        // Text
        text: {
          primary: '#1a1a2e',
          secondary: '#4a4a5a',
          muted: '#8a8a9a',
          inverse: '#ffffff',
        },
        // Utility
        border: {
          DEFAULT: '#e5e5ea',
          light: '#f0f0f5',
          dark: '#d0d0d8',
        },
        success: { DEFAULT: '#22c55e', bg: '#f0fdf4' },
        danger: { DEFAULT: '#ef4444', bg: '#fef2f2' },
        warning: { DEFAULT: '#f59e0b', bg: '#fffbeb' },
        info: { DEFAULT: '#3b82f6', bg: '#eff6ff' },
        // Legacy compatibility
        charcoal: { DEFAULT: '#1a1a1a', light: '#333333' },
        gold: { DEFAULT: '#888888', light: '#cccccc', hover: '#666666', dark: '#555555' },
        offWhite: '#fafafa',
        cream: '#f5f5f5',
        muted: { DEFAULT: '#888888', light: '#cccccc' },
      },
      fontFamily: {
        display: ['Jost', 'sans-serif'],
        headline: ['Jost', 'sans-serif'],
        body: ['Jost', 'sans-serif'],
        label: ['Jost', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['56px', { lineHeight: '1.05', fontWeight: '800', letterSpacing: '-0.04em' }],
        'display-lg': ['44px', { lineHeight: '1.1', fontWeight: '800', letterSpacing: '-0.03em' }],
        'headline-lg': ['32px', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.015em' }],
        'headline-md': ['24px', { lineHeight: '1.2', fontWeight: '600', letterSpacing: '-0.01em' }],
        'headline-sm': ['20px', { lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.005em' }],
        'body-lg': ['18px', { lineHeight: '1.6', fontWeight: '400' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '400' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '400' }],
        'label-md': ['14px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.02em' }],
        'label-sm': ['12px', { lineHeight: '1.4', fontWeight: '600', letterSpacing: '0.04em' }],
        'price-lg': ['22px', { lineHeight: '1', fontWeight: '800' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      spacing: {
        'section-gap': '80px',
        'grid-gutter': '20px',
        'container-padding': '24px',
      },
      borderRadius: {
        'sm': '6px',
        DEFAULT: '8px',
        'md': '12px',
        'lg': '16px',
        'xl': '20px',
        '2xl': '24px',
        'full': '9999px',
      },
      boxShadow: {
        'soft': '0 2px 12px rgba(0, 0, 0, 0.06)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'lift': '0 8px 30px rgba(0, 0, 0, 0.12)',
        'glow-black': '0 0 20px rgba(26, 26, 26, 0.3)',
        'glow-white': '0 0 20px rgba(255, 255, 255, 0.2)',
        'inner-soft': 'inset 0 2px 4px rgba(0, 0, 0, 0.04)',
      },
      zIndex: {
        'dropdown': '50',
        'sticky': '100',
        'overlay': '200',
        'drawer': '201',
        'modal': '300',
        'toast': '999',
      },
      keyframes: {
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(244, 58, 9, 0.4)' },
          '50%': { boxShadow: '0 0 0 10px rgba(244, 58, 9, 0)' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        'count-pulse': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.1)' },
        },
        'shake': {
          '0%, 100%': { transform: 'translateX(0)' },
          '10%': { transform: 'translateX(-6px) rotate(-0.5deg)' },
          '20%': { transform: 'translateX(6px) rotate(0.5deg)' },
          '30%': { transform: 'translateX(-5px) rotate(-0.4deg)' },
          '40%': { transform: 'translateX(5px) rotate(0.4deg)' },
          '50%': { transform: 'translateX(-3px) rotate(-0.2deg)' },
          '60%': { transform: 'translateX(3px) rotate(0.2deg)' },
          '70%': { transform: 'translateX(-1px)' },
        },
      },
      animation: {
        'slide-up': 'slide-up 0.5s ease-out',
        'slide-in-right': 'slide-in-right 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'count-pulse': 'count-pulse 0.3s ease-out',
        'shake': 'shake 0.5s ease-in-out',
      },
    },
  },
  plugins: [],
}