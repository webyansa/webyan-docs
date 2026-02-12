import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { cn } from '@/lib/utils';

const formSchema = z.object({
  organization_name: z
    .string()
    .min(2, 'اسم الجهة مطلوب')
    .max(100, 'اسم الجهة طويل جداً'),
  contact_name: z
    .string()
    .min(2, 'اسم الشخص مطلوب')
    .max(100, 'الاسم طويل جداً'),
  email: z
    .string()
    .email('البريد الإلكتروني غير صالح')
    .max(255, 'البريد الإلكتروني طويل جداً'),
  phone: z
    .string()
    .regex(/^[+]?[\d\s-]{9,15}$/, 'رقم الجوال غير صالح')
    .optional()
    .or(z.literal('')),
  city: z.string().max(50, 'اسم المدينة طويل جداً').optional(),
  interest_type: z.enum(['webyan_subscription', 'custom_platform', 'consulting']),
  organization_size: z.enum(['small', 'medium', 'large']).optional(),
  notes: z.string().max(1000, 'الملاحظات طويلة جداً').optional(),
});

type FormData = z.infer<typeof formSchema>;

const interestOptions = [
  {
    value: 'webyan_subscription',
    label: 'اشتراك ويبيان',
    description: 'موقع جاهز باشتراك شهري/سنوي',
  },
  {
    value: 'custom_platform',
    label: 'منصة مخصصة',
    description: 'تطوير منصة خاصة بمتطلباتكم',
  },
  {
    value: 'consulting',
    label: 'استشارة رقمية',
    description: 'استشارة في التحول الرقمي',
  },
];

const sizeOptions = [
  { value: 'small', label: 'صغيرة', description: 'أقل من 10 موظفين' },
  { value: 'medium', label: 'متوسطة', description: '10-50 موظف' },
  { value: 'large', label: 'كبيرة', description: 'أكثر من 50 موظف' },
];

const saudiRegions = [
  { value: 'riyadh', label: 'الرياض' },
  { value: 'makkah', label: 'مكة المكرمة' },
  { value: 'madinah', label: 'المدينة المنورة' },
  { value: 'eastern', label: 'المنطقة الشرقية' },
  { value: 'qassim', label: 'القصيم' },
  { value: 'asir', label: 'عسير' },
  { value: 'tabuk', label: 'تبوك' },
  { value: 'hail', label: 'حائل' },
  { value: 'northern_borders', label: 'الحدود الشمالية' },
  { value: 'jazan', label: 'جازان' },
  { value: 'najran', label: 'نجران' },
  { value: 'baha', label: 'الباحة' },
  { value: 'jouf', label: 'الجوف' },
];

export default function EmbedDemoRequestPopup() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submissionNumber, setSubmissionNumber] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      organization_name: '',
      contact_name: '',
      email: '',
      phone: '',
      city: '',
      interest_type: 'webyan_subscription',
      organization_size: undefined,
      notes: '',
    },
  });

  // Notify parent on mount
  useEffect(() => {
    window.parent.postMessage({ type: 'WEBYAN_POPUP_STATE', isOpen: true }, '*');
  }, []);

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const urlParams = new URLSearchParams(window.location.search);
      const utm_source = urlParams.get('utm_source') || undefined;
      const utm_campaign = urlParams.get('utm_campaign') || undefined;
      const utm_medium = urlParams.get('utm_medium') || undefined;
      const source_page = urlParams.get('source_page') || document.referrer || window.location.href;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-demo-request`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': 'webyan_demo_2024_secure_token',
          },
          body: JSON.stringify({
            ...data,
            phone: data.phone || undefined,
            city: data.city || undefined,
            organization_size: data.organization_size || undefined,
            notes: data.notes || undefined,
            source_page,
            utm_source,
            utm_campaign,
            utm_medium,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'حدث خطأ أثناء إرسال الطلب');
      }

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

  // Success State
  if (isSuccess) {
    return (
      <div className="h-screen bg-white flex items-center justify-center p-6" dir="rtl">
        <div className="w-full max-w-sm text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            تم استلام طلبك بنجاح!
          </h2>
          <p className="text-gray-600 mb-4 text-sm">
            شكراً لاهتمامكم بخدمات ويبيان. سيقوم فريقنا بالتواصل معكم في أقرب وقت.
          </p>
          {submissionNumber && (
            <div className="bg-sky-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-sky-600 mb-1">رقم الطلب</p>
              <p className="text-xl font-bold text-sky-700">{submissionNumber}</p>
            </div>
          )}
          <Button onClick={handleClose} variant="outline" className="px-8">
            إغلاق
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="flex-shrink-0 px-5 py-4 bg-gradient-to-r from-sky-500 to-sky-600 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
            <Send className="h-4 w-4 text-white" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white">طلب عرض توضيحي</h2>
            <p className="text-xs text-sky-100">أخبرنا عن جهتكم وسنتواصل معكم</p>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>
      </div>

      {/* Scrollable Form Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-red-800">خطأ في الإرسال</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              <FormField
                control={form.control}
                name="organization_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4 text-sky-500" />
                      اسم الجهة / الجمعية *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="مثال: جمعية البر الخيرية" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-sky-500" />
                      اسم الشخص *
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="الاسم الكامل" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-sky-500" />
                        البريد الإلكتروني *
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="example@domain.com"
                          dir="ltr"
                          className="text-left"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-sky-500" />
                        رقم الجوال
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="05xxxxxxxx"
                          dir="ltr"
                          className="text-left"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4 text-sky-500" />
                      المنطقة
                    </FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر المنطقة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {saudiRegions.map((region) => (
                          <SelectItem key={region.value} value={region.value}>
                            {region.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interest_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">نوع الاهتمام *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid gap-2"
                      >
                        {interestOptions.map((option) => (
                          <label
                            key={option.value}
                            className={cn(
                              'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                              field.value === option.value
                                ? 'border-sky-500 bg-sky-50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                          >
                            <RadioGroupItem value={option.value} />
                            <div>
                              <p className="font-medium text-gray-900 text-sm">{option.label}</p>
                              <p className="text-xs text-gray-500">{option.description}</p>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="organization_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">حجم الجهة (اختياري)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حجم الجهة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sizeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <span>{option.label}</span>
                            <span className="text-xs text-muted-foreground mr-2">
                              ({option.description})
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-sm">ملاحظات / احتياج مختصر</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="أخبرنا المزيد عن احتياجاتكم..."
                        className="resize-none"
                        rows={3}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                className="w-full h-11 bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <Send className="h-5 w-5 ml-2" />
                    إرسال الطلب
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-gray-500">
                بالضغط على "إرسال الطلب" فإنك توافق على{' '}
                <a
                  href="https://webyan.net/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sky-600 hover:underline"
                >
                  سياسة الخصوصية
                </a>
              </p>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
