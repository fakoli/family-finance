import { useState, useRef, useEffect } from 'react'
import { Sparkles, Send, MessageSquare } from 'lucide-react'
import { clsx } from 'clsx'
import { useAIQuery } from '@/api/hooks'
import { useAuthStore } from '@/stores/auth'
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
  const user = useAuthStore((s) => s.user)
  const userInitial = user?.username?.charAt(0).toUpperCase() ?? '?'

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
    <div className="flex h-[calc(100vh-theme(spacing.14)-theme(spacing.12))] min-h-0 flex-col">
      <PageHeader
        title="AI Assistant"
        description="Ask questions about your finances"
        actions={
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-100">
            <Sparkles size={18} className="text-brand-600" />
          </div>
        }
      />

      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center animate-fade-in-up">
            {/* AI Avatar */}
            <div className="relative mb-6">
              <img
                src="/images/ai-avatar.png"
                alt="AI Assistant"
                className="h-20 w-20 rounded-2xl shadow-lg"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className="hidden h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 shadow-lg">
                <Sparkles size={32} className="text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-emerald-500">
                <MessageSquare size={12} className="text-white" />
              </div>
            </div>

            <h2 className="mb-2 text-lg font-semibold text-slate-900">
              What would you like to know?
            </h2>
            <p className="mb-8 text-sm text-slate-500">
              Ask me anything about your financial data
            </p>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {exampleQuestions.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="rounded-xl border border-brand-200 bg-white px-4 py-3.5 text-left text-sm text-slate-700 shadow-sm transition-all duration-200 hover:border-brand-300 hover:bg-brand-50 hover:shadow-md"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5 pb-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={clsx(
                  'flex animate-fade-in-up',
                  msg.role === 'user' ? 'justify-end' : 'justify-start',
                )}
              >
                <div
                  className={clsx(
                    'flex max-w-[80%] gap-3',
                    msg.role === 'user' ? 'flex-row-reverse' : 'flex-row',
                  )}
                >
                  {/* Avatar */}
                  {msg.role === 'user' ? (
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                      {userInitial}
                    </div>
                  ) : (
                    <div className="relative shrink-0">
                      <img
                        src="/images/ai-avatar.png"
                        alt="AI"
                        className="h-8 w-8 rounded-full"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none'
                          e.currentTarget.nextElementSibling?.classList.remove('hidden')
                        }}
                      />
                      <div className="hidden h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700">
                        <Sparkles size={14} className="text-white" />
                      </div>
                    </div>
                  )}

                  {/* Message bubble */}
                  <div
                    className={clsx(
                      'rounded-2xl px-4 py-3 text-sm',
                      msg.role === 'user'
                        ? 'bg-brand-600 text-white'
                        : 'border border-slate-200/60 bg-white text-slate-700 shadow-sm',
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              </div>
            ))}

            {query.isPending && (
              <div className="flex justify-start animate-fade-in-up">
                <div className="flex max-w-[80%] gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-brand-700">
                    <Sparkles size={14} className="text-white" />
                  </div>
                  <div className="rounded-2xl border border-slate-200/60 bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
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

      {/* Input bar */}
      <form
        onSubmit={handleSubmit}
        className="mt-4 flex items-center gap-3 rounded-2xl border border-slate-200/60 bg-white p-2 shadow-sm"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your finances..."
          disabled={query.isPending}
          className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={!input.trim() || query.isPending}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600 text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  )
}
