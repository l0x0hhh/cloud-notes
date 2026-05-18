# Editor & Auth Page Redesign

**Date:** 2026-05-03
**Scope:** AuthPage, NoteEditor, color system

---

## 1. Color System — Warm Dark Theme

Replace Apple-monochrome palette with warm amber dark theme.

| Token | Old | New |
|---|---|---|
| `background` | `#f5f5f7` | `#1a1a1a` |
| `foreground` | `#1d1d1f` | `#f0e6d3` |
| `foreground-secondary` | `#6e6e73` | `#a89880` |
| `muted` | `#86868b` | `#8a7a65` |
| `muted-foreground` | `#6e6e73` | `#8a7a65` |
| `card` | `#ffffff` | `#252220` |
| `card-hover` | `#f5f5f7` | `#2d2a26` |
| `border` | `#d2d2d7` | `#3a3530` |
| `border-light` | `#e5e5ea` | `#2e2a26` |
| `primary` | `#007AFF` | `#f59e0b` (amber) |
| `primary-hover` | `#0066d6` | `#d97706` |
| `primary-foreground` | `#ffffff` | `#1a1a1a` |
| `danger` | `#ff3b30` | `#ef4444` |
| `success` | `#34c759` | `#22c55e` |

Glass surfaces removed (designed for light backgrounds). Cards use solid `card` background with subtle border.

## 2. AuthPage Redesign

### Layout
- Single centered card (max-w-md), no two-column layout
- Card has warm background (`card`), rounded-3xl, shadow
- Subtle amber gradient accent at top of card (2px height bar)
- Cloud Notes branding above card (icon + title)

### Behavior
- **Default state:** Login form visible, with "还没有账号？去注册" text link at bottom
- **Register state:** Clicking "去注册" shows Register form, with "已有账号？去登录" link at bottom
- **Login failure:** Toast error message includes clickable hint: "登录失败，还没有账号？" — clicking it switches to register view
- Clean slide-up transition between login/register views

### Component structure
```
AuthPage
  ├── Brand header (icon + "Cloud Notes")
  ├── Card
  │   ├── Color accent bar (top edge)
  │   ├── {showLogin ? <LoginForm /> : <RegisterForm />}
  │   └── Toggle link (bottom)
  └── Footer disclaimer text
```

## 3. NoteEditor Redesign

### Layout: Split View
- Left pane: Editor (title input + textarea + bottom action bar)
- Right pane: Live Markdown preview
- Draggable divider between panes (mouse drag, persisted ratio to localStorage)
- On mobile (<768px): stack vertically, no split (editor on top, toggle preview below)

### Toolbar
Positioned above textarea, inside left editor pane. Widget-style icon buttons in a single row.

Buttons (all icon-only with tooltip):
1. H1, H2, H3 (heading level)
2. Bold, Italic, Strikethrough
3. Blockquote, Code block, Horizontal rule
4. Ordered list, Unordered list, Task list
5. Table, Link, Image

Behavior:
- **Inline formatting** (bold, italic, strikethrough): wrap selected text with syntax, or insert placeholder if no selection
- **Block elements** (headings, quote, code, lists): prefix current line or insert at cursor
- **Link:** prompt for URL, insert `[text](url)`
- **Image:** prompt for URL/alt, insert `![alt](url)`
- **Table:** insert table skeleton template

Grouped with subtle separators between logical groups.

### Action Bar
Same as current (Save / Save As New / Delete) but moved inside the editor pane's bottom area, styled to match warm theme.

### Component structure
```
NoteEditor
  ├── Empty state (unchanged)
  ├── SplitView (2 panes)
  │   ├── EditorPane
  │   │   ├── Title input
  │   │   ├── Toolbar (icon buttons)
  │   │   ├── Textarea (markdown)
  │   │   └── Action bar (save, save-as-new, delete)
  │   ├── Divider (draggable)
  │   └── PreviewPane
  │       └── MarkdownPreview (react-markdown)
  └── DeleteConfirm dialog
```

## 4. MarkdownPreview Updates

Update CSS to use warm theme colors:
- Code blocks: warm dark background
- Blockquotes: amber left border
- Links: amber color
- Tables: warm alternating rows

## 5. Files Changed

| File | Change |
|---|---|
| `tailwind.config.ts` | Replace color tokens with warm theme values |
| `index.css` | Update markdown-preview styles, scrollbar colors, focus rings, remove glass classes |
| `AuthPage.tsx` | Rewrite: single card, login-first toggle, failure hint |
| `LoginForm.tsx` | Minor: accept `onRegisterClick` prop |
| `RegisterForm.tsx` | Minor: accept `onLoginClick` prop |
| `NoteEditor.tsx` | Rewrite: split view, toolbar, draggable divider |
| `WorkspacePage.tsx` | Adjust grid: sidebar + editor split stays, editor now fills remaining space |
| New: `Toolbar.tsx` | Markdown formatting toolbar component |
| New: `SplitView.tsx` | Draggable split pane container |
| `MarkdownPreview.tsx` | No structural changes (CSS only) |

## 6. Non-Goals
- Dark/light theme toggle (warm dark only for now)
- Mobile responsive perfection (focus on desktop)
- Undo/redo toolbar buttons
- Image upload (just URL insertion)
