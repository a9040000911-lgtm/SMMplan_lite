'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';

interface TiptapEditorProps {
  content: string;
  name: string;
}

export default function TiptapEditor({ content, name }: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content: content || '<p>Start writing...</p>',
    editorProps: {
      attributes: {
        class: 'prose prose-slate max-w-none min-h-[400px] p-4 focus:outline-none',
      },
    },
  });

  const addImage = () => {
    const url = window.prompt('Image URL:');
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  };

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-slate-200 bg-slate-50">
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleBold().run()}
          active={editor?.isActive('bold')}
          label="B"
          className="font-bold"
        />
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          active={editor?.isActive('italic')}
          label="I"
          className="italic"
        />
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleStrike().run()}
          active={editor?.isActive('strike')}
          label="S"
          className="line-through"
        />
        <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor?.isActive('heading', { level: 1 })}
          label="H1"
        />
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor?.isActive('heading', { level: 2 })}
          label="H2"
        />
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor?.isActive('heading', { level: 3 })}
          label="H3"
        />
        <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          active={editor?.isActive('bulletList')}
          label="• List"
        />
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
          active={editor?.isActive('orderedList')}
          label="1. List"
        />
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleBlockquote().run()}
          active={editor?.isActive('blockquote')}
          label="❝ Quote"
        />
        <div className="w-px h-6 bg-slate-300 mx-1 self-center" />
        <ToolbarBtn onClick={addImage} label="🖼 Image" />
        <ToolbarBtn
          onClick={() => editor?.chain().focus().toggleCodeBlock().run()}
          active={editor?.isActive('codeBlock')}
          label="</> Code"
        />
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        name={name}
        value={editor?.getHTML() || ''}
      />
    </div>
  );
}

function ToolbarBtn({ onClick, active, label, className }: {
  onClick: () => void;
  active?: boolean;
  label: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1.5 text-xs rounded-md transition-colors ${className || ''} ${
        active
          ? 'bg-indigo-600 text-white'
          : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
      }`}
    >
      {label}
    </button>
  );
}
