import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchDashboard } from '../api/endpoints';
import { getApiErrorMessage } from '../api/client';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function DashboardPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
  });

  return (
    <div className="page">
      <div className="page-header">
        <span className="badge">Overview</span>
        <h1>Dashboard</h1>
      </div>

      {isLoading && <p className="muted">Loading summary…</p>}
      {error && <div className="alert alert-error">{getApiErrorMessage(error)}</div>}

      {data && (
        <div className="metric-grid">
          <div className="metric-card card">
            <span className="metric-label">Today&apos;s sales</span>
            <strong>{formatCurrency(data.todaysSales)}</strong>
          </div>
          <Link to="/orders?today=1" className="metric-card card metric-card-link">
            <span className="metric-label">Orders today</span>
            <strong>{data.ordersToday}</strong>
          </Link>
          <Link to="/orders?status=draft" className="metric-card card metric-card-link">
            <span className="metric-label">Pending orders</span>
            <strong>{data.pendingOrders}</strong>
            <small>Draft status</small>
          </Link>
        </div>
      )}
    </div>
  );
}
