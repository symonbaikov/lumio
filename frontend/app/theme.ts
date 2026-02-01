import { type ThemeOptions, createTheme } from "@mui/material/styles";

export type ThemeMode = "light" | "dark";

const sharedOptions: Pick<ThemeOptions, "typography" | "components"> = {
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: { fontWeight: 600, fontSize: "2.5rem" },
    h2: { fontWeight: 600, fontSize: "2rem" },
    h3: { fontWeight: 600, fontSize: "1.75rem" },
    h4: { fontWeight: 600, fontSize: "1.5rem" },
    h5: { fontWeight: 500, fontSize: "1.25rem" },
    h6: { fontWeight: 500, fontSize: "1rem" },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, padding: "8px 16px" },
        contained: {
          boxShadow: "none",
          "&:hover": {
            boxShadow:
              "0px 2px 4px -1px rgba(0,0,0,0.2), 0px 4px 5px 0px rgba(0,0,0,0.14), 0px 1px 10px 0px rgba(0,0,0,0.12)",
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: "0px 4px 20px rgba(0, 0, 0, 0.05)",
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
  },
};

const paletteByMode: Record<ThemeMode, ThemeOptions["palette"]> = {
  light: {
    primary: {
      main: "#0a66c2",
      light: "#4c93e6",
      dark: "#004182",
      contrastText: "#ffffff",
    },
    secondary: {
      main: "#666666",
      light: "#8c8c8c",
      dark: "#404040",
      contrastText: "#ffffff",
    },
    background: {
      default: "#fcfbf9",
      paper: "#fcfbf9",
    },
    text: {
      primary: "#191919",
      secondary: "#555555",
    },
    divider: "#e0e0e0",
  },
  dark: {
    primary: {
      main: "#62b0ff",
      light: "#8cc8ff",
      dark: "#3c82d6",
      contrastText: "#0b1220",
    },
    secondary: {
      main: "#9aa6b2",
      light: "#c4ced8",
      dark: "#667487",
      contrastText: "#0b1220",
    },
    background: {
      default: "#0b1220",
      paper: "#0f172a",
    },
    text: {
      primary: "#e5e7eb",
      secondary: "#cbd5e1",
    },
    divider: "#1f2937",
  },
};

export const createAppTheme = (mode: ThemeMode) =>
  createTheme({
    ...sharedOptions,
    palette: {
      mode,
      ...paletteByMode[mode],
    },
  });

export const lightTheme = createAppTheme("light");
export const darkTheme = createAppTheme("dark");
