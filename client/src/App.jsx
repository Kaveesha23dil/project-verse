import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import { Loading } from './components/UI';
import { useAuth } from './lib/store';

import Landing from './pages/Landing';
import SignIn from './pages/SignIn';
import Register from './pages/Register';
import Explore from './pages/Explore';
import PublicationDetail from './pages/PublicationDetail';
import PublicationEditor from './pages/PublicationEditor';
import Marketplace from './pages/Marketplace';
import ProductDetail from './pages/ProductDetail';
import SellProduct from './pages/SellProduct';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import Dashboard from './pages/Dashboard';
import Requests from './pages/Requests';
import Admin from './pages/Admin';
import UniversityConsole from './pages/UniversityConsole';
import Pricing from './pages/Pricing';
import Settings from './pages/Settings';

function Protected({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="wrap" style={{ paddingTop: '3rem' }}>
        <Loading />
      </div>
    );
  }
  if (!user) return <Navigate to="/signin" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role_code)) {
    return (
      <div className="wrap-narrow" style={{ paddingTop: '3rem' }}>
        <div className="card">
          <h2>Not your area</h2>
          <p className="muted">
            This section is for {roles.join(' and ')} accounts. Your account is signed in as {user.role_name}.
          </p>
          <a className="btn btn-primary" href="/dashboard">Go to your dashboard</a>
        </div>
      </div>
    );
  }
  return children;
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/register" element={<Register />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/publications/new" element={<Protected roles={['student', 'researcher']}><PublicationEditor /></Protected>} />
        <Route path="/publications/:id/edit" element={<Protected roles={['student', 'researcher']}><PublicationEditor /></Protected>} />
        <Route path="/publications/:slug" element={<PublicationDetail />} />
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/marketplace/:slug" element={<ProductDetail />} />
        <Route path="/sell" element={<Protected><SellProduct /></Protected>} />
        <Route path="/cart" element={<Protected><Cart /></Protected>} />
        <Route path="/orders" element={<Protected><Orders /></Protected>} />
        <Route path="/orders/:orderNo" element={<Protected><Orders /></Protected>} />
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/requests" element={<Protected><Requests /></Protected>} />
        <Route path="/admin" element={<Protected roles={['admin']}><Admin /></Protected>} />
        <Route path="/admin/moderation" element={<Protected roles={['admin']}><Navigate to="/admin?tab=moderation" replace /></Protected>} />
        <Route path="/university" element={<Protected roles={['university']}><UniversityConsole /></Protected>} />
        <Route path="/pricing" element={<Pricing />} />
        <Route path="/settings" element={<Protected><Settings /></Protected>} />
        <Route
          path="*"
          element={
            <div className="wrap-narrow center" style={{ paddingTop: '4rem' }}>
              <div className="eyebrow">404</div>
              <h1>That page is not here</h1>
              <p className="muted">The link may be old, or the publication may have been removed.</p>
              <a className="btn btn-primary" href="/explore">Browse publications</a>
            </div>
          }
        />
      </Routes>
    </Layout>
  );
}
