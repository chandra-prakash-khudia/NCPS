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
        primary:    { main: '#1d9bf0', light: '#60b7ff', dark: '#0f6faf' },
        secondary:  { main: '#00ba7c', light: '#34d399', dark: '#008f60' },
        success:    { main: '#00ba7c' },
        warning:    { main: '#f59e0b' },
        error:      { main: '#f4212e' },
        info:       { main: '#1d9bf0' },
        background: { default: '#000000', paper: '#000000' },
        text:       { primary: '#e7e9ea', secondary: '#71767b' },
        divider: '#2f3336',
      } : {
        primary:    { main: '#1d9bf0', light: '#60b7ff', dark: '#0f6faf' },
        secondary:  { main: '#008f60', light: '#00ba7c', dark: '#006b49' },
        success:    { main: '#059669' },
        warning:    { main: '#d97706' },
        error:      { main: '#dc2626' },
        info:       { main: '#1d9bf0' },
        background: { default: '#f7f9f9', paper: '#ffffff' },
        text:       { primary: '#0f1419', secondary: '#536471' },
        divider: '#cfd9de',
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
            '--sidebar-width': '248px',
            '--border-color': mode === 'dark' ? '#2f3336' : '#cfd9de',
            '--bg-primary': mode === 'dark' ? '#000000' : '#ffffff',
            '--primary-color': '#1d9bf0',
            '--radius-lg': '8px',
            '--radius-md': '8px',
            '--radius-sm': '8px',
            '--shadow-soft': mode === 'dark'
              ? 'none'
              : '0 1px 2px rgba(15,20,25,0.08)',
          },
          body: {
            backgroundColor: mode === 'dark' ? '#000000' : '#f7f9f9',
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
            background: '#1d9bf0',
            '&:hover': {
              background: '#1a8cd8',
              boxShadow: 'none',
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
            border: `1px solid ${mode === 'dark' ? '#2f3336' : '#cfd9de'}`,
            borderRadius: 8,
            boxShadow: 'none',
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
