"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "dark" | "light";

const AdminThemeContext = createContext<{
  theme: Theme;
  toggle: () => void;
}>({ theme: "dark", toggle: () => {} });

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("admin-theme") as Theme | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  function toggle() {
    setTheme(prev => {
      const next = prev === "dark" ? "light" : "dark";
      localStorage.setItem("admin-theme", next);
      return next;
    });
  }

  return (
    <AdminThemeContext.Provider value={{ theme, toggle }}>
      <div className={theme === "dark" ? "dark" : ""}>
        {children}
      </div>
    </AdminThemeContext.Provider>
  );
}
