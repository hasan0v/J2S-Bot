/**
 * Database Seed Script
 * Creates initial admin user and sample knowledge base entries
 * 
 * Usage: node src/seed.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { pool, initializeDatabase } = require('./models/database');

async function seed() {
  try {
    console.log('🌱 Starting database seed...\n');

    // Initialize tables
    await initializeDatabase();

    // ─── Create Admin User ────────────────────────────────────
    const adminEmail = 'admin@journeytosteam.com';
    const adminPassword = 'J2SAdmin2026!'; // Client should change this immediately
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await pool.query(
      `INSERT INTO users (email, password_hash, full_name) 
       VALUES ($1, $2, $3) 
       ON CONFLICT (email) DO UPDATE SET password_hash = $2, full_name = $3`,
      [adminEmail, passwordHash, 'J2S Admin']
    );
    console.log(`✅ Admin user created: ${adminEmail}`);
    console.log(`   Password: ${adminPassword} (CHANGE THIS AFTER FIRST LOGIN)\n`);

    // ─── Seed Knowledge Base ──────────────────────────────────
    // Load from docs/knowledge_base.json if present, otherwise use minimal defaults
    const fs = require('fs');
    const path = require('path');
    const kbJsonPath = path.join(__dirname, '../../docs/knowledge_base.json');

    if (fs.existsSync(kbJsonPath)) {
      console.log('📄 Found knowledge_base.json — seeding from file...');
      // Use the update-kb.js logic inline
      const raw = fs.readFileSync(kbJsonPath, 'utf-8');
      const kb = JSON.parse(raw);
      const entries = [];

      // Business overview
      entries.push({ category: 'programs', title: 'About Journey to STEAM', content: `${kb.business_information.description} Founded in ${kb.business_information.founded} by ${kb.business_information.founder}. We serve students ages ${kb.target_audience.students.age_range} (grades ${kb.target_audience.students.grades}) in ${kb.business_information.service_areas.join(', ')}.` });
      entries.push({ category: 'programs', title: 'Mission & Vision', content: `Mission: ${kb.mission_vision_values.mission}\nVision: ${kb.mission_vision_values.vision}` });
      entries.push({ category: 'programs', title: 'Contact Information', content: `Email: ${kb.business_information.contact.email}. Phone: ${kb.business_information.contact.phone}. Website: ${kb.business_information.website}.` });

      // Program types
      for (const prog of kb.program_types) {
        entries.push({ category: 'programs', title: prog.type, content: `${prog.description}${prog.format ? `. Format: ${prog.format}` : ''}. Benefits: ${prog.benefits.join('; ')}.` });
      }
      // Pathways
      for (const pw of kb.program_pathways) {
        entries.push({ category: 'programs', title: pw.pathway_name, content: `${pw.description} Classes: ${pw.classes.join(', ')}.` });
      }
      // STEAM, features, outcomes, schools, parent champion, instructors
      entries.push({ category: 'programs', title: 'What is STEAM?', content: Object.entries(kb.steam_components).map(([l, i]) => `${l} = ${i.name}: ${i.description}`).join('. ') });
      entries.push({ category: 'programs', title: 'Key Features & Differentiators', content: kb.key_features.join('. ') + '. ' + kb.competitive_advantages.join('. ') });
      entries.push({ category: 'programs', title: 'Educational Outcomes', content: 'Our programs help students: ' + kb.educational_outcomes.join('; ') + '.' });
      entries.push({ category: 'programs', title: 'School Partnerships', content: `${kb.for_schools.turnkey_solution} Benefits: ${kb.for_schools.benefits.map(b => `${b.benefit} — ${b.description}`).join('. ')}. Highlights: ${kb.for_schools.program_highlights.join('. ')}.` });
      entries.push({ category: 'programs', title: 'Parent Champion Program', content: `${kb.parent_champion_program.description} Rewards: ${kb.parent_champion_program.rewards.join('. ')}.` });
      entries.push({ category: 'programs', title: 'Instructor Quality', content: kb.founder_story.hiring_standards });

      // Pricing
      entries.push({ category: 'pricing', title: 'Program Pricing', content: `${kb.pricing_policies.typical_program_cost}. ${kb.pricing_policies.pricing_policy}` });
      entries.push({ category: 'pricing', title: 'Scholarships', content: `${kb.pricing_policies.scholarships.description} ${kb.pricing_policies.scholarships.limitations} Contact: ${kb.pricing_policies.scholarships.contact}` });
      entries.push({ category: 'pricing', title: 'Gift Cards', content: kb.pricing_policies.gift_cards.description });

      // FAQs
      for (const faq of kb.faqs) {
        entries.push({ category: 'faqs', title: faq.question, content: faq.answer });
      }
      for (const obj of kb.common_objections_and_responses) {
        entries.push({ category: 'faqs', title: obj.objection, content: obj.response });
      }
      for (const pp of kb.parent_pain_points_addressed) {
        entries.push({ category: 'faqs', title: `Concern: ${pp.pain_point}`, content: `Our solution: ${pp.solution}` });
      }

      // Policies
      entries.push({ category: 'policies', title: 'No Prorating Policy', content: `${kb.pricing_policies.pricing_policy} ${kb.pricing_policies.payment_note}` });
      entries.push({ category: 'policies', title: 'Escalation Guidelines', content: 'Escalate when: ' + kb.escalation_triggers.join('; ') + '.' });
      entries.push({ category: 'policies', title: 'How to Direct Parents', content: kb.call_to_actions.join('. ') + '.' });

      for (const entry of entries) {
        await pool.query(
          `INSERT INTO knowledge_base (category, title, content) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [entry.category, entry.title, entry.content]
        );
      }
      console.log(`✅ Seeded ${entries.length} knowledge base entries from JSON\n`);
    } else {
      console.log('⚠️  No knowledge_base.json found — run update-kb.js after adding the file\n');
    }

    console.log('🎉 Database seeded successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Change the admin password after first login');
    console.log('   2. Update knowledge base entries with actual business info');
    console.log('   3. Replace placeholder addresses and phone numbers\n');

  } catch (err) {
    console.error('❌ Seed failed:', err.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

seed();
