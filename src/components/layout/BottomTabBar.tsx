"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { FolderTree, Cpu, Bot, Bug } from "lucide-react";

interface TabItem {
  name: string;
  href: string;
  icon: React.ReactNode;
}

const TABS: TabItem[] = [
  {
    name: "Explore",
    href: "/explore",
    icon: <FolderTree className="w-5 h-5" />
  },
  {
    name: "Architecture",
    href: "/architecture",
    icon: <Cpu className="w-5 h-5" />
  },
  {
    name: "Assistant",
    href: "/assistant",
    icon: <Bot className="w-5 h-5" />
  },
  {
    name: "Debugging",
    href: "/debugging",
    icon: <Bug className="w-5 h-5" />
  }
];

export const BottomTabBar: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile primary navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-theme-surface/95 backdrop-blur-md border-t border-theme-border pb-safe shadow-lg select-none"
    >
      <div className="flex items-center justify-around h-14 px-2">
        {TABS.map((tab) => {
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex-1 flex flex-col items-center justify-center min-h-[44px] min-w-[44px] py-1 rounded-lg transition-colors cursor-pointer ${
                isActive
                  ? "text-theme-blue font-semibold"
                  : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-alt/60"
              }`}
            >
              <span className={`shrink-0 transition-transform ${isActive ? "scale-110" : ""}`}>
                {tab.icon}
              </span>
              <span className="text-[10px] font-mono tracking-tight mt-0.5">
                {tab.name}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

