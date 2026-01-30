

# تصميم نظام CRM + Delivery + Customer Success لمنصة ويبيان
## بمعايير عالمية (Zoho/HubSpot/Odoo) مع قابلية التوسع

---

## ملخص تنفيذي

بعد تحليل البنية الحالية للنظام، وجدتُ أن المنصة تمتلك أساسًا جيدًا يمكن البناء عليه:
- **موجود:** `client_organizations` + `client_accounts` + `support_tickets` + `meeting_requests` + `conversations` + `client_invoices` + `client_payments` + `client_timeline`
- **غائب:** نموذج Leads/Opportunities/Quotes/Contracts + Delivery Pipeline + Hosting/Systems + Sales Pipeline Board + Credentials Vault

التصميم المقترح يُحوّل النظام الحالي إلى CRM احترافي متعدد الأبعاد مع الحفاظ على التوافق مع البنية القائمة.

---

## أولًا: نموذج البيانات القياسي (Core Data Model)

### 1.1 الكيانات الجديدة المطلوب إضافتها:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                             نموذج بيانات CRM لمنصة ويبيان                               │
└─────────────────────────────────────────────────────────────────────────────────────────┘

                                  ┌──────────────┐
                                  │    Lead      │
                                  │  عميل محتمل  │
                                  └──────┬───────┘
                                         │ يتحول إلى
                                         ▼
┌──────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                          │
│  ┌─────────────────┐                                     ┌─────────────────┐             │
│  │    Account      │◄────────────────────────────────────│   Contacts      │             │
│  │   الحساب/الجهة  │         1:N                         │  جهات الاتصال   │             │
│  └────────┬────────┘                                     └─────────────────┘             │
│           │                                                                              │
│           │ 1:N                                                                          │
│           ▼                                                                              │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐                   │
│  │  Opportunity    │──────│     Quote       │──────│    Contract     │                   │
│  │  فرصة البيع    │ 1:N  │   عرض السعر    │ 1:1  │     العقد       │                   │
│  └────────┬────────┘      └─────────────────┘      └────────┬────────┘                   │
│           │                                                  │                           │
│           │                                                  │                           │
│           └──────────────────────┬───────────────────────────┘                           │
│                                  │ عند الفوز/التوقيع                                     │
│                                  ▼                                                       │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐                   │
│  │ Implementation  │      │  Subscription   │      │     Hosting     │                   │
│  │   مشروع التنفيذ │      │    الاشتراك    │      │   الاستضافة    │                   │
│  └────────┬────────┘      └────────┬────────┘      └────────┬────────┘                   │
│           │                        │                        │                           │
│           └────────────────────────┼────────────────────────┘                           │
│                                    │                                                     │
│                                    ▼                                                     │
│  ┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐                   │
│  │    Invoices     │      │   Tickets/Chat  │      │    Meetings     │                   │
│  │    الفواتير    │      │   الدعم/الشات  │      │   الاجتماعات   │                   │
│  └─────────────────┘      └─────────────────┘      └─────────────────┘                   │
│                                                                                          │
│                           ┌─────────────────┐                                            │
│                           │    Timeline     │                                            │
│                           │   سجل النشاط   │                                            │
│                           └─────────────────┘                                            │
│                                                                                          │
└──────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 تفاصيل الجداول الجديدة:

#### A) جدول `crm_leads` - العملاء المحتملين

```sql
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
    -- 'website', 'referral', 'social_media', 'event', 'cold_outreach', 'manual'
  source_details text,
  utm_source text,
  utm_campaign text,
  
  -- Classification
  lead_type text DEFAULT 'subscription',
    -- 'subscription', 'custom_platform', 'services'
  estimated_value numeric(12,2),
  
  -- Pipeline Position
  stage text DEFAULT 'new',
    -- 'new', 'contacted', 'qualified', 'meeting_scheduled', 'meeting_done', 'proposal_sent', 'negotiation', 'won', 'lost'
  stage_changed_at timestamptz DEFAULT now(),
  stage_change_reason text,
  next_action text,
  next_action_date date,
  
  -- Assignment
  owner_id uuid REFERENCES staff_members(id),
  
  -- Status
  is_converted boolean DEFAULT false,
  converted_to_account_id uuid REFERENCES client_organizations(id),
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

CREATE INDEX idx_leads_owner ON crm_leads(owner_id);
CREATE INDEX idx_leads_stage ON crm_leads(stage) WHERE NOT is_converted;
CREATE INDEX idx_leads_source ON crm_leads(lead_source);
```

#### B) جدول `crm_opportunities` - فرص البيع

```sql
CREATE TABLE crm_opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Linked Account
  account_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  
  -- Opportunity Details
  name text NOT NULL,
  description text,
  opportunity_type text DEFAULT 'new_business',
    -- 'new_business', 'upsell', 'renewal', 'cross_sell'
  
  -- Value
  expected_value numeric(12,2) NOT NULL,
  currency text DEFAULT 'SAR',
  probability integer DEFAULT 50 CHECK (probability >= 0 AND probability <= 100),
  weighted_value numeric(12,2) GENERATED ALWAYS AS (expected_value * probability / 100) STORED,
  
  -- Timeline
  expected_close_date date,
  actual_close_date date,
  
  -- Pipeline
  stage text DEFAULT 'qualification',
    -- 'qualification', 'needs_analysis', 'proposal', 'negotiation', 'closed_won', 'closed_lost'
  stage_changed_at timestamptz DEFAULT now(),
  stage_change_reason text,
  next_step text,
  
  -- Assignment
  owner_id uuid REFERENCES staff_members(id),
  
  -- Status
  status text DEFAULT 'open',
    -- 'open', 'won', 'lost'
  lost_reason text,
  competitor text,
  
  -- Notes
  notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_opportunities_account ON crm_opportunities(account_id);
CREATE INDEX idx_opportunities_owner ON crm_opportunities(owner_id);
CREATE INDEX idx_opportunities_stage ON crm_opportunities(stage) WHERE status = 'open';
```

#### C) جدول `crm_quotes` - عروض الأسعار

