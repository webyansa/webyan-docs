import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmbedChatWidget from '@/components/chat/EmbedChatWidget';
import { supabase } from '@/integrations/supabase/client';

interface ClientInfo {
  name: string;
  email: string;
  organizationName: string;
}

export default function EmbedChatPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const theme = searchParams.get('theme') as 'light' | 'dark' || 'light';
  const primaryColor = searchParams.get('color') || '#10b981';
  
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        // Verify token and get organization info
        const { data: tokenData, error: tokenError } = await supabase
          .from('embed_tokens')
          .select(`
            id,
            organization_id,
            is_active,
            organization:client_organizations(
              id,
              name,
              contact_email
            )
          `)
          .eq('token', token)
          .single();

        if (tokenError || !tokenData || !tokenData.is_active) {
          console.error('Invalid embed token:', tokenError);
          setLoading(false);
          return;
        }

        const org = tokenData.organization as any;
        const organizationId = tokenData.organization_id;

        // Try to get primary contact for this organization
        const { data: primaryContact } = await supabase
          .from('client_accounts')
          .select('full_name, email')
          .eq('organization_id', organizationId)
          .eq('is_primary_contact', true)
          .eq('is_active', true)
          .maybeSingle();

        // If no primary contact, get any active contact
        let contact = primaryContact;
        if (!contact) {
          const { data: anyContact } = await supabase
            .from('client_accounts')
            .select('full_name, email')
            .eq('organization_id', organizationId)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          contact = anyContact;
        }

        setClientInfo({
          name: contact?.full_name || '',
          email: contact?.email || org?.contact_email || '',
          organizationName: org?.name || 'الدعم الفني'
        });
      } catch (error) {
        console.error('Error fetching client info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientInfo();
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-6">
          <p className="text-destructive font-medium">رمز التضمين مطلوب</p>
          <p className="text-sm text-muted-foreground mt-2">
            يرجى التأكد من صحة رابط التضمين
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="animate-pulse flex items-center gap-2 text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 rounded-full bg-current animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      <EmbedChatWidget 
        embedToken={token}
        theme={theme}
        primaryColor={primaryColor}
        organizationName={clientInfo?.organizationName}
        prefillName={clientInfo?.name}
        prefillEmail={clientInfo?.email}
        defaultMessage="مرحباً، أحتاج المساعدة في استفسار"
      />
    </div>
  );
}
