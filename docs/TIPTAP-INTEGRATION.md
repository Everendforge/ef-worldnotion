# Tiptap Editor Integration Guide

## Installation Status
✅ **Tiptap is installed and ready to use**

### Packages Installed
```json
{
  "@tiptap/react": "^2.x",
  "@tiptap/pm": "^2.x",
  "@tiptap/starter-kit": "^2.x",
  "@tiptap/extension-character-count": "^2.x"
}
```

## Files Created

### 1. TiptapEditor Component (`src/components/TiptapEditor.tsx`)
A fully-featured WYSIWYG editor with:
- **Formatting Tools**: Bold, Italic, Code, Headings (H1-H3), Lists, Quotes
- **Actions**: Undo/Redo
- **Statistics**: Character count
- **Theme Support**: Uses WorldNotion's CSS variables for light/dark theme

### 2. Styles (`src/styles/tiptap-editor.css`)
Complete styling that integrates with WorldNotion's design system:
- Toolbar with grouped buttons
- Content area with proper typography
- Active/hover states
- Scrollbar styling
- Dark mode support

## How to Use

### Basic Integration Pattern

```typescript
import { TiptapEditor } from "./components";

// In your component:
function MyEditor() {
  const [htmlContent, setHtmlContent] = useState("");
  
  return (
    <TiptapEditor
      content={htmlContent}
      onChange={(newHtml) => setHtmlContent(newHtml)}
      disabled={false}
    />
  );
}
```

### Converting Markdown to HTML for Editor

```typescript
import { remark } from "remark";
import { visit } from "unist-util-visit";

function markdownToHtml(markdown: string): string {
  const ast = remark().parse(markdown);
  let html = "";
  
  // Simple conversion - can be enhanced with rehype
  ast.children.forEach((node) => {
    if (node.type === "heading") {
      html += `<h${node.depth}>${getText(node)}</h${node.depth}>`;
    } else if (node.type === "paragraph") {
      html += `<p>${getText(node)}</p>`;
    }
    // ... handle more node types
  });
  
  return html;
}
```

### Converting HTML Back to Markdown

```typescript
import { unified } from "unified";

function htmlToMarkdown(html: string): string {
  // Option 1: Use turndown library (simple)
  import { TurndownService } from "turndown";
  const turndownService = new TurndownService();
  return turndownService.turndown(html);
}
```

## Suggested Next Steps

### 1. Install HTML-to-Markdown Converter (Recommended)
```bash
npm install turndown
```

### 2. Create Adapter Functions
```typescript
// src/utils/editor-adapters.ts
import { TurndownService } from "turndown";

const turndownService = new TurndownService({
  headingStyle: "atx",
  codeBlockStyle: "fenced",
});

export function htmlToMarkdown(html: string): string {
  return turndownService.turndown(html);
}

export function markdownToHtml(markdown: string): string {
  // Use remark/rehype or simple regex conversion
  // For now, Tiptap handles this internally
  return markdown; // Tiptap converts on editor load
}
```

### 3. Create Editor Mode Switcher
```typescript
// In App.tsx editor section
const [editMode, setEditMode] = useState<"rendered" | "markdown" | "tiptap">("rendered");

{editMode === "tiptap" ? (
  <TiptapEditor
    content={editor?.rawMarkdown || ""}
    onChange={(html) => {
      const markdown = htmlToMarkdown(html);
      updateRawMarkdown(markdown);
    }}
    disabled={!canWrite}
  />
) : (
  // ... existing editor modes
)}
```

### 4. Add Tiptap Tab Button in Editor Header
```typescript
<button
  type="button"
  className={editMode === "tiptap" ? "active" : ""}
  onClick={() => setEditMode("tiptap")}
  disabled={!editor}
>
  Editor
</button>
```

## Available Features

### Current Extensions
- **StarterKit**: Bold, Italic, Heading, BulletList, OrderedList, CodeBlock, Blockquote, HorizontalRule, Strike, HardBreak
- **CharacterCount**: Tracks character count

### Can Be Added
- **Links**: `@tiptap/extension-link`
- **Images**: `@tiptap/extension-image`
- **Tables**: `@tiptap/extension-table`
- **TaskLists**: `@tiptap/extension-task-list`
- **Highlight**: `@tiptap/extension-highlight`
- **Subscript/Superscript**: `@tiptap/extension-subscript`, `@tiptap/extension-superscript`
- **Color**: `@tiptap/extension-color`
- **Text Align**: `@tiptap/extension-text-align`

## Testing the Editor

1. Verify compilation: `npm run build` ✅
2. Run dev server: `npm run dev`
3. Navigate to the editor section
4. Try typing and using toolbar buttons

## Troubleshooting

### Editor doesn't render
- Check browser console for errors
- Verify CSS file is imported in TiptapEditor.tsx

### Content doesn't update
- Ensure onChange callback is properly wired
- Check that editor.getHTML() is returning valid HTML

### Styles not applying
- Verify tiptap-editor.css is imported
- Check CSS variable names match App.css (--wn-*)

### Character count shows as undefined
- This is a known Tiptap quirk - try calling .getCharacterCount() on editor directly
