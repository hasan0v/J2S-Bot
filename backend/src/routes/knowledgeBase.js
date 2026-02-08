const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { pool } = require('../models/database');

const router = express.Router();

/**
 * GET /api/knowledge-base
 * Get all knowledge base entries (public - used by chat engine)
 */
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    let query = `SELECT * FROM knowledge_base WHERE is_active = TRUE`;
    const params = [];

    if (category) {
      query += ` AND category = $1`;
      params.push(category);
    }

    query += ` ORDER BY category, title`;
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[KB List Error]', err);
    res.status(500).json({ error: 'Failed to fetch knowledge base' });
  }
});

/**
 * GET /api/knowledge-base/all
 * Get all knowledge base entries including inactive (admin only)
 */
router.get('/all', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM knowledge_base ORDER BY category, title`
    );
    res.json(rows);
  } catch (err) {
    console.error('[KB All Error]', err);
    res.status(500).json({ error: 'Failed to fetch knowledge base' });
  }
});

/**
 * POST /api/knowledge-base
 * Create a new knowledge base entry (admin only)
 * Body: { category: string, title: string, content: string }
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { category, title, content } = req.body;

    if (!category || !title || !content) {
      return res.status(400).json({ error: 'Category, title, and content are required' });
    }

    const validCategories = ['programs', 'pricing', 'faqs', 'policies'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ error: `Category must be one of: ${validCategories.join(', ')}` });
    }

    const { rows } = await pool.query(
      `INSERT INTO knowledge_base (category, title, content) VALUES ($1, $2, $3) RETURNING *`,
      [category, title, content]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[KB Create Error]', err);
    res.status(500).json({ error: 'Failed to create knowledge base entry' });
  }
});

/**
 * PUT /api/knowledge-base/:id
 * Update a knowledge base entry (admin only)
 * Body: { category?: string, title?: string, content?: string, is_active?: boolean }
 */
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { category, title, content, is_active } = req.body;

    // Build dynamic update query
    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (category !== undefined) {
      const validCategories = ['programs', 'pricing', 'faqs', 'policies'];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ error: `Category must be one of: ${validCategories.join(', ')}` });
      }
      updates.push(`category = $${paramIndex++}`);
      values.push(category);
    }
    if (title !== undefined) {
      updates.push(`title = $${paramIndex++}`);
      values.push(title);
    }
    if (content !== undefined) {
      updates.push(`content = $${paramIndex++}`);
      values.push(content);
    }
    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex++}`);
      values.push(is_active);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const { rows } = await pool.query(
      `UPDATE knowledge_base SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Knowledge base entry not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error('[KB Update Error]', err);
    res.status(500).json({ error: 'Failed to update knowledge base entry' });
  }
});

/**
 * DELETE /api/knowledge-base/:id
 * Delete a knowledge base entry (admin only)
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `DELETE FROM knowledge_base WHERE id = $1 RETURNING id`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Knowledge base entry not found' });
    }

    res.json({ success: true, deleted: rows[0].id });
  } catch (err) {
    console.error('[KB Delete Error]', err);
    res.status(500).json({ error: 'Failed to delete knowledge base entry' });
  }
});

module.exports = router;
