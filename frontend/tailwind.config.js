/** Design tokens ported from frontend/wireframes/chronicle_archive/DESIGN.md
 *  ("The Living Archive" / Digital Curator system). */
export default {
  content: ['./*.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Legacy Orange — CTAs and interactive wayfinding, "the spark of discovery"
        primary: {
          DEFAULT: '#a23900',
          container: '#d45211',
          soft: '#f3e2d4',
        },
        // Heritage Green — grounding elements and moments of calm
        heritage: {
          DEFAULT: '#4e6352',
          deep: '#2f3f34',
        },
        // Ink Charcoal — never pure black, keeps the ink-on-paper warmth
        ink: {
          DEFAULT: '#2c2c2c',
          soft: '#5c554d',
          faint: '#8a8177',
        },
        // Parchment surface stack — boundaries come from tone shifts, not lines
        surface: {
          DEFAULT: '#fff8ef',
          lowest: '#fffdf9',
          low: '#faf3e8',
          high: '#f5ebdc',
          highest: '#efe2ce',
        },
        outline: {
          DEFAULT: '#d8cbb8',
          variant: '#e8dfd0',
        },
      },
      fontFamily: {
        display: ['"Noto Serif"', 'Georgia', 'serif'],
        body: ['"Work Sans"', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        label: '0.1em',
        display: '-0.02em',
      },
      boxShadow: {
        // Tinted with on-surface ink rather than black — shadows are felt, not seen
        ambient: '0 20px 40px rgba(44, 44, 44, 0.06)',
        lift: '0 8px 24px rgba(44, 44, 44, 0.08)',
        artifact: '0 4px 12px rgba(44, 44, 44, 0.15)',
      },
      spacing: {
        editorial: '2.75rem',
      },
      maxWidth: {
        manuscript: '44rem',
      },
    },
  },
  plugins: [],
};
