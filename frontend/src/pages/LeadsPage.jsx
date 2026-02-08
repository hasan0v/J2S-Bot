import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const Icons = {
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" /><line x1="12" y1="18" x2="12.01" y2="18" />
    </svg>
  ),
  chat: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  download: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  ),
};

export default function LeadsPage() {
  const [leads, setLeads] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  const fetchLeads = useCallback(async () => {
    try {
      const params = { page, limit: 50 };
      if (search) params.search = search;
      const data = await api.getLeads(params);
      setLeads(data.leads || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error('Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const handleExport = async () => {
    setExporting(true);
    try {
      await api.exportLeads();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-heading font-bold text-brand-dark">Leads</h2>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 w-64 focus:ring-2 focus:ring-primary-300 outline-none text-brand-body"
          />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="bg-secondary-400 text-white px-4 py-1.5 rounded-pill text-sm font-semibold hover:bg-secondary-500 disabled:opacity-50 transition-all shadow-brand-sm"
          >
            {exporting ? 'Exporting...' : <><span className="inline-flex mr-1">{Icons.download}</span> Export CSV</>}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-brand-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-brand-muted">Loading leads...</div>
        ) : leads.length === 0 ? (
          <div className="p-8 text-center text-brand-muted">No leads captured yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-offwhite border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide">Email</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide hidden md:table-cell">Phone</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide hidden lg:table-cell">Program Interest</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide">Source</th>
                  <th className="text-right px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-primary-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-brand-dark">
                      {lead.parent_name || '—'}
                    </td>
                    <td className="px-4 py-3 text-brand-body">
                      {lead.parent_email ? (
                        <a href={`mailto:${lead.parent_email}`} className="text-primary-600 hover:text-primary-700 hover:underline">
                          {lead.parent_email}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-brand-body hidden md:table-cell">
                      {lead.parent_phone ? (
                        <a href={`tel:${lead.parent_phone}`} className="text-primary-600 hover:text-primary-700 hover:underline">
                          {lead.parent_phone}
                        </a>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-brand-body hidden lg:table-cell">
                      {lead.program_interest || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 text-brand-body">
                        {lead.channel === 'sms' ? Icons.phone : Icons.chat}
                        {lead.channel === 'sms' ? 'SMS' : 'Web'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-brand-muted">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <span className="text-sm text-brand-muted">
              {pagination.total} total leads
            </span>
            <div className="flex gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1 text-sm border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-primary-50 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 text-sm border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-primary-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
