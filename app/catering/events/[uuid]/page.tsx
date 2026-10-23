import { EventDetailsPage } from "@/app/components/catering/EventDetailsPage";
export default async function Page({
  params,
}: {
  params: Promise<{ uuid: string }>;
}) {
  const { uuid } = await params;
  return <EventDetailsPage uuid={uuid} />;
}
