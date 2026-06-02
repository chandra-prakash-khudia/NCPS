import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, alpha } from '@mui/material';

const ColorModeContext = createContext({ toggleColorMode: () => {}, mode: 'dark' });
export const useColorMode = () => useContext(ColorModeContext);

const STORAGE_KEY = 'ncps.theme';

// ---- Brand + semantic tokens -------------------------------------------------
// A restrained indigo carries the brand; credibility states stay green/amber/red
// so the meter reads the same everywhere. Tuned by hand for both modes rather
// than generated from a single hue, so nothing looks defaulted.
const brand = {
  light: { main: '#5b5bd6', light: '#7b7ce8', dark: '#4444b0', contrast: '#ffffff' },
  dark: { main: '#8b8cf5', light: '#a6a7ff', dark: '#6f70e0', contrast: '#0b0b12' },
};

const palettes = {
  light: {
    primary: brand.light,
    secondary: { main: '#0e9f6e', light: '#34c98b', dark: '#0a7a54' },
    success: { main: '#0e9f6e' },
    warning: { main: '#d98005' },
    error: { main: '#e02f4f' },
    info: { main: '#5b5bd6' },
    background: { default: '#f7f7fa', paper: '#ffffff' },
    text: { primary: '#16161d', secondary: '#5d5f6b', disabled: '#9a9ca6' },
    divider: '#e7e7ee',
  },
  dark: {
    primary: brand.dark,
    secondary: { main: '#2dd4a7', light: '#5fe6c1', dark: '#16a37f' },
    success: { main: '#2dd4a7' },
    warning: { main: '#f0a93b' },
    error: { main: '#f7556f' },
    info: { main: '#8b8cf5' },
    background: { default: '#0b0c10', paper: '#13141b' },
    text: { primary: '#ededf2', secondary: '#9b9da9', disabled: '#5f616d' },
    divider: '#23242e',
  },
};

const surfaceTokens = (mode) => {
  const isDark = mode === 'dark';
  return {
    appBg: isDark ? '#0b0c10' : '#f7f7fa',
    panel: isDark ? '#13141b' : '#ffffff',
    panelMuted: isDark ? '#16181f' : '#fbfbfd',
    border: isDark ? '#23242e' : '#e7e7ee',
    borderStrong: isDark ? '#30323d' : '#d8d9e2',
    hover: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(17,18,28,0.035)',
    accent: isDark ? brand.dark.main : brand.light.main,
    accentSoft: isDark ? alpha(brand.dark.main, 0.16) : alpha(brand.light.main, 0.1),
    shadowSoft: isDark
      ? '0 1px 2px rgba(0,0,0,0.4), 0 1px 3px rgba(0,0,0,0.3)'
      : '0 1px 2px rgba(16,18,40,0.04), 0 1px 3px rgba(16,18,40,0.06)',
    shadowLift: isDark
      ? '0 8px 24px -8px rgba(0,0,0,0.7), 0 2px 6px rgba(0,0,0,0.4)'
      : '0 12px 28px -12px rgba(16,18,40,0.14), 0 2px 6px rgba(16,18,40,0.06)',
    glow: isDark ? `0 0 0 1px ${alpha(brand.dark.main, 0.4)}` : `0 0 0 1px ${alpha(brand.light.main, 0.35)}`,
  };
};

const getInitialMode = () => {
  if (typeof window === 'undefined') return 'dark';
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return 'dark';
};

