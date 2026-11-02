import "@/styles/globals.css";
import React from "react";
import type { Metadata, Viewport } from "next";
import { Roboto, Roboto_Mono } from "next/font/google";
import { RepositoryProvider } from "@/context/RepositoryContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { ShellLayout } from "@/components/layout/ShellLayout";

const roboto = Roboto({
  weight: ["300", "400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto",
  display: "swap"
});

const robotoMono = Roboto_Mono({
  weight: ["400", "500", "700"],
  subsets: ["latin"],
  variable: "--font-roboto-mono",
  display: "swap"
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://repopilot.dev";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#010102" }
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "RepoPilot — Autonomous Codebase Intelligence & Architecture Exploration",
    template: "%s | RepoPilot"
  },
  description:
    "Zero-budget open-source developer platform for exploring unfamiliar codebases, 3D architectural dependency mapping, AST symbol search, and evidence-grounded bug investigation.",
  keywords: [
    "RepoPilot",
    "codebase intelligence",
    "github repository visualizer",
    "3d code architecture",
    "code explorer",
    "symbol search",
    "ast parsing",
    "stack trace debugger",
    "ollama code assistant",
    "developer tools",
    "open source software",
    "repopilot"
  ],
  authors: [{ name: "Mohit-Rocky-25", url: "https://github.com/Mohit-Rocky-25" }],
  creator: "Mohit-Rocky-25",
  publisher: "RepoPilot",
  formatDetection: {
    email: false,
    address: false,
    telephone: false
  },
  alternates: {
    canonical: "/"
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "RepoPilot — Autonomous Codebase Intelligence & Architecture Exploration",
    description:
      "Understand any unfamiliar codebase instantly. Interactive 3D spatial architecture maps, deterministic symbol search, and evidence-backed local AI investigation with ₹0 API costs.",
    siteName: "RepoPilot",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "RepoPilot — Open-Source Codebase Intelligence Platform"
      }
    ]
  },
  twitter: {
    card: "summary_large_image",
    title: "RepoPilot — Autonomous Codebase Intelligence",
    description:
      "Explore unfamiliar codebases, 3D architecture maps, and investigate bugs with evidence-grounded local AI with zero API fees.",
    images: ["/og-image.jpg"],
    creator: "@Mohit_Rocky_25"
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" }
    ],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png"
  }
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "name": "RepoPilot",
      "headline": "Autonomous Codebase Intelligence & Architecture Exploration",
      "description":
        "Zero-budget open-source developer platform for understanding unfamiliar codebases, 3D architecture visualization, AST symbol search, and evidence-grounded bug investigation.",
      "applicationCategory": "DeveloperApplication",
      "operatingSystem": "Web, Windows, macOS, Linux",
      "offers": {
        "@type": "Offer",
        "price": "0",
        "priceCurrency": "USD"
      },
      "author": {
        "@type": "Person",
        "name": "Mohit-Rocky-25",
        "url": "https://github.com/Mohit-Rocky-25"
      },
      "codeRepository": "https://github.com/Mohit-Rocky-25/RepoPilot",
      "license": "https://opensource.org/licenses/MIT",
      "featureList": [
        "Interactive 3D Spatial Architecture Graph",
        "Deterministic AST Symbol Search",
        "Source Evidence Stack Trace Debugging",
        "Local Ollama Inference with Zero API Cost",
        "Reproducible Unified PR Patch Generation"
      ]
    },
    {
      "@type": "WebSite",
      "name": "RepoPilot",
      "url": siteUrl,
      "potentialAction": {
        "@type": "SearchAction",
        "target": `${siteUrl}/search?q={search_term_string}`,
        "query-input": "required name=search_term_string"
      }
    }
  ]
};

// Inline blocking script to resolve active theme and set data-theme before first paint (eliminates FOUC)
const themeInitializerScript = `(function(){try{var stored=localStorage.getItem('repopilot-theme');var t='light';if(stored==='dark'||stored==='light'){t=stored;}else if(stored==='system'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';}document.documentElement.setAttribute('data-theme',t);document.documentElement.style.colorScheme=t;}catch(e){document.documentElement.setAttribute('data-theme','light');document.documentElement.style.colorScheme='light';}})();`;

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: themeInitializerScript }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className={`${roboto.variable} ${robotoMono.variable} font-sans bg-theme-bg text-theme-text antialiased min-h-screen transition-colors duration-150`}>
        <RepositoryProvider>
          <WorkspaceProvider>
            <ShellLayout>{children}</ShellLayout>
          </WorkspaceProvider>
        </RepositoryProvider>
      </body>
    </html>
  );
}
