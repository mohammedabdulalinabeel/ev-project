import "./globals.css";
import Sidebar, { SidebarNav } from "../components/ui/Sidebar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu } from "lucide-react";

export const metadata = {
  title: "EV-CSMS",
  description: "Electric Vehicle Charging Station Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-100 text-black">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            {/* Mobile Header */}
            <header className="md:hidden flex items-center p-4 bg-white border-b sticky top-0 z-50">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="mr-2">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Toggle navigation menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-0 w-64 border-r fixed inset-y-0 z-50 bg-white">
                  <SidebarNav />
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-bold text-green-600">EV-CSMS</h1>
            </header>

            <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}