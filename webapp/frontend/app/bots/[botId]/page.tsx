import { redirect } from 'next/navigation';

export default async function BotEditPageRoute({
  params,
}: {
  params: Promise<{ botId: string }>;
}) {
  const { botId } = await params;
  // Redirect to main bots page with botId as query parameter
  redirect(`/bots?botId=${botId}`);
}
