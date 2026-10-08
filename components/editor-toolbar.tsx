'use client';

import { useEditorState, type Editor } from '@tiptap/react';
import { useState, type SyntheticEvent } from 'react';
import {
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Italic,
  Link,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  SquareCode,
  Strikethrough,
  Underline,
  Undo2,
  type LucideIcon,
} from 'lucide-react';
import { focusRing } from '@/components/styles';
import { useRovingFocus } from '@/components/use-roving-focus';
import { formatShortcut, toAriaKeyShortcuts, type Shortcut } from '@/lib/keyboard-shortcuts';
import { promptForLink } from '@/lib/rich-text/link-prompt';

type Tool = {
  id: string;
  label: string;
  icon: LucideIcon;
  // TipTap's default shortcut for the tool, shown in the tooltip.
  shortcut?: Shortcut;
  // Only toggles have an active state.
  isActive?: (editor: Editor) => boolean;
  canRun: (editor: Editor) => boolean;
  run: (editor: Editor) => void;
};

type ToolGroup = {
  name: string;
  tools: Tool[];
};

const focus = (editor: Editor) => editor.chain().focus();

// The EDIT-1 toolset. Defined once: the toolbar renders it, and the editor state
// selector derives each tool's active and enabled state from it.
const TOOL_GROUPS: ToolGroup[] = [
  {
    name: 'Text style',
    tools: [
      {
        id: 'bold',
        label: 'Bold',
        icon: Bold,
        shortcut: ['Mod', 'b'],
        isActive: (e) => e.isActive('bold'),
        canRun: (e) => e.can().toggleBold(),
        run: (e) => focus(e).toggleBold().run(),
      },
      {
        id: 'italic',
        label: 'Italic',
        icon: Italic,
        shortcut: ['Mod', 'i'],
        isActive: (e) => e.isActive('italic'),
        canRun: (e) => e.can().toggleItalic(),
        run: (e) => focus(e).toggleItalic().run(),
      },
      {
        id: 'underline',
        label: 'Underline',
        icon: Underline,
        shortcut: ['Mod', 'u'],
        isActive: (e) => e.isActive('underline'),
        canRun: (e) => e.can().toggleUnderline(),
        run: (e) => focus(e).toggleUnderline().run(),
      },
      {
        id: 'strike',
        label: 'Strikethrough',
        icon: Strikethrough,
        shortcut: ['Mod', 'Shift', 's'],
        isActive: (e) => e.isActive('strike'),
        canRun: (e) => e.can().toggleStrike(),
        run: (e) => focus(e).toggleStrike().run(),
      },
      {
        id: 'code',
        label: 'Inline code',
        icon: Code,
        shortcut: ['Mod', 'e'],
        isActive: (e) => e.isActive('code'),
        canRun: (e) => e.can().toggleCode(),
        run: (e) => focus(e).toggleCode().run(),
      },
    ],
  },
  {
    name: 'Headings',
    tools: [
      {
        id: 'heading1',
        label: 'Heading 1',
        icon: Heading1,
        shortcut: ['Mod', 'Alt', '1'],
        isActive: (e) => e.isActive('heading', { level: 1 }),
        canRun: (e) => e.can().toggleHeading({ level: 1 }),
        run: (e) => focus(e).toggleHeading({ level: 1 }).run(),
      },
      {
        id: 'heading2',
        label: 'Heading 2',
        icon: Heading2,
        shortcut: ['Mod', 'Alt', '2'],
        isActive: (e) => e.isActive('heading', { level: 2 }),
        canRun: (e) => e.can().toggleHeading({ level: 2 }),
        run: (e) => focus(e).toggleHeading({ level: 2 }).run(),
      },
      {
        id: 'heading3',
        label: 'Heading 3',
        icon: Heading3,
        shortcut: ['Mod', 'Alt', '3'],
        isActive: (e) => e.isActive('heading', { level: 3 }),
        canRun: (e) => e.can().toggleHeading({ level: 3 }),
        run: (e) => focus(e).toggleHeading({ level: 3 }).run(),
      },
    ],
  },
  {
    name: 'Blocks',
    tools: [
      {
        id: 'bulletList',
        label: 'Bullet list',
        icon: List,
        shortcut: ['Mod', 'Shift', '8'],
        isActive: (e) => e.isActive('bulletList'),
        canRun: (e) => e.can().toggleBulletList(),
        run: (e) => focus(e).toggleBulletList().run(),
      },
      {
        id: 'orderedList',
        label: 'Numbered list',
        icon: ListOrdered,
        shortcut: ['Mod', 'Shift', '7'],
        isActive: (e) => e.isActive('orderedList'),
        canRun: (e) => e.can().toggleOrderedList(),
        run: (e) => focus(e).toggleOrderedList().run(),
      },
      {
        id: 'blockquote',
        label: 'Quote',
        icon: Quote,
        shortcut: ['Mod', 'Shift', 'b'],
        isActive: (e) => e.isActive('blockquote'),
        canRun: (e) => e.can().toggleBlockquote(),
        run: (e) => focus(e).toggleBlockquote().run(),
      },
      {
        id: 'codeBlock',
        label: 'Code block',
        icon: SquareCode,
        shortcut: ['Mod', 'Alt', 'c'],
        isActive: (e) => e.isActive('codeBlock'),
        canRun: (e) => e.can().toggleCodeBlock(),
        run: (e) => focus(e).toggleCodeBlock().run(),
      },
      {
        id: 'horizontalRule',
        label: 'Horizontal rule',
        icon: Minus,
        canRun: (e) => e.can().setHorizontalRule(),
        run: (e) => focus(e).setHorizontalRule().run(),
      },
    ],
  },
  {
    name: 'Link',
    tools: [
      {
        id: 'link',
        label: 'Link',
        icon: Link,
        shortcut: ['Mod', 'k'],
        isActive: (e) => e.isActive('link'),
        canRun: (e) => e.isActive('link') || e.can().setLink({ href: 'https://example.com' }),
        run: promptForLink,
      },
    ],
  },
  {
    name: 'History',
    tools: [
      {
        id: 'undo',
        label: 'Undo',
        icon: Undo2,
        shortcut: ['Mod', 'z'],
        canRun: (e) => e.can().undo(),
        run: (e) => focus(e).undo().run(),
      },
      {
        id: 'redo',
        label: 'Redo',
        icon: Redo2,
        shortcut: ['Mod', 'Shift', 'z'],
        canRun: (e) => e.can().redo(),
        run: (e) => focus(e).redo().run(),
      },
    ],
  },
];

