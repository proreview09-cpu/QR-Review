import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">QR Review</h1>
          <p className="text-sm text-gray-400 mt-1">{user?.role === 'admin' ? 'Admin Panel' : 'Dashboard'}</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {user?.role === 'admin' ? (
            <>
              <NavLink to="/admin">Dashboard</NavLink>
              <NavLink to="/admin/shops">Shops</NavLink>
              <NavLink to="/admin/logs">Logs</NavLink>
              <NavLink to="/admin/settings">Settings</NavLink>
            </>
          ) : (
            <>
              <NavLink to="/dashboard">Dashboard</NavLink>
            </>
          )}
        </nav>
        <div className="p-4 border-t border-gray-700">
          <p className="text-sm text-gray-400">{user?.name}</p>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300 mt-1">
            Logout
          </button>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}

function NavLink({ to, children }) {
  return (
    <Link
      to={to}
      className="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
    >
      {children}
    </Link>
  );
}
