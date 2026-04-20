"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BatteryCharging,
  LayoutDashboard,
  Map,
  Route,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const routes = [
  {
    key: "dashboard-home",
    href: "/",
    label: "Dashboard",
    icon: LayoutDashboard,
    match: (pathname: string) => pathname === "/",
  },
  {
    key: "charging-stations-home",
    href: "/",
    label: "Charging Stations",
    icon: Map,
    match: (pathname: string) => pathname === "/",
  },
  {
    key: "route-planner",
    href: "/route",
    label: "Route Planner",
    icon: Route,
    match: (pathname: string) => pathname.startsWith("/route"),
  },
  {
    key: "battery-analytics",
    href: "/battery",
    label: "Battery Analytics",
    icon: BatteryCharging,
    match: (pathname: string) => pathname.startsWith("/battery"),
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-background p-5 text-foreground">
      <h1 className="text-2xl font-bold tracking-tight text-foreground">EV-CSMS</h1>
      <p className="mt-1 text-sm text-muted-foreground">Charging Management</p>

      <Separator className="my-4" />

      <nav className="flex flex-col gap-2">
        {routes.map((route) => {
          const Icon = route.icon;
          const active = route.match(pathname);

          return (
            <Button
              key={route.key}
              variant={active ? "secondary" : "ghost"}
              className="justify-start gap-2 text-foreground transition duration-300 ease-in-out"
              asChild
            >
              <Link href={route.href}>
                <Icon className="h-4 w-4" />
                <span>{route.label}</span>
              </Link>
            </Button>
          );
        })}
      </nav>
    </div>
  );
}

export default function Sidebar() {
  return (
    <aside className="hidden min-h-screen w-64 border-r border-border bg-background md:block">
      <SidebarNav />
    </aside>
  );
}
