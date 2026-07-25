import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navLinks = [
    { name: 'Dashboard', path: '/' },
    { name: 'Daily Mill Report', path: '/daily-mill' },
    { name: 'Padtal Report', path: '/padtal' },
  ];

  if (user?.role === 'admin') {
    navLinks.push({ name: 'Users', path: '/users' });
    navLinks.push({ name: 'Master Data', path: '/master-data' });
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r shadow-sm flex flex-col">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b">
          <span className="text-2xl font-bold text-brand">MFMPL</span>
        </div>
        
        {/* Navigation Links */}
        <nav className="flex-1 px-4 py-6 flex flex-col space-y-2">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link 
                key={link.path} 
                to={link.path} 
                className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive 
                    ? 'bg-brand text-white shadow' 
                    : 'text-gray-600 hover:bg-gray-100 hover:text-brand'
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* User info & Logout */}
        <div className="p-4 border-t flex flex-col space-y-3">
          <div className="text-sm text-gray-500 truncate px-2">{user?.email}</div>
          <button 
            onClick={handleLogout} 
            className="w-full text-left px-4 py-2 text-sm text-red-600 font-medium hover:bg-red-50 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 h-screen overflow-y-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
