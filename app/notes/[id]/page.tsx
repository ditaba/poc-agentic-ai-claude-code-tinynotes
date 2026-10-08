import { requireUser } from "@/lib/session";

export default async function NotePage({ params }: PageProps<"/notes/[id]">) {
  await requireUser();
  const { id } = await params;
  return (
    <main className="p-8">
      <p>Note {id} — view page (coming soon)</p>
    </main>
  );
}
