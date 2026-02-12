import { useState, useEffect, useRef } from 'react';
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
  Headphones,
  Upload,
  Image as ImageIcon,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import EmbedChatWidget from '@/components/chat/EmbedChatWidget';

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const EmbedTicketPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const apiKey = searchParams.get('key');
  const activeKey = apiKey || token; // Prefer API key, fallback to legacy token
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
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: 'technical',
    priority: 'medium',
    contactName: '',
    contactEmail: '',
    websiteUrl: '',
    screenshotUrl: ''
  });

  useEffect(() => {
    verifyToken();
  }, [activeKey]);

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
    if (!activeKey) {
      setError('رمز التضمين أو مفتاح API مفقود');
      setLoading(false);
      return;
    }

    try {
      const body = activeKey.startsWith('wbyn_') 
        ? { apiKey: activeKey } 
        : { token: activeKey };
      
      const { data, error } = await supabase.functions.invoke('verify-embed-token', {
        body,
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
      
      // Auto-fill contact info from organization data
      const orgId = data.organization?.id;
      if (orgId) {
        // Fetch primary contact name and email
        const { data: primaryContact } = await supabase
          .from('client_accounts')
          .select('full_name, email')
          .eq('organization_id', orgId)
          .eq('is_primary_contact', true)
          .eq('is_active', true)
          .maybeSingle();

        let contact = primaryContact;
        if (!contact) {
          const { data: anyContact } = await supabase
            .from('client_accounts')
            .select('full_name, email')
            .eq('organization_id', orgId)
            .eq('is_active', true)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          contact = anyContact;
        }

        setFormData(prev => ({
          ...prev,
          contactName: contact?.full_name || '',
          contactEmail: contact?.email || data.organization?.contact_email || ''
        }));
      } else if (data.organization?.contact_email) {
        setFormData(prev => ({
          ...prev,
          contactEmail: data.organization.contact_email
        }));
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Token verification error:', err);
      setError('حدث خطأ في التحقق من الرمز');
      setLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast.error('نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, GIF, WebP');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error('حجم الملف كبير جداً. الحد الأقصى 5 ميجابايت');
      return;
    }

    setSelectedImage(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!selectedImage) return null;

    setUploadingImage(true);
    try {
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `embed-tickets/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('ticket-attachments')
        .upload(fileName, selectedImage, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error('فشل رفع الصورة');
        return null;
      }

      const { data: urlData } = supabase.storage
        .from('ticket-attachments')
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Upload error:', err);
      return null;
    } finally {
      setUploadingImage(false);
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
      // Upload image if selected
      let screenshotUrl = null;
      if (selectedImage) {
        screenshotUrl = await uploadImage();
      }

      const submitBody: any = {
        ...formData,
        screenshotUrl,
      };
      // Use apiKey or token based on which one is active
      if (activeKey?.startsWith('wbyn_')) {
        submitBody.apiKey = activeKey;
      } else {
        submitBody.token = activeKey;
      }

      const { data, error } = await supabase.functions.invoke('create-embed-ticket', {
        body: submitBody,
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
    setSelectedImage(null);
    setImagePreview(null);
    setFormData({
      subject: '',
      description: '',
      category: 'technical',
      priority: 'medium',
      contactName: '',
      contactEmail: organization?.contact_email || '',
      websiteUrl: '',
      screenshotUrl: ''
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
        "min-h-screen",
        theme === 'dark' ? 'bg-slate-900' : 'bg-white'
      )} dir="rtl">
        <div className="max-w-md mx-auto">
          {/* Header with gradient */}
          <div 
            className="p-5 text-white relative overflow-hidden"
            style={{ background: `linear-gradient(135deg, #263c84 0%, #24c2ec 100%)` }}
          >
            <div className="absolute -top-10 -left-10 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
            <div className="relative flex items-center gap-3">
              <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center shadow-lg">
                <Headphones className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">الدعم الفني</h1>
                <p className="text-xs text-white/80">{organization?.name}</p>
              </div>
              <button
                onClick={() => window.parent.postMessage({ type: 'WEBYAN_TICKET_CREATED' }, '*')}
                className="mr-auto p-2 rounded-xl hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-1.5 px-5 pt-4 pb-2">
            {[1, 2].map((s) => (
              <div 
                key={s}
                className={cn(
                  "h-1 flex-1 rounded-full transition-all duration-500",
                  s <= step 
                    ? 'bg-gradient-to-r from-[#263c84] to-[#24c2ec]' 
                    : theme === 'dark' ? 'bg-slate-700' : 'bg-slate-200'
                )}
              />
            ))}
          </div>

          {/* Contact info banner (when auto-filled) */}
          {formData.contactName && (
            <div className={cn(
              "mx-5 mt-2 px-4 py-2.5 rounded-xl flex items-center gap-3 text-sm border",
              theme === 'dark' ? 'bg-slate-800/50 border-slate-700 text-slate-300' : 'bg-blue-50/60 border-blue-100 text-slate-600'
            )}>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#263c84] to-[#24c2ec] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {formData.contactName.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className={cn("font-medium text-sm truncate", theme === 'dark' ? 'text-white' : 'text-slate-800')}>{formData.contactName}</p>
                {formData.contactEmail && (
                  <p className="text-xs truncate opacity-70">{formData.contactEmail}</p>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {step === 1 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", theme === 'dark' ? 'text-white' : 'text-slate-700')}>
                    ما نوع المشكلة؟
                  </Label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.slice(0, 4).map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat.value })}
                        className={cn(
                          "flex items-center gap-2.5 p-3.5 rounded-xl border-2 transition-all duration-200",
                          formData.category === cat.value
                            ? 'border-[#263c84] bg-[#263c84]/5 text-[#263c84] shadow-sm'
                            : theme === 'dark' 
                              ? 'border-slate-700 text-slate-300 hover:border-slate-600' 
                              : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                        )}
                      >
                        <cat.icon className="w-4.5 h-4.5" />
                        <span className="text-sm font-medium">{cat.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", theme === 'dark' ? 'text-white' : 'text-slate-700')}>
                    الأولوية
                  </Label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {priorities.map((p) => (
                      <button
                        key={p.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, priority: p.value })}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2.5 rounded-xl border transition-all duration-200 text-center",
                          formData.priority === p.value
                            ? p.color + " border-current ring-1 ring-current/20"
                            : theme === 'dark' 
                              ? 'border-slate-700 text-slate-400 hover:border-slate-600' 
                              : 'border-slate-200 text-slate-500 hover:border-slate-300'
                        )}
                      >
                        <p.icon className="w-4 h-4" />
                        <span className="text-[10px] font-medium">{p.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Button 
                  type="button" 
                  onClick={() => setStep(2)} 
                  className="w-full h-11 rounded-xl bg-gradient-to-r from-[#263c84] to-[#24c2ec] hover:opacity-90 text-white shadow-lg"
                >
                  التالي
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4 animate-in slide-in-from-right-4">
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", theme === 'dark' ? 'text-white' : 'text-slate-700')}>
                    عنوان المشكلة <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    placeholder="صف المشكلة بجملة واحدة..."
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    required
                    className={cn("h-11 rounded-xl", theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'border-slate-200')}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={cn("text-sm font-semibold", theme === 'dark' ? 'text-white' : 'text-slate-700')}>
                    التفاصيل <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    placeholder="اشرح المشكلة بالتفصيل..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    required
                    className={cn("rounded-xl resize-none", theme === 'dark' ? 'bg-slate-800 border-slate-700' : 'border-slate-200')}
                  />
                </div>

                {/* Screenshot upload */}
                <div className={cn(
                  "border-2 border-dashed rounded-xl p-3 transition-all",
                  theme === 'dark' ? 'border-slate-700' : 'border-slate-200',
                  imagePreview && 'border-[#263c84]/40'
                )}>
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="معاينة" className="max-h-32 mx-auto rounded-lg object-contain" />
                      <Button type="button" variant="destructive" size="icon" className="absolute top-1 left-1 h-7 w-7" onClick={removeImage}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 cursor-pointer py-2">
                      <Upload className={cn("w-4 h-4", theme === 'dark' ? 'text-slate-400' : 'text-slate-500')} />
                      <span className={cn("text-xs", theme === 'dark' ? 'text-slate-400' : 'text-slate-500')}>
                        إرفاق صورة (اختياري)
                      </span>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleImageSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setStep(1)} 
                    className="flex-1 h-11 rounded-xl"
                  >
                    السابق
                  </Button>
                  <Button 
                    type="submit" 
                    className="flex-1 h-11 rounded-xl bg-gradient-to-r from-[#263c84] to-[#24c2ec] hover:opacity-90 text-white shadow-lg"
                    disabled={submitting || !formData.subject || !formData.description}
                  >
                    {submitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4 ml-2" />
                        إرسال التذكرة
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className={cn("text-center pb-4 text-[10px]", theme === 'dark' ? 'text-slate-600' : 'text-slate-400')}>
            🔒 بياناتك آمنة ومحمية
          </div>
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

            {/* Screenshot Upload */}
            <div className="space-y-2">
              <Label className={theme === 'dark' ? 'text-white' : 'text-gray-700'}>
                إرفاق صورة (اختياري)
              </Label>
              <div className={cn(
                "border-2 border-dashed rounded-xl p-4 transition-all",
                theme === 'dark' ? 'border-slate-600 hover:border-slate-500' : 'border-slate-200 hover:border-slate-300',
                imagePreview && 'border-primary/50'
              )}>
                {imagePreview ? (
                  <div className="relative">
                    <img 
                      src={imagePreview} 
                      alt="معاينة الصورة" 
                      className="max-h-48 mx-auto rounded-lg object-contain"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 left-2 h-8 w-8"
                      onClick={removeImage}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center cursor-pointer py-4">
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center mb-3",
                      theme === 'dark' ? 'bg-slate-700' : 'bg-slate-100'
                    )}>
                      <Upload className={cn(
                        "w-6 h-6",
                        theme === 'dark' ? 'text-slate-400' : 'text-slate-500'
                      )} />
                    </div>
                    <span className={cn(
                      "text-sm font-medium",
                      theme === 'dark' ? 'text-slate-300' : 'text-slate-700'
                    )}>
                      اضغط لرفع صورة
                    </span>
                    <span className={cn(
                      "text-xs mt-1",
                      theme === 'dark' ? 'text-slate-500' : 'text-slate-400'
                    )}>
                      PNG, JPG, GIF - حد أقصى 5MB
                    </span>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/gif,image/webp"
                      onChange={handleImageSelect}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
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

      {/* Chat Widget */}
      {token && organization && (
        <EmbedChatWidget 
          embedToken={token}
          organizationName={organization.name}
          contactEmail={organization.contact_email}
          primaryColor={primaryColor}
          theme={theme as 'light' | 'dark'}
        />
      )}
    </div>
  );
};

export default EmbedTicketPage;
