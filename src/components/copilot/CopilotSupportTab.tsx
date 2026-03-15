import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Send } from 'lucide-react';

interface Props {
  onSubmit: (data: { client_message: string; tone: string; request_type: string; message?: string }) => void;
  isLoading: boolean;
}

const TONES = [
  { value: 'friendly', label: 'ودي' },
  { value: 'formal', label: 'رسمي' },
  { value: 'brief', label: 'مختصر' },
];

const REQUEST_TYPES = [
  { value: 'general', label: 'عام' },
  { value: 'technical', label: 'تقني' },
  { value: 'billing', label: 'فواتير' },
  { value: 'complaint', label: 'شكوى' },
  { value: 'feature', label: 'طلب ميزة' },
];

export default function CopilotSupportTab({ onSubmit, isLoading }: Props) {
  const [clientMessage, setClientMessage] = useState('');
  const [tone, setTone] = useState('friendly');
  const [requestType, setRequestType] = useState('general');

  const handleSubmit = () => {
    if (!clientMessage.trim()) return;
    onSubmit({ client_message: clientMessage, tone, request_type: requestType });
  };

  return (
    <div className="space-y-3 p-3">
      <div>
        <Label className="text-xs font-medium">رسالة العميل</Label>
        <Textarea
          value={clientMessage}
          onChange={(e) => setClientMessage(e.target.value)}
          placeholder="الصق رسالة العميل هنا..."
          className="mt-1 text-sm min-h-[80px] resize-none"
          dir="rtl"
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs font-medium">النبرة</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
             <SelectContent className="z-[200]">
              {TONES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs font-medium">نوع الطلب</Label>
          <Select value={requestType} onValueChange={setRequestType}>
            <SelectTrigger className="mt-1 h-8 text-xs"><SelectValue /></SelectTrigger>
             <SelectContent className="z-[200]">
              {REQUEST_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <Button onClick={handleSubmit} disabled={isLoading || !clientMessage.trim()} size="sm" className="w-full gap-2">
        <Send className="h-3.5 w-3.5" />
        اكتب رد دعم احترافي
      </Button>
    </div>
  );
}
