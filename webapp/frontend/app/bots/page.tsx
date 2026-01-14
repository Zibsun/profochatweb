import { BotManagement } from "@/components/bots/BotManagement";

export default async function BotsPage({
  searchParams,
}: {
  searchParams: Promise<{ botId?: string }>;
}) {
  const params = await searchParams;
  return <BotManagement initialBotId={params.botId} />;
}