```sql
CREATE TABLE crm_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  account_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  
  -- Quote Info
  quote_number text NOT NULL UNIQUE,
  version integer DEFAULT 1,
  title text NOT NULL,
  
  -- Financials
  subtotal numeric(12,2) NOT NULL,
  discount_type text DEFAULT 'none', -- 'none', 'percentage', 'fixed'
  discount_value numeric(12,2) DEFAULT 0,
  tax_rate numeric(5,2) DEFAULT 15,
  tax_amount numeric(12,2),
  total_amount numeric(12,2) NOT NULL,
  currency text DEFAULT 'SAR',
  
  -- Line Items (JSON array)
  items jsonb DEFAULT '[]',
  -- Structure: [{name, description, quantity, unit_price, total}]
  
  -- Terms
  validity_days integer DEFAULT 30,
  valid_until date,
  terms_and_conditions text,
  notes text,
  
  -- Status
  status text DEFAULT 'draft',
    -- 'draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired', 'revised'
  sent_at timestamptz,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  
  -- Assignment
  created_by uuid REFERENCES staff_members(id),
  approved_by uuid REFERENCES staff_members(id),
  
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
```

#### D) جدول `crm_contracts` - العقود

```sql
CREATE TABLE crm_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  opportunity_id uuid REFERENCES crm_opportunities(id) ON DELETE SET NULL,
  quote_id uuid REFERENCES crm_quotes(id) ON DELETE SET NULL,
  account_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  
  -- Contract Info
  contract_number text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  
  -- Contract Type
  contract_type text DEFAULT 'subscription',
    -- 'subscription', 'custom_platform', 'services', 'sla'
  
  -- Value
  contract_value numeric(12,2) NOT NULL,
  currency text DEFAULT 'SAR',
  billing_frequency text DEFAULT 'annually',
    -- 'monthly', 'quarterly', 'semi_annually', 'annually', 'one_time'
  
  -- Duration
  start_date date NOT NULL,
  end_date date NOT NULL,
  auto_renewal boolean DEFAULT true,
  renewal_notice_days integer DEFAULT 30,
  
  -- Status
  status text DEFAULT 'draft',
    -- 'draft', 'sent', 'signed', 'active', 'expired', 'terminated', 'renewed'
  sent_at timestamptz,
  signed_at timestamptz,
  signed_by text, -- Client signer name
  
  -- Documents
  contract_document_url text,
  signed_document_url text,
  
  -- Terms
  terms_and_conditions text,
  special_terms text,
  
  -- Assignment
  created_by uuid REFERENCES staff_members(id),
  
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
```

#### E) جدول `crm_implementations` - مشاريع التنفيذ

```sql
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
    -- 'standard', 'custom', 'migration'
  
  -- Delivery Pipeline Stage
  stage text DEFAULT 'pending',
    -- 'pending', 'kickoff', 'requirements', 'build', 'testing', 'review', 'go_live', 'handover', 'completed'
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
  -- Structure: [{name, planned_date, actual_date, status, notes}]
  
  -- Team Assignment
  project_manager_id uuid REFERENCES staff_members(id),
  implementer_id uuid REFERENCES staff_members(id),
  csm_id uuid REFERENCES staff_members(id), -- Customer Success Manager
  
  -- Client Side
  client_contact_id uuid REFERENCES client_accounts(id),
  
  -- Handover
  go_live_date date,
  handover_date date,
  handover_notes text,
  
  -- Status
  status text DEFAULT 'active',
    -- 'active', 'on_hold', 'completed', 'cancelled'
  
  -- Notes
  notes text,
  internal_notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_implementations_account ON crm_implementations(account_id);
CREATE INDEX idx_implementations_stage ON crm_implementations(stage) WHERE status = 'active';
CREATE INDEX idx_implementations_pm ON crm_implementations(project_manager_id);
CREATE INDEX idx_implementations_implementer ON crm_implementations(implementer_id);
```

#### F) جدول `crm_hosting` - الاستضافة والبيئات

```sql
CREATE TABLE crm_hosting (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  account_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES crm_subscriptions(id) ON DELETE SET NULL,
  
  -- Hosting Info
  name text NOT NULL,
  hosting_type text DEFAULT 'shared',
    -- 'shared', 'vps', 'dedicated', 'cloud'
  provider text, -- 'aws', 'digitalocean', 'hetzner', 'godaddy', etc.
  
  -- Resources
  resources jsonb DEFAULT '{}',
  -- Structure: {cpu, ram, storage, bandwidth}
  
  -- Status
  status text DEFAULT 'active',
    -- 'provisioning', 'active', 'suspended', 'maintenance', 'terminated'
  
  -- Dates
  provisioned_at date,
  expires_at date,
  
  -- Cost (internal tracking)
  monthly_cost numeric(10,2),
  
  -- Technical Details
  server_ip text,
  server_location text,
  
  -- Notes
  notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### G) جدول `crm_systems` - الأنظمة وبيانات الوصول (محسّن)

```sql
CREATE TABLE crm_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  account_id uuid NOT NULL REFERENCES client_organizations(id) ON DELETE CASCADE,
  hosting_id uuid REFERENCES crm_hosting(id) ON DELETE SET NULL,
  
  -- System Info
  system_type text NOT NULL,
    -- 'website', 'admin_panel', 'client_portal', 'api', 'database', 'email', 'other'
  name text NOT NULL,
  description text,
  
  -- URLs
  url text,
  admin_url text,
  
  -- Credentials (Encrypted/Hashed in production - here we store encrypted)
  -- In MVP: plain text but hidden in UI
  username text,
  password_encrypted text, -- Should be encrypted at rest
  
  -- Access Status
  access_status text DEFAULT 'active',
    -- 'active', 'suspended', 'expired', 'revoked'
  
  -- Access Audit Trail (JSON array)
  access_log jsonb DEFAULT '[]',
  -- Structure: [{action, performed_by, performed_at, ip_address}]
  -- Actions: 'viewed', 'copied', 'reset', 'created', 'updated'
  
  -- Notes
  notes text,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_systems_account ON crm_systems(account_id);
