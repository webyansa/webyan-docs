import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface GuestTicketRequest {
  guestName: string;
  guestEmail: string;
  subject: string;
  description: string;
  websiteUrl?: string;
  screenshotUrl?: string;
  category: string;
  priority: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { 
      guestName, 
      guestEmail, 
      subject, 
      description, 
      websiteUrl, 
      screenshotUrl,
      category, 
      priority 
    }: GuestTicketRequest = await req.json();

    // Validate required fields
    if (!guestName || !guestEmail || !subject || !description) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(guestEmail)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Creating guest ticket for ${guestEmail}`);

    // Insert ticket using service role (bypasses RLS)
    const { data: ticket, error } = await supabase
      .from("support_tickets")
      .insert({
        guest_name: guestName,
        guest_email: guestEmail,
        subject: subject,
        description: description,
        website_url: websiteUrl || null,
        screenshot_url: screenshotUrl || null,
        category: category,
        priority: priority,
        user_id: null, // Guest ticket
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating ticket:", error);
      throw error;
    }

    console.log(`Guest ticket created: ${ticket.ticket_number}`);

    return new Response(JSON.stringify(ticket), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in create-guest-ticket:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);