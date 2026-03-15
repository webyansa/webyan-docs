import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Search } from 'lucide-react';

interface Props {
  onSubmit: (data: { ticket_title: string; ticket_description: string; ticket_messages?: string }) => void;
  isLoading: boolean;
}

export default function CopilotTicketTab({ onSubmit, isLoading }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [messages, setMessages] = useState('');

  const handleSubmit = () => {
    if (!title.trim() && !description.trim()) return;
    onSubmit({ ticket_title: title, ticket_description: description, ticket_messages: messages || undefined });
    setTitle('');
    setDescription('');
    setMessages('');
  };

  return (
    <div className="space-y-3 p-3">
      <div>
        <Label className="text-xs font-medium">عنوان التذكرة</Label>
        <Textarea
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="عنوان التذكرة..."
          className="mt-1 text-sm min-h-[40px] resize-none"
          dir="rtl"
        />
      </div>
      <div>
        <Label className="text-xs font-medium">وصف المشكلة</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="وصف العميل للمشكلة..."
          className="mt-1 text-sm min-h-[80px] resize-none"
          dir="rtl"
        />
      </div>
      <div>
        <Label className="text-xs font-medium">الرسائل السابقة (اختياري)</Label>
        <Textarea
          value={messages}
          onChange={(e) => setMessages(e.target.value)}
          placeholder="الصق الرسائل السابقة إن وجدت..."
          className="mt-1 text-sm min-h-[60px] resize-none"
          dir="rtl"
        />
      </div>
      <Button onClick={handleSubmit} disabled={isLoading || (!title.trim() && !description.trim())} size="sm" className="w-full gap-2">
        <Search className="h-3.5 w-3.5" />
        حلل التذكرة
      </Button>
    </div>
  );
}
