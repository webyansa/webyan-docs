import React from 'react';
import { useSearchParams } from 'react-router-dom';
import EmbedChatWidget from '@/components/chat/EmbedChatWidget';

export default function EmbedChatPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const theme = searchParams.get('theme') as 'light' | 'dark' || 'light';
  const primaryColor = searchParams.get('color') || '#10b981';

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

  return (
    <div className="min-h-screen bg-transparent">
      <EmbedChatWidget 
        embedToken={token}
        theme={theme}
        primaryColor={primaryColor}
      />
    </div>
  );
}
