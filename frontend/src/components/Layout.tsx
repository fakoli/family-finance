import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  FileBarChart,
  FileText,
  ArrowLeftRight,
  Landmark,
  Upload,
  Sparkles,
  TrendingUp,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react'
import { clsx } from 'clsx'
import { useUiStore } from '@/stores/ui'
import { useAuthStore } from '@/stores/auth'

interface NavGroup {
  label: string
  items: { to: string; label: string; icon: typeof LayoutDashboard }[]
}

const navGroups: NavGroup[] = [
  {
    label: 'Main',
    items: [
      { to: '/', label: 'Dashboard', icon: LayoutDashboard },
      { to: '/overview', label: 'Overview', icon: FileBarChart },
      { to: '/net-worth', label: 'Net Worth', icon: TrendingUp },
      { to: '/tax-insights', label: 'Tax Insights', icon: FileText },
    ],
  },
  {
    label: 'Data',
    items: [
      { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { to: '/accounts', label: 'Accounts', icon: Landmark },
      { to: '/imports', label: 'Import', icon: Upload },
    ],
  },
  {
    label: 'Tools',
    items: [{ to: '/ai', label: 'AI Assistant', icon: Sparkles }],
  },
]

export function Layout() {
  const { sidebarOpen, sidebarCollapsed, toggleSidebar, setSidebarOpen, toggleCollapsed } =
    useUiStore()
  const logout = useAuthStore((s) => s.logout)
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()

  const allGroups = user?.is_admin
    ? [
        ...navGroups,
        { label: 'Admin', items: [{ to: '/admin', label: 'Admin', icon: Shield }] },
      ]
    : navGroups

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userInitial = user?.username?.charAt(0).toUpperCase() ?? '?'

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm md:hidden transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed z-30 flex h-full flex-col bg-gradient-to-b from-slate-800 to-slate-900 text-white transition-all duration-300 md:static md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
          sidebarCollapsed ? 'w-16' : 'w-64',
        )}
      >
        {/* Brand header */}
        <div
          className={clsx(
            'flex h-16 items-center border-b border-slate-700/50',
            sidebarCollapsed ? 'justify-center px-2' : 'gap-3 px-5',
          )}
        >
          <img
            src="/images/logo.png"
            alt="FamilyFinance"
            className="h-8 w-8 rounded-lg"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.nextElementSibling?.classList.remove('hidden')
            }}
          />
          <div className="hidden h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
            <Landmark size={18} className="text-white" />
          </div>
          {!sidebarCollapsed && (
            <span className="text-sm font-bold tracking-tight">FamilyFinance</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4">
          {allGroups.map((group) => (
            <div key={group.label} className="mb-4">
              {!sidebarCollapsed && (
                <span className="mb-2 block px-3 text-[10px] font-semibold uppercase tracking-widest text-slate-500">
                  {group.label}
                </span>
              )}
              <div className="space-y-0.5">
                {group.items.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === '/'}
                    onClick={() => setSidebarOpen(false)}
                    title={sidebarCollapsed ? label : undefined}
                    className={({ isActive }) =>
                      clsx(
                        'flex items-center rounded-lg text-sm font-medium transition-all duration-150',
                        sidebarCollapsed
                          ? 'justify-center px-2 py-3 md:py-2.5'
                          : 'gap-3 px-3 py-3 md:py-2.5',
                        isActive
                          ? 'border-l-2 border-brand-400 bg-slate-700/50 text-white'
                          : 'border-l-2 border-transparent text-slate-400 hover:bg-slate-700/30 hover:text-white',
                      )
                    }
                  >
                    <Icon size={18} className="shrink-0" />
                    {!sidebarCollapsed && label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-slate-700/50 px-3 py-3 space-y-2">
          {/* User info */}
          {!sidebarCollapsed && user && (
            <div className="flex items-center gap-3 rounded-lg px-3 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {userInitial}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-white">{user.username}</p>
                <p className="truncate text-xs text-slate-400">{user.email}</p>
              </div>
            </div>
          )}
          {sidebarCollapsed && user && (
            <div className="flex justify-center py-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                {userInitial}
              </div>
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={handleLogout}
            title={sidebarCollapsed ? 'Sign out' : undefined}
            className={clsx(
              'flex w-full items-center rounded-lg text-sm font-medium text-slate-400 transition-colors hover:bg-slate-700/30 hover:text-white',
              sidebarCollapsed ? 'justify-center px-2 py-3 md:py-2.5' : 'gap-3 px-3 py-3 md:py-2.5',
            )}
          >
            <LogOut size={18} className="shrink-0" />
            {!sidebarCollapsed && 'Sign out'}
          </button>

          {/* Collapse toggle (desktop only) */}
          <button
            onClick={toggleCollapsed}
            className="hidden w-full items-center justify-center rounded-lg py-2 text-slate-500 transition-colors hover:bg-slate-700/30 hover:text-slate-300 md:flex"
          >
            {sidebarCollapsed ? <ChevronsRight size={16} /> : <ChevronsLeft size={16} />}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <header className="flex h-14 items-center gap-3 border-b border-slate-200 bg-white px-4 md:hidden">
          <button
            onClick={toggleSidebar}
            className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <img
            src="/images/logo.png"
            alt=""
            className="h-7 w-7 rounded-md"
            onError={(e) => {
              e.currentTarget.style.display = 'none'
            }}
          />
          <span className="text-sm font-bold tracking-tight text-slate-900">FamilyFinance</span>
        </header>

        <main className="flex-1 overflow-y-auto bg-pattern p-6 lg:p-8">
          <div className="mx-auto max-w-7xl animate-fade-in-up">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
