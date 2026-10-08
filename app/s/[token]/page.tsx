// Public: no auth check (PUB-1).
export default async function SharedNotePage({ params }: PageProps<"/s/[token]">) {
  const { token } = await params;
  return (
    <main className="p-8">
      <p>Shared note {token} (coming soon)</p>
    </main>
  );
}
