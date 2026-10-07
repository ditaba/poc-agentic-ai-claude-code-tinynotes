export default async function EditNotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-8">
      <p>Editing note {id} (coming soon)</p>
    </main>
  );
}
