-- =====================================================
-- CRM Phase 1: Core Tables for Sales, Delivery & Systems
-- =====================================================

-- 1. CRM Leads Table (العملاء المحتملين)
CREATE TABLE crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Lead Info
  company_name text NOT NULL,
  contact_name text NOT NULL,
  contact_email text NOT NULL,
  contact_phone text,
  website_url text,
  
  -- Source Tracking
  lead_source text NOT NULL DEFAULT 'manual',
  source_details text,
  utm_source text,
  utm_campaign text,
  
  -- Classification
  lead_type text DEFAULT 'subscription',
  estimated_value numeric(12,2),
  
  -- Pipeline Position
  stage text DEFAULT 'new',
  stage_changed_at timestamptz DEFAULT now(),
  stage_change_reason text,
  next_action text,
  next_action_date date,
  
  -- Assignment
  owner_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  
  -- Status
  is_converted boolean DEFAULT false,
  converted_to_account_id uuid REFERENCES client_organizations(id) ON DELETE SET NULL,
  converted_at timestamptz,
  lost_reason text,
  
  -- Notes
  notes text,
  tags text[],
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_activity_at timestamptz
);

CREATE INDEX idx_crm_leads_owner ON crm_leads(owner_id);
CREATE INDEX idx_crm_leads_stage ON crm_leads(stage) WHERE NOT is_converted;
CREATE INDEX idx_crm_leads_source ON crm_leads(lead_source);

-- 2. CRM Opportunities Table (فرص البيع)
CREATE TABLE crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Linked Account
  account_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  
  -- Opportunity Details
  name text NOT NULL,
  description text,
  opportunity_type text DEFAULT 'new_business',
  
  -- Value
  expected_value numeric(12,2) NOT NULL,
  currency text DEFAULT 'SAR',
  probability integer DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  
  -- Timeline
  expected_close_date date,
  actual_close_date date,
  
  -- Pipeline
  stage text DEFAULT 'qualification',
  stage_changed_at timestamptz DEFAULT now(),
  stage_change_reason text,
  next_step text,
  
  -- Assignment
  owner_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  
  -- Status
  status text DEFAULT 'open',
  lost_reason text,
  competitor text,
  
  -- Notes
  notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_crm_opportunities_account ON crm_opportunities(account_id);
CREATE INDEX idx_crm_opportunities_owner ON crm_opportunities(owner_id);
CREATE INDEX idx_crm_opportunities_stage ON crm_opportunities(stage) WHERE status = 'open';