const AppThemeProvider = ({ children }) => {
  const [mode, setMode] = useState(getInitialMode);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    document.documentElement.setAttribute('data-theme', mode);
  }, [mode]);

  const colorMode = useMemo(() => ({
    toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
    mode,
  }), [mode]);

  const theme = useMemo(() => {
    const s = surfaceTokens(mode);
    const p = palettes[mode];

    return createTheme({
      palette: { mode, ...p },

      typography: {
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        h1: { fontWeight: 760, letterSpacing: '-0.03em', lineHeight: 1.05 },
        h2: { fontWeight: 740, letterSpacing: '-0.025em', lineHeight: 1.1 },
        h3: { fontWeight: 720, letterSpacing: '-0.02em', lineHeight: 1.15 },
        h4: { fontWeight: 700, letterSpacing: '-0.018em', lineHeight: 1.2 },
        h5: { fontWeight: 680, letterSpacing: '-0.012em' },
        h6: { fontWeight: 660, letterSpacing: '-0.008em' },
        subtitle1: { fontWeight: 600, letterSpacing: '-0.005em' },
        subtitle2: { fontWeight: 600, letterSpacing: '0' },
        body1: { fontSize: '0.95rem', lineHeight: 1.6 },
        body2: { fontSize: '0.86rem', lineHeight: 1.6 },
        caption: { fontSize: '0.745rem', letterSpacing: '0.01em' },
        overline: { fontWeight: 700, letterSpacing: '0.08em', fontSize: '0.68rem' },
        button: { textTransform: 'none', fontWeight: 600, letterSpacing: '-0.005em' },
      },

      shape: { borderRadius: 12 },

      components: {
        MuiCssBaseline: {
          styleOverrides: {
            ':root': {
              '--sidebar-width': '256px',
              '--app-bg': s.appBg,
              '--panel': s.panel,
              '--panel-muted': s.panelMuted,
              '--border-color': s.border,
              '--border-strong': s.borderStrong,
              '--hover': s.hover,
              '--accent': s.accent,
              '--accent-soft': s.accentSoft,
              '--text-primary': p.text.primary,
              '--text-secondary': p.text.secondary,
              '--radius-lg': '16px',
              '--radius-md': '12px',
              '--radius-sm': '9px',
              '--shadow-soft': s.shadowSoft,
              '--shadow-lift': s.shadowLift,
              '--glow': s.glow,
              '--mono': "'JetBrains Mono', ui-monospace, SFMono-Regular, monospace",
              colorScheme: mode,
            },
            '*': { boxSizing: 'border-box' },
            html: { WebkitFontSmoothing: 'antialiased', MozOsxFontSmoothing: 'grayscale' },
            body: {
              backgroundColor: s.appBg,
              backgroundImage: mode === 'dark'
                ? `radial-gradient(900px 500px at 100% -5%, ${alpha(brand.dark.main, 0.07)}, transparent 60%)`
                : `radial-gradient(900px 500px at 100% -5%, ${alpha(brand.light.main, 0.05)}, transparent 60%)`,
              backgroundAttachment: 'fixed',
              fontFeatureSettings: "'cv05', 'cv08', 'cv11', 'ss01'",
            },
            '::selection': { background: alpha(s.accent, 0.28) },
          },
        },

        MuiButton: {
          defaultProps: { disableElevation: true },
          styleOverrides: {
            root: {
              borderRadius: 10,
              padding: '7px 16px',
              fontSize: '0.86rem',
              fontWeight: 600,
              boxShadow: 'none',
              transition: 'background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 120ms ease',
              '&:active': { transform: 'translateY(0.5px)' },
            },
            sizeSmall: { padding: '4px 12px', fontSize: '0.8rem' },
            sizeLarge: { padding: '10px 22px', fontSize: '0.95rem' },
            contained: {
              color: mode === 'dark' ? brand.dark.contrast : '#fff',
              backgroundImage: mode === 'dark'
                ? `linear-gradient(180deg, ${brand.dark.light}, ${brand.dark.main})`
                : `linear-gradient(180deg, ${brand.light.light}, ${brand.light.main})`,
              '&:hover': {
                backgroundImage: mode === 'dark'
                  ? `linear-gradient(180deg, ${brand.dark.main}, ${brand.dark.dark})`
                  : `linear-gradient(180deg, ${brand.light.main}, ${brand.light.dark})`,
                boxShadow: 'none',
              },
            },
            outlined: {
              borderColor: s.borderStrong,
              '&:hover': { borderColor: s.accent, backgroundColor: s.accentSoft },
            },
            text: { '&:hover': { backgroundColor: s.hover } },
          },
        },

        MuiIconButton: {
          styleOverrides: {
            root: { borderRadius: 10, transition: 'background-color 140ms ease, color 140ms ease' },
          },
        },

        MuiPaper: {
          styleOverrides: {
            root: { backgroundImage: 'none' },
            outlined: { borderColor: s.border },
          },
        },

        MuiCard: {
          defaultProps: { elevation: 0 },
          styleOverrides: {
            root: {
              backgroundImage: 'none',
              backgroundColor: s.panel,
              border: `1px solid ${s.border}`,
              borderRadius: 16,
              boxShadow: s.shadowSoft,
            },
          },
        },

        MuiChip: {
          styleOverrides: {
            root: { borderRadius: 8, fontWeight: 600, fontSize: '0.76rem' },
            outlined: { borderColor: s.borderStrong },
            sizeSmall: { height: 24 },
          },
        },

        MuiTooltip: {
          styleOverrides: {
            tooltip: {
              borderRadius: 8,
              fontSize: '0.74rem',
              fontWeight: 500,
              padding: '6px 10px',
              backgroundColor: mode === 'dark' ? '#23242e' : '#1c1d27',
              border: `1px solid ${mode === 'dark' ? '#32333f' : 'transparent'}`,
            },
            arrow: { color: mode === 'dark' ? '#23242e' : '#1c1d27' },
          },
        },

        MuiOutlinedInput: {
          styleOverrides: {
            root: {
              borderRadius: 10,
              backgroundColor: s.panelMuted,
              transition: 'border-color 140ms ease, box-shadow 140ms ease',
              '& .MuiOutlinedInput-notchedOutline': { borderColor: s.border },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: s.borderStrong },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderWidth: 1, borderColor: s.accent },
              '&.Mui-focused': { boxShadow: `0 0 0 3px ${s.accentSoft}` },
            },
          },
        },

        MuiMenu: {
          styleOverrides: {
            paper: {
              borderRadius: 12,
              border: `1px solid ${s.border}`,
              boxShadow: s.shadowLift,
              backgroundImage: 'none',
              backgroundColor: s.panel,
            },
          },
        },

        MuiMenuItem: {
          styleOverrides: {
            root: { borderRadius: 8, margin: '2px 6px', '&:hover': { backgroundColor: s.hover } },
          },
        },

        MuiDialog: {
          styleOverrides: {
            paper: {
              borderRadius: 18,
              border: `1px solid ${s.border}`,
              backgroundImage: 'none',
              backgroundColor: s.panel,
              boxShadow: s.shadowLift,
            },
          },
        },

        MuiTabs: {
          styleOverrides: {
            indicator: { height: 2.5, borderRadius: 2 },
          },
        },
        MuiTab: {
          styleOverrides: {
            root: { textTransform: 'none', fontWeight: 600, minHeight: 44, fontSize: '0.86rem' },
          },
        },

        MuiLinearProgress: {
          styleOverrides: {
            root: { borderRadius: 999 },
            bar: { borderRadius: 999 },
          },
        },

        MuiAvatar: {
          styleOverrides: { root: { fontWeight: 700 } },
        },

        MuiDivider: {
          styleOverrides: { root: { borderColor: s.border } },
        },

        MuiToggleButton: {
          styleOverrides: {
            root: {
              textTransform: 'none',
              fontWeight: 600,
              borderColor: s.border,
              borderRadius: 9,
              '&.Mui-selected': {
                backgroundColor: s.accentSoft,
                color: s.accent,
                '&:hover': { backgroundColor: s.accentSoft },
              },
            },
          },
        },
      },
    });
  }, [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default AppThemeProvider;
