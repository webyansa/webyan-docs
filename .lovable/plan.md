
## Plan: Fix Phase Assignment and Implement Configurable Project Workflows

### Part 1: Fix Phase Assignment Modal (Bug Fix)

**Problem**: The modal shows "No team assigned" even when the project has team members because the query runs before the props are populated.

**Solution**:
1. **Update `PhaseAssignmentModal.tsx`**:
   - Add a proper check to only enable the query when we have at least one team ID
   - Add loading state handling for team member fetch
   - Show "Loading team members..." instead of "No team assigned" when fetching

2. **Update `ProjectDetailsPage.tsx`**:
   - Ensure the modal is only opened after project data is fully loaded
   - Pass the team IDs only when they are available

---

### Part 2: Implement Configurable Workflow Templates

**Database Schema Changes**:

1. **Create `workflow_templates` table**:
   - Stores workflow configurations by project type
   - Fields: `id`, `project_type`, `name`, `is_default`, `created_at`

2. **Create `workflow_phases` table**:
   - Stores phase definitions for each workflow
   - Fields: `id`, `workflow_id`, `phase_key`, `phase_name`, `phase_order`, `instructions`, `suggested_role` (implementer/csm/project_manager)

3. **Update `create_default_project_phases()` function**:
   - Looks up the workflow template based on `project_type`
   - Creates phases from the template instead of hardcoded values

**New Phase Configuration for "Webyan Subscription" Projects**:

| Order | Phase Key | Phase Name | Instructions | Suggested Role |
|-------|-----------|------------|--------------|----------------|
| 1 | requirements | استلام المتطلبات | جمع وتوثيق متطلبات العميل والباقة المختارة | csm |
| 2 | trial_setup | تجهيز البيئة التجريبية | تجهيز نطاق تجريبي ضمن ويبيان، نسخ الباقة، وتطبيق هوية العميل | implementer |
| 3 | initial_content | إدخال المحتوى الأولي | إدخال محتوى افتراضي أو حقيقي لكامل الموقع ليطلع العميل على الشكل النهائي | implementer |
| 4 | trial_inspection | فحص الموقع التجريبي | التأكد من عمل الموقع بالكامل في لوحة التحكم والموقع الخارجي | implementer |
| 5 | client_approval | إرسال للعميل للتعميد | إرسال رسالة بريد رسمية توضح جاهزية الموقع على النطاق التجريبي | csm |
| 6 | production_setup | تجهيز البيئة الرسمية | تجهيز استضافة ودومين رسمي للعميل وربط الاستضافة بالدومين | implementer |
| 7 | production_upload | رفع الموقع على الاستضافة | رفع الموقع على الاستضافة الرسمية وتكوين البيئة | implementer |
| 8 | final_review | المراجعة وإدخال المحتوى النهائي | فحص الموقع بشكل نهائي والتأكد من عدم وجود أخطاء وإدخال المحتوى النهائي | implementer |
| 9 | launch | الإطلاق | نشر النطاق وتفعيله بشكل رسمي | implementer |
| 10 | closure | التسليم والإغلاق | إرسال رسالة رسمية للعميل ببيانات الموقع، تسجيل بداية وانتهاء الاشتراك | csm |

---

### Part 3: Frontend Updates

**Update `projectConfig.ts`**:
- Add new phase types for the 10-phase workflow
- Include detailed descriptions and instructions for each phase
- Update `legacyPhaseMapping` for backward compatibility

**Update `StaffPhaseCard.tsx`**:
- Display phase instructions to guide the staff member
- Show the detailed description from the workflow template

**Update `PhaseProgressCard.tsx`**:
- Support dynamic phase configurations from database
- Show progress based on actual phase count (not hardcoded 8)

**Create Admin Settings Page** (Optional - Future Enhancement):
- Allow admins to manage workflow templates
- Edit phase names, instructions, and order
- Assign default workflows to project types

---

### Technical Details

**Migration SQL**:
```text
-- 1. Create workflow_templates table
CREATE TABLE public.workflow_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_type TEXT NOT NULL,
  name TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create workflow_phases table
CREATE TABLE public.workflow_phases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES workflow_templates(id) ON DELETE CASCADE,
  phase_key TEXT NOT NULL,
  phase_name TEXT NOT NULL,
  phase_order INTEGER NOT NULL,
  instructions TEXT,
  suggested_role TEXT CHECK (suggested_role IN ('implementer', 'csm', 'project_manager')),
  UNIQUE (workflow_id, phase_order)
);

-- 3. Insert default workflow for webyan_subscription
INSERT INTO workflow_templates (project_type, name, is_default) 
VALUES ('webyan_subscription', 'مسار اشتراك ويبيان', true);

-- 4. Insert phases for the workflow
INSERT INTO workflow_phases (workflow_id, phase_key, phase_name, phase_order, instructions, suggested_role)
SELECT id, ... FROM workflow_templates WHERE project_type = 'webyan_subscription';

-- 5. Update the trigger function to use templates
CREATE OR REPLACE FUNCTION public.create_default_project_phases()
RETURNS TRIGGER AS $$
DECLARE
  template_id UUID;
BEGIN
  -- Find the workflow template for this project type
  SELECT wt.id INTO template_id 
  FROM workflow_templates wt 
  WHERE wt.project_type = NEW.project_type AND wt.is_default = true;
  
  -- If no template found, use legacy phases
  IF template_id IS NULL THEN
    INSERT INTO project_phases (project_id, phase_type, phase_order)
    VALUES ...;
  ELSE
    -- Create phases from template
    INSERT INTO project_phases (project_id, phase_type, phase_order)
    SELECT NEW.id, wp.phase_key, wp.phase_order
    FROM workflow_phases wp
    WHERE wp.workflow_id = template_id
    ORDER BY wp.phase_order;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Files to Create/Modify**:
1. `supabase/migrations/XXX_workflow_templates.sql` - Database schema
2. `src/lib/operations/projectConfig.ts` - Update phase types and add new phases
3. `src/lib/operations/phaseUtils.ts` - Add helper for template-based phases
4. `src/components/operations/PhaseAssignmentModal.tsx` - Fix team loading bug
5. `src/components/operations/StaffPhaseCard.tsx` - Show phase instructions
6. `src/components/operations/PhaseProgressCard.tsx` - Dynamic phase support

---

### Implementation Order

1. **Immediate Fix**: Fix the `PhaseAssignmentModal` bug (5 minutes)
2. **Database Migration**: Create workflow tables and seed data (10 minutes)
3. **Update Config**: Add new phase types to frontend config (10 minutes)
4. **Update UI Components**: Display instructions and support dynamic phases (15 minutes)
5. **Test**: Verify workflow on existing and new projects (5 minutes)
