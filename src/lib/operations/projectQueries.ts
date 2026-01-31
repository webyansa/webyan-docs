import { supabase } from "@/integrations/supabase/client";

export const PROJECT_DETAILS_SELECT = `
  *,
  account:client_organizations(id, name, contact_email, contact_phone),
  quote:crm_quotes(id, quote_number, title, total_amount),
  opportunity:crm_opportunities(id, name),
  implementer:staff_members!crm_implementations_implementer_id_fkey(id, full_name, email),
  csm:staff_members!crm_implementations_csm_id_fkey(id, full_name, email),
  project_manager:staff_members!crm_implementations_project_manager_id_fkey(id, full_name, email)
`;

export function isUuid(value: string | null | undefined) {
  if (!value) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

type FetchOpts = {
  retries?: number;
  retryDelayMs?: number;
};

/**
 * Reliable project fetch:
 * - Uses maybeSingle() to avoid false negatives.
 * - Optionally retries null results to handle rare propagation/RLS timing edge-cases.
 */
export async function fetchProjectDetailsById(id: string, opts?: FetchOpts) {
  const retries = Math.max(0, opts?.retries ?? 0);
  const retryDelayMs = Math.max(0, opts?.retryDelayMs ?? 250);

  for (let attempt = 0; attempt <= retries; attempt++) {
    const { data, error } = await supabase
      .from("crm_implementations")
      .select(PROJECT_DETAILS_SELECT)
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    if (data) return data;

    if (attempt < retries) {
      await new Promise((r) => setTimeout(r, retryDelayMs));
    }
  }

  return null;
}
