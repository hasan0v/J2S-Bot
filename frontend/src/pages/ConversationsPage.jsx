import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

/* Single-color inline SVG icons */
const Icons = {
  dot: (color) => (
    <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="4" fill={color} /></svg>
  ),
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
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
      <polyline points="22,6 12,13 2,6" />
    </svg>
  ),
  phoneCall: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  close: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  ),
};

function ChannelLabel({ channel }) {
  return (
    <span className="inline-flex items-center gap-1 text-brand-body">
      {channel === 'sms' ? Icons.phone : Icons.chat}
      {channel === 'sms' ? 'SMS' : 'Web'}
    </span>
  );
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function StatusBadge({ status }) {
  const styles = {
    active: 'bg-green-100 text-green-700',
    ended: 'bg-gray-100 text-gray-600',
    escalated: 'bg-red-100 text-red-700',
  };
  const dotColors = { active: '#22c55e', ended: '#9ca3af', escalated: '#ef4444' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-pill text-xs font-medium ${styles[status] || styles.active}`}>
      {Icons.dot(dotColors[status] || dotColors.active)} {status}
    </span>
  );
}

function ConversationModal({ conversation, onClose }) {
  if (!conversation) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-brand-lg max-w-2xl w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="font-heading font-semibold text-brand-dark">
              {conversation.parent_name || 'Anonymous'} 
              <span className="ml-2 text-sm font-normal text-brand-muted">
                <ChannelLabel channel={conversation.channel} />
              </span>
            </h3>
            <p className="text-sm text-brand-muted flex items-center gap-3">
              {conversation.parent_email && <span className="inline-flex items-center gap-1">{Icons.mail} {conversation.parent_email}</span>}
              {conversation.parent_phone && <span className="inline-flex items-center gap-1">{Icons.phoneCall} {conversation.parent_phone}</span>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={conversation.status} />
            <button onClick={onClose} className="text-brand-muted hover:text-brand-dark p-1">{Icons.close}</button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-brand-offwhite">
          {conversation.messages?.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-brand-dark shadow-brand-sm'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-primary-200' : 'text-brand-muted'}`}>
                  {new Date(msg.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ConversationsPage() {
  const [conversations, setConversations] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [filters, setFilters] = useState({ status: '', channel: '', page: 1 });

  const fetchConversations = useCallback(async () => {
    try {
      const params = { page: filters.page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.channel) params.channel = filters.channel;

      const data = await api.getConversations(params);
      setConversations(data.conversations || []);
      setPagination(data.pagination || {});
    } catch (err) {
      console.error('Failed to load conversations:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  const openConversation = async (conv) => {
    try {
      const detail = await api.getConversation(conv.id);
      setSelectedDetail(detail);
      setSelected(conv.id);
    } catch (err) {
      console.error('Failed to load conversation:', err);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-heading font-bold text-brand-dark">Conversations</h2>
        <div className="flex gap-2">
          <select
            value={filters.status}
            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-brand-body focus:ring-2 focus:ring-primary-300 outline-none"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="ended">Ended</option>
            <option value="escalated">Escalated</option>
          </select>
          <select
            value={filters.channel}
            onChange={(e) => setFilters((f) => ({ ...f, channel: e.target.value, page: 1 }))}
            className="text-sm border border-gray-200 rounded-xl px-3 py-1.5 bg-white text-brand-body focus:ring-2 focus:ring-primary-300 outline-none"
          >
            <option value="">All Channels</option>
            <option value="web">Web</option>
            <option value="sms">SMS</option>
          </select>
        </div>
      </div>

      {/* Conversations Table */}
      <div className="bg-white rounded-2xl shadow-brand-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-brand-muted">Loading conversations...</div>
        ) : conversations.length === 0 ? (
          <div className="p-8 text-center text-brand-muted">No conversations found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-offwhite border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide">Parent</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide">Channel</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide hidden sm:table-cell">Last Message</th>
                  <th className="text-left px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide">Status</th>
                  <th className="text-right px-4 py-3 font-medium text-brand-muted text-xs uppercase tracking-wide">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {conversations.map((conv) => (
                  <tr
                    key={conv.id}
                    onClick={() => openConversation(conv)}
                    className="hover:bg-primary-50/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-brand-dark">
                        {conv.parent_name || 'Anonymous'}
                      </div>
                      {conv.parent_email && (
                        <div className="text-xs text-brand-muted">{conv.parent_email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <ChannelLabel channel={conv.channel} />
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-brand-body truncate max-w-xs">
                        {conv.last_message?.substring(0, 50) || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={conv.status} />
                    </td>
                    <td className="px-4 py-3 text-right text-brand-muted">
                      {timeAgo(conv.updated_at)}
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
              Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
            </span>
            <div className="flex gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                className="px-3 py-1 text-sm border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-primary-50 transition-colors"
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                className="px-3 py-1 text-sm border border-gray-200 rounded-xl disabled:opacity-50 hover:bg-primary-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Conversation Detail Modal */}
      {selected && selectedDetail && (
        <ConversationModal
          conversation={selectedDetail}
          onClose={() => {
            setSelected(null);
            setSelectedDetail(null);
          }}
        />
      )}
    </div>
  );
}
