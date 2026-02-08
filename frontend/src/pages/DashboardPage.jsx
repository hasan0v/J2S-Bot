import { usePolling } from '../hooks/usePolling';
import api from '../services/api';

/* Simple single-color SVG icons — inherit color from parent via currentColor */
const icons = {
  chat: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  calendar: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  ),
  chart: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  ),
  users: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  alert: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  zap: (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
};

function MetricCard({ label, value, icon, color = 'purple' }) {
  const colors = {
    purple: 'bg-primary-50 text-primary-600',
    orange: 'bg-secondary-50 text-secondary-500',
    green: 'bg-green-50 text-green-700',
    yellow: 'bg-yellow-50 text-yellow-700',
    red: 'bg-red-50 text-red-700',
    cyan: 'bg-cyan-50 text-cyan-700',
  };

  return (
    <div className="bg-white rounded-2xl shadow-brand-sm p-5 hover:shadow-brand-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icons[icon] || icon}
        </div>
        <div>
          <p className="text-sm text-brand-muted">{label}</p>
          <p className="text-2xl font-heading font-bold text-brand-dark">{value ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: metrics, loading } = usePolling(() => api.getMetrics(), 30000);
  const { data: trends } = usePolling(() => api.getTrends(), 60000);

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-heading font-bold text-brand-dark">Dashboard</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-brand-sm p-5 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary-50" />
                <div className="space-y-2">
                  <div className="h-3 w-24 bg-gray-200 rounded" />
                  <div className="h-6 w-16 bg-gray-200 rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-heading font-bold text-brand-dark">Dashboard</h2>
        <span className="text-sm text-brand-muted">Auto-refreshes every 30s</span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard
          label="Conversations Today"
          value={metrics?.conversationsToday}
          icon="chat"
          color="purple"
        />
        <MetricCard
          label="This Week"
          value={metrics?.conversationsThisWeek}
          icon="calendar"
          color="cyan"
        />
        <MetricCard
          label="This Month"
          value={metrics?.conversationsThisMonth}
          icon="chart"
          color="orange"
        />
        <MetricCard
          label="Total Leads"
          value={metrics?.totalLeads}
          icon="users"
          color="green"
        />
        <MetricCard
          label="Escalation Rate"
          value={metrics?.escalationRate != null ? `${metrics.escalationRate}%` : null}
          icon="alert"
          color="red"
        />
        <MetricCard
          label="Avg Response Time"
          value={metrics?.avgResponseTime != null ? `${metrics.avgResponseTime}s` : null}
          icon="zap"
          color="yellow"
        />
      </div>

      {/* Conversation Trends */}
      {trends && trends.length > 0 && (
        <div className="bg-white rounded-2xl shadow-brand-sm p-5">
          <h3 className="text-lg font-heading font-semibold text-brand-dark mb-4">Conversations (Last 30 Days)</h3>
          <div className="flex items-end gap-1 h-32">
            {trends.map((day, i) => {
              const max = Math.max(...trends.map((t) => parseInt(t.count)));
              const height = max > 0 ? (parseInt(day.count) / max) * 100 : 0;
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1" title={`${day.date}: ${day.count}`}>
                  <span className="text-[10px] text-brand-muted">{day.count}</span>
                  <div
                    className="w-full bg-primary-400 rounded-t-sm min-h-[2px] transition-all"
                    style={{ height: `${Math.max(height, 2)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            <span className="text-xs text-brand-muted">30 days ago</span>
            <span className="text-xs text-brand-muted">Today</span>
          </div>
        </div>
      )}
    </div>
  );
}