```

#### H) تحديث جدول `client_organizations` (Account)

إضافة حقول جديدة للـ Account:

```sql
ALTER TABLE client_organizations ADD COLUMN IF NOT EXISTS
  -- Sales Assignment
  sales_owner_id uuid REFERENCES staff_members(id),
  
  -- Customer Success Assignment
  csm_id uuid REFERENCES staff_members(id),
  
  -- Lead Conversion
  converted_from_lead_id uuid REFERENCES crm_leads(id),
  
  -- Customer Health
  health_score integer CHECK (health_score >= 0 AND health_score <= 100),
  health_status text DEFAULT 'healthy',
    -- 'healthy', 'neutral', 'at_risk', 'churning'
  
  -- Success Lifecycle (separate from sales lifecycle)
  success_stage text DEFAULT 'onboarding',
    -- 'onboarding', 'adoption', 'expansion', 'advocacy', 'at_risk', 'churned'
  
  -- Key Dates
  first_contract_date date,
  renewal_date date,
  
  -- Value Metrics
  total_contract_value numeric(12,2),
  monthly_recurring_revenue numeric(12,2);
```

### 1.3 تحديث الجداول الموجودة:

#### تعديل `client_invoices` لربطها بالعقود:

```sql
ALTER TABLE client_invoices ADD COLUMN IF NOT EXISTS
  contract_id uuid REFERENCES crm_contracts(id) ON DELETE SET NULL,
  subscription_id uuid REFERENCES crm_subscriptions(id) ON DELETE SET NULL;
```

#### تعديل `support_tickets` لربط بالمشروع:

```sql
ALTER TABLE support_tickets ADD COLUMN IF NOT EXISTS
  implementation_id uuid REFERENCES crm_implementations(id) ON DELETE SET NULL;
```

---

## ثانيًا: رحلة العميل (Customer Journey) بثلاثة أبعاد

### 2.1 نموذج Journey ثلاثي الأبعاد:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              رحلة العميل في ويبيان                                      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  A) SALES PIPELINE (قبل التعاقد)                                                        │
│  ═══════════════════════════════                                                        │
│                                                                                         │
│   ┌────────┐    ┌──────────┐    ┌─────────┐    ┌─────────┐    ┌──────────┐             │
│   │  New   │───▶│Contacted │───▶│Qualified│───▶│ Meeting │───▶│ Meeting  │             │
│   │  جديد  │    │تم التواصل│    │  مؤهل   │    │Scheduled│    │   Done   │             │
│   └────────┘    └──────────┘    └─────────┘    │تم الجدولة│    │تم الاجتماع│             │
│                                                └─────────┘    └────┬─────┘             │
│                                                                    │                    │
│                                  ┌───────────────────────────────────┘                    │
│                                  ▼                                                       │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌─────┐    ┌──────┐                   │
│   │ Proposal │───▶│Negotiation│───▶│Closing   │───▶│ Won │ OR │ Lost │                   │
│   │تم الإرسال│    │  تفاوض   │    │  إغلاق   │    │فوز  │    │خسارة │                   │
│   └──────────┘    └──────────┘    └──────────┘    └──┬──┘    └──────┘                   │
│                                                       │                                  │
├───────────────────────────────────────────────────────┼──────────────────────────────────┤
│                                                       ▼                                  │
│  B) DELIVERY PIPELINE (التنفيذ والتسليم)                                                │
│  ═══════════════════════════════════════                                                │
│                                                                                         │
│   ┌─────────┐    ┌─────────┐    ┌───────┐    ┌───────┐    ┌────────┐    ┌────────┐     │
│   │Contract │───▶│Contract │───▶│Kickoff│───▶│ Build │───▶│Testing │───▶│ Review │     │
│   │  Sent   │    │ Signed  │    │ بداية │    │ بناء  │    │ اختبار │    │مراجعة  │     │
│   │إرسال عقد│    │توقيع عقد│    └───────┘    └───────┘    └────────┘    └───┬────┘     │
│   └─────────┘    └─────────┘                                                │           │
│                                                                             │           │
│                                  ┌──────────────────────────────────────────┘           │
│                                  ▼                                                       │
│   ┌─────────┐    ┌──────────┐                                                           │
│   │ Go-Live │───▶│ Handover │                                                           │
│   │  إطلاق  │    │  تسليم   │                                                           │
│   └────┬────┘    └────┬─────┘                                                           │
│        │              │                                                                  │
├────────┼──────────────┼──────────────────────────────────────────────────────────────────┤
│        └──────────────┘                                                                  │
│                │                                                                         │
│                ▼                                                                         │
│  C) CUSTOMER SUCCESS LIFECYCLE (بعد التشغيل)                                            │
│  ═══════════════════════════════════════════                                            │
│                                                                                         │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐                          │
│   │Onboarding│───▶│ Adoption │───▶│Expansion │───▶│ Advocacy │                          │
│   │ تهيئة    │    │  تبني    │    │  توسع    │    │  تأييد   │                          │
│   └──────────┘    └──────────┘    └──────────┘    └──────────┘                          │
│        │                                                  ▲                              │
│        │                                                  │                              │
│        ▼                                                  │                              │
│   ┌──────────┐    ┌──────────┐    ┌──────────┐            │                              │
│   │ At Risk  │───▶│  Paused  │───▶│ Renewal  │────────────┘                              │
│   │  مهدد    │    │  موقوف   │    │  تجديد   │                                           │
│   └────┬─────┘    └──────────┘    └──────────┘                                           │
│        │                                                                                 │
│        ▼                                                                                 │
│   ┌──────────┐                                                                           │
│   │ Churned  │                                                                           │
│   │  منتهي   │                                                                           │
│   └──────────┘                                                                           │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 جدول Stage Transitions للتتبع:

```sql
CREATE TABLE crm_stage_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Entity Reference
  entity_type text NOT NULL, -- 'lead', 'opportunity', 'implementation', 'account'
  entity_id uuid NOT NULL,
  
  -- Pipeline
  pipeline_type text NOT NULL, -- 'sales', 'delivery', 'success'
  
  -- Transition Details
  from_stage text NOT NULL,
  to_stage text NOT NULL,
  
  -- Reason and Notes
  reason text,
  notes text,
  
  -- Who & When
  performed_by uuid REFERENCES staff_members(id),
  performed_by_name text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_stage_transitions_entity ON crm_stage_transitions(entity_type, entity_id);
