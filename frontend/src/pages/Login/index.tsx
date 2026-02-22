import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Landmark, AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '@/stores/auth'

export default function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await login({ username, password })
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left panel - hero (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)',
            backgroundSize: '32px 32px',
          }} />
        </div>
        <div className="relative flex flex-col items-center justify-center p-12 text-white">
          <img
            src="/images/login-hero.png"
            alt="Family Finance"
            className="mb-8 max-w-md rounded-2xl shadow-2xl"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
          <h2 className="text-3xl font-bold tracking-tight">
            Your Family&apos;s Financial Hub
          </h2>
          <p className="mt-3 max-w-sm text-center text-lg leading-relaxed text-brand-100">
            Track spending, monitor investments, and build wealth together.
          </p>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12">
        {/* Mobile hero (shown only on small screens) */}
        <div className="mb-8 lg:hidden">
          <img
            src="/images/login-hero.png"
            alt=""
            className="mx-auto mb-4 max-w-[240px] rounded-xl"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        </div>

        <div className="w-full max-w-sm animate-fade-in-up">
          {/* Brand */}
          <div className="mb-8 flex flex-col items-center">
            <div className="mb-4 flex items-center gap-3">
              <img
                src="/images/logo.png"
                alt="FamilyFinance"
                className="h-11 w-11 rounded-xl"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                  e.currentTarget.nextElementSibling?.classList.remove('hidden')
                }}
              />
              <div className="hidden h-11 w-11 items-center justify-center rounded-xl bg-brand-600 shadow-lg">
                <Landmark size={22} className="text-white" />
              </div>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Welcome back
            </h1>
            <p className="mt-1 text-sm text-slate-500">Sign in to your FamilyFinance account</p>
          </div>

          {/* Form */}
          <div className="rounded-2xl border border-slate-200/60 bg-white p-6 shadow-xl sm:p-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200/60 px-4 py-3 text-sm text-red-700">
                  <AlertCircle size={16} className="shrink-0" />
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="username" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  placeholder="admin"
                />
              </div>

              <div>
                <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-100 focus:outline-none"
                  placeholder="••••••••"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:bg-brand-800 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-slate-400">
            Powered by FamilyFinance
          </p>
        </div>
      </div>
    </div>
  )
}
