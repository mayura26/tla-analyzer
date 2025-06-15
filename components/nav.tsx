"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import React from "react";

const navItems = [
  {
    title: "Raw Data",
    href: "/input"
  },
  {
    title: "Compare Data",
    href: "/compare"
  },
  {
    title: "Weekly Summary",
    href: "/weekly"
  },
  {
    title: "View Comparison",
    href: "/compare/view"
  }
];

export function Nav() {
  const pathname = usePathname();

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
            {navItems.map((item, index) => (
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
                {index === 1 && (
                  <div className="h-4 w-[1px] bg-gray-300 dark:bg-gray-700" />
                )}
              </React.Fragment>
            ))}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
} 