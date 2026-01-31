import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowRight,
  Building2,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  User,
  XCircle,
  CheckCircle2,
  Target,
  Clock,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ar } from 'date-fns/locale';
import { toast } from 'sonner';
import { dealStages, DealStage, formatCurrency } from '@/lib/crm/pipelineConfig';

// Components
import OpportunityTimeline from '@/components/crm/OpportunityTimeline';
import AddNoteModal from '@/components/crm/modals/AddNoteModal';
import ScheduleMeetingModal from '@/components/crm/modals/ScheduleMeetingModal';
import MeetingReportModal from '@/components/crm/modals/MeetingReportModal';
import CreateQuoteModal from '@/components/crm/modals/CreateQuoteModal';
import RejectionModal from '@/components/crm/modals/RejectionModal';
import StageNoteModal from '@/components/crm/modals/StageNoteModal';

interface Deal {
  id: string;
  name: string;
  expected_value: number;
  probability: number;
  stage: string;
  status: string;
  opportunity_type: string | null;
  expected_close_date: string | null;
  next_step: string | null;
  description: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  account_id: string | null;
  account?: { id: string; name: string; contact_email: string } | null;
  owner?: { id: string; full_name: string } | null;
}

interface Quote {
  id: string;
  quote_number: string;
  title: string;
  total_amount: number;
  status: string;
  created_at: string;
  document_url: string | null;
}

type ModalType = 'note' | 'schedule_meeting' | 'meeting_report' | 'create_quote' | 'rejection' | 'stage_note' | null;

