-- إضافة قيد فريد على quote_id في جدول المشاريع لمنع إنشاء مشاريع مكررة
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'crm_implementations_quote_id_unique') THEN
        ALTER TABLE crm_implementations ADD CONSTRAINT crm_implementations_quote_id_unique UNIQUE (quote_id);
    END IF;
END $$;

-- إضافة قيد فريد على quote_id في جدول توثيق العقود
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'contract_documentation_quote_id_unique') THEN
        ALTER TABLE contract_documentation ADD CONSTRAINT contract_documentation_quote_id_unique UNIQUE (quote_id);
    END IF;
END $$;

-- إضافة عمود project_id لربط عرض السعر بالمشروع المنشأ
ALTER TABLE crm_quotes
ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES crm_implementations(id) ON DELETE SET NULL;