const TOOLS = TOOL_GROUPS.flatMap((group) => group.tools);

// The toolbar only renders on the client, so navigator is safe to read here.
const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);

type ToolState = { isActive?: boolean; isEnabled: boolean };

export function EditorToolbar({ editor }: { editor: Editor }) {
  // One deep-compared snapshot, so the toolbar re-renders only when a state changes.
  const states = useEditorState({
    editor,
    selector: ({ editor }): Record<string, ToolState> =>
      Object.fromEntries(
        TOOLS.map((tool) => [
          tool.id,
          { isActive: tool.isActive?.(editor), isEnabled: tool.canRun(editor) },
        ]),
      ),
  });
  const { activeIndex, handleKeyDown, handleFocus } = useRovingFocus();

  return (
    <div
      role='toolbar'
      aria-label='Formatting'
      onKeyDown={handleKeyDown}
      onFocus={handleFocus}
      className='sticky top-0 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-t-[calc(var(--radius-lg)-1px)] border-b border-aqua-100 bg-aqua-50/95 p-1.5 backdrop-blur-sm'
    >
      {TOOL_GROUPS.map((group) => (
        <div
          key={group.name}
          role='group'
          aria-label={group.name}
          className='flex items-center gap-0.5'
        >
          {group.tools.map((tool) => (
            <ToolbarButton
              key={tool.id}
              tool={tool}
              editor={editor}
              state={states[tool.id]}
              isTabStop={TOOLS.indexOf(tool) === activeIndex}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type TooltipAlign = 'start' | 'center' | 'end';

const TOOLTIP_POSITION: Record<TooltipAlign, string> = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
};

// Room a centered tooltip needs on each side; the widest is about 180px.
const TOOLTIP_HALF_WIDTH = 96;

// Aligns the tooltip to the toolbar edge the button is close to, so it never
// sticks out of the toolbar, however the buttons wrap.
function tooltipAlignFor(button: HTMLElement): TooltipAlign {
  const toolbar = button.closest('[role="toolbar"]')?.getBoundingClientRect();
  if (!toolbar) return 'center';
  const { left, width } = button.getBoundingClientRect();
  const center = left + width / 2;
  if (center - toolbar.left < TOOLTIP_HALF_WIDTH) return 'start';
  if (toolbar.right - center < TOOLTIP_HALF_WIDTH) return 'end';
  return 'center';
}

type ToolbarButtonProps = {
  tool: Tool;
  editor: Editor;
  state: ToolState;
  isTabStop: boolean;
};

function ToolbarButton({ tool, editor, state, isTabStop }: ToolbarButtonProps) {
  const [tooltipAlign, setTooltipAlign] = useState<TooltipAlign>('center');
  const Icon = tool.icon;
  const shortcut = tool.shortcut && formatShortcut(tool.shortcut, isMac);

  function handleClick() {
    // aria-disabled keeps the button focusable (WAI-ARIA toolbar pattern), so
    // clicks have to be ignored here.
    if (state.isEnabled) tool.run(editor);
  }

  // Runs just before the tooltip shows (hover or keyboard focus).
  function handleTooltipShow(event: SyntheticEvent<HTMLButtonElement>) {
    setTooltipAlign(tooltipAlignFor(event.currentTarget));
  }

  return (
    <button
      type='button'
      data-roving-item
      tabIndex={isTabStop ? 0 : -1}
      aria-label={tool.label}
      aria-pressed={state.isActive}
      aria-disabled={!state.isEnabled || undefined}
      aria-keyshortcuts={tool.shortcut && toAriaKeyShortcuts(tool.shortcut, isMac)}
      onClick={handleClick}
      onPointerEnter={handleTooltipShow}
      onFocus={handleTooltipShow}
      className={`group relative inline-flex size-8 items-center justify-center rounded-md text-slate-700 transition-colors hover:bg-aqua-100 aria-pressed:bg-aqua-100 aria-pressed:text-aqua-800 aria-disabled:cursor-not-allowed aria-disabled:hover:bg-transparent ${focusRing}`}
    >
      <Icon className='size-4 group-aria-disabled:opacity-40' />
      {/* Visible hint for mouse and keyboard users; screen readers get the same
          information from aria-label and aria-keyshortcuts. Hidden tooltips use
          display: none, so they never widen the page. */}
      <span
        aria-hidden='true'
        className={`pointer-events-none absolute top-full z-20 mt-1.5 hidden items-center gap-1.5 whitespace-nowrap rounded-md bg-aqua-950 px-2 py-1 text-xs font-medium text-white shadow-md transition-opacity group-hover:flex group-focus-visible:flex starting:opacity-0 ${TOOLTIP_POSITION[tooltipAlign]}`}
      >
        {tool.label}
        {shortcut && <kbd className='font-sans text-aqua-200'>{shortcut}</kbd>}
      </span>
    </button>
  );
}
