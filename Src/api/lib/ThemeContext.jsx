// Src/api/lib/ThemeContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const themes = {
  light: { name: 'Light', bg: '#ffffff', text: '#0f172a', primary: '#2563eb' },
  dark: { name: 'Dark', bg: '#0f172a', text: '#f8fafc', primary: '#3b82f6' },
  cyberpunk: { name: 'Cyberpunk', bg: '#0d0221', text: '#00f6ff', primary: '#ff007f' },
  forest: { name: 'Forest', bg: '#062c22', text: '#ecfdf5', primary: '#10b981' }
};

export const ThemeProvider = ({ children }) => {
  const [currentTheme, setCurrentTheme] = useState(() => {
    return localStorage.getItem('app_theme') || 'dark';
  });

  useEffect(() => {
    const theme = themes[currentTheme] || themes.dark;
    document.documentElement.style.setProperty('--bg-color', theme.bg);
    document.documentElement.style.setProperty('--text-color', theme.text);
    document.documentElement.style.setProperty('--primary-color', theme.primary);
    localStorage.setItem('app_theme', currentTheme);
  }, [currentTheme]);

  const changeTheme = (themeName) => {
    if (themes[themeName]) {
      setCurrentTheme(themeName);
    }
  };

  return (
    <ThemeContext.Provider value={{ currentTheme, changeTheme, themes }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);