export default function DealDetailsPage() {
  const { dealId } = useParams();
  const navigate = useNavigate();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [targetStage, setTargetStage] = useState<DealStage | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (dealId) {
      fetchDeal();
      fetchQuotes();
    }
  }, [dealId]);

  const fetchDeal = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_opportunities')
        .select(`
          *,
          account:client_organizations(id, name, contact_email),
          owner:staff_members!crm_opportunities_owner_id_fkey(id, full_name)
        `)
        .eq('id', dealId)
        .single();

      if (error) throw error;
      setDeal(data);
    } catch (error) {
      console.error('Error fetching deal:', error);
      toast.error('حدث خطأ أثناء جلب بيانات الفرصة');
    } finally {
      setLoading(false);
    }
  };

  const fetchQuotes = async () => {
    try {
      const { data, error } = await supabase
        .from('crm_quotes')
        .select('id, quote_number, title, total_amount, status, created_at, document_url')
        .eq('opportunity_id', dealId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuotes(data || []);
    } catch (error) {
      console.error('Error fetching quotes:', error);
    }
  };

  const openModal = (modal: ModalType, stage?: DealStage) => {
    setTargetStage(stage || null);
    setActiveModal(modal);
  };

  const closeModal = () => {
    setActiveModal(null);
    setTargetStage(null);
  };

  const handleSuccess = () => {
    fetchDeal();
    fetchQuotes();
    setRefreshKey(prev => prev + 1);
  };

  const handleStageClick = (newStage: DealStage) => {
    if (!deal || deal.stage === newStage) return;
    
    switch (newStage) {
      case 'meeting_scheduled':
        openModal('schedule_meeting', newStage);
        break;
      case 'meeting_done':
        openModal('meeting_report', newStage);
        break;
      case 'proposal_sent':
        openModal('create_quote', newStage);
        break;
      case 'rejected':
        openModal('rejection', newStage);
        break;
      default:
        openModal('stage_note', newStage);
        break;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-48" />
            <Skeleton className="h-32" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!deal) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">لم يتم العثور على الفرصة</p>
        <Button onClick={() => navigate('/admin/crm/deals')} className="mt-4">
          العودة للفرص
        </Button>
      </div>
    );
  }

  const stageConfig = dealStages[deal.stage as DealStage];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin/crm/deals')}>
            <ArrowRight className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{deal.name}</h1>
            {deal.account && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Building2 className="w-4 h-4" />
                {deal.account.name}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={`${stageConfig?.bgColor} ${stageConfig?.color}`}>
            {stageConfig?.label || deal.stage}
          </Badge>
          <Badge variant="outline">{deal.probability}%</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Key Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                معلومات الفرصة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">القيمة المتوقعة</p>
                  <p className="text-lg font-semibold text-green-600">
                    {formatCurrency(deal.expected_value)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">الاحتمالية</p>
                  <p className="text-lg font-semibold">{deal.probability}%</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">تاريخ الإغلاق المتوقع</p>
                  <p className="text-sm">
                    {deal.expected_close_date 
                      ? format(new Date(deal.expected_close_date), 'PPP', { locale: ar })
                      : 'غير محدد'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">المسؤول</p>
                  <p className="text-sm flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {deal.owner?.full_name || 'غير محدد'}
                  </p>
                </div>
              </div>

              {deal.next_step && (
                <>
                  <Separator className="my-4" />
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1">الخطوة التالية</p>
                    <p className="text-sm">{deal.next_step}</p>
                  </div>
                </>
              )}

              {deal.description && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">الوصف</p>
                    <p className="text-sm">{deal.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Stage Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                مراحل الفرصة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {Object.entries(dealStages)
                  .filter(([key]) => key !== 'rejected')
                  .map(([key, config], index) => {
                    const isActive = deal.stage === key;
                    const isPast = config.order < (dealStages[deal.stage as DealStage]?.order || 0);
                    const Icon = config.icon;

                    return (
                      <div key={key} className="flex items-center">
                        <Button
                          variant={isActive ? "default" : isPast ? "secondary" : "outline"}
                          size="sm"
                          className={`whitespace-nowrap ${isActive ? config.bgColor + ' ' + config.color : ''}`}
                          onClick={() => !isActive && handleStageClick(key as DealStage)}
                          disabled={deal.stage === 'approved' || deal.stage === 'rejected'}
                        >
                          <Icon className="w-4 h-4 ml-1" />
                          {config.label}
                        </Button>
                        {index < Object.entries(dealStages).filter(([k]) => k !== 'rejected').length - 1 && (
                          <ArrowRight className="w-4 h-4 mx-1 text-muted-foreground flex-shrink-0" />
                        )}
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>

          {/* Quotes */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                عروض الأسعار
              </CardTitle>
              <Button 
                size="sm" 
                onClick={() => openModal('create_quote')}
                disabled={deal.stage === 'approved' || deal.stage === 'rejected'}
              >
                إنشاء عرض جديد
              </Button>
            </CardHeader>
            <CardContent>
              {quotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-4">لا توجد عروض أسعار</p>
              ) : (
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <div key={quote.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <div>
                        <p className="font-medium text-sm">{quote.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {quote.quote_number} • {format(new Date(quote.created_at), 'PPP', { locale: ar })}
                        </p>
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-green-600">{formatCurrency(quote.total_amount)}</p>
                        <Badge variant="outline" className="text-xs">
                          {quote.status === 'sent' ? 'مرسل' : quote.status === 'accepted' ? 'مقبول' : quote.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">إجراءات سريعة</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                className="w-full justify-start" 
                onClick={() => openModal('note')}
              >
                <MessageSquare className="w-4 h-4 ml-2" />
                إضافة ملاحظة
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => openModal('schedule_meeting')}
                disabled={deal.stage === 'approved' || deal.stage === 'rejected'}
              >
                <Calendar className="w-4 h-4 ml-2" />
                جدولة اجتماع
              </Button>
              <Button 
                variant="outline" 
                className="w-full justify-start"
                onClick={() => openModal('create_quote')}
                disabled={deal.stage === 'approved' || deal.stage === 'rejected'}
              >
                <FileText className="w-4 h-4 ml-2" />
                إنشاء عرض سعر
              </Button>
              <Separator />
              {deal.stage !== 'approved' && deal.stage !== 'rejected' && (
                <>
                  <Button 
                    className="w-full justify-start bg-green-600 hover:bg-green-700"
                    onClick={() => handleStageClick('approved')}
                  >
                    <CheckCircle2 className="w-4 h-4 ml-2" />
                    اعتماد الفرصة
                  </Button>
                  <Button 
                    variant="destructive" 
                    className="w-full justify-start"
                    onClick={() => openModal('rejection')}
                  >
                    <XCircle className="w-4 h-4 ml-2" />
                    رفض الفرصة
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <OpportunityTimeline key={refreshKey} opportunityId={deal.id} maxHeight="500px" />

          {/* Metadata */}
          <Card>
            <CardContent className="pt-4">
              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>تاريخ الإنشاء</span>
                  <span>{format(new Date(deal.created_at), 'PPP', { locale: ar })}</span>
                </div>
                <div className="flex justify-between">
                  <span>آخر تحديث</span>
                  <span>{formatDistanceToNow(new Date(deal.updated_at), { addSuffix: true, locale: ar })}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modals */}
      <AddNoteModal
        open={activeModal === 'note'}
        onOpenChange={(open) => !open && closeModal()}
        dealId={deal.id}
        dealName={deal.name}
        onSuccess={handleSuccess}
      />

      <ScheduleMeetingModal
        open={activeModal === 'schedule_meeting'}
        onOpenChange={(open) => !open && closeModal()}
        dealId={deal.id}
        dealName={deal.name}
        currentStage={deal.stage}
        onSuccess={handleSuccess}
      />

      <MeetingReportModal
        open={activeModal === 'meeting_report'}
        onOpenChange={(open) => !open && closeModal()}
        dealId={deal.id}
        dealName={deal.name}
        currentStage={deal.stage}
        onSuccess={handleSuccess}
      />

      <CreateQuoteModal
        open={activeModal === 'create_quote'}
        onOpenChange={(open) => !open && closeModal()}
        dealId={deal.id}
        dealName={deal.name}
        accountId={deal.account_id}
        currentStage={deal.stage}
        currentValue={deal.expected_value}
        onSuccess={handleSuccess}
      />

      <RejectionModal
        open={activeModal === 'rejection'}
        onOpenChange={(open) => !open && closeModal()}
        dealId={deal.id}
        dealName={deal.name}
        dealValue={deal.expected_value}
        currentStage={deal.stage}
        onSuccess={() => {
          handleSuccess();
          navigate('/admin/crm/deals');
        }}
      />

      {targetStage && activeModal === 'stage_note' && (
        <StageNoteModal
          open={true}
          onOpenChange={(open) => !open && closeModal()}
          dealId={deal.id}
          dealName={deal.name}
          currentStage={deal.stage}
          targetStage={targetStage}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
}
