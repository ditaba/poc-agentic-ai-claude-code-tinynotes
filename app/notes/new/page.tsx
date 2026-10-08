import { requireUser } from "@/lib/session";

export default async function NewNotePage() {
  await requireUser();
  return (
    <main className="p-8">
      <p>New note editor (coming soon)</p>
    </main>
  );
}
