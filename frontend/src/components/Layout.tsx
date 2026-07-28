import { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/', icon: 'dashboard' },
    { name: 'Daily Report', path: '/daily-mill', icon: 'assessment' },
    { name: 'Padtal', path: '/padtal', icon: 'inventory' },
  ];

  if (user?.role === 'admin') {
    navLinks.push({ name: 'Users', path: '/users', icon: 'group' });
    navLinks.push({ name: 'Master Data', path: '/master-data', icon: 'database' });
    navLinks.push({ name: 'Alerts', path: '/settings', icon: 'settings' });
    navLinks.push({ name: 'Audit Log', path: '/audit-log', icon: 'history' });
  }

  return (
    <div className="min-h-screen flex bg-surface-bright text-on-surface font-body-md overflow-x-hidden w-full max-w-full">
      {/* Mobile Backdrop Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Side Navigation Bar */}
      <aside
        className={`bg-surface-container-low shadow-sm h-screen w-64 fixed left-0 top-0 flex flex-col py-6 border-r border-outline-variant/30 z-40 transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="px-6 mb-8 flex items-center justify-between">
          <div>
            <h1 className="font-display-lg text-2xl font-bold text-primary">MillOps</h1>
            <p className="text-on-surface-variant font-label-sm uppercase tracking-widest text-[10px]">Enterprise ERP • MFMPL</p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1 text-on-surface-variant hover:text-on-surface lg:hidden rounded-lg"
            aria-label="Close menu"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                  isActive
                    ? 'bg-primary-container/10 text-primary font-bold border-r-4 border-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                }`}
              >
                <span className="material-symbols-outlined text-xl">{link.icon}</span>
                <span className="font-body-md text-sm">{link.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="px-6 mt-auto pt-4">
          <div className="p-4 rounded-xl bg-primary-container text-white flex flex-col gap-2 shadow-lg mb-4">
            <span className="material-symbols-outlined text-white">auto_awesome</span>
            <p className="font-label-sm font-bold text-sm">MillOps AI</p>
            <p className="text-[11px] opacity-90">Daily production & quality analytics ready.</p>
          </div>
          <div className="p-3 border-t border-outline-variant/30 flex flex-col space-y-2">
            <div className="text-xs text-on-surface-variant font-medium truncate">{user?.email}</div>
            <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-1.5 text-xs text-error font-semibold hover:bg-error-container/40 rounded-lg transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-sm">logout</span> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Top Navigation Header */}
      <header className="fixed top-0 right-0 left-0 lg:left-64 h-16 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/30 z-20 flex items-center justify-between px-3 sm:px-8">
        <div className="flex items-center gap-2 sm:gap-6 w-auto flex-1 max-w-md">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 -ml-1 text-on-surface-variant hover:text-primary transition-colors lg:hidden rounded-lg focus:outline-none shrink-0"
            aria-label="Toggle navigation menu"
          >
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
          <div className="relative w-full max-w-[180px] sm:max-w-sm flex items-center group">
            <span className="material-symbols-outlined absolute left-3 text-on-surface-variant group-focus-within:text-primary transition-colors text-lg">search</span>
            <input
              className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-full pl-9 pr-3 py-1.5 text-xs sm:text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
              placeholder="Search..."
              type="text"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors relative">
            <span className="material-symbols-outlined">notifications</span>
            <span className="absolute top-2 right-2 w-2 h-2 bg-error rounded-full"></span>
          </button>
          <div className="h-6 w-px bg-outline-variant/30 mx-0.5 sm:mx-2"></div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-semibold text-primary">{user?.email?.split('@')[0] || 'User'}</p>
              <p className="text-[11px] text-on-surface-variant capitalize">{user?.role || 'Operator'}</p>
            </div>
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs sm:text-sm border-2 border-primary/20 shrink-0">
              {user?.email?.[0]?.toUpperCase() || 'M'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-64 pt-20 pb-12 px-3 sm:px-6 md:px-8 min-h-screen bg-surface-bright overflow-x-hidden max-w-full w-full">
        <Outlet />
      </main>
    </div>
  );
}

