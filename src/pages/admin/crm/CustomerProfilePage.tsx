import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerHeader } from '@/components/crm/CustomerHeader';
import { BasicInfoTab } from '@/components/crm/tabs/BasicInfoTab';
import { SubscriptionTab } from '@/components/crm/tabs/SubscriptionTab';
import { InvoicesTab } from '@/components/crm/tabs/InvoicesTab';
import { TicketsTab } from '@/components/crm/tabs/TicketsTab';
import { MeetingsTab } from '@/components/crm/tabs/MeetingsTab';
import { TimelineTab } from '@/components/crm/tabs/TimelineTab';
import { OverviewTab } from '@/components/crm/tabs/OverviewTab';
import { SalesTab } from '@/components/crm/tabs/SalesTab';
import { HostingTab } from '@/components/crm/tabs/HostingTab';
import { DeliveryTab } from '@/components/crm/tabs/DeliveryTab';
import { PortalAccountsTab } from '@/components/crm/tabs/PortalAccountsTab';
import { CustomerType } from '@/components/crm/CustomerTypeBadge';
import { LifecycleStage } from '@/components/crm/LifecycleBadge';

interface OrganizationData {
  id: string;
  name: string;
  logo_url: string | null;
  organization_type: string;
  customer_type: CustomerType;
  lifecycle_stage: LifecycleStage;
  subscription_status: string;
  subscription_plan: string | null;
  subscription_start_date: string | null;
  subscription_end_date: string | null;
  auto_renewal: boolean;
  contact_email: string;
  contact_phone: string | null;
  website_url: string | null;
  city: string | null;
  address: string | null;
  registration_number: string | null;
  internal_notes: string | null;
  tags: string[] | null;
  is_active: boolean;
  last_interaction_at: string | null;
  created_at: string;
  assigned_account_manager: {
    id: string;
    full_name: string;
  } | null;
}

interface ContactData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  job_title: string | null;
  is_primary_contact: boolean;
  is_active: boolean;
}

