import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

const CATEGORIES = ['programs', 'pricing', 'faqs', 'policies'];

/* Single-color SVG icons for KB categories & actions */
const KBIcons = {
  programs: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  ),
  pricing: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  faqs: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
  policies: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
    </svg>
  ),
  eye: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  eyeOff: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ),
  edit: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  ),
  trash: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
  ),
};

const CATEGORY_LABELS = {
  programs: 'Programs',
  pricing: 'Pricing',
  faqs: 'FAQs',
  policies: 'Policies',
};

function CategoryLabel({ category }) {
  return (
    <span className="inline-flex items-center gap-1">
      {KBIcons[category]} {CATEGORY_LABELS[category]}
    </span>
  );
}

function KBEntryForm({ entry, onSave, onCancel }) {
  const [category, setCategory] = useState(entry?.category || 'programs');
  const [title, setTitle] = useState(entry?.title || '');
  const [content, setContent] = useState(entry?.content || '');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await onSave({ category, title, content });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-brand-sm p-5 space-y-4">
      <h3 className="font-heading font-semibold text-brand-dark">{entry ? 'Edit Entry' : 'New Entry'}</h3>
      
      <div>
        <label className="block text-sm font-medium text-brand-body mb-1">Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-brand-body focus:ring-2 focus:ring-primary-300 outline-none"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}><CategoryLabel category={c} /></option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-body mb-1">Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-brand-dark focus:ring-2 focus:ring-primary-300 outline-none"
          placeholder="e.g., Summer Camp 2026"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-body mb-1">Content</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          required
          rows={5}
          className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-y text-brand-dark focus:ring-2 focus:ring-primary-300 outline-none"
          placeholder="Describe the program, pricing, FAQ answer, or policy details..."
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !title.trim() || !content.trim()}
          className="bg-primary-600 text-white px-5 py-2 rounded-pill text-sm font-semibold hover:bg-primary-700 disabled:opacity-50 transition-all shadow-brand-sm"
        >
          {saving ? 'Saving...' : entry ? 'Update' : 'Create'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-200 text-brand-body px-5 py-2 rounded-pill text-sm hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [activeCategory, setActiveCategory] = useState('all');

  const fetchEntries = useCallback(async () => {
    try {
      const data = await api.getKnowledgeBase();
      setEntries(data || []);
    } catch (err) {
      console.error('Failed to load KB:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const handleSave = async (data) => {
    try {
      if (editing) {
        await api.updateKBEntry(editing.id, data);
      } else {
        await api.createKBEntry(data);
      }
      setShowForm(false);
      setEditing(null);
      fetchEntries();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this entry?')) return;
    try {
      await api.deleteKBEntry(id);
      fetchEntries();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleToggleActive = async (entry) => {
    try {
      await api.updateKBEntry(entry.id, { is_active: !entry.is_active });
      fetchEntries();
    } catch (err) {
      console.error('Failed to toggle:', err);
    }
  };

  const filtered = activeCategory === 'all'
    ? entries
    : entries.filter((e) => e.category === activeCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-xl font-heading font-bold text-brand-dark">Knowledge Base</h2>
        <button
          onClick={() => { setShowForm(true); setEditing(null); }}
          className="bg-secondary-400 text-white px-5 py-2 rounded-pill text-sm font-semibold hover:bg-secondary-500 transition-all shadow-brand-sm"
        >
          + Add Entry
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-1 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-pill text-sm font-medium whitespace-nowrap transition-colors ${
            activeCategory === 'all' ? 'bg-primary-600 text-white shadow-brand-sm' : 'text-brand-body hover:bg-gray-100'
          }`}
        >
          All ({entries.length})
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setActiveCategory(c)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-pill text-sm font-medium whitespace-nowrap transition-colors ${
              activeCategory === c ? 'bg-primary-600 text-white shadow-brand-sm' : 'text-brand-body hover:bg-gray-100'
            }`}
          >
            <CategoryLabel category={c} /> ({entries.filter((e) => e.category === c).length})
          </button>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <KBEntryForm
          entry={editing}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditing(null); }}
        />
      )}

      {/* Entries List */}
      {loading ? (
        <div className="p-8 text-center text-brand-muted">Loading knowledge base...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-brand-sm p-8 text-center text-brand-muted">
          No entries found. Click "Add Entry" to create one.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((entry) => (
            <div
              key={entry.id}
              className={`bg-white rounded-2xl shadow-brand-sm p-4 hover:shadow-brand-md transition-shadow ${!entry.is_active ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs bg-primary-50 text-primary-600 px-2.5 py-0.5 rounded-pill font-medium">
                      <CategoryLabel category={entry.category} />
                    </span>
                    {!entry.is_active && (
                      <span className="text-xs bg-secondary-50 text-secondary-600 px-2.5 py-0.5 rounded-pill">
                        Inactive
                      </span>
                    )}
                  </div>
                  <h4 className="font-heading font-semibold text-brand-dark">{entry.title}</h4>
                  <p className="text-sm text-brand-body mt-1 whitespace-pre-wrap">{entry.content}</p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => handleToggleActive(entry)}
                    className="p-1.5 text-brand-muted hover:text-secondary-500 rounded-xl hover:bg-secondary-50 transition-colors"
                    title={entry.is_active ? 'Deactivate' : 'Activate'}
                  >
                    {entry.is_active ? KBIcons.eye : KBIcons.eyeOff}
                  </button>
                  <button
                    onClick={() => { setEditing(entry); setShowForm(true); }}
                    className="p-1.5 text-brand-muted hover:text-primary-600 rounded-xl hover:bg-primary-50 transition-colors"
                    title="Edit"
                  >
                    {KBIcons.edit}
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 text-brand-muted hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors"
                    title="Delete"
                  >
                    {KBIcons.trash}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
