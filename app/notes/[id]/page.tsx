export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <main className="p-8">
      <p>Note {id} — view page (coming soon)</p>
    </main>
  );
}
