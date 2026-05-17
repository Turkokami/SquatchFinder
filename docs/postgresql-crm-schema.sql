-- Squatch Finder CRM
-- PostgreSQL schema design for commercial pest-control lead management.
-- This schema is intentionally normalized around a core businesses table
-- with lookup tables for categories and pipeline statuses, plus activity
-- tables for contacts, scoring, outreach, follow-ups, and notes.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'rep'
    CHECK (role IN ('admin', 'manager', 'rep')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lead_categories (
  id BIGSERIAL PRIMARY KEY,
  category_code TEXT NOT NULL UNIQUE,
  category_name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE pipeline_statuses (
  id BIGSERIAL PRIMARY KEY,
  status_code TEXT NOT NULL UNIQUE,
  status_name TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pipeline_statuses_display_order_unique UNIQUE (display_order)
);

CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  category_id BIGINT NOT NULL REFERENCES lead_categories(id),
  status_id BIGINT NOT NULL REFERENCES pipeline_statuses(id),
  business_name TEXT NOT NULL,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT NOT NULL,
  state_code TEXT,
  postal_code TEXT,
  country_code TEXT NOT NULL DEFAULT 'US',
  phone TEXT,
  website TEXT,
  google_business_profile_link TEXT,
  decision_maker_name TEXT,
  decision_maker_email TEXT,
  pest_control_opportunity_notes TEXT,
  current_lead_score INTEGER NOT NULL DEFAULT 0
    CHECK (current_lead_score BETWEEN 0 AND 100),
  priority_level TEXT NOT NULL DEFAULT 'medium'
    CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
  last_contacted_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  role_title TEXT,
  business_association TEXT,
  email TEXT,
  phone TEXT,
  linkedin_url TEXT,
  facebook_url TEXT,
  source_url TEXT,
  confidence_score INTEGER
    CHECK (confidence_score IS NULL OR confidence_score BETWEEN 0 AND 100),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  is_decision_maker BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE lead_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  scored_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  score_value INTEGER NOT NULL CHECK (score_value BETWEEN 0 AND 100),
  priority_level TEXT NOT NULL
    CHECK (priority_level IN ('low', 'medium', 'high', 'critical')),
  score_reason TEXT,
  scoring_version TEXT NOT NULL DEFAULT 'v1',
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  scored_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE outreach_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  channel TEXT NOT NULL
    CHECK (channel IN ('call', 'email', 'text', 'visit', 'linkedin', 'facebook')),
  subject TEXT,
  message_summary TEXT NOT NULL,
  outcome TEXT,
  source_url TEXT,
  requires_manual_approval BOOLEAN NOT NULL DEFAULT TRUE,
  happened_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE follow_up_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  outreach_log_id UUID REFERENCES outreach_logs(id) ON DELETE SET NULL,
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  task_notes TEXT,
  task_type TEXT NOT NULL DEFAULT 'general'
    CHECK (task_type IN ('general', 'call', 'email', 'linkedin', 'facebook', 'site_visit')),
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'done', 'skipped')),
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  note_body TEXT NOT NULL,
  is_private BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_businesses_category_id ON businesses(category_id);
CREATE INDEX idx_businesses_status_id ON businesses(status_id);
CREATE INDEX idx_businesses_assigned_user_id ON businesses(assigned_user_id);
CREATE INDEX idx_businesses_city ON businesses(city);
CREATE INDEX idx_businesses_current_lead_score ON businesses(current_lead_score DESC);
CREATE INDEX idx_businesses_next_follow_up_at ON businesses(next_follow_up_at);

CREATE INDEX idx_contacts_business_id ON contacts(business_id);
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_is_decision_maker ON contacts(is_decision_maker);

CREATE INDEX idx_lead_scores_business_id ON lead_scores(business_id);
CREATE INDEX idx_lead_scores_is_current ON lead_scores(business_id, is_current);
CREATE UNIQUE INDEX uq_lead_scores_current_per_business
  ON lead_scores(business_id)
  WHERE is_current = TRUE;

CREATE INDEX idx_outreach_logs_business_id ON outreach_logs(business_id);
CREATE INDEX idx_outreach_logs_contact_id ON outreach_logs(contact_id);
CREATE INDEX idx_outreach_logs_happened_at ON outreach_logs(happened_at DESC);
CREATE INDEX idx_outreach_logs_channel ON outreach_logs(channel);

CREATE INDEX idx_follow_up_tasks_business_id ON follow_up_tasks(business_id);
CREATE INDEX idx_follow_up_tasks_assigned_user_id ON follow_up_tasks(assigned_user_id);
CREATE INDEX idx_follow_up_tasks_due_at ON follow_up_tasks(due_at);
CREATE INDEX idx_follow_up_tasks_status ON follow_up_tasks(status);

CREATE INDEX idx_notes_business_id ON notes(business_id);
CREATE INDEX idx_notes_contact_id ON notes(contact_id);
CREATE INDEX idx_notes_user_id ON notes(user_id);

INSERT INTO lead_categories (category_code, category_name, description) VALUES
  ('RESTAURANT', 'Restaurants', 'Standalone restaurants and restaurant groups'),
  ('APARTMENTS', 'Apartments', 'Apartment communities and complexes'),
  ('MULTIFAMILY', 'Multifamily housing', 'Multifamily residential properties'),
  ('HOA', 'HOAs', 'Homeowner associations'),
  ('RETIREMENT', 'Retirement communities', 'Senior and retirement communities'),
  ('FOOD_MANUFACTURER', 'Food manufacturers', 'Food production and packaging facilities'),
  ('COMMERCIAL_KITCHEN', 'Commercial kitchens', 'Shared, commissary, or institutional kitchens'),
  ('BREWERY', 'Breweries', 'Breweries and taproom operations'),
  ('GROCERY', 'Grocery stores', 'Grocers, markets, and food retailers'),
  ('PROPERTY_MANAGEMENT', 'Property management companies', 'Commercial or residential management firms');

INSERT INTO pipeline_statuses (status_code, status_name, display_order, is_closed) VALUES
  ('NEW', 'New', 1, FALSE),
  ('QUALIFIED', 'Qualified', 2, FALSE),
  ('CONTACTED', 'Contacted', 3, FALSE),
  ('SITE_SURVEY', 'Site Survey', 4, FALSE),
  ('PROPOSAL_SENT', 'Proposal Sent', 5, FALSE),
  ('NEGOTIATING', 'Negotiating', 6, FALSE),
  ('WON', 'Won', 7, TRUE),
  ('LOST', 'Lost', 8, TRUE);

COMMENT ON TABLE businesses IS 'Core business prospect records for commercial pest-control leads.';
COMMENT ON COLUMN businesses.google_business_profile_link IS 'Public Google Business Profile or Maps listing URL.';
COMMENT ON COLUMN businesses.current_lead_score IS 'Cached current score for fast filtering and board rendering.';
COMMENT ON TABLE lead_scores IS 'Historical and current lead scoring snapshots per business.';
COMMENT ON TABLE outreach_logs IS 'Manual outreach records only; no message should be auto-sent without explicit approval.';
