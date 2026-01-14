import { GroupsManagement } from "@/components/groups/GroupsManagement";

export default async function GroupsPage({
  searchParams,
}: {
  searchParams: Promise<{ groupId?: string }>;
}) {
  const params = await searchParams;
  return <GroupsManagement initialGroupId={params.groupId} />;
}
