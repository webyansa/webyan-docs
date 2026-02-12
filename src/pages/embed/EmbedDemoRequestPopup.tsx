import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2, User, Mail, Phone, MapPin, Send, CheckCircle2, Loader2, AlertCircle, X,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  organization_name: z.string().min(2, 'اسم الجهة مطلوب').max(100),
  contact_name: z.string().min(2, 'اسم الشخص مطلوب').max(100),
  email: z.string().email('البريد الإلكتروني غير صالح').max(255),
  phone: z.string().regex(/^[+]?[\d\s-]{9,15}$/, 'رقم الجوال غير صالح').optional().or(z.literal('')),
  city: z.string().max(50).optional(),
  interest_type: z.enum(['webyan_subscription', 'custom_platform', 'consulting']),
  organization_size: z.enum(['small', 'medium', 'large']).optional(),
  notes: z.string().max(1000).optional(),
});

type FormData = z.infer<typeof formSchema>;

const interestOptions = [
  { value: 'webyan_subscription', label: 'اشتراك ويبيان', description: 'موقع جاهز باشتراك شهري/سنوي' },
  { value: 'custom_platform', label: 'منصة مخصصة', description: 'تطوير منصة خاصة بمتطلباتكم' },
  { value: 'consulting', label: 'استشارة رقمية', description: 'استشارة في التحول الرقمي' },
];

const sizeOptions = [
  { value: 'small', label: 'صغيرة', desc: 'أقل من 10 موظفين' },
  { value: 'medium', label: 'متوسطة', desc: '10-50 موظف' },
  { value: 'large', label: 'كبيرة', desc: 'أكثر من 50 موظف' },
];

const saudiRegions = [
  'الرياض', 'مكة المكرمة', 'المدينة المنورة', 'المنطقة الشرقية', 'القصيم',
  'عسير', 'تبوك', 'حائل', 'الحدود الشمالية', 'جازان', 'نجران', 'الباحة', 'الجوف',
];

export default function EmbedDemoRequestPopup() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionNumber, setSubmissionNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organization_name: '', contact_name: '', email: '', phone: '', city: '',
      interest_type: 'webyan_subscription', organization_size: undefined, notes: '',
    },
  });

  const selectedInterest = watch('interest_type');

  useEffect(() => {
    window.parent.postMessage({ type: 'WEBYAN_POPUP_STATE', isOpen: true }, '*');
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-demo-request`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': 'webyan_demo_2024_secure_token' },
          body: JSON.stringify({
            ...data,
            phone: data.phone || undefined, city: data.city || undefined,
            organization_size: data.organization_size || undefined, notes: data.notes || undefined,
            source_page: urlParams.get('source_page') || document.referrer || window.location.href,
            utm_source: urlParams.get('utm_source') || undefined,
            utm_campaign: urlParams.get('utm_campaign') || undefined,
            utm_medium: urlParams.get('utm_medium') || undefined,
          }),
        }
      );
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || 'حدث خطأ أثناء إرسال الطلب');
      setSubmissionNumber(result.data?.submission_number || null);
      setIsSuccess(true);
      window.parent.postMessage({ type: 'WEBYAN_FORM_SUBMITTED', success: true }, '*');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    window.parent.postMessage({ type: 'WEBYAN_POPUP_CLOSED' }, '*');
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">تم استلام طلبك بنجاح!</h2>
          <p className="text-gray-500 mb-5 text-sm leading-relaxed">
            شكراً لاهتمامكم بخدمات ويبيان. سيقوم فريقنا بالتواصل معكم في أقرب وقت.
          </p>
          {submissionNumber && (
            <div className="bg-sky-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-sky-500 mb-1">رقم الطلب</p>
              <p className="text-lg font-bold text-sky-700 tracking-wide">{submissionNumber}</p>
            </div>
          )}
          <button
            onClick={handleClose}
            className="w-full py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
          >
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col" dir="rtl">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 bg-gradient-to-l from-sky-500 to-sky-600 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Send className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">طلب عرض توضيحي</h2>
            <p className="text-[11px] text-sky-100">أخبرنا عن جهتكم وسنتواصل معكم</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <form onSubmit={handleSubmit(onSubmit)} className="p-5 space-y-4">
          {error && (
            <div className="bg-red-50 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Organization */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Building2 className="h-4 w-4 text-sky-500" />
              اسم الجهة / الجمعية <span className="text-red-400">*</span>
            </label>
            <input
              {...register('organization_name')}
              placeholder="مثال: جمعية البر الخيرية"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
            />
            {errors.organization_name && <p className="text-xs text-red-500 mt-1">{errors.organization_name.message}</p>}
          </div>

          {/* Contact Name */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <User className="h-4 w-4 text-sky-500" />
              اسم الشخص <span className="text-red-400">*</span>
            </label>
            <input
              {...register('contact_name')}
              placeholder="الاسم الكامل"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
            />
            {errors.contact_name && <p className="text-xs text-red-500 mt-1">{errors.contact_name.message}</p>}
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Mail className="h-4 w-4 text-sky-500" />
                البريد <span className="text-red-400">*</span>
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="email@domain.com"
                dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-left focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
              />
              {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>}
            </div>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
                <Phone className="h-4 w-4 text-sky-500" />
                الجوال
              </label>
              <input
                {...register('phone')}
                type="tel"
                placeholder="05xxxxxxxx"
                dir="ltr"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm text-left focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
              />
              {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
            </div>
          </div>

          {/* Region */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <MapPin className="h-4 w-4 text-sky-500" />
              المنطقة
            </label>
            <select
              {...register('city')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all appearance-none"
            >
              <option value="">اختر المنطقة</option>
              {saudiRegions.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Interest Type */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              نوع الاهتمام <span className="text-red-400">*</span>
            </label>
            <div className="grid gap-2">
              {interestOptions.map((opt) => (
                <label
                  key={opt.value}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all text-sm',
                    selectedInterest === opt.value
                      ? 'border-sky-400 bg-sky-50/70'
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50/30'
                  )}
                >
                  <input
                    type="radio"
                    value={opt.value}
                    {...register('interest_type')}
                    className="accent-sky-500 w-4 h-4"
                  />
                  <div>
                    <p className="font-medium text-gray-800">{opt.label}</p>
                    <p className="text-xs text-gray-400">{opt.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Organization Size */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">حجم الجهة (اختياري)</label>
            <select
              {...register('organization_size')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all appearance-none"
            >
              <option value="">اختر حجم الجهة</option>
              {sizeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label} ({opt.desc})</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1.5 block">ملاحظات (اختياري)</label>
            <textarea
              {...register('notes')}
              placeholder="أخبرنا المزيد عن احتياجاتكم..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50/50 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 transition-all"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 rounded-xl bg-gradient-to-l from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-60 shadow-lg shadow-sky-500/25"
          >
            {isSubmitting ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> جاري الإرسال...</>
            ) : (
              <><Send className="h-4 w-4" /> إرسال الطلب</>
            )}
          </button>

          <p className="text-[11px] text-center text-gray-400">
            بالضغط على "إرسال الطلب" فإنك توافق على{' '}
            <a href="https://webyan.sa/privacy" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">
              سياسة الخصوصية
            </a>
          </p>
        </form>
      </div>
    </div>
  );
}
