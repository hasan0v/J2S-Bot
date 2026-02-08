/**
 * Knowledge Base Update Script
 * Replaces all KB entries with data from docs/knowledge_base.json
 * 
 * Usage: node src/update-kb.js
 */

require('dotenv').config();
const { pool } = require('./models/database');
const fs = require('fs');
const path = require('path');

async function updateKnowledgeBase() {
  const client = await pool.connect();

  try {
    console.log('📚 Updating knowledge base from knowledge_base.json...\n');

    // Load JSON
    const jsonPath = path.join(__dirname, '../../docs/knowledge_base.json');
    const raw = fs.readFileSync(jsonPath, 'utf-8');
    const kb = JSON.parse(raw);

    // Build KB entries from the JSON structure
    const entries = [];

    // ─── PROGRAMS ─────────────────────────────────────────────
    // Business Overview
    entries.push({
      category: 'programs',
      title: 'About Journey to STEAM',
      content: `${kb.business_information.description} Founded in ${kb.business_information.founded} by ${kb.business_information.founder}. ${kb.founder_story.background} We serve students ages ${kb.target_audience.students.age_range} (grades ${kb.target_audience.students.grades}) in ${kb.business_information.service_areas.join(', ')}.`,
    });

    // Mission & Values
    entries.push({
      category: 'programs',
      title: 'Mission & Vision',
      content: `Mission: ${kb.mission_vision_values.mission}\n\nVision: ${kb.mission_vision_values.vision}\n\nCore Values: ${kb.mission_vision_values.core_values.map(v => `${v.value} — ${v.description}`).join('. ')}`,
    });

    // Program Types
    for (const prog of kb.program_types) {
      entries.push({
        category: 'programs',
        title: prog.type,
        content: `${prog.description}${prog.format ? `. Format: ${prog.format}` : ''}${prog.location ? `. Location: ${prog.location}` : ''}. Benefits: ${prog.benefits.join('; ')}.`,
      });
    }

    // Program Pathways
    for (const pathway of kb.program_pathways) {
      entries.push({
        category: 'programs',
        title: pathway.pathway_name,
        content: `${pathway.description} Available classes: ${pathway.classes.join(', ')}.`,
      });
    }

    // STEAM Components
    entries.push({
      category: 'programs',
      title: 'What is STEAM?',
      content: Object.entries(kb.steam_components).map(([letter, info]) => `${letter} = ${info.name}: ${info.description}`).join('. ') + '.',
    });

    // Key Features
    entries.push({
      category: 'programs',
      title: 'Key Features & Differentiators',
      content: kb.key_features.join('. ') + '.\n\nCompetitive advantages: ' + kb.competitive_advantages.join('. ') + '.',
    });

    // Educational Outcomes
    entries.push({
      category: 'programs',
      title: 'Educational Outcomes',
      content: 'Our programs help students: ' + kb.educational_outcomes.join('; ') + '.',
    });

    // For Schools
    entries.push({
      category: 'programs',
      title: 'School Partnerships',
      content: `${kb.for_schools.turnkey_solution}\n\nBenefits for schools: ${kb.for_schools.benefits.map(b => `${b.benefit} — ${b.description}`).join('. ')}.\n\nProgram highlights: ${kb.for_schools.program_highlights.join('. ')}.`,
    });

    // Parent Champion Program
    entries.push({
      category: 'programs',
      title: 'Parent Champion Program',
      content: `${kb.parent_champion_program.description}\n\nHow it works: ${kb.parent_champion_program.how_it_works.join('. ')}.\n\nRewards: ${kb.parent_champion_program.rewards.join('. ')}.\n\n${kb.parent_champion_program.support_provided}`,
    });

    // Instructor Quality
    entries.push({
      category: 'programs',
      title: 'Instructor Quality & Hiring Standards',
      content: `${kb.founder_story.hiring_standards} ${kb.founder_story.philosophy}`,
    });

    // Contact Information
    entries.push({
      category: 'programs',
      title: 'Contact Information',
      content: `Email: ${kb.business_information.contact.email}. Phone: ${kb.business_information.contact.phone} or ${kb.business_information.contact.phone_alternate}. Website: ${kb.business_information.website}. Facebook: ${kb.business_information.social_media.facebook}. Instagram: ${kb.business_information.social_media.instagram}.`,
    });

    // ─── PRICING ──────────────────────────────────────────────
    entries.push({
      category: 'pricing',
      title: 'Program Pricing',
      content: `Typical cost: ${kb.pricing_policies.typical_program_cost}. ${kb.pricing_policies.pricing_policy} ${kb.pricing_policies.payment_note}`,
    });

    entries.push({
      category: 'pricing',
      title: 'Scholarships',
      content: `${kb.pricing_policies.scholarships.description} Eligibility: ${kb.pricing_policies.scholarships.eligibility}. ${kb.pricing_policies.scholarships.limitations} Contact: ${kb.pricing_policies.scholarships.contact}`,
    });

    entries.push({
      category: 'pricing',
      title: 'Gift Cards',
      content: kb.pricing_policies.gift_cards.description,
    });

    // Common pricing objections
    const pricingObjection = kb.common_objections_and_responses.find(o => o.objection.toLowerCase().includes('expensive'));
    if (pricingObjection) {
      entries.push({
        category: 'pricing',
        title: 'Pricing Value Explanation',
        content: `Common question: "${pricingObjection.objection}" — ${pricingObjection.response}`,
      });
    }

    // ─── FAQs ─────────────────────────────────────────────────
    for (const faq of kb.faqs) {
      entries.push({
        category: 'faqs',
        title: faq.question,
        content: faq.answer,
      });
    }

    // Common objections as FAQs
    for (const obj of kb.common_objections_and_responses) {
      // Skip pricing one (already added)
      if (obj.objection.toLowerCase().includes('expensive')) continue;
      entries.push({
        category: 'faqs',
        title: obj.objection,
        content: obj.response,
      });
    }

    // Parent pain points as FAQs
    for (const pp of kb.parent_pain_points_addressed) {
      entries.push({
        category: 'faqs',
        title: `Concern: ${pp.pain_point}`,
        content: `Our solution: ${pp.solution}`,
      });
    }

    // ─── POLICIES ─────────────────────────────────────────────
    entries.push({
      category: 'policies',
      title: 'No Prorating Policy',
      content: `${kb.pricing_policies.pricing_policy} ${kb.pricing_policies.payment_note}`,
    });

    // Refund policy FAQ
    const refundFaq = kb.faqs.find(f => f.question.toLowerCase().includes('refund'));
    if (refundFaq) {
      entries.push({
        category: 'policies',
        title: 'Refund Policy',
        content: refundFaq.answer,
      });
    }

    // Inclement weather
    const weatherFaq = kb.faqs.find(f => f.question.toLowerCase().includes('weather'));
    if (weatherFaq) {
      entries.push({
        category: 'policies',
        title: 'Inclement Weather Policy',
        content: weatherFaq.answer,
      });
    }

    // Safety
    entries.push({
      category: 'policies',
      title: 'Child Safety',
      content: kb.faqs.find(f => f.question.toLowerCase().includes('safety'))?.answer || 'All staff are background-checked and receive ongoing training. We maintain rigorous safety protocols.',
    });

    // Chatbot guardrails as internal policy
    entries.push({
      category: 'policies',
      title: 'Escalation Guidelines',
      content: 'Escalate to a team member when: ' + kb.escalation_triggers.join('; ') + '.',
    });

    // Calls to Action
    entries.push({
      category: 'policies',
      title: 'How to Direct Parents (Calls to Action)',
      content: kb.call_to_actions.join('. ') + '.',
    });

    // ─── INSERT INTO DATABASE ─────────────────────────────────
    await client.query('BEGIN');

    // Clear existing entries
    const deleteResult = await client.query('DELETE FROM knowledge_base');
    console.log(`🗑️  Removed ${deleteResult.rowCount} old entries`);

    // Insert new entries
    let inserted = 0;
    for (const entry of entries) {
      await client.query(
        `INSERT INTO knowledge_base (category, title, content, is_active) VALUES ($1, $2, $3, TRUE)`,
        [entry.category, entry.title, entry.content]
      );
      inserted++;
    }

    await client.query('COMMIT');

    // Summary
    const counts = {};
    for (const e of entries) {
      counts[e.category] = (counts[e.category] || 0) + 1;
    }

    console.log(`\n✅ Inserted ${inserted} knowledge base entries:`);
    for (const [cat, count] of Object.entries(counts)) {
      console.log(`   ${cat}: ${count} entries`);
    }

    console.log('\n🎉 Knowledge base updated successfully!');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Update failed:', err.message);
    console.error(err.stack);
  } finally {
    client.release();
    await pool.end();
    process.exit(0);
  }
}

updateKnowledgeBase();