```

---

## ثالثًا: واجهات المستخدم (UX Screens)

### 3.1 لوحة Pipeline Board (Sales Kanban)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  Pipeline المبيعات                                                     [+ فرصة جديدة]  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  فلترة: [نوع العميل ▼] [المسؤول ▼] [المصدر ▼] [التاريخ ▼]     🔍 بحث...               │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐       │
│  │ 📋 تأهيل   │ │ 📝 تحليل   │ │ 📄 عرض سعر │ │ 🤝 تفاوض   │ │ ✅ فوز      │       │
│  │  3 فرص    │ │  2 فرص     │ │  4 فرص     │ │  2 فرص     │ │  8 فرص     │       │
│  │ 45,000 ر.س │ │ 30,000 ر.س │ │ 120,000 ر.س│ │ 80,000 ر.س │ │ 250,000 ر.س│       │
│  ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤ ├─────────────┤       │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │             │       │
│  │ │جمعية ABC│ │ │ │مؤسسة XYZ│ │ │ │شركة DEF │ │ │ │جمعية GHI│ │ │             │       │
│  │ │─────────│ │ │ │─────────│ │ │ │─────────│ │ │ │─────────│ │ │             │       │
│  │ │💰 15,000│ │ │ │💰 20,000│ │ │ │💰 50,000│ │ │ │💰 40,000│ │ │             │       │
│  │ │👤 أحمد  │ │ │ │👤 سارة  │ │ │ │👤 محمد  │ │ │ │👤 أحمد  │ │ │             │       │
│  │ │📅 منذ 3د│ │ │ │📅 منذ 1د│ │ │ │📅 منذ 5د│ │ │ │📅 منذ 2د│ │ │             │       │
│  │ │⏭ متابعة│ │ │ │⏭ عرض   │ │ │ │⏭ مكالمة│ │ │ │⏭ إغلاق │ │ │             │       │
│  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │             │       │
│  │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │ ┌─────────┐ │ │             │       │
│  │ │ ... ... │ │ │ │ ... ... │ │ │ │ ... ... │ │ │ │ ... ... │ │ │             │       │
│  │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │ └─────────┘ │ │             │       │
│  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘       │
│                                                                                         │
│  [◀ خسارة: 3 فرص (25,000 ر.س)]                                                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 نافذة تغيير المرحلة (Stage Change Modal)

```text
┌─────────────────────────────────────────────────────────────────┐
│  ⚠️ تغيير المرحلة                                       [✕]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  الفرصة: شركة ABC للتقنية                                       │
│  من: 📝 تحليل الاحتياجات  ──▶  إلى: 📄 عرض سعر                  │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ سبب التغيير *                                               ││
│  │ [___________________________________________]               ││
│  │  مثال: العميل وافق على المتطلبات وطلب عرض سعر               ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ الخطوة التالية *                                            ││
│  │ [___________________________________________]               ││
│  │  مثال: إرسال عرض السعر خلال 48 ساعة                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  📅 تاريخ الخطوة التالية: [___/___/____]                        │
│                                                                 │
│                          [إلغاء]  [تأكيد التغيير]               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3 لوحة Delivery Board (تنفيذ)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  Delivery Pipeline - مشاريع التنفيذ                                [+ مشروع جديد]      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│  فلترة: [المنفذ ▼] [نوع المشروع ▼] [التأخر ▼]                    🔍 بحث...              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ ⏳ انتظار │  │ 🚀 بداية │  │ ⚙️ بناء  │  │ 🔍 مراجعة│  │ 🎯 إطلاق │  │ ✅ تسليم │   │
│  │  2       │  │  3       │  │  4       │  │  2       │  │  1       │  │  5       │   │
│  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤  ├──────────┤   │
│  │┌────────┐│  │┌────────┐│  │┌────────┐│  │┌────────┐│  │┌────────┐│  │          │   │
│  ││جمعية A ││  ││مؤسسة B ││  ││شركة C  ││  ││جمعية D ││  ││شركة E  ││  │          │   │
│  ││────────││  ││────────││  ││────────││  ││────────││  ││────────││  │          │   │
│  ││📊 0%   ││  ││📊 15%  ││  ││📊 60%  ││  ││📊 85%  ││  ││📊 95%  ││  │          │   │
│  ││👷 أحمد ││  ││👷 خالد ││  ││👷 سارة ││  ││👷 محمد ││  ││👷 أحمد ││  │          │   │
│  ││📅 15/02││  ││📅 20/02││  ││📅 10/02││  ││📅 05/02││  ││📅 01/02││  │          │   │
│  ││🔴 متأخر││  ││🟢 في وقته│  ││🟡 قريب ││  ││🟢 في وقته│  ││🟢 في وقته│  │          │   │
│  │└────────┘│  │└────────┘│  │└────────┘│  │└────────┘│  │└────────┘│  │          │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.4 ملف العميل 360° (Customer Profile)

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  ◀ العملاء     جمعية التنمية الاجتماعية                    [تعديل] [إجراءات سريعة ▼]  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────┐  نوع: 📦 اشتراك ويبيان                                                     │
│  │  LOGO   │  المرحلة: [🟢 نشط ▼]                    الصحة: 🟢 ممتاز (85/100)           │
│  └─────────┘  المسؤول: أحمد محمد (مبيعات) | سارة أحمد (نجاح العميل)                    │
│               آخر تفاعل: منذ 3 أيام                   تجديد: 45 يوم متبقي               │
│                                                                                         │
│  ┌─ إجراءات سريعة ──────────────────────────────────────────────────────────────────┐   │
│  │  [📝 فتح تذكرة]  [📅 جدولة اجتماع]  [📄 إنشاء فاتورة]  [💬 محادثة]              │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  [ملخص] [جهات الاتصال] [المبيعات] [الاشتراك] [الاستضافة] [الفواتير] [التنفيذ] [الدعم] [النشاط]│
│  ═══════                                                                                │
│                                                                                         │
│  ┌─────────────────────────────────────────┐  ┌─────────────────────────────────────┐   │
│  │ 📊 ملخص سريع                            │  │ ⚠️ تنبيهات                          │   │
│  ├─────────────────────────────────────────┤  ├─────────────────────────────────────┤   │
│  │ القيمة الإجمالية: 45,000 ر.س/سنة       │  │ • اشتراك ينتهي خلال 45 يوم         │   │
│  │ عدد الفواتير: 4 (3 مدفوعة)             │  │ • فاتورة متأخرة: 5,000 ر.س          │   │
│  │ التذاكر المفتوحة: 2                    │  │ • تذكرة بانتظار الرد منذ 3 أيام     │   │
│  │ الاجتماعات هذا الشهر: 1                │  │                                     │   │
│  └─────────────────────────────────────────┘  └─────────────────────────────────────┘   │
│                                                                                         │
│  ┌───────────────────────────────────────────────────────────────────────────────────┐   │
│  │ 📈 آخر الأنشطة                                                                    │   │
│  ├───────────────────────────────────────────────────────────────────────────────────┤   │
│  │ • 🔵 منذ ساعتين - تم إغلاق تذكرة #TKT-2024-0045 بواسطة سارة                       │   │
│  │ • 🟢 منذ يوم - تم سداد فاتورة INV-2024-0012 بمبلغ 15,000 ر.س                      │   │
│  │ • 🟡 منذ 3 أيام - اجتماع متابعة مع العميل (30 دقيقة)                              │   │
│  │ • 🔵 منذ أسبوع - تم فتح تذكرة جديدة: مشكلة في تسجيل الدخول                        │   │
│  │                                                         [عرض السجل الكامل ←]       │   │
│  └───────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.5 تبويب الاستضافة والوصول (Hosting & Access)

