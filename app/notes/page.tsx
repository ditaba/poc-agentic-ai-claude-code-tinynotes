import { requireUser } from "@/lib/session";

export default async function NotesPage() {
  await requireUser();
  return (
    <main className="p-8">
      <p>Your notes (coming soon)</p>
    </main>
  );
}
