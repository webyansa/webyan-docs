import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Search, 
  ArrowLeftRight,
  Trash2,
  UserPlus,
  Phone,
  Mail,
  Building2,
  Loader2,
  Edit
} from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { leadStatuses, LeadStatus, leadSources, LeadSource, serviceTypes, ServiceType } from '@/lib/crm/pipelineConfig';

interface Lead {
  id: string;
  company_name: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string | null;
  lead_source: string;
  stage: string;
  notes: string | null;
  is_converted: boolean;
  created_at: string;
  owner?: { full_name: string } | null;
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  
  // Form modal state
  const [showForm, setShowForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    company_name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    lead_source: 'form' as LeadSource,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  
  // Convert modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [convertData, setConvertData] = useState({
    deal_name: '',
    service_type: 'subscription' as ServiceType,
    expected_value: '',
  });
  const [converting, setConverting] = useState(false);

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_leads')
        .select(`
          id,
          company_name,
          contact_name,
          contact_email,
          contact_phone,
          lead_source,
          stage,
          notes,
          is_converted,
          created_at,
          owner:staff_members!crm_leads_owner_id_fkey(full_name)
        `)
        .eq('is_converted', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLeads(data || []);
    } catch (error) {
      console.error('Error fetching leads:', error);
      toast.error('حدث خطأ أثناء جلب العملاء المحتملين');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!formData.company_name.trim() || !formData.contact_name.trim() || !formData.contact_email.trim()) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setSaving(true);
    try {
      if (editingLead) {
        const { error } = await supabase
          .from('crm_leads')
          .update({
            company_name: formData.company_name,
            contact_name: formData.contact_name,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone || null,
            lead_source: formData.lead_source,
            notes: formData.notes || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingLead.id);

        if (error) throw error;
        toast.success('تم تحديث العميل المحتمل بنجاح');
      } else {
        const { error } = await supabase
          .from('crm_leads')
          .insert({
            company_name: formData.company_name,
            contact_name: formData.contact_name,
            contact_email: formData.contact_email,
            contact_phone: formData.contact_phone || null,
            lead_source: formData.lead_source,
            notes: formData.notes || null,
            stage: 'new',
          });

        if (error) throw error;
        toast.success('تم إضافة العميل المحتمل بنجاح');
      }

      setShowForm(false);
      setEditingLead(null);
      resetForm();
      fetchLeads();
    } catch (error) {
      console.error('Error saving lead:', error);
      toast.error('حدث خطأ أثناء الحفظ');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (leadId: string, newStatus: LeadStatus) => {
    try {
      const { error } = await supabase
        .from('crm_leads')
        .update({
          stage: newStatus,
          stage_changed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;
      toast.success('تم تحديث الحالة بنجاح');
      fetchLeads();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('حدث خطأ أثناء تحديث الحالة');
    }
  };

  const handleConvert = async () => {
    if (!convertingLead || !convertData.deal_name.trim() || !convertData.expected_value) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    setConverting(true);
    try {
      // 1. Create a temporary organization first (required for crm_opportunities.account_id)
      const customerType = convertData.service_type === 'subscription' ? 'subscription' : 'custom_platform';
      
      const { data: newOrg, error: orgError } = await supabase
        .from('client_organizations')
        .insert([{
          name: convertingLead.company_name,
          contact_email: convertingLead.contact_email,
          contact_phone: convertingLead.contact_phone || null,
          organization_type: 'other',
          is_active: false, // Not active until deal is approved
          lifecycle_stage: 'prospect',
          customer_type: customerType,
        }])
        .select('id')
        .single();

      if (orgError) throw orgError;

      // 2. Create a new opportunity/deal in crm_opportunities
      const { data: newDeal, error: dealError } = await supabase
        .from('crm_opportunities')
        .insert([{
          name: convertData.deal_name,
          account_id: newOrg.id,
          expected_value: parseFloat(convertData.expected_value),
          currency: 'SAR',
          probability: 20, // Initial probability for new opportunity
          stage: 'new_opportunity',
          status: 'open',
          opportunity_type: convertData.service_type,
        }])
        .select('id')
        .single();

      if (dealError) throw dealError;

      // 3. Mark lead as converted and link to account
      const { error: leadError } = await supabase
        .from('crm_leads')
        .update({
          is_converted: true,
          converted_at: new Date().toISOString(),
          converted_to_account_id: newOrg.id,
          stage: 'interested', // Mark as interested since it was converted
        })
        .eq('id', convertingLead.id);

      if (leadError) throw leadError;

      // 4. Log the conversion in stage transitions
      await supabase.from('crm_stage_transitions').insert([{
        entity_type: 'lead',
        entity_id: convertingLead.id,
        pipeline_type: 'leads',
        from_stage: convertingLead.stage,
        to_stage: 'converted',
        reason: `تم التحويل إلى فرصة: ${convertData.deal_name}`,
        notes: `تم إنشاء فرصة جديدة بقيمة ${convertData.expected_value} ر.س`,
      }]);

      toast.success('تم تحويل العميل المحتمل إلى فرصة بنجاح');
      setShowConvertModal(false);
      setConvertingLead(null);
      setConvertData({ deal_name: '', service_type: 'subscription', expected_value: '' });
      fetchLeads();
    } catch (error) {
      console.error('Error converting lead:', error);
      toast.error('حدث خطأ أثناء التحويل');
    } finally {
      setConverting(false);
    }
  };

  const handleDelete = async (leadId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا العميل المحتمل؟')) return;

    try {
      const { error } = await supabase
        .from('crm_leads')
        .delete()
        .eq('id', leadId);

      if (error) throw error;
      toast.success('تم حذف العميل المحتمل');
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast.error('حدث خطأ أثناء الحذف');
    }
  };

  const resetForm = () => {
    setFormData({
      company_name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      lead_source: 'form',
      notes: '',
    });
  };

  const openEditForm = (lead: Lead) => {
    setEditingLead(lead);
    setFormData({
      company_name: lead.company_name,
      contact_name: lead.contact_name,
      contact_email: lead.contact_email,
      contact_phone: lead.contact_phone || '',
      lead_source: lead.lead_source as LeadSource,
      notes: lead.notes || '',
    });
    setShowForm(true);
  };

  const openConvertModal = (lead: Lead) => {
    setConvertingLead(lead);
    setConvertData({
      deal_name: `فرصة - ${lead.company_name}`,
      service_type: 'subscription',
      expected_value: '',
    });
    setShowConvertModal(true);
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.company_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      lead.contact_email.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || lead.stage === statusFilter;
    const matchesSource = sourceFilter === 'all' || lead.lead_source === sourceFilter;

    return matchesSearch && matchesStatus && matchesSource;
  });

  const getStatusBadge = (status: string) => {
    const config = leadStatuses[status as LeadStatus];
    if (!config) return <Badge variant="outline">{status}</Badge>;
    
    return (
      <Badge className={`${config.bgColor} ${config.color} border-0`}>
        {config.label}
      </Badge>
    );
  };

  const getSourceLabel = (source: string) => {
    return leadSources[source as LeadSource]?.label || source;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">العملاء المحتملون</h1>
          <p className="text-muted-foreground">إدارة العملاء المحتملين قبل تحويلهم إلى فرص</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingLead(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 ml-2" />
          عميل محتمل جديد
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Object.entries(leadStatuses).map(([key, config]) => {
          const count = leads.filter(l => l.stage === key).length;
          const Icon = config.icon;
          return (
            <Card key={key}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{config.label}</p>
                    <p className="text-2xl font-bold">{count}</p>
                  </div>
                  <div className={`p-3 rounded-full ${config.bgColor}`}>
                    <Icon className={`w-5 h-5 ${config.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="بحث بالاسم أو البريد..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="الحالة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع الحالات</SelectItem>
                {Object.entries(leadStatuses).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="المصدر" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المصادر</SelectItem>
                {Object.entries(leadSources).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>الجهة</TableHead>
                <TableHead>جهة الاتصال</TableHead>
                <TableHead>الحالة</TableHead>
                <TableHead>المصدر</TableHead>
                <TableHead>تاريخ الإضافة</TableHead>
                <TableHead className="text-left">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLeads.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا توجد عملاء محتملين
                  </TableCell>
                </TableRow>
              ) : (
                filteredLeads.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-muted rounded-full">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium">{lead.company_name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="font-medium">{lead.contact_name}</div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Mail className="w-3 h-3" />
                          {lead.contact_email}
                        </div>
                        {lead.contact_phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="w-3 h-3" />
                            {lead.contact_phone}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={lead.stage}
                        onValueChange={(value) => handleStatusChange(lead.id, value as LeadStatus)}
                      >
                        <SelectTrigger className="w-[130px] h-8">
                          <SelectValue>{getStatusBadge(lead.stage)}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(leadStatuses).map(([key, config]) => (
                            <SelectItem key={key} value={key}>
                              <div className="flex items-center gap-2">
                                <config.icon className={`w-4 h-4 ${config.color}`} />
                                {config.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getSourceLabel(lead.lead_source)}</Badge>
                    </TableCell>
                    <TableCell>
                      {format(new Date(lead.created_at), 'dd MMM yyyy', { locale: ar })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {lead.stage === 'interested' && (
                          <Button
                            size="sm"
                            onClick={() => openConvertModal(lead)}
                            className="gap-1"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                            تحويل
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditForm(lead)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDelete(lead.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add/Edit Lead Form Modal */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              {editingLead ? 'تعديل عميل محتمل' : 'إضافة عميل محتمل'}
            </DialogTitle>
            <DialogDescription>
              {editingLead ? 'تعديل بيانات العميل المحتمل' : 'أضف عميل محتمل جديد للمتابعة'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="company_name">اسم الجهة *</Label>
              <Input
                id="company_name"
                value={formData.company_name}
                onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                placeholder="مثال: شركة ABC"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_name">اسم جهة الاتصال *</Label>
              <Input
                id="contact_name"
                value={formData.contact_name}
                onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                placeholder="مثال: أحمد محمد"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_email">البريد الإلكتروني *</Label>
              <Input
                id="contact_email"
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                placeholder="example@company.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_phone">الهاتف</Label>
              <Input
                id="contact_phone"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                placeholder="05xxxxxxxx"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="lead_source">مصدر العميل</Label>
              <Select
                value={formData.lead_source}
                onValueChange={(value) => setFormData({ ...formData, lead_source: value as LeadSource })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(leadSources).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">ملاحظات</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="أي ملاحظات إضافية..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowForm(false)} disabled={saving}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? 'جاري الحفظ...' : editingLead ? 'تحديث' : 'إضافة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Convert to Deal Modal */}
      <Dialog open={showConvertModal} onOpenChange={setShowConvertModal}>
        <DialogContent className="sm:max-w-[500px]" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-green-600" />
              تحويل إلى فرصة
            </DialogTitle>
            <DialogDescription>
              تحويل "{convertingLead?.company_name}" إلى فرصة بيع
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="deal_name">اسم الفرصة *</Label>
              <Input
                id="deal_name"
                value={convertData.deal_name}
                onChange={(e) => setConvertData({ ...convertData, deal_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="service_type">نوع الخدمة</Label>
              <Select
                value={convertData.service_type}
                onValueChange={(value) => setConvertData({ ...convertData, service_type: value as ServiceType })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(serviceTypes).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="expected_value">القيمة المتوقعة (ريال) *</Label>
              <Input
                id="expected_value"
                type="number"
                value={convertData.expected_value}
                onChange={(e) => setConvertData({ ...convertData, expected_value: e.target.value })}
                placeholder="مثال: 15000"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConvertModal(false)} disabled={converting}>
              إلغاء
            </Button>
            <Button onClick={handleConvert} disabled={converting} className="bg-green-600 hover:bg-green-700">
              {converting ? 'جاري التحويل...' : 'تحويل إلى فرصة'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
