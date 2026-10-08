import { requireUser } from "@/lib/session";

export default async function EditNotePage({ params }: PageProps<"/notes/[id]/edit">) {
  await requireUser();
  const { id } = await params;
  return (
    <main className="p-8">
      <p>Editing note {id} (coming soon)</p>
    </main>
  );
}
