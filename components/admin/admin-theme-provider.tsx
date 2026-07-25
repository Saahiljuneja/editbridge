"use client";

import { createContext, useContext } from "react";

const AdminThemeContext = createContext<{ theme: "light"; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

export function useAdminTheme() {
  return useContext(AdminThemeContext);
}

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <AdminThemeContext.Provider value={{ theme: "light", toggle: () => {} }}>
      <div>{children}</div>
    </AdminThemeContext.Provider>
  );
}
