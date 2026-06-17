import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CharacterCount from "@tiptap/extension-character-count";
import { useEffect } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Quote,
  Code,
  Redo,
  Undo,
} from "lucide-react";
import "../styles/tiptap-editor.css";

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  disabled?: boolean;
}

export function TiptapEditor({
  content,
  onChange,
  disabled = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        bulletList: {
          keepMarks: true,
        },
        orderedList: {
          keepMarks: true,
        },
      }),
      CharacterCount.configure({
        limit: 100000,
      }),
    ],
    content: content || "<p></p>",
    editorProps: {
      attributes: {
        class: "tiptap-editor-content",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (editor && content && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return <div className="tiptap-editor-loading">Loading editor...</div>;
  }

  const characterCount = editor.storage.characterCount?.characters?.();

  return (
    <div className="tiptap-editor-container">
      <div className="tiptap-toolbar">
        <div className="tiptap-toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={disabled || !editor.can().chain().focus().toggleBold().run()}
            className={editor.isActive("bold") ? "active" : ""}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={disabled || !editor.can().chain().focus().toggleItalic().run()}
            className={editor.isActive("italic") ? "active" : ""}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            disabled={disabled || !editor.can().chain().focus().toggleCode().run()}
            className={editor.isActive("code") ? "active" : ""}
            title="Code (Ctrl+`)"
          >
            <Code size={16} />
          </button>
        </div>

        <div className="tiptap-toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            disabled={disabled || !editor.can().chain().focus().toggleHeading({ level: 1 }).run()}
            className={editor.isActive("heading", { level: 1 }) ? "active" : ""}
            title="Heading 1 (Ctrl+Alt+1)"
          >
            <Heading1 size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={disabled || !editor.can().chain().focus().toggleHeading({ level: 2 }).run()}
            className={editor.isActive("heading", { level: 2 }) ? "active" : ""}
            title="Heading 2 (Ctrl+Alt+2)"
          >
            <Heading2 size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={disabled || !editor.can().chain().focus().toggleHeading({ level: 3 }).run()}
            className={editor.isActive("heading", { level: 3 }) ? "active" : ""}
            title="Heading 3 (Ctrl+Alt+3)"
          >
            <Heading3 size={16} />
          </button>
        </div>

        <div className="tiptap-toolbar-group">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            disabled={disabled || !editor.can().chain().focus().toggleBulletList().run()}
            className={editor.isActive("bulletList") ? "active" : ""}
            title="Bullet List (Ctrl+Shift+8)"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            disabled={disabled || !editor.can().chain().focus().toggleOrderedList().run()}
            className={editor.isActive("orderedList") ? "active" : ""}
            title="Ordered List (Ctrl+Shift+9)"
          >
            <ListOrdered size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            disabled={disabled || !editor.can().chain().focus().toggleBlockquote().run()}
            className={editor.isActive("blockquote") ? "active" : ""}
            title="Quote (Ctrl+Shift+B)"
          >
            <Quote size={16} />
          </button>
        </div>

        <div className="tiptap-toolbar-group">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={disabled || !editor.can().chain().focus().undo().run()}
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={disabled || !editor.can().chain().focus().redo().run()}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo size={16} />
          </button>
        </div>

        <div className="tiptap-toolbar-stats">
          <span className="stat">
            {characterCount ?? 0} chars
          </span>
        </div>
      </div>

      <EditorContent editor={editor} className="tiptap-editor" />
    </div>
  );
}
