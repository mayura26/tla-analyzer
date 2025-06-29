"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useSession, signOut } from "next-auth/react";
import { User, LogOut } from "lucide-react";
import React from "react";

// Separate items for authenticated vs public access
const publicNavItems = [
  {
    title: "Weekly Summary",
    href: "/weekly"
  }
];

const authenticatedNavItems = [
  {
    title: "Raw Data",
    href: "/input"
  },
  {
    title: "Compare Data",
    href: "/compare"
  },
  {
    title: "View Comparison",
    href: "/compare/view"
  },
  {
    title: "Admin",
    href: "/admin"
  }
];

export function Nav() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  return (
    <nav className="border-b">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              TLA Analyzer
            </Link>
          </div>
          <div className="flex items-center gap-6">
            {/* Show Weekly Summary to all users */}
            {publicNavItems.map((item) => (
              <React.Fragment key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === item.href
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  {item.title}
                </Link>
              </React.Fragment>
            ))}
            
            {/* Show authenticated-only items */}
            {status === "authenticated" && authenticatedNavItems.map((item, index) => (
              <React.Fragment key={item.href}>
                {index === 0 && (
                  <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700" />
                )}
                <Link
                  href={item.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === item.href
                      ? "text-foreground"
                      : "text-foreground/60"
                  )}
                >
                  {item.title}
                </Link>
                {index === 1 && (
                  <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700" />
                )}
              </React.Fragment>
            ))}
            
            <ThemeToggle />
            
            {status === "authenticated" ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span className="hidden sm:inline">{session?.user?.name || "Admin"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleLogout} className="flex items-center gap-2">
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : status === "unauthenticated" ? (
              <Link href="/login">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </nav>
  );
} 