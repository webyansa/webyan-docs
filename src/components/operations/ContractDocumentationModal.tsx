import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, FileCheck, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { contractStatuses, contractTypes } from '@/lib/operations/projectConfig';

interface ContractDocumentationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quoteId: string;
  opportunityId?: string;
  accountId: string;
  accountName: string;
  staffId?: string;
}

export function ContractDocumentationModal({
  open,
  onOpenChange,
  quoteId,
  opportunityId,
  accountId,
  accountName,
  staffId,
}: ContractDocumentationModalProps) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'preparing' | 'signed'>('preparing');
  const [signedDate, setSignedDate] = useState<Date>();
  const [contractType, setContractType] = useState<string>('');
  const [notes, setNotes] = useState('');

  const createContractDocMutation = useMutation({
    mutationFn: async () => {
      // Create the contract documentation
      const { data: contractDoc, error: contractError } = await supabase
        .from('contract_documentation')
        .insert({
          quote_id: quoteId,
          opportunity_id: opportunityId || null,
          account_id: accountId,
          status,
          signed_date: signedDate ? format(signedDate, 'yyyy-MM-dd') : null,
          contract_type: contractType || null,
          notes: notes || null,
          created_by: staffId || null,
        })
        .select()
        .single();

      if (contractError) throw contractError;

      // If signed, create a new project automatically
      if (status === 'signed') {
        // Get quote details for project name
        const { data: quote } = await supabase
          .from('crm_quotes')
          .select('title')
          .eq('id', quoteId)
          .single();

        const projectName = quote?.title || `مشروع ${accountName}`;

        const { error: projectError } = await supabase
          .from('crm_implementations')
          .insert({
            account_id: accountId,
            opportunity_id: opportunityId || null,
            quote_id: quoteId,
            contract_doc_id: contractDoc.id,
            project_name: projectName,
            status: 'active',
            stage: 'kickoff',
            received_date: format(new Date(), 'yyyy-MM-dd'),
            priority: 'medium',
          });

        if (projectError) throw projectError;
      }

      return contractDoc;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quote'] });
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['implementations'] });
      toast.success(
        status === 'signed' 
          ? 'تم توثيق العقد وإنشاء المشروع بنجاح'
          : 'تم توثيق حالة العقد بنجاح'
      );
      onOpenChange(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error('حدث خطأ: ' + error.message);
    },
  });

  const resetForm = () => {
    setStatus('preparing');
    setSignedDate(undefined);
    setContractType('');
    setNotes('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5" />
            توثيق العقد
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">
              العميل: <span className="font-medium text-foreground">{accountName}</span>
            </p>
          </div>

          <div className="space-y-2">
            <Label>حالة العقد</Label>
            <Select value={status} onValueChange={(v: 'preparing' | 'signed') => setStatus(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(contractStatuses).map(([key, value]) => (
                  <SelectItem key={key} value={key}>
                    <span className={value.color}>{value.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status === 'signed' && (
            <div className="space-y-2">
              <Label>تاريخ التوقيع</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start text-right font-normal',
                      !signedDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="ml-2 h-4 w-4" />
                    {signedDate ? format(signedDate, 'PPP', { locale: ar }) : 'اختر التاريخ'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={signedDate}
                    onSelect={setSignedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className="space-y-2">
            <Label>نوع العقد (اختياري)</Label>
            <Select value={contractType} onValueChange={setContractType}>
              <SelectTrigger>
                <SelectValue placeholder="اختر نوع العقد" />
              </SelectTrigger>
              <SelectContent>
                {contractTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>ملاحظات (اختياري)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات متعلقة بالعقد..."
              rows={3}
            />
          </div>

          {status === 'signed' && (
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                ✓ عند تأكيد التوقيع، سيتم إنشاء مشروع جديد تلقائياً وتحويله لفريق التنفيذ
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button 
            onClick={() => createContractDocMutation.mutate()}
            disabled={createContractDocMutation.isPending || (status === 'signed' && !signedDate)}
          >
            {createContractDocMutation.isPending && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            )}
            {status === 'signed' ? 'توثيق وإنشاء المشروع' : 'حفظ التوثيق'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
