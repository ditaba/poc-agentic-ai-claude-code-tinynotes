export default async function SharedNotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <main className="p-8">
      <p>Shared note {token} (coming soon)</p>
    </main>
  );
}
