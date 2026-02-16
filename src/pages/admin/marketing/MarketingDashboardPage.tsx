import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Mail } from 'lucide-react';
import CampaignStatsCards from '@/components/marketing/CampaignStatsCards';
import CampaignsList from '@/components/marketing/CampaignsList';

export default function MarketingDashboardPage() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCampaigns();
  }, [statusFilter]);

  const fetchCampaigns = async () => {
    setLoading(true);
    let query = supabase.from('marketing_campaigns').select('*').order('created_at', { ascending: false }) as any;
    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }
    const { data } = await query;
    setCampaigns(data || []);
    setLoading(false);
  };

  const completedCampaigns = campaigns.filter((c: any) => c.status === 'completed');
  const totalRecipients = completedCampaigns.reduce((sum: number, c: any) => sum + (c.total_recipients || 0), 0);
  const totalSuccess = completedCampaigns.reduce((sum: number, c: any) => sum + (c.success_count || 0), 0);
  const avgDelivery = totalRecipients > 0 ? (totalSuccess / totalRecipients * 100) : 0;

  return (
    <div className="p-6 space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-7 w-7 text-primary" />
            الحملات التسويقية البريدية
          </h1>
          <p className="text-muted-foreground mt-1">إدارة وتتبع حملات البريد الإلكتروني</p>
        </div>
        <Button onClick={() => navigate('/admin/marketing/campaigns/new')} className="gap-2">
          <Plus className="h-4 w-4" />
          حملة جديدة
        </Button>
      </div>

      <CampaignStatsCards
        totalCampaigns={campaigns.length}
        avgDeliveryRate={avgDelivery}
        avgOpenRate={0}
        avgClickRate={0}
      />

      <div className="flex items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="كل الحالات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">كل الحالات</SelectItem>
            <SelectItem value="draft">مسودة</SelectItem>
            <SelectItem value="scheduled">مجدولة</SelectItem>
            <SelectItem value="sending">قيد الإرسال</SelectItem>
            <SelectItem value="completed">مكتملة</SelectItem>
            <SelectItem value="paused">متوقفة</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
      ) : (
        <CampaignsList campaigns={campaigns} />
      )}
    </div>
  );
}
