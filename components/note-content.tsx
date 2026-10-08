import { noteProseStyles } from '@/components/styles';
import { renderNoteContent } from '@/lib/rich-text/render';

type NoteContentProps = {
  // Stored TipTap JSON. It's validated again before rendering.
  content: unknown;
  className?: string;
};

// Read-only note text, styled exactly like the editor (EDIT-4).
export function NoteContent({ content, className = '' }: NoteContentProps) {
  return <div className={`${noteProseStyles} ${className}`}>{renderNoteContent(content)}</div>;
}
