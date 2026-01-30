"use client";

import * as React from "react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      className="h-16px w-16px p-0 text-[#080705] dark:text-[#FAFFFD] hover:text-[#080705] dark:hover:text-[#FAFFFD] transition-colors"
    >
      {theme === "dark" ? (
        // Sun icon for dark mode (to switch to light)
        <Sun size={16} />
      ) : (
        // Moon icon for light mode (to switch to dark)
        <Moon size={16} />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