-- 3. CRM Quotes Table (عروض الأسعار)
CREATE TABLE crm_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  account_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  
  -- Quote Info
  quote_number text NOT NULL DEFAULT '',
  version integer DEFAULT 1,
  title text NOT NULL,
  
  -- Financials
  subtotal numeric(12,2) NOT NULL,
  discount_type text DEFAULT 'none',
  discount_value numeric(12,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 15,
  tax_amount numeric(12,2),
  total_amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'SAR',
  
  -- Line Items (JSON array)
  items jsonb DEFAULT '[]',
  
  -- Terms
  validity_days integer DEFAULT 30,
  valid_until date,
  terms_and_conditions text,
  notes text,
  
  -- Status
  status text DEFAULT 'draft',
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  
  -- Assignment
  created_by uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  approved_by uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-generate quote number
CREATE OR REPLACE FUNCTION generate_quote_number()
RETURNS trigger AS $$
DECLARE
  year_str text;
  seq_num integer;
BEGIN
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    year_str := to_char(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(MAX(
      NULLIF(regexp_replace(quote_number, '^QT-' || year_str || '-', ''), '')::integer
    ), 0) + 1
    INTO seq_num
    FROM crm_quotes
    WHERE quote_number LIKE 'QT-' || year_str || '-%';
    
    NEW.quote_number := 'QT-' || year_str || '-' || LPAD(seq_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_quote_number
BEFORE INSERT ON crm_quotes
FOR EACH ROW EXECUTE FUNCTION generate_quote_number();

-- 4. CRM Contracts Table (العقود)
CREATE TABLE crm_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES crm_quotes(id) ON DELETE SET NULL,
  account_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  
  -- Contract Info
  contract_number text NOT NULL DEFAULT '',
  title text NOT NULL,
  description text,
  
  -- Contract Type
  contract_type text DEFAULT 'subscription',
  
  -- Value
  contract_value numeric(12,2) NOT NULL,
  currency text DEFAULT 'SAR',
  billing_frequency text DEFAULT 'annually',
  
  -- Duration
  start_date date NOT NULL,
  end_date date NOT NULL,
  auto_renewal boolean DEFAULT true,
  renewal_notice_days integer DEFAULT 30,
  
  -- Status
  status text DEFAULT 'draft',
  sent_at timestamptz,
  signed_at timestamptz,
  signed_by text,
  
  -- Documents
  contract_document_url text,
  signed_document_url text,
  
  -- Terms
  terms_and_conditions text,
  special_terms text,
  
  -- Assignment
  created_by uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Auto-generate contract number
CREATE OR REPLACE FUNCTION generate_contract_number()
RETURNS trigger AS $$
DECLARE
  year_str text;
  seq_num integer;
BEGIN
  IF NEW.contract_number IS NULL OR NEW.contract_number = '' THEN
    year_str := to_char(CURRENT_DATE, 'YYYY');
    SELECT COALESCE(MAX(
      NULLIF(regexp_replace(contract_number, '^CT-' || year_str || '-', ''), '')::integer
    ), 0) + 1
    INTO seq_num
    FROM crm_contracts
    WHERE contract_number LIKE 'CT-' || year_str || '-%';
    
    NEW.contract_number := 'CT-' || year_str || '-' || LPAD(seq_num::text, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER set_contract_number
BEFORE INSERT ON crm_contracts
FOR EACH ROW EXECUTE FUNCTION generate_contract_number();

-- 5. CRM Implementations Table (مشاريع التنفيذ)
CREATE TABLE crm_implementations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  account_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  contract_id uuid REFERENCES crm_contracts(id) ON DELETE SET NULL,
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  
  -- Project Info
  project_name text NOT NULL,
  description text,
  project_type text DEFAULT 'standard',
  
  -- Delivery Pipeline Stage
  stage text DEFAULT 'pending',
  stage_changed_at timestamptz DEFAULT now(),
  stage_change_reason text,
  
  -- Progress
  progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  
  -- Timeline
  planned_start_date date,
  actual_start_date date,
  planned_end_date date,
  actual_end_date date,
  
  -- Key Milestones (JSON)
  milestones jsonb DEFAULT '[]',
  
  -- Team Assignment
  project_manager_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  implementer_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  csm_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  
  -- Client Side
  client_contact_id uuid REFERENCES client_accounts(id) ON DELETE SET NULL,
  
  -- Handover
  go_live_date date,
  handover_date date,
  handover_notes text,
  
  -- Status
  status text DEFAULT 'active',
  
  -- Notes
  notes text,
  internal_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_crm_implementations_account ON crm_implementations(account_id);
CREATE INDEX idx_crm_implementations_stage ON crm_implementations(stage) WHERE status = 'active';
CREATE INDEX idx_crm_implementations_implementer ON crm_implementations(implementer_id);

-- 6. CRM Systems Table (الأنظمة وبيانات الوصول)
CREATE TABLE crm_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  account_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  
  -- System Info
  system_type text NOT NULL,
  name text NOT NULL,
  description text,
  
  -- URLs
  url text,
  admin_url text,
  
  -- Credentials (hidden in UI)
  username text,
  password_encrypted text,
  
  -- Access Status
  access_status text DEFAULT 'active',
  
  -- Access Audit Trail (JSON array)
  access_log jsonb DEFAULT '[]',
  
  -- Notes
  notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_crm_systems_account ON crm_systems(account_id);

-- 7. CRM Stage Transitions Table (سجل انتقالات المراحل)
CREATE TABLE crm_stage_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity Reference
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  
  -- Pipeline
  pipeline_type text NOT NULL,
  
  -- Transition Details
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  
  -- Reason and Notes
  reason text,
  notes text,
  
  -- Who & When
  performed_by uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  performed_by_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_crm_stage_transitions_entity ON crm_stage_transitions(entity_type, entity_id);

-- 8. Update client_organizations with new CRM fields
ALTER TABLE client_organizations 
  ADD COLUMN IF NOT EXISTS sales_owner_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS csm_id uuid REFERENCES staff_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS converted_from_lead_id uuid,
  ADD COLUMN IF NOT EXISTS health_score integer CHECK (health_score >= 0 AND health_score <= 100),
  ADD COLUMN IF NOT EXISTS health_status text DEFAULT 'healthy',
  ADD COLUMN IF NOT EXISTS success_stage text DEFAULT 'onboarding',
  ADD COLUMN IF NOT EXISTS first_contract_date date,
  ADD COLUMN IF NOT EXISTS renewal_date date,
  ADD COLUMN IF NOT EXISTS total_contract_value numeric(12,2),
  ADD COLUMN IF NOT EXISTS monthly_recurring_revenue numeric(12,2);

-- 9. Update client_invoices to link with contracts
ALTER TABLE client_invoices 
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES crm_contracts(id) ON DELETE SET NULL;

-- 10. Update support_tickets to link with implementations
ALTER TABLE support_tickets 
  ADD COLUMN IF NOT EXISTS implementation_id uuid REFERENCES crm_implementations(id) ON DELETE SET NULL;

-- =====================================================
-- RLS Policies
-- =====================================================

-- Enable RLS on all new tables
ALTER TABLE crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_implementations ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_systems ENABLE ROW LEVEL SECURITY;
ALTER TABLE crm_stage_transitions ENABLE ROW LEVEL SECURITY;

-- Leads policies
CREATE POLICY "Admins can manage all leads"
ON crm_leads FOR ALL
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view assigned leads"
ON crm_leads FOR SELECT
USING (owner_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid()));

-- Opportunities policies
CREATE POLICY "Admins can manage all opportunities"
ON crm_opportunities FOR ALL
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view assigned opportunities"
ON crm_opportunities FOR SELECT
USING (owner_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid()));

-- Quotes policies
CREATE POLICY "Admins can manage all quotes"
ON crm_quotes FOR ALL
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view related quotes"
ON crm_quotes FOR SELECT
USING (created_by IN (SELECT id FROM staff_members WHERE user_id = auth.uid()));

-- Contracts policies
CREATE POLICY "Admins can manage all contracts"
ON crm_contracts FOR ALL
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view contracts"
ON crm_contracts FOR SELECT
USING (is_staff(auth.uid()));

-- Implementations policies
CREATE POLICY "Admins can manage all implementations"
ON crm_implementations FOR ALL
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can view assigned implementations"
ON crm_implementations FOR SELECT
USING (
  implementer_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
  OR project_manager_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
  OR csm_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid())
);

CREATE POLICY "Implementers can update assigned implementations"
ON crm_implementations FOR UPDATE
USING (implementer_id IN (SELECT id FROM staff_members WHERE user_id = auth.uid()));

-- Systems policies (Admin only for credentials)
CREATE POLICY "Admins can manage all systems"
ON crm_systems FOR ALL
USING (is_admin(auth.uid()));

CREATE POLICY "Staff can view systems without credentials"
ON crm_systems FOR SELECT
USING (is_staff(auth.uid()));

-- Stage transitions policies
CREATE POLICY "Admins can view all transitions"
ON crm_stage_transitions FOR SELECT
USING (is_admin_or_editor(auth.uid()));

CREATE POLICY "Staff can insert transitions"
ON crm_stage_transitions FOR INSERT
WITH CHECK (is_admin_or_editor(auth.uid()) OR is_staff(auth.uid()));

-- Clients can view their organization's implementations
CREATE POLICY "Clients can view their implementations"
ON crm_implementations FOR SELECT
USING (account_id = get_client_organization(auth.uid()));

-- Clients can view their contracts
CREATE POLICY "Clients can view their contracts"
ON crm_contracts FOR SELECT
USING (account_id = get_client_organization(auth.uid()));

-- =====================================================
-- Triggers for Timeline Integration
-- =====================================================

-- Log lead stage changes to timeline (when converted to account)
CREATE OR REPLACE FUNCTION log_lead_conversion_to_timeline()
RETURNS trigger AS $$
BEGIN
  IF NEW.is_converted = true AND OLD.is_converted = false AND NEW.converted_to_account_id IS NOT NULL THEN
    INSERT INTO client_timeline (
      organization_id, event_type, title, description, 
      reference_type, reference_id, performed_by
    )
    VALUES (
      NEW.converted_to_account_id,
      'lead_converted',
      'تحويل عميل محتمل',
      'تم تحويل العميل المحتمل "' || NEW.company_name || '" إلى حساب عميل',
      'lead',
      NEW.id,
      (SELECT id FROM staff_members WHERE user_id = auth.uid() LIMIT 1)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER lead_conversion_timeline_trigger
AFTER UPDATE ON crm_leads
FOR EACH ROW EXECUTE FUNCTION log_lead_conversion_to_timeline();

-- Log opportunity won to timeline
CREATE OR REPLACE FUNCTION log_opportunity_won_to_timeline()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'won' AND (OLD.status IS NULL OR OLD.status != 'won') THEN
    INSERT INTO client_timeline (
      organization_id, event_type, title, description,
      reference_type, reference_id, performed_by,
      metadata
    )
    VALUES (
      NEW.account_id,
      'deal_won',
      'فوز بصفقة جديدة',
      'تم الفوز بصفقة "' || NEW.name || '" بقيمة ' || NEW.expected_value || ' ' || NEW.currency,
      'opportunity',
      NEW.id,
      (SELECT id FROM staff_members WHERE user_id = auth.uid() LIMIT 1),
      jsonb_build_object('value', NEW.expected_value, 'currency', NEW.currency)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER opportunity_won_timeline_trigger
AFTER UPDATE ON crm_opportunities
FOR EACH ROW EXECUTE FUNCTION log_opportunity_won_to_timeline();

-- Log contract signed to timeline
CREATE OR REPLACE FUNCTION log_contract_signed_to_timeline()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'signed' AND (OLD.status IS NULL OR OLD.status != 'signed') THEN
    INSERT INTO client_timeline (
      organization_id, event_type, title, description,
      reference_type, reference_id, performed_by,
      metadata
    )
    VALUES (
      NEW.account_id,
      'contract_signed',
      'توقيع عقد',
      'تم توقيع العقد رقم ' || NEW.contract_number || ' بقيمة ' || NEW.contract_value || ' ' || NEW.currency,
      'contract',
      NEW.id,
      (SELECT id FROM staff_members WHERE user_id = auth.uid() LIMIT 1),
      jsonb_build_object('value', NEW.contract_value, 'contract_number', NEW.contract_number)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER contract_signed_timeline_trigger
AFTER UPDATE ON crm_contracts
FOR EACH ROW EXECUTE FUNCTION log_contract_signed_to_timeline();

-- Log implementation stage changes to timeline
CREATE OR REPLACE FUNCTION log_implementation_stage_to_timeline()
RETURNS trigger AS $$
BEGIN
  IF NEW.stage != OLD.stage THEN
    INSERT INTO client_timeline (
      organization_id, event_type, title, description,
      reference_type, reference_id, performed_by,
      metadata
    )
    VALUES (
      NEW.account_id,
      'implementation_stage_changed',
      'تغيير مرحلة التنفيذ',
      'تم نقل مشروع "' || NEW.project_name || '" من "' || OLD.stage || '" إلى "' || NEW.stage || '"',
      'implementation',
      NEW.id,
      (SELECT id FROM staff_members WHERE user_id = auth.uid() LIMIT 1),
      jsonb_build_object('from_stage', OLD.stage, 'to_stage', NEW.stage, 'progress', NEW.progress_percentage)
    );
    
    -- Also log to stage_transitions
    INSERT INTO crm_stage_transitions (
      entity_type, entity_id, pipeline_type,
      from_stage, to_stage, reason,
      performed_by, performed_by_name
    )
    VALUES (
      'implementation',
      NEW.id,
      'delivery',
      OLD.stage,
      NEW.stage,
      NEW.stage_change_reason,
      (SELECT id FROM staff_members WHERE user_id = auth.uid() LIMIT 1),
      (SELECT full_name FROM staff_members WHERE user_id = auth.uid() LIMIT 1)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER implementation_stage_timeline_trigger
AFTER UPDATE ON crm_implementations
FOR EACH ROW EXECUTE FUNCTION log_implementation_stage_to_timeline();