```text
┌───────────────────────────────────────────────────────────────────────────────────────┐
│  [ملخص] [جهات الاتصال] [المبيعات] [الاشتراك] [الاستضافة] [الفواتير] [التنفيذ] [الدعم] │
│                                                 ═════════                              │
├───────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                       │
│  ┌─ الاستضافة ───────────────────────────────────────────────────────────────────┐   │
│  │                                                                   [+ إضافة]    │   │
│  │  ┌────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │ 🖥️ استضافة VPS رئيسية                                    🟢 نشط        │    │   │
│  │  │ ─────────────────────────────────────────────────────────────────────  │    │   │
│  │  │ المزود: DigitalOcean  |  الموارد: 4 vCPU, 8GB RAM, 160GB SSD          │    │   │
│  │  │ الموقع: Frankfurt     |  IP: 178.xxx.xxx.xxx                           │    │   │
│  │  │ انتهاء: 15/06/2024    |  التكلفة: 200 ر.س/شهر                          │    │   │
│  │  └────────────────────────────────────────────────────────────────────────┘    │   │
│  └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
│  ┌─ الأنظمة وبيانات الوصول ──────────────────────────────────────────────────────┐   │
│  │                                                                   [+ إضافة]    │   │
│  │                                                                                 │   │
│  │  ┌────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │ 🌐 الموقع الرئيسي                                         🟢 نشط        │    │   │
│  │  │ ─────────────────────────────────────────────────────────────────────  │    │   │
│  │  │ الرابط: https://charity-abc.webyan.sa           [🔗 فتح]               │    │   │
│  │  └────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                 │   │
│  │  ┌────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │ 🔐 لوحة التحكم (Admin Panel)                              🟢 نشط        │    │   │
│  │  │ ─────────────────────────────────────────────────────────────────────  │    │   │
│  │  │ الرابط: https://admin.charity-abc.webyan.sa     [🔗 فتح]               │    │   │
│  │  │                                                                        │    │   │
│  │  │ بيانات الدخول:                                                         │    │   │
│  │  │ ┌──────────────────────────────────────────────────────────────────┐  │    │   │
│  │  │ │ المستخدم: admin@charity-abc.org                                  │  │    │   │
│  │  │ │ كلمة المرور: ••••••••••••    [👁️ إظهار] [📋 نسخ] [🔄 إعادة تعيين]│  │    │   │
│  │  │ └──────────────────────────────────────────────────────────────────┘  │    │   │
│  │  │                                                                        │    │   │
│  │  │ 📋 سجل الوصول: آخر عرض بواسطة "أحمد" في 15/01/2024 10:30 ص           │    │   │
│  │  └────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                 │   │
│  │  ┌────────────────────────────────────────────────────────────────────────┐    │   │
│  │  │ 👥 بوابة العملاء                                          🟢 نشط        │    │   │
│  │  │ ─────────────────────────────────────────────────────────────────────  │    │   │
│  │  │ الرابط: https://portal.charity-abc.webyan.sa    [🔗 فتح]               │    │   │
│  │  └────────────────────────────────────────────────────────────────────────┘    │   │
│  │                                                                                 │   │
│  └────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                       │
└───────────────────────────────────────────────────────────────────────────────────────┘
```

---

## رابعًا: سير العمل التلقائي (Automated Workflows)

