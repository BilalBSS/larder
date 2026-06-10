// / brand tokens
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './src/ui/**/*.{ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // / surfaces
        paper: '#F4EEE2',
        'paper-deep': '#ECE3D0',
        surface: '#FBF7EC',
        'surface-2': '#FFFCF4',
        'surface-mute': '#EFE7D5',
        // / ink
        ink: '#1C1814',
        'ink-soft': '#3A332C',
        mid: '#6B6359',
        muted: '#9A8F82',
        // / lines
        hairline: '#E5DAC5',
        edge: '#D9CDB5',
        'edge-press': '#C9BC9C',
        // / accent
        terracotta: {
          DEFAULT: '#B5532D',
          deep: '#8E3F1F',
          soft: '#E9C8B7',
          bg: '#F7E4D6',
        },
        // / urgency states
        urgency: {
          urgent: '#C5403A',
          'urgent-bg': '#F6DFD9',
          'urgent-deep': '#8E2A26',
          soon: '#C77A1A',
          'soon-bg': '#F6E5C3',
          'soon-deep': '#8E5410',
          fresh: '#4F7C45',
          'fresh-bg': '#DEE9D2',
          'fresh-deep': '#2F4D29',
          frozen: '#5C6A78',
          'frozen-bg': '#DAE0E5',
          'frozen-deep': '#3E4853',
          gone: '#9A8F82',
        },
        // / member avatars
        member: {
          1: '#B5532D',
          2: '#6F8654',
          3: '#8B5E3C',
          4: '#6B6395',
          5: '#A06B86',
          6: '#4A6B7A',
        },
      },
      fontSize: {
        eyebrow: ['11px', '13.2px'],
        meta: ['12px', '16.2px'],
        body: ['14px', '20.3px'],
        label: ['13px', '16.9px'],
        num: ['14px', '14px'],
        'num-sm': ['12px', '12px'],
        'num-lg': ['18px', '18px'],
        'num-xl': ['28px', '34px'],
        'num-display': ['44px', '52px'],
        title: ['17px', '21.25px'],
        display: ['24px', '27.6px'],
        'display-lg': ['32px', '35.2px'],
        'display-xl': ['44px', '46.2px'],
      },
      spacing: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        6: '24px',
        7: '32px',
        8: '40px',
        9: '56px',
        10: '72px',
      },
      borderRadius: {
        1: '4px',
        2: '8px',
        3: '12px',
        4: '16px',
        5: '20px',
        pill: '9999px',
      },
      fontFamily: {
        // / semantic aliases
        serif: ['Newsreader_600SemiBold'],
        sans: ['Manrope_500Medium'],
        mono: ['JetBrainsMono_400Regular'],
        // / loaded weights
        'newsreader-medium': ['Newsreader_500Medium'],
        'newsreader-semibold': ['Newsreader_600SemiBold'],
        'manrope-medium': ['Manrope_500Medium'],
        'manrope-semibold': ['Manrope_600SemiBold'],
        'manrope-bold': ['Manrope_700Bold'],
        'mono-regular': ['JetBrainsMono_400Regular'],
        'mono-medium': ['JetBrainsMono_500Medium'],
      },
      letterSpacing: {
        eyebrow: '0.08em',
        display: '-0.01em',
        num: '-0.005em',
      },
    },
  },
  plugins: [],
};