export default function CustomerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<OrganizationData | null>(null);
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchData = useCallback(async () => {
    if (!id) return;

    try {
      // Fetch organization with account manager
      const { data: orgData, error: orgError } = await supabase
        .from('client_organizations')
        .select(`
          *,
          assigned_account_manager:staff_members!client_organizations_assigned_account_manager_fkey(id, full_name)
        `)
        .eq('id', id)
        .single();

      if (orgError) throw orgError;

      // Fetch contacts
      const { data: contactsData, error: contactsError } = await supabase
        .from('client_accounts')
        .select('id, full_name, email, phone, job_title, is_primary_contact, is_active')
        .eq('organization_id', id)
        .order('is_primary_contact', { ascending: false });

      if (contactsError) throw contactsError;

      // Map organization data with defaults for new columns
      setOrganization({
        ...orgData,
        customer_type: orgData.customer_type || 'subscription',
        lifecycle_stage: orgData.lifecycle_stage || 'active',
        auto_renewal: orgData.auto_renewal ?? true,
        internal_notes: orgData.internal_notes || null,
        tags: orgData.tags || [],
        last_interaction_at: orgData.last_interaction_at || null,
        assigned_account_manager: orgData.assigned_account_manager || null,
      });
      setContacts(contactsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('حدث خطأ أثناء تحميل البيانات');
      navigate('/admin/clients');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleToggleStatus = async () => {
    if (!organization) return;
    
    const newStatus = !organization.is_active;
    const action = newStatus ? 'تفعيل' : 'تعطيل';
    
    if (!confirm(`هل أنت متأكد من ${action} ${organization.name}؟`)) return;

    try {
      const { error } = await supabase
        .from('client_organizations')
        .update({ is_active: newStatus })
        .eq('id', organization.id);

      if (error) throw error;
      toast.success(`تم ${action} المؤسسة بنجاح`);
      fetchData();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error(`حدث خطأ أثناء ${action} المؤسسة`);
    }
  };

  const handleDelete = async () => {
    if (!organization) return;
    
    if (!confirm(`هل أنت متأكد من حذف ${organization.name}؟\n\nسيتم حذف جميع البيانات المرتبطة بها. هذا الإجراء لا يمكن التراجع عنه!`)) return;

    try {
      const { data, error } = await supabase.functions.invoke('delete-client', {
        body: {
          organization_id: organization.id,
          delete_organization: true
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success('تم حذف المؤسسة بنجاح');
      navigate('/admin/clients');
    } catch (error: any) {
      console.error('Error deleting:', error);
      toast.error(error.message || 'حدث خطأ أثناء الحذف');
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="p-6 text-center">
        <p className="text-muted-foreground">لم يتم العثور على العميل</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <CustomerHeader
        organization={organization}
        onEdit={() => setActiveTab('basic')}
        onToggleStatus={handleToggleStatus}
        onDelete={handleDelete}
        onCreateTicket={() => navigate(`/admin/tickets?org=${organization.id}`)}
        onScheduleMeeting={() => navigate(`/admin/meetings?org=${organization.id}`)}
        onLifecycleChange={fetchData}
      />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent flex-wrap">
          <TabsTrigger 
            value="overview" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            ملخص
          </TabsTrigger>
          <TabsTrigger 
            value="basic" 
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            البيانات الأساسية
          </TabsTrigger>
          <TabsTrigger 
            value="sales"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            المبيعات
          </TabsTrigger>
          <TabsTrigger 
            value="subscription"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            الاشتراك
          </TabsTrigger>
          <TabsTrigger 
            value="hosting"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            الاستضافة
          </TabsTrigger>
          <TabsTrigger 
            value="invoices"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            الفواتير
          </TabsTrigger>
          <TabsTrigger 
            value="delivery"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            التنفيذ
          </TabsTrigger>
          <TabsTrigger 
            value="tickets"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            التذاكر
          </TabsTrigger>
          <TabsTrigger 
            value="meetings"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            الاجتماعات
          </TabsTrigger>
          <TabsTrigger 
            value="portal-accounts"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            حسابات البوابة
          </TabsTrigger>
          <TabsTrigger 
            value="timeline"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
          >
            سجل النشاط
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab 
            organizationId={organization.id} 
            organizationName={organization.name}
            subscriptionEndDate={organization.subscription_end_date}
            lastInteractionAt={organization.last_interaction_at}
          />
        </TabsContent>

        <TabsContent value="basic" className="mt-6">
          <BasicInfoTab 
            organization={organization} 
            contacts={contacts} 
            onUpdate={fetchData} 
          />
        </TabsContent>

        <TabsContent value="sales" className="mt-6">
          <SalesTab 
            organizationId={organization.id}
            organizationName={organization.name}
          />
        </TabsContent>

        <TabsContent value="subscription" className="mt-6">
          <SubscriptionTab 
            organization={organization}
            onUpdate={fetchData}
          />
        </TabsContent>

        <TabsContent value="hosting" className="mt-6">
          <HostingTab organizationId={organization.id} />
        </TabsContent>

        <TabsContent value="invoices" className="mt-6">
          <InvoicesTab organizationId={organization.id} />
        </TabsContent>

        <TabsContent value="delivery" className="mt-6">
          <DeliveryTab organizationId={organization.id} />
        </TabsContent>

        <TabsContent value="tickets" className="mt-6">
          <TicketsTab 
            organizationId={organization.id}
            onCreateTicket={() => navigate(`/admin/tickets?org=${organization.id}`)}
          />
        </TabsContent>

        <TabsContent value="meetings" className="mt-6">
          <MeetingsTab 
            organizationId={organization.id}
            onScheduleMeeting={() => navigate(`/admin/meetings?org=${organization.id}`)}
          />
        </TabsContent>

        <TabsContent value="portal-accounts" className="mt-6">
          <PortalAccountsTab 
            organizationId={organization.id}
            organizationName={organization.name}
          />
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <TimelineTab organizationId={organization.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
