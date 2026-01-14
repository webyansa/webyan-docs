import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { 
  Ticket, 
  Send,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Monitor,
  CreditCard,
  Sparkles,
  GraduationCap,
  MoreHorizontal,
  AlertTriangle,
  Clock,
  Zap,
  Flame,
  X,
  Minimize2,
  Maximize2,
  MessageCircle,
  Headphones
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  logo_url?: string;
  contact_email?: string;
}

const categories = [
  { value: 'technical', label: 'مشكلة تقنية', icon: Monitor, color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' },
  { value: 'billing', label: 'الفواتير', icon: CreditCard, color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
  { value: 'feature', label: 'طلب ميزة', icon: Sparkles, color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
  { value: 'training', label: 'التدريب', icon: GraduationCap, color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  { value: 'other', label: 'أخرى', icon: MoreHorizontal, color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100' },
];

const priorities = [
  { value: 'low', label: 'منخفضة', icon: Clock, color: 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100', description: 'يمكن الانتظار' },
  { value: 'medium', label: 'متوسطة', icon: AlertTriangle, color: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100', description: 'يحتاج حل قريب' },
  { value: 'high', label: 'عالية', icon: Zap, color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100', description: 'يؤثر على العمل' },
  { value: 'urgent', label: 'عاجلة', icon: Flame, color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100', description: 'توقف كامل' },
];

const EmbedTicketPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const mode = searchParams.get('mode') || 'full'; // full, compact, widget
  const theme = searchParams.get('theme') || 'light'; // light, dark
  const primaryColor = searchParams.get('color') || '#3b82f6';
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isMinimized, setIsMinimized] = useState(mode === 'widget');
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'technical',
    priority: 'medium',
    contactName: '',
    contactEmail: '',
    websiteUrl: ''
  });

  useEffect(() => {
    verifyToken();
  }, [token]);

  // Listen for postMessage from parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === 'WEBYAN_OPEN_WIDGET') {
        setIsMinimized(false);
      } else if (event.data.type === 'WEBYAN_CLOSE_WIDGET') {
        setIsMinimized(true);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  // Send ready message to parent
  useEffect(() => {
    if (!loading && !error) {
      window.parent.postMessage({ type: 'WEBYAN_WIDGET_READY' }, '*');
    }
  }, [loading, error]);

  const verifyToken = async () => {
    if (!token) {
      setError('رمز التضمين مفقود');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('verify-embed-token', {
        body: { token },
        headers: {
          'x-embed-origin': window.location.origin
        }
      });

      if (error || !data?.valid) {
        setError(data?.error || 'رمز التضمين غير صالح أو منتهي الصلاحية');
        setLoading(false);
        return;
      }

      setOrganization(data.organization);
      setLoading(false);
    } catch (err) {
      console.error('Token verification error:', err);
      setError('حدث خطأ في التحقق من الرمز');
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.subject.trim() || !formData.description.trim()) {
      toast.error('يرجى ملء الحقول المطلوبة');
      return;
    }

    setSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-embed-ticket', {
        body: {
          token,
          ...formData
        },
        headers: {
          'x-embed-origin': window.location.origin
        }
      });

      if (error || !data?.success) {
        throw new Error(data?.error || 'فشل في إنشاء التذكرة');
      }

      setTicketNumber(data.ticketNumber);
      setSubmitted(true);
      
      // Notify parent window
      window.parent.postMessage({ 
        type: 'WEBYAN_TICKET_CREATED', 
        ticketNumber: data.ticketNumber 
      }, '*');
    } catch (err: any) {
      console.error('Submit error:', err);
      toast.error(err.message || 'حدث خطأ أثناء إرسال التذكرة');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setTicketNumber('');
    setStep(1);
    setFormData({
      subject: '',
      description: '',
      category: 'technical',
      priority: 'medium',
      contactName: '',
      contactEmail: '',
      websiteUrl: ''
    });
  };

  // Loading state
  if (loading) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4",
        theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 to-slate-100'
      )} dir="rtl">
        <div className="text-center">
          <div className="relative">
            <div className="w-16 h-16 rounded-full border-4 border-primary/20 animate-pulse mx-auto" />
            <Loader2 className="w-8 h-8 animate-spin text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
          <p className={cn("mt-4", theme === 'dark' ? 'text-slate-400' : 'text-muted-foreground')}>
            جاري التحقق...
          </p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4",
        theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-red-50 to-orange-50'
      )} dir="rtl">
        <div className={cn(
          "rounded-2xl shadow-xl p-8 max-w-md w-full text-center border",
          theme === 'dark' ? 'bg-slate-800 border-red-900' : 'bg-white border-red-100'
        )}>
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-red-500/30">
            <AlertCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className={cn("text-xl font-bold mb-2", theme === 'dark' ? 'text-white' : 'text-gray-900')}>
            رمز غير صالح
          </h2>
          <p className={cn("mb-6", theme === 'dark' ? 'text-slate-400' : 'text-gray-600')}>
            {error}
          </p>
          <div className={cn(
            "p-4 rounded-xl text-sm",
            theme === 'dark' ? 'bg-slate-700 text-slate-300' : 'bg-gray-50 text-gray-500'
          )}>
            <p>إذا كنت تعتقد أن هذا خطأ، يرجى التواصل مع مسؤول النظام.</p>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (submitted) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-4",
        theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-green-50 to-emerald-50'
      )} dir="rtl">
        <div className={cn(
          "rounded-2xl shadow-xl p-8 max-w-md w-full text-center border",
          theme === 'dark' ? 'bg-slate-800 border-green-900' : 'bg-white border-green-100'
        )}>
          <div className="relative mb-6">
            <div className="w-24 h-24 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-xl shadow-green-500/30">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center animate-bounce shadow-lg">
              <span className="text-lg">🎉</span>
            </div>
          </div>
          
          <h2 className={cn("text-2xl font-bold mb-2", theme === 'dark' ? 'text-white' : 'text-gray-900')}>
            تم إرسال التذكرة بنجاح!
          </h2>
          <p className={cn("mb-6", theme === 'dark' ? 'text-slate-400' : 'text-gray-600')}>
            سيتم التواصل معك في أقرب وقت ممكن
          </p>
          
          <div className={cn(
            "rounded-2xl p-6 mb-6 border",
            theme === 'dark' 
              ? 'bg-gradient-to-br from-emerald-900/50 to-green-900/50 border-green-700' 
              : 'bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20'
          )}>
            <p className={cn("text-sm mb-2", theme === 'dark' ? 'text-slate-400' : 'text-gray-500')}>
              رقم التذكرة
            </p>
            <p className="text-3xl font-bold font-mono text-primary">{ticketNumber}</p>
          </div>

          <p className={cn("text-sm mb-6", theme === 'dark' ? 'text-slate-500' : 'text-gray-500')}>
            احتفظ برقم التذكرة للمتابعة
          </p>

          <Button 
            onClick={resetForm}
            variant="outline"
            className="w-full"
          >
            <MessageCircle className="w-4 h-4 ml-2" />
            إرسال تذكرة أخرى
          </Button>
        </div>
      </div>
    );
  }

  // Compact mode - Step form
  if (mode === 'compact') {
    return (
      <div className={cn(
        "min-h-screen p-4",
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      )} dir="rtl">
        <div className="max-w-md mx-auto">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
              <Headphones className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className={cn("font-bold", theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                الدعم الفني
              </h1>
              <p className={cn("text-xs", theme === 'dark' ? 'text-slate-400' : 'text-gray-500')}>
                {organization?.name}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-2 mb-6">
            {[1, 2, 3].map((s) => (
              <div 
                key={s}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all duration-300",
                  s <= step 
                    ? 'bg-primary' 
                    : theme === 'dark' ? 'bg-slate-700' : 'bg-gray-200'
                )}
              />
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                    ما نوع المشكلة؟
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.slice(0, 4).map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.value })}
                        className={cn(
                          "flex items-center gap-2 p-3 rounded-xl border-2 transition-all",
                          formData.category === cat.value
                            ? 'border-primary bg-primary/5 text-primary'
                            : theme === 'dark' 
                              ? 'border-slate-700 text-slate-300 hover:border-slate-600' 
                              : 'border-gray-200 text-gray-600 hover:border-gray-300'
                        )}
                      >
                        <cat.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <Button 
                  type="button" 
                  onClick={() => setStep(2)} 
                  className="w-full"
                >
                  التالي
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                    عنوان المشكلة
                  </Label>
                  <Input
                    placeholder="صف المشكلة بجملة واحدة..."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                    التفاصيل
                  </Label>
                  <Textarea
                    placeholder="اشرح المشكلة بالتفصيل..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)} 
                    className="flex-1"
                  >
                    السابق
                  </Button>
                  <Button 
                    type="button" 
                    onClick={() => setStep(3)} 
                    className="flex-1"
                    disabled={!formData.subject || !formData.description}
                  >
                    التالي
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                    الاسم (اختياري)
                  </Label>
                  <Input
                    placeholder="اسمك الكريم"
                    value={formData.contactName}
                    onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                    البريد الإلكتروني (اختياري)
                  </Label>
                  <Input
                    type="email"
                    placeholder="email@example.com"
                    value={formData.contactEmail}
                    onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                    dir="ltr"
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(2)} 
                    className="flex-1"
                  >
                    السابق
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 ml-2" />
                        إرسال
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // Full mode - Original form
  return (
    <div className={cn(
      "min-h-screen p-4 md:p-6",
      theme === 'dark' ? 'bg-slate-900' : 'bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50'
    )} dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className={cn(
          "rounded-2xl shadow-sm border p-6 mb-6",
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        )}>
          <div className="flex items-center gap-4">
            {organization?.logo_url ? (
              <img src={organization.logo_url} alt={organization.name} className="w-14 h-14 rounded-xl object-cover" />
            ) : (
              <div className="w-14 h-14 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg shadow-primary/25">
                <Ticket className="w-7 h-7 text-white" />
              </div>
            )}
            <div>
              <h1 className={cn("text-xl font-bold", theme === 'dark' ? 'text-white' : 'text-gray-900')}>
                فتح تذكرة دعم
              </h1>
              <p className={cn("text-sm", theme === 'dark' ? 'text-slate-400' : 'text-gray-500')}>
                {organization?.name || 'مركز الدعم'}
              </p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className={cn(
          "rounded-2xl shadow-sm border overflow-hidden",
          theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
        )}>
          <div className="p-6 space-y-6">
            {/* Contact Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactName" className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                  الاسم
                </Label>
                <Input
                  id="contactName"
                  placeholder="اسمك الكريم"
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className={cn(
                    "h-12 rounded-xl",
                    theme === 'dark' ? 'bg-slate-900 border-slate-600' : 'border-slate-200'
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactEmail" className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                  البريد الإلكتروني
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="example@domain.com"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  className={cn(
                    "h-12 rounded-xl",
                    theme === 'dark' ? 'bg-slate-900 border-slate-600' : 'border-slate-200'
                  )}
                  dir="ltr"
                />
              </div>
            </div>

            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="subject" className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                عنوان المشكلة <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subject"
                placeholder="اكتب عنواناً مختصراً يصف المشكلة"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                required
                className={cn(
                  "h-12 rounded-xl",
                  theme === 'dark' ? 'bg-slate-900 border-slate-600' : 'border-slate-200'
                )}
              />
            </div>

            {/* Category */}
            <div className="space-y-3">
              <Label className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>نوع المشكلة</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, category: cat.value })}
                    className={cn(
                      "flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200",
                      formData.category === cat.value
                        ? cat.color + " border-current ring-2 ring-current/20"
                        : theme === 'dark' 
                          ? 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <cat.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Priority */}
            <div className="space-y-3">
              <Label className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>الأولوية</Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {priorities.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority: p.value })}
                    className={cn(
                      "flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all duration-200",
                      formData.priority === p.value
                        ? p.color + " border-current ring-2 ring-current/20"
                        : theme === 'dark' 
                          ? 'bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-500' 
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    <p.icon className="w-5 h-5" />
                    <span className="text-xs font-medium">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Website URL */}
            <div className="space-y-2">
              <Label htmlFor="websiteUrl" className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                رابط الصفحة (اختياري)
              </Label>
              <Input
                id="websiteUrl"
                type="url"
                placeholder="https://example.com/page"
                value={formData.websiteUrl}
                onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                className={cn(
                  "h-12 rounded-xl",
                  theme === 'dark' ? 'bg-slate-900 border-slate-600' : 'border-slate-200'
                )}
                dir="ltr"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                وصف المشكلة <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="description"
                placeholder="اشرح المشكلة بالتفصيل... ما الذي حدث؟ ما الخطوات التي قمت بها؟"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={5}
                required
                className={cn(
                  "rounded-xl resize-none",
                  theme === 'dark' ? 'bg-slate-900 border-slate-600' : 'border-slate-200'
                )}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className={cn(
            "border-t p-6",
            theme === 'dark' ? 'bg-slate-900/50 border-slate-700' : 'bg-slate-50 border-slate-200'
          )}>
            <Button 
              type="submit" 
              disabled={submitting}
              className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 transition-all duration-200"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                  جاري الإرسال...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5 ml-2" />
                  إرسال التذكرة
                </>
              )}
            </Button>
          </div>
        </form>

        {/* Footer */}
        <div className={cn(
          "text-center mt-6 text-sm",
          theme === 'dark' ? 'text-slate-500' : 'text-gray-500'
        )}>
          <p>مركز دعم ويبيان - نحن هنا لمساعدتك</p>
        </div>
      </div>
    </div>
  );
};

export default EmbedTicketPage;
