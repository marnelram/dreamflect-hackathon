import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dreamflect — agent-rendered morning ritual",
  description:
    "A dream-reflection app where the entire post-capture interface is generated at runtime by Claude. Built with CopilotKit + A2UI + shadcn for the Generative UI Hackathon.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
