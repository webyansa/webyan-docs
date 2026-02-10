
-- Add project_name and recurring_items to crm_quotes
ALTER TABLE crm_quotes ADD COLUMN IF NOT EXISTS project_name text;
ALTER TABLE crm_quotes ADD COLUMN IF NOT EXISTS recurring_items jsonb DEFAULT '[]';

-- Create client_recurring_charges table
CREATE TABLE IF NOT EXISTS client_recurring_charges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES client_organizations(id),
  quote_id uuid REFERENCES crm_quotes(id),
  project_id uuid REFERENCES crm_implementations(id),
  item_name text NOT NULL,
  annual_amount numeric NOT NULL DEFAULT 0,
  first_year_free boolean DEFAULT false,
  first_due_date date,
  status text DEFAULT 'active',
  reminder_sent_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE client_recurring_charges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage recurring charges"
  ON client_recurring_charges FOR ALL
  TO authenticated USING (true) WITH CHECK (true);
