"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Search, PlusCircle, MessageSquare, User } from "lucide-react";
import React from "react";

export default function BottomNav() {
  const pathname = usePathname();

  // Hide nav on certain pages (e.g., create-story has its own sticky footer)
  const hiddenRoutes = ["/create-story", "/create"];
  if (hiddenRoutes.includes(pathname || "/")) return null;

  const items = [
    { href: "/", label: "Home", icon: Home },
    { href: "/search", label: "Search", icon: Search },
    { href: "/create", label: "Create", icon: PlusCircle },
    { href: "/inbox", label: "Inbox", icon: MessageSquare },
    { href: "/profile", label: "Profile", icon: User },
  ];

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#E5E7EB] px-4 py-2"
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between">
        {items.map((item) => {
          const Icon = item.icon;
          const isCreate = item.href === "/create";
          const isActive = pathname === item.href || (item.href === "/" && pathname === "/");

          if (isCreate) {
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-label={item.label}
                className="-mt-6 mx-2 flex items-center justify-center"
                title={item.label}
              >
                <div className="w-14 h-14 rounded-full bg-[#EC1D99] flex items-center justify-center shadow-lg transform-gpu transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#EC1D99]">
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </Link>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              className="flex-1"
              title={item.label}
            >
              <div
                className={`flex flex-col items-center justify-center gap-1 px-2 py-1 rounded-md transition-colors ${isActive ? "text-[#EC1D99]" : "text-[#6B7280]"
                  }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="w-6 h-6" />
                <span className="text-[10px]">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
