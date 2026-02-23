import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Ticket, Building2, User, Search, Send, Loader2,
  AlertTriangle, ChevronLeft, ChevronRight, CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  contact_email: string;
}

interface StaffMember {
  id: string;
  full_name: string;
  job_title: string | null;
}

interface CreateTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

const categoryOptions = [
  { value: 'technical', label: 'تقنية', icon: '🔧' },
  { value: 'question', label: 'استفسار', icon: '❓' },
  { value: 'suggestion', label: 'اقتراح', icon: '💡' },
  { value: 'complaint', label: 'شكوى', icon: '⚠️' },
  { value: 'general', label: 'عام', icon: '📋' },
];

const priorityOptions = [
  { value: 'low', label: 'عادية', color: 'bg-slate-100 text-slate-700 border-slate-200' },
  { value: 'medium', label: 'متوسطة', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'high', label: 'عاجلة', color: 'bg-rose-50 text-rose-700 border-rose-200' },
];

export function CreateTicketModal({ open, onOpenChange, onCreated }: CreateTicketModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const [step, setStep] = useState(1);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [orgSearch, setOrgSearch] = useState('');
  const [staffSearch, setStaffSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [selectedStaff, setSelectedStaff] = useState<StaffMember | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    if (open) {
      fetchData();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setStep(1);
    setSelectedOrg(null);
    setSelectedStaff(null);
    setSubject('');
    setDescription('');
    setCategory('general');
    setPriority('medium');
    setOrgSearch('');
    setStaffSearch('');
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [orgsRes, staffRes] = await Promise.all([
        supabase.from('client_organizations').select('id, name, contact_email').eq('is_active', true).order('name'),
        supabase.from('staff_members' as any).select('id, full_name, job_title').eq('is_active', true).eq('can_reply_tickets', true),
      ]);
      setOrganizations(orgsRes.data || []);
      setStaffMembers((staffRes.data as unknown as StaffMember[]) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredOrgs = useMemo(
    () => organizations.filter(o => o.name.toLowerCase().includes(orgSearch.toLowerCase()) || o.contact_email.toLowerCase().includes(orgSearch.toLowerCase())),
    [organizations, orgSearch],
  );

  const filteredStaff = useMemo(
    () => staffMembers.filter(s => s.full_name.toLowerCase().includes(staffSearch.toLowerCase())),
    [staffMembers, staffSearch],
  );

  const canProceedStep1 = !!selectedOrg;
  const canSubmit = !!selectedOrg && subject.trim().length > 0 && description.trim().length > 0;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('support_tickets').insert({
        subject,
        description,
        category,
        priority,
        status: selectedStaff ? 'in_progress' : 'open',
        organization_id: selectedOrg!.id,
        assigned_to_staff: selectedStaff?.id || null,
        source: 'admin',
      } as any);

      if (error) throw error;

      toast({ title: '✅ تم إنشاء التذكرة', description: `تم فتح تذكرة جديدة لـ ${selectedOrg!.name}` });
      onOpenChange(false);
      onCreated();
    } catch (error: any) {
      toast({ title: 'خطأ', description: error.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const stepTitles = ['اختيار العميل', 'تفاصيل التذكرة', 'المراجعة والإرسال'];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="p-6 pb-4 border-b bg-muted/30">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 rounded-lg bg-primary/10">
              <Ticket className="h-5 w-5 text-primary" />
            </div>
            فتح تذكرة جديدة
          </DialogTitle>
          <DialogDescription className="text-sm">إنشاء تذكرة دعم فني نيابةً عن العميل</DialogDescription>

          {/* Steps indicator */}
          <div className="flex items-center gap-2 mt-4">
            {stepTitles.map((title, i) => {
              const stepNum = i + 1;
              const isActive = step === stepNum;
              const isDone = step > stepNum;
              return (
                <div key={stepNum} className="flex items-center gap-2 flex-1">
                  <button
                    onClick={() => { if (isDone) setStep(stepNum); }}
                    className={cn(
                      'flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all w-full justify-center',
                      isActive && 'bg-primary text-primary-foreground shadow-sm',
                      isDone && 'bg-primary/10 text-primary cursor-pointer hover:bg-primary/20',
                      !isActive && !isDone && 'bg-muted text-muted-foreground',
                    )}
                    disabled={!isDone}
                  >
                    {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : <span>{stepNum}</span>}
                    <span className="hidden sm:inline">{title}</span>
                  </button>
                  {i < 2 && <div className={cn('h-px flex-shrink-0 w-4', isDone ? 'bg-primary' : 'bg-border')} />}
                </div>
              );
            })}
          </div>
        </DialogHeader>

        {/* Body */}
        <ScrollArea className="max-h-[55vh]">
          <div className="p-6 space-y-4">
            {/* Step 1: Select Client */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ابحث عن العميل بالاسم أو البريد..."
                    value={orgSearch}
                    onChange={e => setOrgSearch(e.target.value)}
                    className="pr-10"
                  />
                </div>

                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredOrgs.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">لا توجد نتائج</div>
                ) : (
                  <div className="grid gap-2">
                    {filteredOrgs.map(org => (
                      <button
                        key={org.id}
                        onClick={() => setSelectedOrg(org)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border text-right w-full transition-all',
                          selectedOrg?.id === org.id
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border hover:border-primary/30 hover:bg-muted/50',
                        )}
                      >
                        <Avatar className="h-9 w-9 flex-shrink-0">
                          <AvatarFallback className={cn(
                            'text-xs font-bold',
                            selectedOrg?.id === org.id ? 'bg-primary text-primary-foreground' : 'bg-muted',
                          )}>
                            {org.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{org.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{org.contact_email}</p>
                        </div>
                        {selectedOrg?.id === org.id && (
                          <CheckCircle2 className="h-5 w-5 text-primary flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Ticket Details */}
            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">الموضوع <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="أدخل عنوان التذكرة..."
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">الوصف <span className="text-destructive">*</span></Label>
                  <Textarea
                    placeholder="اشرح المشكلة أو الطلب بالتفصيل..."
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">التصنيف</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {categoryOptions.map(c => (
                          <SelectItem key={c.value} value={c.value}>
                            <span className="flex items-center gap-2">{c.icon} {c.label}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">الأولوية</Label>
                    <div className="flex gap-2">
                      {priorityOptions.map(p => (
                        <button
                          key={p.value}
                          onClick={() => setPriority(p.value)}
                          className={cn(
                            'flex-1 py-2 px-2 rounded-md border text-xs font-medium transition-all text-center',
                            p.color,
                            priority === p.value ? 'ring-2 ring-primary/30 shadow-sm' : 'opacity-60 hover:opacity-100',
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Staff Assignment (optional) */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">
                    توجيه لموظف <span className="text-muted-foreground text-xs">(اختياري)</span>
                  </Label>
                  <div className="relative">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن موظف..."
                      value={staffSearch}
                      onChange={e => setStaffSearch(e.target.value)}
                      className="pr-10"
                    />
                  </div>
                  <div className="grid gap-1.5 max-h-32 overflow-y-auto">
                    {selectedStaff && (
                      <button
                        onClick={() => setSelectedStaff(null)}
                        className="flex items-center gap-2 p-2 rounded-md text-right w-full text-xs text-muted-foreground hover:bg-muted/50"
                      >
                        بدون توجيه
                      </button>
                    )}
                    {filteredStaff.map(s => (
                      <button
                        key={s.id}
                        onClick={() => setSelectedStaff(s)}
                        className={cn(
                          'flex items-center gap-2 p-2 rounded-md border text-right w-full transition-all',
                          selectedStaff?.id === s.id
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:bg-muted/50',
                        )}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-[10px]">{s.full_name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{s.full_name}</p>
                          {s.job_title && <p className="text-[10px] text-muted-foreground">{s.job_title}</p>}
                        </div>
                        {selectedStaff?.id === s.id && <CheckCircle2 className="h-4 w-4 text-primary" />}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {step === 3 && (
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Building2 className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">العميل</p>
                      <p className="font-medium text-sm">{selectedOrg?.name}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Ticket className="h-4 w-4 text-primary" />
                    <div>
                      <p className="text-xs text-muted-foreground">الموضوع</p>
                      <p className="font-medium text-sm">{subject}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="outline">
                      {categoryOptions.find(c => c.value === category)?.icon} {categoryOptions.find(c => c.value === category)?.label}
                    </Badge>
                    <Badge variant="outline" className={priorityOptions.find(p => p.value === priority)?.color}>
                      {priorityOptions.find(p => p.value === priority)?.label}
                    </Badge>
                  </div>
                  {selectedStaff && (
                    <div className="flex items-center gap-3">
                      <User className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-xs text-muted-foreground">موجّهة إلى</p>
                        <p className="font-medium text-sm">{selectedStaff.full_name}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الوصف</p>
                    <p className="text-sm whitespace-pre-wrap bg-background rounded-md p-3 border">{description}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="p-4 border-t bg-muted/20 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { if (step > 1) setStep(step - 1); else onOpenChange(false); }}
            className="gap-1"
          >
            <ChevronRight className="h-4 w-4" />
            {step > 1 ? 'السابق' : 'إلغاء'}
          </Button>

          {step < 3 ? (
            <Button
              size="sm"
              onClick={() => setStep(step + 1)}
              disabled={step === 1 && !canProceedStep1}
              className="gap-1"
            >
              التالي
              <ChevronLeft className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
              className="gap-2"
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              إنشاء التذكرة
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
