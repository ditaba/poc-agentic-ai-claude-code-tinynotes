import Link from 'next/link';
import { redirect } from 'next/navigation';
import { buttonStyles } from '@/components/styles';
import { getCurrentUser } from '@/lib/session';

const FEATURES = [
  {
    title: 'Write with formatting',
    text: 'Headings, lists, links, quotes and code, with a simple toolbar and keyboard shortcuts.',
  },
  {
    title: 'Share with a link',
    text: 'Turn on a public link for any note. Anyone can read it, no account needed.',
  },
  {
    title: 'Stay in control',
    text: 'Turn sharing off at any time, and the link stops working right away.',
  },
];

// Public intro. Signed-in users go straight to their notes (SPEC §5).
export default async function Home() {
  if (await getCurrentUser()) redirect('/dashboard');

  return (
    <main>
      <section className='bg-gradient-to-b from-aqua-100 to-white px-4 py-20 text-center'>
        <h1 className='text-4xl font-semibold tracking-tight text-aqua-950 sm:text-5xl'>
          Simple notes you can share
        </h1>
        <p className='mx-auto mt-4 max-w-xl text-lg text-slate-600'>
          NextNotes is a calm place for your notes. Write them, format them, and publish any of them
          with a link when you want to.
        </p>
        <div className='mt-8 flex flex-wrap justify-center gap-3'>
          <Link href='/auth?mode=sign-up' className={buttonStyles.primary}>
            Create an account
          </Link>
          <Link href='/auth?mode=sign-in' className={buttonStyles.secondary}>
            Sign in
          </Link>
        </div>
      </section>

      <section aria-label='Features' className='mx-auto w-full max-w-3xl px-4 py-12'>
        <ul className='grid gap-4 sm:grid-cols-3'>
          {FEATURES.map((feature) => (
            <li
              key={feature.title}
              className='rounded-2xl border border-aqua-100 bg-white p-5 shadow-sm'
            >
              <h2 className='font-medium text-aqua-950'>{feature.title}</h2>
              <p className='mt-1 text-sm text-slate-500'>{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
