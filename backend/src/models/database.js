const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client:', err.message);
});

/**
 * Initialize database tables if they don't exist
 */
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Enable uuid-ossp extension
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // Users table (dashboard auth)
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Conversations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        session_id VARCHAR(255) UNIQUE NOT NULL,
        channel VARCHAR(10) NOT NULL CHECK (channel IN ('web', 'sms')),
        parent_name VARCHAR(255),
        parent_email VARCHAR(255),
        parent_phone VARCHAR(20),
        program_interest VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'ended', 'escalated')),
        escalation_reason TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Messages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
        role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
        content TEXT NOT NULL,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Knowledge base table
    await client.query(`
      CREATE TABLE IF NOT EXISTS knowledge_base (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        category VARCHAR(50) NOT NULL CHECK (category IN ('programs', 'pricing', 'faqs', 'policies')),
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes (IF NOT EXISTS)
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(created_at DESC);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);`);

    await client.query('COMMIT');
    console.log('  Database tables and indexes ready');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, initializeDatabase };
