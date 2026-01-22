import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DeleteClientRequest {
  client_account_id?: string;
  organization_id?: string;
  delete_organization?: boolean;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify admin user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "غير مصرح" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (roleData?.role !== "admin") {
      return new Response(
        JSON.stringify({ error: "يجب أن تكون مديراً لتنفيذ هذه العملية" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { client_account_id, organization_id, delete_organization }: DeleteClientRequest = await req.json();

    console.log("Delete request:", { client_account_id, organization_id, delete_organization });

    // If deleting a specific client account
    if (client_account_id) {
      // Get client account details
      const { data: clientAccount } = await supabase
        .from("client_accounts")
        .select("id, user_id, organization_id")
        .eq("id", client_account_id)
        .single();

      if (!clientAccount) {
        return new Response(
          JSON.stringify({ error: "العميل غير موجود" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const userId = clientAccount.user_id;
      const orgId = clientAccount.organization_id;

      // Delete related data for this client
      if (userId) {
        // Delete conversations and messages for this client
        const { data: conversations } = await supabase
          .from("conversations")
          .select("id")
          .eq("client_account_id", client_account_id);

        if (conversations && conversations.length > 0) {
          const conversationIds = conversations.map(c => c.id);
          
          // Delete conversation messages
          await supabase
            .from("conversation_messages")
            .delete()
            .in("conversation_id", conversationIds);

          // Delete conversation events
          await supabase
            .from("conversation_events")
            .delete()
            .in("conversation_id", conversationIds);

          // Delete typing indicators
          await supabase
            .from("typing_indicators")
            .delete()
            .in("conversation_id", conversationIds);

          // Delete conversations
          await supabase
            .from("conversations")
            .delete()
            .eq("client_account_id", client_account_id);
        }

        // Delete user notifications
        await supabase
          .from("user_notifications")
          .delete()
          .eq("user_id", userId);

        // Delete user activity log
        await supabase
          .from("user_activity_log")
          .delete()
          .eq("user_id", userId);

        // Delete user roles
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", userId);

        // Delete profile
        await supabase
          .from("profiles")
          .delete()
          .eq("id", userId);

        // Delete auth user
        await supabase.auth.admin.deleteUser(userId);
      }

      // Delete client account
      await supabase
        .from("client_accounts")
        .delete()
        .eq("id", client_account_id);

      console.log("Client account deleted successfully:", client_account_id);

      return new Response(
        JSON.stringify({ success: true, message: "تم حذف حساب العميل بنجاح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If deleting entire organization
    if (organization_id && delete_organization) {
      // Get all client accounts in this organization
      const { data: clientAccounts } = await supabase
        .from("client_accounts")
        .select("id, user_id")
        .eq("organization_id", organization_id);

      // Delete all related support tickets
      const { data: tickets } = await supabase
        .from("support_tickets")
        .select("id")
        .eq("organization_id", organization_id);

      if (tickets && tickets.length > 0) {
        const ticketIds = tickets.map(t => t.id);
        
        // Delete ticket replies
        await supabase
          .from("ticket_replies")
          .delete()
          .in("ticket_id", ticketIds);

        // Delete ticket activity log
        await supabase
          .from("ticket_activity_log")
          .delete()
          .in("ticket_id", ticketIds);

        // Delete tickets
        await supabase
          .from("support_tickets")
          .delete()
          .eq("organization_id", organization_id);
      }

      // Delete all conversations for this organization
      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .eq("organization_id", organization_id);

      if (conversations && conversations.length > 0) {
        const conversationIds = conversations.map(c => c.id);
        
        await supabase
          .from("conversation_messages")
          .delete()
          .in("conversation_id", conversationIds);

        await supabase
          .from("conversation_events")
          .delete()
          .in("conversation_id", conversationIds);

        await supabase
          .from("typing_indicators")
          .delete()
          .in("conversation_id", conversationIds);

        await supabase
          .from("conversations")
          .delete()
          .eq("organization_id", organization_id);
      }

      // Delete meeting requests and related data
      const { data: meetings } = await supabase
        .from("meeting_requests")
        .select("id")
        .eq("organization_id", organization_id);

      if (meetings && meetings.length > 0) {
        const meetingIds = meetings.map(m => m.id);

        await supabase
          .from("meeting_activity_log")
          .delete()
          .in("meeting_id", meetingIds);

        await supabase
          .from("meeting_ratings")
          .delete()
          .in("meeting_id", meetingIds);

        await supabase
          .from("meeting_requests")
          .delete()
          .eq("organization_id", organization_id);
      }

      // Delete subscription requests
      await supabase
        .from("subscription_requests")
        .delete()
        .eq("organization_id", organization_id);

      // Delete embed tokens
      await supabase
        .from("embed_tokens")
        .delete()
        .eq("organization_id", organization_id);

      // Delete each client account and their auth users
      if (clientAccounts && clientAccounts.length > 0) {
        for (const account of clientAccounts) {
          if (account.user_id) {
            // Delete user notifications
            await supabase
              .from("user_notifications")
              .delete()
              .eq("user_id", account.user_id);

            // Delete user activity log
            await supabase
              .from("user_activity_log")
              .delete()
              .eq("user_id", account.user_id);

            // Delete user roles
            await supabase
              .from("user_roles")
              .delete()
              .eq("user_id", account.user_id);

            // Delete profile
            await supabase
              .from("profiles")
              .delete()
              .eq("id", account.user_id);

            // Delete auth user
            await supabase.auth.admin.deleteUser(account.user_id);
          }
        }

        // Delete all client accounts
        await supabase
          .from("client_accounts")
          .delete()
          .eq("organization_id", organization_id);
      }

      // Finally delete the organization
      await supabase
        .from("client_organizations")
        .delete()
        .eq("id", organization_id);

      console.log("Organization deleted successfully:", organization_id);

      return new Response(
        JSON.stringify({ success: true, message: "تم حذف المؤسسة وجميع بياناتها بنجاح" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "معلومات الحذف غير صالحة" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in delete-client:", error);
    return new Response(
      JSON.stringify({ error: error.message || "حدث خطأ أثناء الحذف" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
