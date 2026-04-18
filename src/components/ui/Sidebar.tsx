import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export default function Sidebar() {
  return (
    <aside className="w-64 bg-white border-r min-h-screen p-5">
      <h1 className="text-2xl font-bold text-green-600">EV-CSMS</h1>
      <p className="text-sm text-gray-500 mt-1">Charging Management</p>

      <Separator className="my-4" />

      <nav className="flex flex-col gap-4 text-gray-700 font-medium">
        <Link href="/" className="hover:text-green-600">
          Dashboard
        </Link>

        <Link href="/stations" className="hover:text-green-600">
          Charging Stations
        </Link>

        <Link href="/route" className="hover:text-green-600">
          Route Planner
        </Link>

        <Link href="/battery" className="hover:text-green-600">
          Battery Analytics
        </Link>
      </nav>
    </aside>
  );
}