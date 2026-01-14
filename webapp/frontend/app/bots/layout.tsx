"use client"

/**
 * Bot Management Layout
 * 
 * Note: AppLayout (with sidebar) is now handled by ConditionalLayout in root layout.
 * This layout file is kept for potential future bot-specific providers.
 */
export default function BotsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
