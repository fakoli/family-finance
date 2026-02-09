import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, User } from 'lucide-react'
import { useAIQuery } from '@/api/hooks'
import { PageHeader } from '@/components/PageHeader'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

const exampleQuestions = [
  'How much did I spend on dining last month?',
  'What are my top 5 spending categories?',
  'Show me my subscription costs',
  "What's my average monthly spending?",
]

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const query = useAIQuery()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = (text: string) => {
    if (!text.trim()) return
    const userMessage: Message = { role: 'user', content: text.trim() }
    setMessages((prev) => [...prev, userMessage])
    setInput('')

    query.mutate(
      { question: text.trim() },
      {
        onSuccess: (res) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: res.data.answer },
          ])
        },
        onError: (err) => {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: `Sorry, I encountered an error: ${err.message}` },
          ])
        },
      },
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  return (
    <div className="flex h-[calc(100vh-theme(spacing.14)-theme(spacing.12))] flex-col">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your finances"
        actions={
          <Sparkles size={20} className="text-slate-400" />
        }
      />

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center">
            <div className="mb-6 rounded-full bg-slate-100 p-4">
              <Sparkles size={28} className="text-slate-400" />
            </div>
            <h2 className="mb-2 text-base font-medium text-slate-900">
              What would you like to know?
            </h2>
            <p className="mb-6 text-sm text-slate-500">
              Ask me anything about your financial data
            </p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {exampleQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4 pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`flex max-w-[80%] gap-3 ${
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                      msg.role === 'user'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {msg.role === 'user' ? <User size={14} /> : <Sparkles size={14} />}
                  </div>
                  <div
                    className={`rounded-lg px-4 py-3 text-sm ${
                      msg.role === 'user'
                        ? 'bg-slate-100 text-slate-900'
                        : 'border border-slate-200 bg-white text-slate-700'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {query.isPending && (
              <div className="flex justify-start">
                <div className="flex max-w-[80%] gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600">
                    <Sparkles size={14} />
                  </div>
                  <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <span className="animate-pulse">Thinking</span>
                      <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                      <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-4 flex items-center gap-2 border-t border-slate-200 pt-4"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          disabled={query.isPending}
          className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || query.isPending}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 p-2.5 text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
