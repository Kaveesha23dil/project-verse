import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth, useToast, timeAgo } from '../lib/store';
import { Avatar, PlanBadge, Wordmark } from './UI';

const NAV = [
  { to: '/explore', label: 'Publications' },
  { to: '/marketplace', label: 'Marketplace' },
  { to: '/pricing', label: 'Plans' },
];

function NotificationsMenu({ onClose }) {
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    let active = true;
    api.get('/notifications').then((r) => { if (active) setItems(r.data); }).catch((err) => {
      if (active) { setItems([]); setError(err); }
    });
    return () => { active = false; };
  }, []);

  const markAllRead = async () => {
    setBusy(true);
    try {
      await api.post('/notifications/read', {});
      setItems((prev) => (prev || []).map((n) => ({ ...n, is_read: 1 })));
      window.dispatchEvent(new CustomEvent('pv:notifications-read'));
    } catch (err) { toast.error(err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="menu" style={{ width: 340 }}>
      <div className="row-between" style={{ padding: '0.5rem 0.7rem' }}>
        <strong style={{ fontFamily: 'var(--display)' }}>Notifications</strong>
        <button className="btn btn-quiet btn-sm" disabled={busy || !items?.some((n) => !n.is_read)} onClick={markAllRead}>Mark all read</button>
      </div>
      <hr />
      {items === null && <div className="small muted" style={{ padding: '1rem 0.7rem' }}>Loading…</div>}
      {error && <div className="notice notice-error" role="alert">{error.message}</div>}
      {!error && items?.length === 0 && (
        <div className="small muted" style={{ padding: '1.5rem 0.7rem', textAlign: 'center' }}>
          Nothing yet. Activity on your publications and requests shows up here.
        </div>
      )}
      {items?.slice(0, 12).map((n) => (
        <Link
          key={n.id}
          to={n.link_url || '/dashboard'}
          onClick={onClose}
          style={{
            display: 'block', padding: '0.6rem 0.7rem', borderRadius: 'var(--radius-sm)',
            background: n.is_read ? 'transparent' : 'var(--violet-50)',
          }}
        >
          <div className="row" style={{ gap: '0.4rem', alignItems: 'baseline' }}>
            {n.priority === 'priority' && <span className="badge badge-violet">Priority</span>}
            <strong style={{ color: 'var(--ink)', fontSize: 'var(--step-0)' }}>{n.title}</strong>
          </div>
          {n.body && <div className="small muted truncate-2">{n.body}</div>}
          <div className="small mono muted">{timeAgo(n.created_at)}</div>
        </Link>
      ))}
    </div>
  );
}

export default function Layout({ children }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [openMenu, setOpenMenu] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const shellRef = useRef(null);

  useEffect(() => {
    if (!user) { setUnread(0); return undefined; }
    const load = () => api.get('/notifications').then((r) => setUnread(r.unread)).catch(() => {});
    load();
    const id = setInterval(load, 60000);
    window.addEventListener('pv:notifications-read', load);
    return () => { clearInterval(id); window.removeEventListener('pv:notifications-read', load); };
  }, [user]);

  useEffect(() => {
    const closeMenus = () => { setOpenMenu(null); setNavOpen(false); };
    const onClick = (e) => { if (!shellRef.current?.contains(e.target)) closeMenus(); };
    const onKey = (e) => {
      if (e.key === 'Escape') {
        shellRef.current?.querySelector('[aria-expanded="true"]')?.focus();
        closeMenus();
      }
    };
    const onFocus = (e) => { if (!shellRef.current?.contains(e.target)) closeMenus(); };
    document.addEventListener('pointerdown', onClick);
    document.addEventListener('keydown', onKey);
    document.addEventListener('focusin', onFocus);
    return () => {
      document.removeEventListener('pointerdown', onClick);
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('focusin', onFocus);
    };
  }, []);

  useEffect(() => { setOpenMenu(null); setNavOpen(false); window.scrollTo(0, 0); }, [pathname]);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 901px)');
    const onResize = () => { if (desktop.matches) { setNavOpen(false); setOpenMenu(null); } };
    desktop.addEventListener('change', onResize);
    return () => desktop.removeEventListener('change', onResize);
  }, []);

  const handleSignOut = () => {
    signOut();
    setOpenMenu(null);
    navigate('/');
  };

  return (
    <div className="shell">
      <header className="topbar">
        <div className="wrap topbar-inner" ref={shellRef}>
          <Wordmark />

          <button
            type="button"
            className="btn btn-ghost nav-toggle"
            aria-label={navOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={navOpen}
            aria-controls="navbar-panel"
            onClick={() => { setNavOpen((prev) => !prev); setOpenMenu(null); }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              {navOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>

          <div id="navbar-panel" className={`navbar-panel${navOpen ? ' is-open' : ''}`}>

          <nav className="nav grow" aria-label="Main">
            {NAV.map((item) => (
              <NavLink key={item.to} to={item.to} onClick={() => setNavOpen(false)} className={({ isActive }) => (isActive ? 'active' : '')}>
                {item.label}
              </NavLink>
            ))}
          </nav>

          {user ? (
            <div className="row header-actions" style={{ gap: '0.4rem' }}>
              <Link className="btn btn-quiet" to="/cart" aria-label="Cart">Cart</Link>

              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-quiet bell"
                  onClick={() => setOpenMenu(openMenu === 'notif' ? null : 'notif')}
                  aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
                  aria-expanded={openMenu === 'notif'}
                >
                  Alerts
                  {unread > 0 && <span className="bell-dot mono">{unread > 9 ? '9+' : unread}</span>}
                </button>
                {openMenu === 'notif' && <NotificationsMenu onClose={() => setOpenMenu(null)} />}
              </div>

              <div style={{ position: 'relative' }}>
                <button
                  className="btn btn-quiet row"
                  onClick={() => setOpenMenu(openMenu === 'user' ? null : 'user')}
                  aria-expanded={openMenu === 'user'}
                  aria-label="Account menu"
                  style={{ gap: '0.5rem' }}
                >
                  <Avatar name={user.full_name} url={user.avatar_url} />
                </button>
                {openMenu === 'user' && (
                  <div className="menu">
                    <div style={{ padding: '0.6rem 0.7rem' }}>
                      <strong style={{ display: 'block', fontFamily: 'var(--display)' }}>{user.full_name}</strong>
                      <div className="small muted">{user.role_name}</div>
                      <div style={{ marginTop: '0.4rem' }}><PlanBadge plan={user.plan_code} /></div>
                    </div>
                    <hr />
                    <Link to="/dashboard" onClick={() => setOpenMenu(null)}>Dashboard</Link>
                    <Link to={user.role_code === 'admin' ? '/admin?tab=moderation' : '/requests'} onClick={() => setOpenMenu(null)}>
                      {user.role_code === 'admin' ? 'Review submissions' : 'Requests'}
                    </Link>
                    {['student', 'researcher'].includes(user.role_code) && (
                      <Link to="/publications/new" onClick={() => setOpenMenu(null)}>New publication</Link>
                    )}
                    {user.role_code !== 'admin' && (
                      <Link to="/sell" onClick={() => setOpenMenu(null)}>Sell in the marketplace</Link>
                    )}
                    <Link to="/orders" onClick={() => setOpenMenu(null)}>Orders</Link>
                    {user.role_code === 'university' && (
                      <Link to="/university" onClick={() => setOpenMenu(null)}>University console</Link>
                    )}
                    {user.role_code === 'admin' && (
                      <Link to="/admin" onClick={() => setOpenMenu(null)}>Administration</Link>
                    )}
                    <hr />
                    <Link to="/settings" onClick={() => setOpenMenu(null)}>Settings</Link>
                    <button onClick={handleSignOut}>Sign out</button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="row header-actions" style={{ gap: '0.4rem' }}>
              <Link className="btn btn-ghost btn-sm" to="/signin">Sign in</Link>
              <Link className="btn btn-primary btn-sm" to="/register">Create account</Link>
            </div>
          )}
          </div>
        </div>
      </header>

      <main className={`page${pathname === '/' ? ' page-home' : ''}`}>{children}</main>

      <footer className="footer">
        <div className="wrap">
          <div className="grid grid-4" style={{ gap: '2rem' }}>
            <div>
              <Wordmark inverted />
              <p style={{ marginTop: '0.8rem', maxWidth: '30ch' }}>
                University research, published where industry can actually find it.
              </p>
            </div>
            <div>
              <h5>Explore</h5>
              <Link to="/explore">Publications</Link>
              <Link to="/marketplace">Marketplace</Link>
              <Link to="/pricing">Plans and pricing</Link>
            </div>
            <div>
              <h5>Publish</h5>
              <Link to="/publications/new">Add a publication</Link>
              <Link to="/sell">Sell a research output</Link>
              <Link to="/register">Create an account</Link>
            </div>
            <div>
              <h5>Institution</h5>
              <Link to="/university">University console</Link>
              <Link to="/settings">Account settings</Link>
            </div>
          </div>
          <hr style={{ border: 0, borderTop: '1px solid var(--graphite-800)', margin: '2rem 0 1rem' }} />
          <div className="row-between small">
            <span>© {new Date().getFullYear()} ProjectVerse — Sri Lanka Technology Campus</span>
            <span className="mono">CCS3361 Technology Challenge Competition</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
