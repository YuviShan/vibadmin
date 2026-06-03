import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AuthProvider } from './context/AuthContext';
import { DashboardPage } from './pages/DashboardPage';
import { ItemFormPage } from './pages/ItemFormPage';
import { ItemsPage } from './pages/ItemsPage';
import { RateFormPage } from './pages/RateFormPage';
import { LoginPage } from './pages/LoginPage';
import { NewOrderPage } from './pages/NewOrderPage';
import { OrdersPage } from './pages/OrdersPage';
import { PartnerFormPage } from './pages/PartnerFormPage';
import { PartnersPage } from './pages/PartnersPage';
import { RatesPage } from './pages/RatesPage';
import { SalesOrderPage } from './pages/SalesOrderPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="partners" element={<PartnersPage />} />
              <Route path="partners/new" element={<PartnerFormPage />} />
              <Route path="partners/:id" element={<PartnerFormPage />} />
              <Route path="items" element={<ItemsPage />} />
              <Route path="items/new" element={<ItemFormPage />} />
              <Route path="items/:id" element={<ItemFormPage />} />
              <Route path="rates" element={<RatesPage />} />
              <Route path="rates/new" element={<RateFormPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/new" element={<NewOrderPage />} />
              <Route path="orders/:id" element={<SalesOrderPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
