import React, { createContext, useContext, useMemo, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';

const ColorModeContext = createContext({ toggleColorMode: () => {} });
export const useColorMode = () => useContext(ColorModeContext);

const AppThemeProvider = ({ children }) => {
  const [mode, setMode] = useState('dark');

  const colorMode = useMemo(() => ({
    toggleColorMode: () => setMode((prev) => (prev === 'light' ? 'dark' : 'light')),
    mode,
  }), [mode]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      ...(mode === 'dark' ? {
        primary:    { main: '#2563eb', light: '#60a5fa', dark: '#1d4ed8' },
        secondary:  { main: '#0f766e', light: '#2dd4bf', dark: '#115e59' },
        success:    { main: '#10b981' },
        warning:    { main: '#f59e0b' },
        error:      { main: '#ef4444' },
        info:       { main: '#0284c7' },
        background: { default: '#0f172a', paper: '#162033' },
        text:       { primary: '#f8fafc', secondary: '#b6c2d1' },
        divider: 'rgba(226,232,240,0.12)',
      } : {
        primary:    { main: '#1d4ed8', light: '#3b82f6', dark: '#1e40af' },
        secondary:  { main: '#0f766e', light: '#14b8a6', dark: '#115e59' },
        success:    { main: '#059669' },
        warning:    { main: '#d97706' },
        error:      { main: '#dc2626' },
        info:       { main: '#0369a1' },
        background: { default: '#f4f7fb', paper: '#ffffff' },
        text:       { primary: '#111827', secondary: '#526173' },
        divider: 'rgba(17,24,39,0.1)',
      }),
    },

    typography: {
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
      h1: { fontWeight: 800, letterSpacing: 0 },
      h2: { fontWeight: 800, letterSpacing: 0 },
      h3: { fontWeight: 800, letterSpacing: 0 },
      h4: { fontWeight: 700, letterSpacing: 0 },
      h5: { fontWeight: 700 },
      h6: { fontWeight: 700 },
      subtitle1: { fontWeight: 600 },
      subtitle2: { fontWeight: 600 },
      body2: { fontSize: '0.875rem', lineHeight: 1.6 },
      caption: { fontSize: '0.75rem', letterSpacing: '0.02em' },
      button: { textTransform: 'none', fontWeight: 700 },
    },

    shape: { borderRadius: 8 },

    components: {
      MuiCssBaseline: {
        styleOverrides: {
          ':root': {
            '--border-color': mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
            '--bg-primary': mode === 'dark' ? '#111827' : '#ffffff',
            '--primary-color': mode === 'dark' ? '#60a5fa' : '#1d4ed8',
            '--radius-lg': '8px',
            '--radius-md': '8px',
            '--radius-sm': '8px',
            '--shadow-soft': mode === 'dark'
              ? '0 10px 28px rgba(0,0,0,0.22)'
              : '0 10px 24px rgba(17,24,39,0.08)',
          },
        },
      },
      MuiButton: {
        styleOverrides: {
          root: {
            borderRadius: 8,
            padding: '8px 20px',
            fontSize: '0.875rem',
            boxShadow: 'none',
            '&:hover': { boxShadow: 'none' },
          },
          contained: {
            background: mode === 'dark' ? '#2563eb' : '#1d4ed8',
            '&:hover': {
              background: mode === 'dark' ? '#1d4ed8' : '#1e40af',
              transform: 'translateY(-1px)',
              boxShadow: '0 8px 20px rgba(37,99,235,0.24)',
            },
          },
          outlined: {
            borderColor: mode === 'dark' ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
          },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            backgroundImage: 'none',
            border: `1px solid ${mode === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`,
            borderRadius: 8,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8, fontWeight: 600 },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            borderRadius: 8,
            fontSize: '0.75rem',
            fontWeight: 500,
            backdropFilter: 'blur(8px)',
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
        },
      },
    },
  }), [mode]);

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