### 4.1 قواعد الأتمتة:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                              سير العمل التلقائي                                         │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  SALES PIPELINE                                                                         │
│  ══════════════                                                                         │
│                                                                                         │
│  ┌─ WHEN: Lead → Qualified ──────────────────────────────────────────────────────────┐ │
│  │  THEN:                                                                             │ │
│  │    ✓ إنشاء مهمة "جدولة اجتماع أولي" للمالك                                        │ │
│  │    ✓ إرسال إشعار للمالك                                                           │ │
│  │    ✓ تسجيل في Timeline                                                            │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  ┌─ WHEN: Opportunity → Proposal Sent ───────────────────────────────────────────────┐ │
│  │  THEN:                                                                             │ │
│  │    ✓ تسجيل تاريخ إرسال العرض                                                      │ │
│  │    ✓ إنشاء تذكير متابعة بعد 3 أيام                                                │ │
│  │    ✓ إنشاء تذكير ثاني بعد 7 أيام                                                  │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  ┌─ WHEN: Quote → Accepted ──────────────────────────────────────────────────────────┐ │
│  │  THEN:                                                                             │ │
│  │    ✓ إنشاء عقد جديد تلقائياً من بيانات العرض                                      │ │
│  │    ✓ إشعار المدير للمراجعة                                                        │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  ┌─ WHEN: Opportunity → Won ─────────────────────────────────────────────────────────┐ │
│  │  THEN:                                                                             │ │
│  │    ✓ تحديث حالة العقد إلى "موقّع"                                                 │ │
│  │    ✓ إنشاء مشروع تنفيذ جديد                                                       │ │
│  │    ✓ تعيين موظف التنفيذ (أو طلب التعيين من المدير)                                │ │
│  │    ✓ إنشاء اجتماع Kickoff                                                         │ │
│  │    ✓ تحديث مرحلة الحساب إلى "onboarding"                                          │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  DELIVERY PIPELINE                                                                      │
│  ════════════════                                                                       │
│                                                                                         │
│  ┌─ WHEN: Implementation → Go-Live ──────────────────────────────────────────────────┐ │
│  │  THEN:                                                                             │ │
│  │    ✓ إنشاء اشتراك SaaS جديد                                                       │ │
│  │    ✓ تفعيل الوصول لبوابة العملاء                                                  │ │
│  │    ✓ تعيين مدير نجاح العميل (CSM)                                                 │ │
│  │    ✓ إرسال بريد ترحيبي للعميل                                                     │ │
│  │    ✓ تسجيل في Timeline                                                            │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  ┌─ WHEN: Implementation → Handover ─────────────────────────────────────────────────┐ │
│  │  THEN:                                                                             │ │
│  │    ✓ تحديث مرحلة الحساب إلى "active"                                              │ │
│  │    ✓ إغلاق مشروع التنفيذ                                                          │ │
│  │    ✓ إنشاء أول فاتورة (إذا لم توجد)                                               │ │
│  │    ✓ إشعار CSM ببدء المتابعة                                                       │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  CUSTOMER SUCCESS                                                                       │
│  ════════════════                                                                       │
│                                                                                         │
│  ┌─ WHEN: Subscription expires in 30 days ───────────────────────────────────────────┐ │
│  │  THEN:                                                                             │ │
│  │    ✓ إشعار CSM والمدير                                                            │ │
│  │    ✓ تحديث الحساب إلى "renewing"                                                  │ │
│  │    ✓ إنشاء مهمة "متابعة التجديد"                                                  │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  ┌─ WHEN: Invoice overdue > 14 days ─────────────────────────────────────────────────┐ │
│  │  THEN:                                                                             │ │
│  │    ✓ إشعار المدير                                                                 │ │
│  │    ✓ تحديث صحة العميل إلى "at_risk"                                               │ │
│  │    ✓ إرسال تذكير للعميل (إذا مفعّل)                                               │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
│  ┌─ WHEN: No activity for 30 days ───────────────────────────────────────────────────┐ │
│  │  THEN:                                                                             │ │
│  │    ✓ إشعار CSM                                                                    │ │
│  │    ✓ إنشاء مهمة "تسجيل اطمئنان مع العميل"                                         │ │
│  └────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## خامسًا: الأدوار والصلاحيات (RBAC)

### 5.1 مصفوفة الصلاحيات الجديدة:

```text
┌───────────────────────────────────────────────────────────────────────────────────────────┐
│                              مصفوفة صلاحيات CRM                                          │
├───────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                           │
│  الصلاحية                        │ Manager │ Sales │ Implementer │ CSM │ Support │ Client│
│  ══════════════════════════════════════════════════════════════════════════════════════  │
│                                                                                           │
│  --- LEADS & OPPORTUNITIES ---                                                            │
│  عرض جميع الـ Leads             │   ✅    │  ✅   │     ❌      │ ❌  │   ❌    │   ❌   │
│  إنشاء/تعديل Leads              │   ✅    │  ✅   │     ❌      │ ❌  │   ❌    │   ❌   │
│  تحويل Lead إلى Account         │   ✅    │  ✅   │     ❌      │ ❌  │   ❌    │   ❌   │
│  إدارة الـ Opportunities        │   ✅    │  ✅   │     ❌      │ ❌  │   ❌    │   ❌   │
│  عرض Pipeline Board             │   ✅    │  ✅   │     ❌      │ ❌  │   ❌    │   ❌   │
│                                                                                           │
│  --- QUOTES & CONTRACTS ---                                                               │
│  إنشاء عروض أسعار              │   ✅    │  ✅   │     ❌      │ ❌  │   ❌    │   ❌   │
│  اعتماد عروض الأسعار           │   ✅    │  ❌   │     ❌      │ ❌  │   ❌    │   ❌   │
│  إنشاء/تعديل العقود            │   ✅    │  🔸   │     ❌      │ ❌  │   ❌    │   ❌   │
│  عرض العقود                    │   ✅    │  ✅   │     ✅      │ ✅  │   ❌    │   ❌   │
│                                                                                           │
│  --- DELIVERY ---                                                                         │
│  عرض Delivery Board             │   ✅    │  ❌   │     ✅      │ ❌  │   ❌    │   ❌   │
│  إدارة مشاريع التنفيذ          │   ✅    │  ❌   │     ✅      │ ❌  │   ❌    │   ❌   │
│  تغيير مرحلة التنفيذ           │   ✅    │  ❌   │     ✅      │ ❌  │   ❌    │   ❌   │
│                                                                                           │
│  --- CUSTOMER SUCCESS ---                                                                 │
│  عرض صحة العملاء               │   ✅    │  ❌   │     ❌      │ ✅  │   ❌    │   ❌   │
│  تغيير مرحلة النجاح            │   ✅    │  ❌   │     ❌      │ ✅  │   ❌    │   ❌   │
│  إدارة التجديدات               │   ✅    │  ❌   │     ❌      │ ✅  │   ❌    │   ❌   │
│                                                                                           │
│  --- HOSTING & ACCESS ---                                                                 │
│  عرض بيانات الاستضافة          │   ✅    │  ❌   │     ✅      │ ❌  │   ❌    │   ❌   │
│  عرض بيانات الوصول (Vault)     │   ✅    │  ❌   │     🔸      │ ❌  │   ❌    │   ❌   │
│  نسخ كلمات المرور              │   ✅    │  ❌   │     ❌      │ ❌  │   ❌    │   ❌   │
│  إعادة تعيين كلمات المرور      │   ✅    │  ❌   │     ❌      │ ❌  │   ❌    │   ❌   │
│                                                                                           │
│  --- BILLING ---                                                                          │
│  إنشاء/تعديل الفواتير          │   ✅    │  ❌   │     ❌      │ ❌  │   ❌    │   ❌   │
│  عرض الفواتير                  │   ✅    │  🔸   │     ❌      │ ✅  │   ❌    │   ✅   │
│  تسجيل المدفوعات               │   ✅    │  ❌   │     ❌      │ ❌  │   ❌    │   ❌   │
│                                                                                           │
│  --- SUPPORT ---                                                                          │
│  عرض تذاكر العميل              │   ✅    │  ❌   │     ❌      │ ✅  │   🔸    │   ✅   │
│  الرد على التذاكر              │   ✅    │  ❌   │     ❌      │ ❌  │   ✅    │   ✅   │
│                                                                                           │
│  --- ACCOUNT MANAGEMENT ---                                                               │
│  عرض ملف العميل 360            │   ✅    │  ✅   │     🔸      │ ✅  │   🔸    │   ❌   │
│  تعديل بيانات العميل           │   ✅    │  🔸   │     ❌      │ 🔸  │   ❌    │   ❌   │
│  حذف العميل                    │   ✅    │  ❌   │     ❌      │ ❌  │   ❌    │   ❌   │
│                                                                                           │
│  ─────────────────────────────────────────────────────────────────────────────────────   │
│  ✅ = كامل   🔸 = محدود/قراءة فقط   ❌ = ممنوع                                           │
│                                                                                           │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 تحديث ملف الصلاحيات:

```typescript
// إضافات على RolePermissions في src/lib/permissions.ts
interface CRMPermissions {
  // Leads & Opportunities
  canManageLeads: boolean;
  canManageOpportunities: boolean;
  canViewPipelineBoard: boolean;
  
