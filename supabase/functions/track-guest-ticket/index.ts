import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface TrackTicketRequest {
  ticketNumber: string;
  email: string;
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

    const { ticketNumber, email }: TrackTicketRequest = await req.json();

    // Validate inputs
    if (!ticketNumber || !email) {
      return new Response(
        JSON.stringify({ error: "رقم التذكرة والبريد الإلكتروني مطلوبان" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log(`Tracking ticket ${ticketNumber} for ${email}`);

    // Find ticket by ticket number and guest email
    const { data: ticket, error: ticketError } = await supabase
      .from("support_tickets")
      .select("*")
      .eq("ticket_number", ticketNumber.toUpperCase())
      .eq("guest_email", email.toLowerCase())
      .single();

    if (ticketError || !ticket) {
      console.log("Ticket not found:", ticketError);
      return new Response(
        JSON.stringify({ error: "لم يتم العثور على التذكرة. تأكد من صحة البيانات." }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get replies for this ticket
    const { data: replies, error: repliesError } = await supabase
      .from("ticket_replies")
      .select("id, message, is_staff_reply, created_at")
      .eq("ticket_id", ticket.id)
      .order("created_at", { ascending: true });

    if (repliesError) {
      console.error("Error fetching replies:", repliesError);
    }

    console.log(`Found ticket ${ticketNumber} with ${replies?.length || 0} replies`);

    return new Response(
      JSON.stringify({ 
        ticket: {
          id: ticket.id,
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          created_at: ticket.created_at,
          updated_at: ticket.updated_at,
          resolved_at: ticket.resolved_at,
        },
        replies: replies || [] 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in track-guest-ticket:", error);
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