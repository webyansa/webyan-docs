import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import {
  Globe,
  Mail,
  Phone,
  Building2,
  MapPin,
  Calendar,
  User,
  ExternalLink,
  Filter,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
  UserPlus,
  ArrowRight,
  Copy,
  Code,
  Loader2,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface FormSubmission {
  id: string;
  submission_number: string;
  form_type: string;
  status: string;
  organization_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  city: string | null;
  interest_type: string | null;
  organization_size: string | null;
  notes: string | null;
  source: string;
  source_page: string | null;
  utm_source: string | null;
  utm_campaign: string | null;
  utm_medium: string | null;
  lead_id: string | null;
  opportunity_id: string | null;
  assigned_to: string | null;
  created_at: string;
  contacted_at: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  new: { label: 'جديد', color: 'bg-blue-100 text-blue-700', icon: Clock },
  contacted: { label: 'تم التواصل', color: 'bg-amber-100 text-amber-700', icon: MessageSquare },
  qualified: { label: 'مؤهل', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  not_qualified: { label: 'غير مؤهل', color: 'bg-gray-100 text-gray-700', icon: XCircle },
  converted: { label: 'تم التحويل', color: 'bg-purple-100 text-purple-700', icon: UserPlus },
};

const interestTypeLabels: Record<string, string> = {
  webyan_subscription: 'اشتراك ويبيان',
  custom_platform: 'منصة مخصصة',
  consulting: 'استشارة/تحول رقمي',
};

const organizationSizeLabels: Record<string, string> = {
  small: 'صغيرة',
  medium: 'متوسطة',
  large: 'كبيرة',
};

export default function WebsiteRequestsPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [interestFilter, setInterestFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubmission, setSelectedSubmission] = useState<FormSubmission | null>(null);
  const [showEmbedDialog, setShowEmbedDialog] = useState(false);

  // Fetch submissions
  const { data: submissions = [], isLoading, refetch } = useQuery({
    queryKey: ['website-submissions', statusFilter, interestFilter],
    queryFn: async () => {
      let query = supabase
        .from('website_form_submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      if (interestFilter !== 'all') {
        query = query.eq('interest_type', interestFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as FormSubmission[];
    },
  });

  // Fetch staff for assignment
  const { data: staffMembers = [] } = useQuery({
    queryKey: ['staff-members-for-assignment'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('staff_members')
        .select('id, full_name')
        .eq('is_active', true);
      if (error) throw error;
      return data;
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, any> = { status };
      if (status === 'contacted') {
        updates.contacted_at = new Date().toISOString();
      } else if (status === 'converted') {
        updates.converted_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('website_form_submissions')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-submissions'] });
      toast.success('تم تحديث الحالة');
    },
    onError: () => {
      toast.error('فشل في تحديث الحالة');
    },
  });

  // Assign staff mutation
  const assignStaffMutation = useMutation({
    mutationFn: async ({ id, staffId }: { id: string; staffId: string }) => {
      const { error } = await supabase
        .from('website_form_submissions')
        .update({
          assigned_to: staffId,
          assigned_at: new Date().toISOString(),
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['website-submissions'] });
      toast.success('تم تعيين المسؤول');
    },
    onError: () => {
      toast.error('فشل في تعيين المسؤول');
    },
  });

  // Convert to Lead mutation
  const convertToLeadMutation = useMutation({
    mutationFn: async (submission: FormSubmission) => {
      // Check if already converted
      if (submission.lead_id) {
        throw new Error('تم تحويل هذا الطلب مسبقاً');
      }

      // Create new lead from submission data
      const { data: lead, error: leadError } = await supabase
        .from('crm_leads')
        .insert({
          company_name: submission.organization_name,
          contact_name: submission.contact_name,
          contact_email: submission.email,
          contact_phone: submission.phone,
          lead_source: 'website',
          source_details: `طلب عرض توضيحي - ${submission.submission_number}`,
          notes: submission.notes,
          utm_source: submission.utm_source,
          utm_campaign: submission.utm_campaign,
          stage: 'new',
        })
        .select()
        .single();

      if (leadError) throw leadError;

      // Update submission to link to the new lead
      const { error: updateError } = await supabase
        .from('website_form_submissions')
        .update({
          lead_id: lead.id,
          status: 'converted',
          converted_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      return lead;
    },
    onSuccess: (lead) => {
      queryClient.invalidateQueries({ queryKey: ['website-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['crm-leads'] });
      toast.success('تم تحويل الطلب إلى عميل محتمل بنجاح');
      setSelectedSubmission(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل في تحويل الطلب');
    },
  });

  // Convert to Opportunity mutation (تحويل مباشر للفرص)
  const convertToOpportunityMutation = useMutation({
    mutationFn: async (submission: FormSubmission) => {
      // Check if already converted
      if (submission.opportunity_id) {
        throw new Error('تم تحويل هذا الطلب إلى فرصة مسبقاً');
      }

      // 1. Create client organization (as trial prospect)
      const { data: org, error: orgError } = await supabase
        .from('client_organizations')
        .insert([{
          name: submission.organization_name,
          contact_email: submission.email,
          contact_phone: submission.phone,
          city: submission.city,
          subscription_status: 'trial' as const,
          notes: submission.notes,
        }])
        .select()
        .single();

      if (orgError) throw orgError;

      // 2. Create opportunity linked to the organization
      const { data: opportunity, error: oppError } = await supabase
        .from('crm_opportunities')
        .insert({
          name: `فرصة - ${submission.organization_name}`,
          account_id: org.id,
          stage: 'new_opportunity',
          status: 'open',
          opportunity_type: submission.interest_type || 'subscription',
          expected_value: 0,
          probability: 10,
          description: `مصدر: طلب عرض توضيحي - ${submission.submission_number}`,
        })
        .select()
        .single();

      if (oppError) throw oppError;

      // 3. Update submission to link to the opportunity
      const { error: updateError } = await supabase
        .from('website_form_submissions')
        .update({
          opportunity_id: opportunity.id,
          status: 'converted',
          converted_at: new Date().toISOString(),
        })
        .eq('id', submission.id);

      if (updateError) throw updateError;

      // 4. Add to client timeline
      await supabase.from('client_timeline').insert({
        organization_id: org.id,
        event_type: 'lead_captured',
        title: 'تم إنشاء الفرصة من طلب الموقع',
        description: `رقم الطلب: ${submission.submission_number}`,
        metadata: {
          submission_id: submission.id,
          interest_type: submission.interest_type,
        },
      });

      return { org, opportunity };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['website-submissions'] });
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['client-organizations'] });
      toast.success('تم تحويل الطلب إلى فرصة بنجاح');
      setSelectedSubmission(null);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'فشل في تحويل الطلب إلى فرصة');
    },
  });

  // Filter submissions by search
  const filteredSubmissions = submissions.filter((sub) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      sub.organization_name.toLowerCase().includes(query) ||
      sub.contact_name.toLowerCase().includes(query) ||
      sub.email.toLowerCase().includes(query) ||
      sub.submission_number.toLowerCase().includes(query)
    );
  });

  // Stats
  const stats = {
    total: submissions.length,
    new: submissions.filter((s) => s.status === 'new').length,
    contacted: submissions.filter((s) => s.status === 'contacted').length,
    qualified: submissions.filter((s) => s.status === 'qualified').length,
  };

  const iframeCode = `<iframe 
  src="${window.location.origin}/embed/demo-request" 
  width="100%" 
  height="700" 
  frameborder="0" 
  style="border: none; border-radius: 12px; max-width: 600px;"
  title="طلب عرض توضيحي - ويبيان">
</iframe>`;

  const popupWidgetCode = `<!-- Webyan Demo Request Widget -->
<script src="${window.location.origin}/embed/webyan-demo-widget.js" 
  data-button-text="طلب عرض توضيحي"
  data-button-color="#0ea5e9"
  data-button-position="bottom-left">
</script>`;

  const manualTriggerCode = `<!-- فتح النافذة يدوياً -->
<button onclick="window.WebyanDemo.open()">
  طلب عرض توضيحي
</button>`;

  const [embedTab, setEmbedTab] = useState<'popup' | 'iframe'>('popup');

  const copyEmbedCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('تم نسخ كود التضمين');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">طلبات الموقع</h1>
          <p className="text-muted-foreground">إدارة طلبات العرض التوضيحي من الموقع الرسمي</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowEmbedDialog(true)}>
            <Code className="h-4 w-4 ml-2" />
            كود التضمين
          </Button>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 ml-2" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">إجمالي الطلبات</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.new}</p>
                <p className="text-sm text-muted-foreground">طلبات جديدة</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <MessageSquare className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.contacted}</p>
                <p className="text-sm text-muted-foreground">تم التواصل</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-100">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.qualified}</p>
                <p className="text-sm text-muted-foreground">مؤهلين</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="بحث بالاسم، البريد، أو رقم الطلب..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pr-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(statusConfig).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={interestFilter} onValueChange={setInterestFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="نوع الاهتمام" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الأنواع</SelectItem>
                {Object.entries(interestTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="text-center py-12">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">لا توجد طلبات</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الطلب</TableHead>
                  <TableHead>الجهة</TableHead>
                  <TableHead>الشخص</TableHead>
                  <TableHead>نوع الاهتمام</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead>التاريخ</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubmissions.map((submission) => {
                  const status = statusConfig[submission.status] || statusConfig.new;
                  const StatusIcon = status.icon;
                  return (
                    <TableRow
                      key={submission.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      <TableCell>
                        <span className="font-mono text-sm">{submission.submission_number}</span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{submission.organization_name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p>{submission.contact_name}</p>
                            <p className="text-xs text-muted-foreground">{submission.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {submission.interest_type && (
                          <Badge variant="outline">
                            {interestTypeLabels[submission.interest_type] || submission.interest_type}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1', status.color)}>
                          <StatusIcon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{format(new Date(submission.created_at), 'dd/MM/yyyy', { locale: ar })}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(submission.created_at), {
                              addSuffix: true,
                              locale: ar,
                            })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Submission Detail Sheet */}
      <Sheet open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {selectedSubmission && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  طلب {selectedSubmission.submission_number}
                </SheetTitle>
                <SheetDescription>
                  تم الإرسال{' '}
                  {formatDistanceToNow(new Date(selectedSubmission.created_at), {
                    addSuffix: true,
                    locale: ar,
                  })}
                </SheetDescription>
              </SheetHeader>

              <Tabs defaultValue="details" className="mt-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="details">التفاصيل</TabsTrigger>
                  <TabsTrigger value="actions">الإجراءات</TabsTrigger>
                </TabsList>

                <TabsContent value="details" className="space-y-4 mt-4">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">الحالة</span>
                    <Badge
                      className={cn(
                        'gap-1',
                        statusConfig[selectedSubmission.status]?.color || 'bg-gray-100'
                      )}
                    >
                      {statusConfig[selectedSubmission.status]?.label || selectedSubmission.status}
                    </Badge>
                  </div>

                  {/* Organization Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="h-4 w-4" />
                        بيانات الجهة
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">اسم الجهة</Label>
                        <p className="font-medium">{selectedSubmission.organization_name}</p>
                      </div>
                      {selectedSubmission.organization_size && (
                        <div>
                          <Label className="text-xs text-muted-foreground">حجم الجهة</Label>
                          <p>{organizationSizeLabels[selectedSubmission.organization_size]}</p>
                        </div>
                      )}
                      {selectedSubmission.city && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{selectedSubmission.city}</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Contact Info */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium flex items-center gap-2">
                        <User className="h-4 w-4" />
                        بيانات التواصل
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground">الاسم</Label>
                        <p className="font-medium">{selectedSubmission.contact_name}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a
                          href={`mailto:${selectedSubmission.email}`}
                          className="text-primary hover:underline"
                        >
                          {selectedSubmission.email}
                        </a>
                      </div>
                      {selectedSubmission.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <a
                            href={`tel:${selectedSubmission.phone}`}
                            className="text-primary hover:underline"
                          >
                            {selectedSubmission.phone}
                          </a>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Interest & Notes */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">نوع الاهتمام</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {selectedSubmission.interest_type && (
                        <Badge variant="secondary" className="text-sm">
                          {interestTypeLabels[selectedSubmission.interest_type]}
                        </Badge>
                      )}
                      {selectedSubmission.notes && (
                        <div>
                          <Label className="text-xs text-muted-foreground">ملاحظات</Label>
                          <p className="text-sm bg-muted p-3 rounded-lg mt-1">
                            {selectedSubmission.notes}
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Tracking Info */}
                  {(selectedSubmission.utm_source ||
                    selectedSubmission.utm_campaign ||
                    selectedSubmission.source_page) && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium flex items-center gap-2">
                          <ExternalLink className="h-4 w-4" />
                          معلومات التتبع
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        {selectedSubmission.source_page && (
                          <div>
                            <Label className="text-xs text-muted-foreground">صفحة المصدر</Label>
                            <p className="truncate">{selectedSubmission.source_page}</p>
                          </div>
                        )}
                        {selectedSubmission.utm_source && (
                          <div>
                            <Label className="text-xs text-muted-foreground">UTM Source</Label>
                            <p>{selectedSubmission.utm_source}</p>
                          </div>
                        )}
                        {selectedSubmission.utm_campaign && (
                          <div>
                            <Label className="text-xs text-muted-foreground">UTM Campaign</Label>
                            <p>{selectedSubmission.utm_campaign}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                <TabsContent value="actions" className="space-y-4 mt-4">
                  {/* Change Status */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">تغيير الحالة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(statusConfig).map(([key, { label, color, icon: Icon }]) => (
                          <Button
                            key={key}
                            variant={selectedSubmission.status === key ? 'default' : 'outline'}
                            size="sm"
                            className="justify-start"
                            onClick={() =>
                              updateStatusMutation.mutate({ id: selectedSubmission.id, status: key })
                            }
                            disabled={updateStatusMutation.isPending}
                          >
                            <Icon className="h-4 w-4 ml-2" />
                            {label}
                          </Button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Assign Staff */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">تعيين مسؤول المتابعة</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Select
                        value={selectedSubmission.assigned_to || ''}
                        onValueChange={(value) =>
                          assignStaffMutation.mutate({ id: selectedSubmission.id, staffId: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="اختر الموظف" />
                        </SelectTrigger>
                        <SelectContent>
                          {staffMembers.map((staff) => (
                            <SelectItem key={staff.id} value={staff.id}>
                              {staff.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">إجراءات سريعة</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button variant="outline" className="w-full justify-start" asChild>
                        <a href={`mailto:${selectedSubmission.email}`}>
                          <Mail className="h-4 w-4 ml-2" />
                          إرسال بريد للعميل
                        </a>
                      </Button>
                      {selectedSubmission.phone && (
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <a href={`tel:${selectedSubmission.phone}`}>
                            <Phone className="h-4 w-4 ml-2" />
                            الاتصال بالعميل
                          </a>
                        </Button>
                      )}
                      {selectedSubmission.lead_id ? (
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <a href={`/admin/crm/leads?id=${selectedSubmission.lead_id}`}>
                            <UserPlus className="h-4 w-4 ml-2" />
                            عرض العميل المحتمل
                          </a>
                        </Button>
                      ) : selectedSubmission.opportunity_id ? (
                        <Button variant="outline" className="w-full justify-start" asChild>
                          <a href={`/admin/crm/deals/${selectedSubmission.opportunity_id}`}>
                            <Target className="h-4 w-4 ml-2" />
                            عرض الفرصة
                          </a>
                        </Button>
                      ) : (
                        <div className="space-y-2">
                          <Button 
                            variant="default" 
                            className="w-full justify-start bg-green-600 hover:bg-green-700"
                            onClick={() => convertToOpportunityMutation.mutate(selectedSubmission)}
                            disabled={convertToOpportunityMutation.isPending || convertToLeadMutation.isPending}
                          >
                            {convertToOpportunityMutation.isPending ? (
                              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                            ) : (
                              <Target className="h-4 w-4 ml-2" />
                            )}
                            تحويل إلى فرصة (موصى به)
                          </Button>
                          <Button 
                            variant="outline" 
                            className="w-full justify-start"
                            onClick={() => convertToLeadMutation.mutate(selectedSubmission)}
                            disabled={convertToLeadMutation.isPending || convertToOpportunityMutation.isPending}
                          >
                            {convertToLeadMutation.isPending ? (
                              <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                            ) : (
                              <UserPlus className="h-4 w-4 ml-2" />
                            )}
                            تحويل إلى عميل محتمل
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Embed Code Dialog */}
      <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              كود تضمين النموذج
            </DialogTitle>
            <DialogDescription>
              انسخ هذا الكود وألصقه في موقعك الرسمي لعرض نموذج طلب العرض التوضيحي
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setEmbedTab('popup')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  embedTab === 'popup'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                نافذة منبثقة (موصى به)
              </button>
              <button
                onClick={() => setEmbedTab('iframe')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  embedTab === 'iframe'
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                iframe مضمن
              </button>
            </div>

            {embedTab === 'popup' ? (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">كود الـ Widget (الأسهل)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    أضف هذا الكود في نهاية صفحتك قبل وسم body/
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap text-left" dir="ltr">
                      {popupWidgetCode}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 left-2"
                      onClick={() => copyEmbedCode(popupWidgetCode)}
                    >
                      <Copy className="h-4 w-4 ml-1" />
                      نسخ
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">فتح النافذة يدوياً (اختياري)</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    يمكنك فتح النافذة من أي زر في موقعك
                  </p>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap text-left" dir="ltr">
                      {manualTriggerCode}
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      className="absolute top-2 left-2"
                      onClick={() => copyEmbedCode(manualTriggerCode)}
                    >
                      <Copy className="h-4 w-4 ml-1" />
                      نسخ
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="relative">
                <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto whitespace-pre-wrap text-left" dir="ltr">
                  {iframeCode}
                </pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute top-2 left-2"
                  onClick={() => copyEmbedCode(iframeCode)}
                >
                  <Copy className="h-4 w-4 ml-1" />
                  نسخ
                </Button>
              </div>
            )}

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h4 className="font-medium text-amber-800 mb-2">ملاحظات مهمة:</h4>
              <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
                <li>
                  مفتاح API للموقع الرسمي: <code className="bg-amber-100 px-1 rounded">webyan_demo_2024_secure_token</code>
                </li>
                <li>النافذة المنبثقة تعمل على جميع الأجهزة (Responsive)</li>
                <li>يمكنك تغيير لون الزر وموقعه عبر خصائص data-*</li>
                <li>لإخفاء الزر العائم: أضف <code className="bg-amber-100 px-1 rounded">data-show-button="false"</code></li>
              </ul>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
