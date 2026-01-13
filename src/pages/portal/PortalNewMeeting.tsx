import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import { 
  Calendar, 
  ArrowRight,
  Loader2,
  Clock,
  Video,
  CheckCircle2,
  Info,
  Sparkles
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { MeetingCalendar } from '@/components/booking/MeetingCalendar';
import { cn } from '@/lib/utils';

const meetingTypes = [
  { value: 'general', label: 'اجتماع عام', description: 'مناقشة عامة أو استفسارات', icon: '💬', color: 'bg-blue-100 border-blue-200' },
  { value: 'training', label: 'جلسة تدريبية', description: 'تدريب على استخدام المنصة', icon: '📚', color: 'bg-green-100 border-green-200' },
  { value: 'support', label: 'دعم فني', description: 'حل مشكلة تقنية', icon: '🔧', color: 'bg-orange-100 border-orange-200' },
  { value: 'demo', label: 'عرض توضيحي', description: 'عرض ميزات جديدة', icon: '🎬', color: 'bg-purple-100 border-purple-200' },
  { value: 'consultation', label: 'استشارة', description: 'استشارة تقنية أو إدارية', icon: '💡', color: 'bg-pink-100 border-pink-200' },
];

const durations = [
  { value: 15, label: '15 دقيقة', description: 'مناسب للاستفسارات السريعة' },
  { value: 30, label: '30 دقيقة', description: 'الخيار الأكثر شيوعاً' },
  { value: 45, label: '45 دقيقة', description: 'للمواضيع المتوسطة' },
  { value: 60, label: 'ساعة كاملة', description: 'للتدريب والمواضيع المعقدة' },
];

const steps = [
  { id: 1, title: 'نوع الاجتماع', description: 'اختر نوع الاجتماع' },
  { id: 2, title: 'الموعد', description: 'حدد التاريخ والوقت' },
  { id: 3, title: 'التفاصيل', description: 'أضف المزيد من المعلومات' },
  { id: 4, title: 'المراجعة', description: 'تأكيد الحجز' },
];

const PortalNewMeeting = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  
  const [formData, setFormData] = useState({
    meeting_type: '',
    subject: '',
    description: '',
    duration_minutes: 30
  });

  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizationId();
  }, [user]);

  const fetchOrganizationId = async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('client_accounts')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (data) {
      setOrganizationId(data.organization_id);
    }
  };

  const handleSubmit = async () => {
    if (!formData.subject || !selectedDate || !selectedTime) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!organizationId) {
      toast.error('حدث خطأ. يرجى تحديث الصفحة والمحاولة مرة أخرى');
      return;
    }

    setLoading(true);

    try {
      const [hours, minutes] = selectedTime.split(':').map(Number);
      const preferredDateTime = new Date(selectedDate);
      preferredDateTime.setHours(hours, minutes, 0, 0);

      const { error } = await supabase
        .from('meeting_requests')
        .insert({
          organization_id: organizationId,
          requested_by: user?.id,
          meeting_type: formData.meeting_type,
          subject: formData.subject,
          description: formData.description || null,
          preferred_date: preferredDateTime.toISOString(),
          duration_minutes: formData.duration_minutes,
          status: 'pending'
        });

      if (error) throw error;

      toast.success('تم إرسال طلب الاجتماع بنجاح! سيتم إشعارك عند التأكيد.');
      navigate('/portal/meetings');
    } catch (error) {
      console.error('Error creating meeting request:', error);
      toast.error('حدث خطأ أثناء إرسال الطلب');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.meeting_type !== '';
      case 2:
        return selectedDate !== null && selectedTime !== null;
      case 3:
        return formData.subject.trim() !== '';
      case 4:
        return true;
      default:
        return false;
    }
  };

  const nextStep = () => {
    if (canProceed() && currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const progress = (currentStep / 4) * 100;

  const selectedMeetingType = meetingTypes.find(t => t.value === formData.meeting_type);
  const selectedDuration = durations.find(d => d.value === formData.duration_minutes);

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4 gap-2">
          <Link to="/portal/meetings">
            <ArrowRight className="w-4 h-4" />
            العودة للاجتماعات
          </Link>
        </Button>
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl bg-primary/10">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
              حجز موعد اجتماع
            </h1>
            <p className="text-muted-foreground">حدد موعداً مناسباً للاجتماع مع فريق ويبيان</p>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex items-center gap-2",
                index < steps.length - 1 && "flex-1"
              )}
            >
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                  currentStep === step.id && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  currentStep > step.id && "bg-green-500 text-white",
                  currentStep < step.id && "bg-muted text-muted-foreground"
                )}
              >
                {currentStep > step.id ? <CheckCircle2 className="h-5 w-5" /> : step.id}
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "flex-1 h-1 rounded-full mx-2",
                  currentStep > step.id ? "bg-green-500" : "bg-muted"
                )} />
              )}
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-muted-foreground">
          {steps.map((step) => (
            <span key={step.id} className={cn(
              currentStep === step.id && "text-primary font-medium"
            )}>
              {step.title}
            </span>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="mb-6">
        <CardContent className="p-6">
          {/* Step 1: Meeting Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">ما نوع الاجتماع الذي تحتاجه؟</h2>
                <p className="text-muted-foreground text-sm">اختر النوع الأنسب لموضوعك</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {meetingTypes.map((type) => (
                  <button
                    key={type.value}
                    onClick={() => setFormData({ ...formData, meeting_type: type.value })}
                    className={cn(
                      "p-4 rounded-xl border-2 text-right transition-all hover:shadow-md",
                      formData.meeting_type === type.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : `${type.color} hover:border-primary/30`
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">{type.icon}</span>
                      <div className="flex-1">
                        <p className="font-semibold">{type.label}</p>
                        <p className="text-sm text-muted-foreground">{type.description}</p>
                      </div>
                      {formData.meeting_type === type.value && (
                        <CheckCircle2 className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              <div className="pt-4 border-t">
                <Label className="text-base font-semibold mb-3 block">مدة الاجتماع</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {durations.map((d) => (
                    <button
                      key={d.value}
                      onClick={() => setFormData({ ...formData, duration_minutes: d.value })}
                      className={cn(
                        "p-3 rounded-lg border-2 text-center transition-all",
                        formData.duration_minutes === d.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-center justify-center gap-2 mb-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{d.label}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{d.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Date & Time */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">متى تفضل الاجتماع؟</h2>
                <p className="text-muted-foreground text-sm">اختر التاريخ والوقت المناسب</p>
              </div>

              <MeetingCalendar
                selectedDate={selectedDate}
                selectedTime={selectedTime}
                duration={formData.duration_minutes}
                onDateSelect={setSelectedDate}
                onTimeSelect={setSelectedTime}
              />
            </div>
          )}

          {/* Step 3: Details */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-2">أخبرنا المزيد عن اجتماعك</h2>
                <p className="text-muted-foreground text-sm">هذه المعلومات تساعدنا على الاستعداد بشكل أفضل</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">موضوع الاجتماع *</Label>
                  <Input
                    id="subject"
                    placeholder="مثال: تدريب على لوحة التحكم الجديدة"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">تفاصيل إضافية (اختياري)</Label>
                  <Textarea
                    id="description"
                    placeholder="اكتب أي تفاصيل أو أسئلة تريد مناقشتها في الاجتماع..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={5}
                  />
                </div>

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">نصيحة:</p>
                    <p>كلما كانت التفاصيل أوضح، كلما استطعنا تقديم مساعدة أفضل في الاجتماع.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-primary" />
                <div>
                  <h2 className="text-xl font-semibold">مراجعة وتأكيد الحجز</h2>
                  <p className="text-muted-foreground text-sm">تأكد من صحة المعلومات قبل الإرسال</p>
                </div>
              </div>

              <div className="grid gap-4">
                <div className="p-4 rounded-xl bg-muted/50 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{selectedMeetingType?.icon}</span>
                    <div>
                      <p className="text-sm text-muted-foreground">نوع الاجتماع</p>
                      <p className="font-semibold">{selectedMeetingType?.label}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">التاريخ والوقت</p>
                      <p className="font-semibold">
                        {selectedDate && format(selectedDate, 'EEEE d MMMM yyyy', { locale: ar })}
                        {' - '}
                        {selectedTime}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Clock className="h-6 w-6 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">المدة</p>
                      <p className="font-semibold">{selectedDuration?.label}</p>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border">
                  <p className="text-sm text-muted-foreground mb-1">الموضوع</p>
                  <p className="font-semibold text-lg">{formData.subject}</p>
                  {formData.description && (
                    <>
                      <p className="text-sm text-muted-foreground mt-3 mb-1">التفاصيل</p>
                      <p className="text-sm">{formData.description}</p>
                    </>
                  )}
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                  <Video className="h-5 w-5 text-green-600 mt-0.5" />
                  <div className="text-sm text-green-800">
                    <p className="font-medium mb-1">ماذا بعد؟</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>سيتم مراجعة طلبك من قبل فريقنا</li>
                      <li>ستتلقى إشعاراً بتأكيد الموعد أو اقتراح موعد بديل</li>
                      <li>سيتم إرسال رابط الاجتماع إلى بريدك الإلكتروني</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={currentStep === 1}
          className="gap-2"
        >
          <ArrowRight className="h-4 w-4" />
          السابق
        </Button>

        {currentStep < 4 ? (
          <Button
            onClick={nextStep}
            disabled={!canProceed()}
            className="gap-2"
          >
            التالي
            <ArrowRight className="h-4 w-4 rotate-180" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={loading || !canProceed()}
            className="gap-2 bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            تأكيد الحجز
          </Button>
        )}
      </div>
    </div>
  );
};

export default PortalNewMeeting;
