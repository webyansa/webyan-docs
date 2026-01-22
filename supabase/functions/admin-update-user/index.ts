import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateUserRequest {
  user_id: string;
  action: 'update_password' | 'update_profile' | 'delete_user';
  new_password?: string;
  full_name?: string;
  email?: string;
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

    const { user_id, action, new_password, full_name, email }: UpdateUserRequest = await req.json();

    console.log("Admin update user request:", { user_id, action });

    // Prevent admin from modifying their own account through this endpoint
    if (user_id === user.id && action === 'delete_user') {
      return new Response(
        JSON.stringify({ error: "لا يمكنك حذف حسابك الخاص" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    switch (action) {
      case 'update_password': {
        if (!new_password || new_password.length < 6) {
          return new Response(
            JSON.stringify({ error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        const { error: updateError } = await supabase.auth.admin.updateUserById(
          user_id,
          { password: new_password }
        );

        if (updateError) {
          throw updateError;
        }

        console.log("Password updated for user:", user_id);

        return new Response(
          JSON.stringify({ success: true, message: "تم تغيير كلمة المرور بنجاح" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'update_profile': {
        // Update profile in profiles table
        const updateData: any = {};
        if (full_name) updateData.full_name = full_name;
        if (email) updateData.email = email;

        if (Object.keys(updateData).length > 0) {
          const { error: profileError } = await supabase
            .from("profiles")
            .update(updateData)
            .eq("id", user_id);

          if (profileError) {
            throw profileError;
          }

          // Also update in staff_members or client_accounts if applicable
          await supabase
            .from("staff_members")
            .update({ full_name: full_name, email: email })
            .eq("user_id", user_id);

          await supabase
            .from("client_accounts")
            .update({ full_name: full_name, email: email })
            .eq("user_id", user_id);

          // Update auth user email if changed
          if (email) {
            await supabase.auth.admin.updateUserById(user_id, { email: email });
          }
        }

        console.log("Profile updated for user:", user_id);

        return new Response(
          JSON.stringify({ success: true, message: "تم تحديث البيانات بنجاح" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      case 'delete_user': {
        // Delete all related data for this user

        // Check if staff member
        const { data: staffMember } = await supabase
          .from("staff_members")
          .select("id")
          .eq("user_id", user_id)
          .single();

        if (staffMember) {
          // Unassign tickets
          await supabase
            .from("support_tickets")
            .update({ assigned_to_staff: null })
            .eq("assigned_to_staff", staffMember.id);

          // Unassign meetings
          await supabase
            .from("meeting_requests")
            .update({ assigned_staff: null })
            .eq("assigned_staff", staffMember.id);

          // Unassign conversations
          await supabase
            .from("conversations")
            .update({ assigned_agent_id: null })
            .eq("assigned_agent_id", staffMember.id);

          // Delete quick replies
          await supabase
            .from("quick_replies")
            .delete()
            .eq("staff_id", staffMember.id);

          // Delete staff member record
          await supabase
            .from("staff_members")
            .delete()
            .eq("id", staffMember.id);
        }

        // Check if client account
        const { data: clientAccount } = await supabase
          .from("client_accounts")
          .select("id")
          .eq("user_id", user_id)
          .single();

        if (clientAccount) {
          // Delete conversations for this client
          const { data: conversations } = await supabase
            .from("conversations")
            .select("id")
            .eq("client_account_id", clientAccount.id);

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
              .eq("client_account_id", clientAccount.id);
          }

          // Delete client account
          await supabase
            .from("client_accounts")
            .delete()
            .eq("id", clientAccount.id);
        }

        // Delete user notifications
        await supabase
          .from("user_notifications")
          .delete()
          .eq("user_id", user_id);

        // Delete user activity log
        await supabase
          .from("user_activity_log")
          .delete()
          .eq("user_id", user_id);

        // Delete user roles
        await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user_id);

        // Delete profile
        await supabase
          .from("profiles")
          .delete()
          .eq("id", user_id);

        // Delete auth user
        const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(user_id);
        
        if (deleteAuthError) {
          console.error("Error deleting auth user:", deleteAuthError);
        }

        console.log("User deleted successfully:", user_id);

        return new Response(
          JSON.stringify({ success: true, message: "تم حذف المستخدم بنجاح" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: "الإجراء غير معروف" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

  } catch (error: any) {
    console.error("Error in admin-update-user:", error);
    return new Response(
      JSON.stringify({ error: error.message || "حدث خطأ" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
