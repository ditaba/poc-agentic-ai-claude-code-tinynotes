import type { ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

type SearchParams = Record<string, string | string[] | undefined>;

// The props Next.js passes to a page or generateMetadata. Both are Promises.
export function pageProps<Params extends Record<string, string>>(
  params: Params,
  searchParams: SearchParams = {},
) {
  return { params: Promise.resolve(params), searchParams: Promise.resolve(searchParams) };
}

// Renders a page, including async Server Components at the top, to HTML.
export async function renderPage(page: ReactNode | Promise<ReactNode>): Promise<string> {
  return renderToStaticMarkup(await page);
}
