import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Home', icon: '⌂', end: true },
  { to: '/partners', label: 'Partners', icon: '👥' },
  { to: '/items', label: 'Items', icon: '📦' },
  { to: '/inventory', label: 'Stock', icon: '🏷' },
  { to: '/masters', label: 'Masters', icon: '⚙' },
  { to: '/rates', label: 'Rates', icon: '₹' },
  { to: '/orders', label: 'Orders', icon: '🧾' },
];

export function Layout() {
  const { org, user, logout } = useAuth();
  const location = useLocation();
  const hideMobileNav =
    location.pathname.startsWith('/orders/') && location.pathname !== '/orders';

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">v</span>
          <div>
            <strong>viberp</strong>
            <small>Textile ERP</small>
          </div>
        </div>
        <nav className="nav sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="org-badge">{org?.name ?? 'Organization'}</div>
          <div className="user-line">{user?.email ?? 'Signed in'}</div>
          <button type="button" className="btn-text" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>

      <div className="layout-body">
        <header className="topbar">
          <div className="topbar-brand">
            <span className="brand-mark sm">v</span>
            <strong>viberp</strong>
          </div>
          <button type="button" className="btn-text topbar-signout" onClick={logout}>
            Sign out
          </button>
        </header>
        <main className="main">
          <Outlet />
        </main>
      </div>

      {!hideMobileNav && (
        <nav className="bottom-nav" aria-label="Main">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? 'bottom-nav-link active' : 'bottom-nav-link')}
            >
              <span className="bottom-nav-icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