  // Quotes & Contracts
  canCreateQuotes: boolean;
  canApproveQuotes: boolean;
  canManageContracts: boolean;
  canViewContracts: boolean;
  
  // Delivery
  canViewDeliveryBoard: boolean;
  canManageImplementations: boolean;
  
  // Customer Success
  canManageCustomerHealth: boolean;
  canManageRenewals: boolean;
  
  // Hosting & Access
  canViewHosting: boolean;
  canViewCredentials: boolean;
  canCopyPasswords: boolean;
  canResetPasswords: boolean;
  
  // Billing
  canManageInvoices: boolean;
  canViewInvoices: boolean;
  canRecordPayments: boolean;
  
  // Account Management
  canViewCustomer360: boolean;
  canEditCustomerData: boolean;
  canDeleteCustomers: boolean;
}
```

---

## سادسًا: التقارير (Minimal Reporting)

### 6.1 لوحة تحكم CRM Dashboard:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  📊 لوحة تحكم CRM                                          [تحديث] [تصدير]             │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐       │
│  │ 💼 الفرص المفتوحة│ │ 💰 قيمة Pipeline│ │ 📈 معدل التحويل │ │ 🎯 الفرص المغلقة│       │
│  │      12        │ │  350,000 ر.س   │ │      35%       │ │    8 (هذا الشهر)│       │
│  │  ▲ +3 من الأسبوع│ │  ▲ +15%        │ │  ▼ -5%         │ │  ▲ +2           │       │
│  └─────────────────┘ └─────────────────┘ └─────────────────┘ └─────────────────┘       │
│                                                                                         │
│  ┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐ │
│  │ 📊 توزيع الفرص حسب المرحلة             │ │ 🏢 توزيع العملاء حسب الحالة            │ │
│  ├────────────────────────────────────────┤ ├────────────────────────────────────────┤ │
│  │                                        │ │                                        │ │
│  │  تأهيل    ████████░░░░░░░░░░░ 25%      │ │  نشط      ████████████████░░ 80%      │ │
│  │  تحليل    ██████░░░░░░░░░░░░░ 17%      │ │  مهدد     ███░░░░░░░░░░░░░░░ 10%      │ │
│  │  عرض سعر  ████████████░░░░░░░ 33%      │ │  موقوف    ██░░░░░░░░░░░░░░░░  5%      │ │
│  │  تفاوض    ██████████░░░░░░░░░ 25%      │ │  تجديد    ██░░░░░░░░░░░░░░░░  5%      │ │
│  │                                        │ │                                        │ │
│  └────────────────────────────────────────┘ └────────────────────────────────────────┘ │
│                                                                                         │
│  ┌────────────────────────────────────────┐ ┌────────────────────────────────────────┐ │
│  │ ⚠️ تنبيهات مهمة                         │ │ 📅 اشتراكات قرب التجديد (30 يوم)       │ │
│  ├────────────────────────────────────────┤ ├────────────────────────────────────────┤ │
│  │ • 3 فواتير متأخرة (25,000 ر.س)         │ │ • جمعية ABC - 15/02/2024 - 15,000 ر.س │ │
│  │ • 2 تذكرة مفتوحة > 7 أيام              │ │ • مؤسسة XYZ - 20/02/2024 - 20,000 ر.س │ │
│  │ • 1 عميل بدون تفاعل > 30 يوم           │ │ • شركة DEF - 28/02/2024 - 10,000 ر.س  │ │
│  │ • 2 مشروع تنفيذ متأخر                  │ │                                        │ │
│  └────────────────────────────────────────┘ └────────────────────────────────────────┘ │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## سابعًا: خطة التنفيذ المرحلية

### MVP (المرحلة الأولى) - 4-6 أسابيع:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  المرحلة الأولى (MVP) - الأساسيات                                                       │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  1. قاعدة البيانات:                                                                     │
│     ✓ جدول crm_leads                                                                   │
│     ✓ جدول crm_opportunities                                                           │
│     ✓ جدول crm_quotes                                                                  │
│     ✓ جدول crm_contracts (status tracking only)                                        │
│     ✓ جدول crm_implementations                                                         │
│     ✓ جدول crm_systems (بيانات الوصول)                                                 │
│     ✓ تحديث client_organizations (إضافة الحقول الجديدة)                                │
│                                                                                         │
│  2. واجهات المستخدم:                                                                    │
│     ✓ Sales Pipeline Board (Kanban)                                                    │
│     ✓ Delivery Pipeline Board                                                          │
│     ✓ ملف العميل 360 المحسّن (Tabs جديدة)                                              │
│     ✓ نافذة تغيير المرحلة مع السبب                                                     │
│     ✓ تبويب الأنظمة وبيانات الوصول (مع إخفاء كلمات المرور)                            │
│                                                                                         │
│  3. الصلاحيات:                                                                          │
│     ✓ تحديث مصفوفة الصلاحيات                                                           │
│     ✓ إضافة دور Sales                                                                  │
│     ✓ إضافة دور Implementer                                                            │
│                                                                                         │
│  4. سجل النشاط:                                                                         │
│     ✓ تسجيل تغييرات المراحل                                                            │
│     ✓ Triggers للتسجيل التلقائي                                                         │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### المرحلة الثانية - 4-6 أسابيع:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  المرحلة الثانية - الفوترة والأتمتة                                                     │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  1. نظام Quotes كامل:                                                                   │
│     ✓ نموذج إنشاء عرض سعر                                                              │
│     ✓ إصدارات العروض                                                                   │
│     ✓ حالات الاعتماد                                                                   │
│                                                                                         │
│  2. نظام Contracts كامل:                                                                │
│     ✓ نموذج إنشاء عقد                                                                  │
│     ✓ ربط مع الفواتير                                                                  │
│                                                                                         │
│  3. جدول crm_hosting:                                                                   │
│     ✓ بيانات الاستضافة والموارد                                                        │
│                                                                                         │
│  4. Workflows تلقائية:                                                                   │
│     ✓ Edge Functions للأتمتة                                                           │
│     ✓ تنبيهات الاشتراكات والفواتير                                                     │
│                                                                                         │
│  5. CRM Dashboard:                                                                      │
│     ✓ إحصائيات Pipeline                                                                │
│     ✓ تنبيهات مهمة                                                                     │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### المرحلة الثالثة - 4-6 أسابيع:

```text
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  المرحلة الثالثة - التحليلات المتقدمة                                                   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  1. Customer Health Score:                                                              │
│     ✓ حساب تلقائي للصحة                                                                │
│     ✓ مؤشرات الخطر                                                                     │
│                                                                                         │
│  2. تحليلات متقدمة:                                                                     │
│     ✓ CLV (قيمة العميل)                                                                │
│     ✓ Retention Rate                                                                    │
│     ✓ Churn Analysis                                                                    │
│                                                                                         │
│  3. تقارير متقدمة:                                                                      │
│     ✓ تقارير المبيعات                                                                  │
│     ✓ تقارير التنفيذ                                                                   │
│     ✓ تصدير البيانات                                                                   │
│                                                                                         │
│  4. أتمتة متقدمة:                                                                       │
│     ✓ Email sequences                                                                   │
│     ✓ Task automation                                                                   │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## ثامنًا: هيكل الملفات المقترح

