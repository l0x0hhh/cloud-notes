import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownPreviewProps {
  content: string
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  if (!content.trim()) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted gap-2">
        <p className="text-sm font-medium text-muted-foreground">暂无内容可预览</p>
        <p className="text-xs opacity-50">在编辑区输入 Markdown 内容以查看预览</p>
      </div>
    )
  }

  return (
    <div className="markdown-preview animate-fade-in">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
