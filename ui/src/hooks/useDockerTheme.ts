import { createTheme } from '@mui/material/styles';

declare global {
  interface Window {
    __ddMuiV5Themes?: { dark: object; light: object };
  }
}

export function useDockerTheme() {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const injected = window.__ddMuiV5Themes;
  if (injected) {
    return {
      theme: createTheme(injected[prefersDark ? 'dark' : 'light']),
      prefersDark,
    };
  }
  return {
    theme: createTheme({ palette: { mode: prefersDark ? 'dark' : 'light' } }),
    prefersDark,
  };
}