```text
src/
├── pages/admin/
│   └── crm/
│       ├── CustomerProfilePage.tsx      (موجود - يحتاج تحديث)
│       ├── SalesPipelinePage.tsx         (جديد)
│       ├── DeliveryPipelinePage.tsx      (جديد)
│       ├── LeadsPage.tsx                 (جديد)
│       ├── OpportunitiesPage.tsx         (جديد)
│       ├── QuotesPage.tsx                (جديد)
│       ├── ContractsPage.tsx             (جديد)
│       └── CRMDashboardPage.tsx          (جديد)
│
├── components/crm/
│   ├── tabs/
│   │   ├── BasicInfoTab.tsx             (موجود)
│   │   ├── SubscriptionTab.tsx          (موجود)
│   │   ├── InvoicesTab.tsx              (موجود)
│   │   ├── TicketsTab.tsx               (موجود)
│   │   ├── MeetingsTab.tsx              (موجود)
│   │   ├── TimelineTab.tsx              (موجود)
│   │   ├── SalesTab.tsx                 (جديد - Opportunities/Quotes/Contracts)
│   │   ├── HostingTab.tsx               (جديد - Hosting & Systems)
│   │   ├── DeliveryTab.tsx              (جديد - Implementation details)
│   │   └── OverviewTab.tsx              (جديد - Summary dashboard)
│   │
│   ├── pipeline/
│   │   ├── PipelineBoard.tsx            (جديد - Kanban component)
│   │   ├── PipelineCard.tsx             (جديد - Deal/Opportunity card)
│   │   ├── StageChangeModal.tsx         (جديد - Stage transition modal)
│   │   └── DeliveryCard.tsx             (جديد - Implementation card)
│   │
│   ├── forms/
│   │   ├── LeadForm.tsx                 (جديد)
│   │   ├── OpportunityForm.tsx          (جديد)
│   │   ├── QuoteForm.tsx                (جديد)
│   │   ├── ContractForm.tsx             (جديد)
│   │   ├── ImplementationForm.tsx       (جديد)
│   │   ├── HostingForm.tsx              (جديد)
│   │   └── SystemCredentialsForm.tsx    (جديد)
│   │
│   ├── CustomerHeader.tsx               (موجود - يحتاج تحديث)
│   ├── LifecycleBadge.tsx               (موجود)
│   ├── CustomerTypeBadge.tsx            (موجود)
│   ├── HealthScoreBadge.tsx             (جديد)
│   ├── PipelineStageBadge.tsx           (جديد)
│   └── CredentialsVault.tsx             (جديد - Secure credentials display)
│
├── lib/
│   ├── permissions.ts                   (موجود - يحتاج تحديث)
│   └── crm/
│       ├── pipelineConfig.ts            (جديد - Stage definitions)
│       ├── workflowActions.ts           (جديد - Automation triggers)
│       └── healthCalculator.ts          (جديد - Health score logic)
│
└── hooks/
    └── crm/
        ├── useLeads.ts                  (جديد)
        ├── useOpportunities.ts          (جديد)
        ├── usePipeline.ts               (جديد)
        └── useCustomerHealth.ts         (جديد)
```

---

## ملخص التوصيات

1. **البناء على الموجود:** النظام الحالي يحتوي على أساس جيد (Organizations, Accounts, Tickets, Meetings, Invoices, Timeline) - لا حاجة لإعادة البناء.

2. **إضافة طبقة Sales:** جداول Leads/Opportunities/Quotes/Contracts ضرورية لتتبع رحلة المبيعات.

3. **إضافة طبقة Delivery:** جدول Implementations لإدارة التنفيذ والتسليم.

4. **خزنة الوصول:** جدول Systems مع إخفاء كلمات المرور وسجل تدقيق.

5. **أتمتة تدريجية:** البدء بـ Triggers بسيطة ثم Edge Functions للأتمتة المتقدمة.

6. **الصلاحيات أولاً:** تحديث مصفوفة الصلاحيات قبل بناء الواجهات.

