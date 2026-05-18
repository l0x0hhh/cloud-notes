import { cn } from '@/lib/utils'
import {
  Heading1, Heading2, Heading3,
  Bold, Italic, Strikethrough,
  Quote, Code2, Minus,
  List, ListOrdered, CheckSquare,
  Table2, Link, Image,
} from 'lucide-react'

interface ToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  onInsert: (before: string, after?: string, placeholder?: string) => void
}

interface ToolGroup {
  tools: {
    icon: React.ElementType
    label: string
    before: string
    after?: string
    placeholder?: string
    block?: boolean
  }[]
}

const groups: ToolGroup[] = [
  {
    tools: [
      { icon: Heading1, label: '一级标题', before: '# ', block: true },
      { icon: Heading2, label: '二级标题', before: '## ', block: true },
      { icon: Heading3, label: '三级标题', before: '### ', block: true },
    ],
  },
  {
    tools: [
      { icon: Bold, label: '加粗', before: '**', after: '**', placeholder: '加粗文字' },
      { icon: Italic, label: '斜体', before: '*', after: '*', placeholder: '斜体文字' },
      { icon: Strikethrough, label: '删除线', before: '~~', after: '~~', placeholder: '删除文字' },
    ],
  },
  {
    tools: [
      { icon: Quote, label: '引用', before: '> ', block: true },
      { icon: Code2, label: '代码块', before: '```\n', after: '\n```', placeholder: '代码' },
      { icon: Minus, label: '分隔线', before: '\n---\n' },
    ],
  },
  {
    tools: [
      { icon: List, label: '无序列表', before: '- ', block: true },
      { icon: ListOrdered, label: '有序列表', before: '1. ', block: true },
      { icon: CheckSquare, label: '待办', before: '- [ ] ', block: true },
    ],
  },
  {
    tools: [
      { icon: Table2, label: '表格', before: '\n| 列1 | 列2 |\n| --- | --- |\n| 内容 | 内容 |\n' },
      { icon: Link, label: '链接', before: '[', after: '](url)', placeholder: '链接文字' },
      { icon: Image, label: '图片', before: '![', after: '](url)', placeholder: '图片描述' },
    ],
  },
]

export function Toolbar({ textareaRef, onInsert }: ToolbarProps) {
  const handleTool = (tool: ToolGroup['tools'][number]) => {
    const ta = textareaRef.current
    if (!ta) {
      onInsert(tool.before, tool.after, tool.placeholder)
      return
    }

    const start = ta.selectionStart
    const end = ta.selectionEnd
    const selected = ta.value.substring(start, end)
    const hasSelection = start !== end

    if (tool.block) {
      // Block-level: insert at start of current line
      const before = ta.value.substring(0, start)
      const lineStart = before.lastIndexOf('\n', start - 1) + 1
      ta.setRangeText(tool.before, lineStart, lineStart, 'end')
      ta.focus()
      ta.dispatchEvent(new Event('input', { bubbles: true }))
      return
    }

    if (hasSelection && tool.after !== undefined) {
      // Wrap selection
      ta.setRangeText(tool.before + selected + (tool.after || ''), start, end, 'select')
    } else if (tool.after !== undefined) {
      // Insert with placeholder
      const placeholder = tool.placeholder || ''
      ta.setRangeText(tool.before + placeholder + tool.after, start, end, 'select')
    } else {
      // Plain insert
      ta.setRangeText(tool.before, start, end, 'end')
    }

    ta.focus()
    ta.dispatchEvent(new Event('input', { bubbles: true }))
  }

  return (
    <div className="flex items-center gap-0.5 px-2 py-1.5 bg-background-secondary/60 rounded-2xl border border-border overflow-x-auto">
      {groups.map((group, gi) => (
        <div key={gi} className="flex items-center gap-0.5">
          {gi > 0 && <div className="w-px h-5 bg-border mx-1 shrink-0" />}
          {group.tools.map((tool) => (
            <button
              key={tool.label}
              type="button"
              title={tool.label}
              onClick={() => handleTool(tool)}
              className={cn(
                'p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-card transition-colors',
                'focus:outline-none focus:ring-1 focus:ring-primary/50'
              )}
            >
              <tool.icon className="w-4 h-4" />
            </button>
          ))}
        </div>
      ))}
    </div>
  )
}
