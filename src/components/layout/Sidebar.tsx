"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderTree,
  Search,
  Cpu,
  Bug,
  GitPullRequest,
  Settings,
  Bot,
  Layers,
  BookOpen,
  Terminal,
  Activity,
  Compass,
  Code2
} from "lucide-react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

export const Sidebar: React.FC = () => {
  const pathname = usePathname();

  const sections: { title: string; items: NavItem[] }[] = [
    {
      title: "Repository",
      items: [
        {
          name: "Overview",
          href: "/",
          icon: <Layers className="w-4 h-4" />
        },
        {
          name: "Code Explorer",
          href: "/explore",
          icon: <FolderTree className="w-4 h-4" />
        },
        {
          name: "Search & Symbols",
          href: "/search",
          icon: <Search className="w-4 h-4" />
        },
        {
          name: "Architecture & 3D Map",
          href: "/architecture",
          icon: <Cpu className="w-4 h-4" />
        }
      ]
    },
    {
      title: "Intelligence",
      items: [
        {
          name: "Code Assistant",
          href: "/assistant",
          icon: <Bot className="w-4 h-4" />,
          badge: "Ollama"
        },
        {
          name: "Bug Investigation",
          href: "/debugging",
          icon: <Bug className="w-4 h-4" />
        },
        {
          name: "Patch Review",
          href: "/patches",
          icon: <GitPullRequest className="w-4 h-4" />
        }
      ]
    },
    {
      title: "System",
      items: [
        {
          name: "Local AI (Ollama)",
          href: "/settings/ai",
          icon: <Activity className="w-4 h-4" />
        },
        {
          name: "Settings",
          href: "/settings",
          icon: <Settings className="w-4 h-4" />
        },
        {
          name: "Docs & Limits",
          href: "/docs",
          icon: <BookOpen className="w-4 h-4" />
        }
      ]
    }
  ];

  return (
    <aside className="w-64 bg-[#0F1011] border-r border-[#23252A] flex flex-col shrink-0 select-none shadow-[1px_0_0_rgba(255,255,255,0.02)]">
      {/* Brand Header */}
      <div className="h-14 flex items-center px-4 border-b border-[#23252A] gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-[#5E6AD2]/15 border border-[#5E6AD2]/30 flex items-center justify-center text-[#828FFF] shadow-[0_0_12px_rgba(94,106,210,0.25)]">
          <Compass className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-[#F7F8F8] font-sans">
              RepoPilot
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded-[4px] bg-[#141516] text-[#8A8F98] border border-[#23252A]">
              v1.0
            </span>
          </div>
          <span className="text-[11px] text-[#62666D]">
            Codebase Intelligence
          </span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((sec, secIdx) => (
          <div key={secIdx}>
            <div className="px-2 pb-1.5 text-[10.5px] font-mono tracking-wider text-[#62666D] uppercase font-semibold">
              {sec.title}
            </div>
            <div className="space-y-0.5">
              {sec.items.map((item) => {
                const isActive =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center justify-between px-2.5 py-1.5 text-xs rounded-md transition-all duration-150 ${
                      isActive
                        ? "bg-[#141516] text-[#F7F8F8] font-medium border-l-2 border-[#5E6AD2] shadow-xs"
                        : "text-[#8A8F98] hover:text-[#F7F8F8] hover:bg-[#141516]/60 border-l-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? "text-[#828FFF]" : "text-[#62666D]"}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-[4px] bg-[#18191A] text-[#8A8F98] border border-[#23252A]">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer Info / Zero-Budget Indicator */}
      <div className="p-3 border-t border-[#23252A] bg-[#0F1011] text-[11px] text-[#62666D] font-mono flex items-center justify-between">
        <span>Zero-Budget · FOSS</span>
        <span className="text-[#27A644] flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-[#27A644] animate-pulse" />
          <span>Local Engine</span>
        </span>
      </div>
    </aside>
  );
};
