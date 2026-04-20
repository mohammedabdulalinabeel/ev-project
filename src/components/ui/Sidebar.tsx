"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

const routes = [
  { href: "/", label: "Dashboard" },
  { href: "/", label: "Charging Stations" },
  { href: "/route", label: "Route Planner" },
  { href: "/battery", label: "Battery Analytics" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-col h-full bg-white p-5 overflow-y-auto">
      <h1 className="text-2xl font-bold text-green-600">EV-CSMS</h1>
      <p className="text-sm text-gray-500 mt-1">Charging Management</p>

      <Separator className="my-4" />

      <nav className="flex flex-col gap-2">
        {routes.map((route) => (
          <Button
            key={route.href}
            variant={pathname === route.href ? "secondary" : "ghost"}
            className="justify-start"
            asChild
          >
            <Link href={route.href}>{route.label}</Link>
          </Button>
        ))}
      </nav>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="w-64 border-r min-h-screen hidden md:block bg-white">
      <SidebarNav />
    </aside>
  );
}