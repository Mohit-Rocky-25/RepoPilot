"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  FolderTree,
  FolderArchive,
  Search,
  Cpu,
  Bug,
  GitPullRequest,
  Settings,
  Bot,
  BookOpen,
  Activity,
  Compass,
  Home
} from "lucide-react";
import { FourDots } from "@/components/ui/signature/FourDots";
import { RepoPilotLogo } from "@/components/ui/RepoPilotLogo";

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
      title: "Workspace",
      items: [
        {
          name: "Home / Overview",
          href: "/",
          icon: <Home className="w-4 h-4" />
        },
        {
          name: "My Workplace",
          href: "/workplace",
          icon: <FolderArchive className="w-4 h-4 text-theme-blue" />,
          badge: "Drafts"
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
        },
        {
          name: "Saved Workspaces",
          href: "/history",
          icon: <FolderArchive className="w-4 h-4" />
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
      title: "Configuration",
      items: [
        {
          name: "Local AI (Ollama)",
          href: "/settings/ai",
          icon: <Activity className="w-4 h-4" />
        },
        {
          name: "Settings & Token",
          href: "/settings",
          icon: <Settings className="w-4 h-4" />
        },
        {
          name: "Documentation",
          href: "/docs",
          icon: <BookOpen className="w-4 h-4" />
        }
      ]
    }
  ];

  return (
    <aside className="hidden md:flex w-64 bg-theme-surface border-r border-theme-border flex-col shrink-0 select-none shadow-xs">
      {/* Brand Header / Home Link */}
      <Link
        href="/"
        title="Go to RepoPilot Home"
        className="h-14 flex items-center px-4 border-b border-theme-border gap-2.5 hover:bg-theme-surface-alt transition-colors group cursor-pointer"
      >
        <div className="w-8 h-8 rounded-lg bg-theme-surface-alt border border-theme-border flex items-center justify-center group-hover:border-theme-blue/40 transition-all shrink-0">
          <RepoPilotLogo size={20} variant="mark" withGlow />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-sm tracking-tight text-theme-text font-sans group-hover:text-theme-blue transition-colors">
              RepoPilot
            </span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-theme-surface-alt text-theme-text-muted border border-theme-border">
              v1.0
            </span>
          </div>
          <span className="text-[11px] text-theme-text-muted">
            Codebase Intelligence
          </span>
        </div>
      </Link>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {sections.map((sec, secIdx) => (
          <div key={secIdx}>
            <div className="px-2 pb-1.5 text-[10.5px] font-mono tracking-wider text-theme-text-subtle uppercase font-semibold">
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
                        ? "bg-theme-blue-surface text-theme-blue font-medium border-l-2 border-theme-blue shadow-xs"
                        : "text-theme-text-muted hover:text-theme-text hover:bg-theme-surface-alt border-l-2 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className={isActive ? "text-theme-blue" : "text-theme-text-subtle"}>
                        {item.icon}
                      </span>
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-theme-surface-alt text-theme-text-muted border border-theme-border">
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

      {/* Footer Info / Signature Motif */}
      <div className="p-3 border-t border-theme-border bg-theme-surface text-[11px] text-theme-text-muted font-mono flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FourDots size="xs" />
          <span>FOSS · GDG Style</span>
        </div>
        <span className="text-theme-green-text flex items-center gap-1.5 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-theme-green animate-pulse" />
          <span>Local Engine</span>
        </span>
      </div>
    </aside>
  );
};
