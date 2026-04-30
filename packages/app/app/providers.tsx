"use client";

import { ThemeProvider, createGlobalStyle } from "styled-components";
import { theme } from "@/lib/theme";
import StyledComponentsRegistry from "@/lib/registry";

const GlobalStyle = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
  }

  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow: hidden;
  }

  html {
    background: ${theme.bg.base};
  }

  body {
    background: ${theme.bg.base};
    color: ${theme.ink[1]};
    font-family: ${theme.font.mono};
    font-weight: 400;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    text-rendering: optimizeLegibility;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  :focus {
    outline: none;
  }
`;

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <StyledComponentsRegistry>
      <ThemeProvider theme={theme}>
        <GlobalStyle />
        {children}
      </ThemeProvider>
    </StyledComponentsRegistry>
  );
}
