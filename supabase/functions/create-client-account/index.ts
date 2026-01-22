import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      throw new Error('Invalid token');
    }

    // Check if caller is admin
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', callerUser.id)
      .single();

    if (!roleData || (roleData.role !== 'admin' && roleData.role !== 'editor')) {
      throw new Error('Unauthorized: Only admins can create client accounts');
    }

    const { 
      organization_id, 
      full_name, 
      email, 
      password, 
      phone, 
      job_title, 
      is_primary_contact 
    } = await req.json();

    // Validate required fields
    if (!organization_id || !full_name || !email || !password) {
      throw new Error('Missing required fields');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters');
    }

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);
    
    if (existingUser) {
      // Check if this user already has a client account
      const { data: existingAccount } = await supabaseAdmin
        .from('client_accounts')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle();
      
      if (existingAccount) {
        throw new Error('هذا البريد الإلكتروني مسجل بالفعل كحساب عميل');
      }

      // Ensure profile exists
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('id', existingUser.id)
        .maybeSingle();

      if (!existingProfile) {
        await supabaseAdmin.from('profiles').insert({
          id: existingUser.id,
          email,
          full_name
        });
      }

      // Ensure client role is assigned
      const { data: existingRole } = await supabaseAdmin
        .from('user_roles')
        .select('id')
        .eq('user_id', existingUser.id)
        .maybeSingle();

      if (!existingRole) {
        await supabaseAdmin.from('user_roles').insert({
          user_id: existingUser.id,
          role: 'client'
        });
      }
      
      // Link existing user to client account
      const { error: accountError } = await supabaseAdmin
        .from('client_accounts')
        .insert({
          user_id: existingUser.id,
          organization_id,
          full_name,
          email,
          phone: phone || null,
          job_title: job_title || null,
          is_primary_contact: is_primary_contact || false
        });
      
      if (accountError) {
        throw accountError;
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          user_id: existingUser.id,
          message: 'تم ربط الحساب الموجود بالمؤسسة بنجاح'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new user in auth
    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name,
        is_client: true
      }
    });

    if (createError) {
      throw createError;
    }

    if (!authData.user) {
      throw new Error('Failed to create user');
    }

    // Create profile record for the user
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: authData.user.id,
        email,
        full_name
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Continue anyway, profile might be created by trigger
    }

    // Assign client role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: 'client'
      });

    if (roleError) {
      console.error('Error assigning role:', roleError);
    }

    // Create client account record
    const { error: accountError } = await supabaseAdmin
      .from('client_accounts')
      .insert({
        user_id: authData.user.id,
        organization_id,
        full_name,
        email,
        phone: phone || null,
        job_title: job_title || null,
        is_primary_contact: is_primary_contact || false
      });

    if (accountError) {
      // Rollback: delete the auth user if account creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw accountError;
    }

    // Get organization details for the welcome email
    const { data: orgData } = await supabaseAdmin
      .from('client_organizations')
      .select('name')
      .eq('id', organization_id)
      .single();

    // Send welcome email with login credentials
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    
    // Base URLs for Webyan
    const portalBaseUrl = 'https://webyan-guide-hub.lovable.app';
    const docsBaseUrl = 'https://docs.webyan.net';
    
    if (resendApiKey) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${resendApiKey}`,
          },
          body: JSON.stringify({
            from: 'ويبيان <support@webyan.net>',
            to: [email],
            subject: 'مرحباً بك في بوابة عملاء ويبيان',
            html: `
              <div dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 28px;">مرحباً بك في ويبيان</h1>
                </div>
                <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
                  <p style="font-size: 18px; color: #1f2937; margin-bottom: 20px;">
                    مرحباً <strong>${full_name}</strong>،
                  </p>
                  <p style="color: #4b5563; line-height: 1.8; margin-bottom: 20px;">
                    تم إنشاء حسابك في بوابة عملاء ويبيان بنجاح. يمكنك الآن الوصول إلى البوابة لإدارة تذاكر الدعم، طلب الاجتماعات، ومتابعة اشتراكك.
                  </p>
                  
                  ${orgData ? `
                  <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <p style="margin: 0; color: #374151;"><strong>المؤسسة:</strong> ${orgData.name}</p>
                  </div>
                  ` : ''}
                  
                  <div style="background: #eff6ff; border: 1px solid #bfdbfe; padding: 20px; border-radius: 8px; margin-bottom: 25px;">
                    <h3 style="color: #1e40af; margin: 0 0 15px 0;">بيانات الدخول:</h3>
                    <p style="margin: 5px 0; color: #1e3a8a;"><strong>البريد الإلكتروني:</strong> ${email}</p>
                    <p style="margin: 5px 0; color: #1e3a8a;"><strong>كلمة المرور:</strong> ${password}</p>
                  </div>
                  
                  <div style="text-align: center; margin-top: 30px;">
                    <a href="${portalBaseUrl}/portal/login" 
                       style="display: inline-block; background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 14px 40px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">
                      الدخول للبوابة
                    </a>
                  </div>
                  
                  <div style="text-align: center; margin-top: 15px;">
                    <a href="${docsBaseUrl}" 
                       style="color: #1e40af; font-size: 14px; text-decoration: underline;">
                      📚 استعراض أدلة المستخدم
                    </a>
                  </div>
                  
                  <p style="color: #6b7280; font-size: 14px; margin-top: 30px; text-align: center;">
                    ننصحك بتغيير كلمة المرور بعد أول تسجيل دخول من صفحة الإعدادات.
                  </p>
                </div>
              </div>
            `,
          }),
        });
      } catch (emailError) {
        console.error('Failed to send welcome email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user_id: authData.user.id,
        message: 'تم إنشاء الحساب بنجاح وإرسال بيانات الدخول للبريد الإلكتروني'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Error creating client account:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to create client account';
    return new Response(
      JSON.stringify({ 
        error: errorMessage
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
