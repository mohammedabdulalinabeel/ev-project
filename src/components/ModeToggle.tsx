"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";

export function ModeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative border-border bg-background text-foreground transition duration-300 ease-in-out hover:bg-muted"
      aria-label="Toggle theme"
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition duration-300 ease-in-out dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition duration-300 ease-in-out dark:rotate-0 dark:scale-100" />
    </Button>
  );
}

export default ModeToggle;
