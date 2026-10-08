import { requireUser } from "@/lib/session";

export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;
  return (
    <main className="p-8">
      <p>Editing note {id} (coming soon)</p>
    </main>
  );
}
