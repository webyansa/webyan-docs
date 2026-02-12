import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmbedChatWidget from '@/components/chat/EmbedChatWidget';
import { supabase } from '@/integrations/supabase/client';

interface ClientInfo {
  name: string;
  email: string;
  organizationName: string;
}

interface TokenSettings {
  welcomeMessage: string;
  defaultMessage: string;
  primaryColor: string;
  secondaryColor: string;
}

export default function EmbedChatPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const apiKey = searchParams.get('key') || '';
  const activeKey = apiKey || token;
  const theme = searchParams.get('theme') as 'light' | 'dark' || 'light';
  
  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [tokenSettings, setTokenSettings] = useState<TokenSettings>({
    welcomeMessage: 'مرحباً بك! 👋 يسعدنا التواصل معك. فريق الدعم الفني جاهز لمساعدتك.',
    defaultMessage: 'مرحباً، أحتاج المساعدة بخصوص...',
    primaryColor: '#263c84',
    secondaryColor: '#24c2ec'
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClientInfo = async () => {
      if (!activeKey) {
        setLoading(false);
        return;
      }

      try {
        // Use the verify-embed-token edge function which has service role access
        const { data, error } = await supabase.functions.invoke('verify-embed-token', {
          body: { token: activeKey.startsWith('wbyn_') ? undefined : activeKey, apiKey: activeKey.startsWith('wbyn_') ? activeKey : undefined }
        });

        if (error || !data?.valid) {
          console.error('Invalid token/key:', error || data?.error);
          setLoading(false);
          return;
        }

        // Set client info from the edge function response
        setClientInfo({
          name: data.contactName || '',
          email: data.contactEmail || data.organization?.contact_email || '',
          organizationName: data.organization?.name || 'الدعم الفني'
        });

        // For legacy tokens, fetch settings separately
        if (!activeKey.startsWith('wbyn_')) {
          const { data: tokenData } = await supabase
            .from('embed_tokens')
            .select('welcome_message, default_message, primary_color, secondary_color')
            .eq('token', activeKey)
            .maybeSingle();

          if (tokenData) {
            setTokenSettings({
              welcomeMessage: tokenData.welcome_message || tokenSettings.welcomeMessage,
              defaultMessage: tokenData.default_message || tokenSettings.defaultMessage,
              primaryColor: tokenData.primary_color || tokenSettings.primaryColor,
              secondaryColor: tokenData.secondary_color || tokenSettings.secondaryColor
            });
          }
        }
      } catch (error) {
        console.error('Error fetching client info:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClientInfo();
  }, [activeKey]);

  if (!activeKey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-6">
          <p className="text-destructive font-medium">رمز التضمين أو مفتاح API مطلوب</p>
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
        embedToken={activeKey}
        theme={theme}
        primaryColor={tokenSettings.primaryColor}
        secondaryColor={tokenSettings.secondaryColor}
        organizationName={clientInfo?.organizationName}
        prefillName={clientInfo?.name}
        prefillEmail={clientInfo?.email}
        defaultMessage={tokenSettings.defaultMessage}
        welcomeMessage={tokenSettings.welcomeMessage}
      />
    </div>
  );
}
