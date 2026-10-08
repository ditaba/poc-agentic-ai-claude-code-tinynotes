import { describe, expect, test } from 'vitest';
import { isAllowedHref } from './extensions';

describe('isAllowedHref', () => {
  test('allows http, https and mailto links', () => {
    expect(isAllowedHref('http://example.com')).toBe(true);
    expect(isAllowedHref('https://example.com/a?b=c#d')).toBe(true);
    expect(isAllowedHref('HTTPS://EXAMPLE.COM')).toBe(true);
    expect(isAllowedHref('mailto:ada@example.com')).toBe(true);
  });

  test('blocks script and other protocols, however they are written', () => {
    for (const href of [
      'javascript:alert(1)',
      'JavaScript:alert(1)',
      '  javascript:alert(1)',
      'java\tscript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'ftp://example.com',
    ]) {
      expect(isAllowedHref(href), href).toBe(false);
    }
  });

  test('blocks relative and malformed links', () => {
    for (const href of ['', '/notes', '//example.com', 'example.com', 'https://']) {
      expect(isAllowedHref(href), href).toBe(false);
    }
  });
});
