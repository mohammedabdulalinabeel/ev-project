"use client";

import { Menu } from "lucide-react";

import Sidebar, { SidebarNav } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-100 text-foreground transition duration-300 ease-in-out dark:bg-slate-950">
      <Sidebar />

      <div className="flex flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-background p-4 shadow-sm md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open navigation">
                <Menu className="h-5 w-5 text-foreground" />
              </Button>
            </SheetTrigger>

            <SheetContent
              side="left"
              className="w-72 border-border bg-background p-0"
            >
              <div className="h-full">
                <SidebarNav />
              </div>
            </SheetContent>
          </Sheet>

          <h1 className="text-lg font-bold text-foreground">EV-CSMS</h1>
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
