import { useState } from 'react';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
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

export default function EmbedDemoRequestPage() {
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

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Get UTM parameters from URL
      const urlParams = new URLSearchParams(window.location.search);
      const utm_source = urlParams.get('utm_source') || undefined;
      const utm_campaign = urlParams.get('utm_campaign') || undefined;
      const utm_medium = urlParams.get('utm_medium') || undefined;

      // Get referrer
      const source_page = document.referrer || window.location.href;

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حدث خطأ غير متوقع');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Success State
  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-sky-50 to-white p-4 md:p-6 flex items-center justify-center">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              تم استلام طلبك بنجاح!
            </h2>
            <p className="text-gray-600 mb-4">
              شكراً لاهتمامكم بخدمات ويبيان. سيقوم فريقنا بالتواصل معكم في أقرب وقت.
            </p>
            {submissionNumber && (
              <div className="bg-sky-50 rounded-lg p-4 mb-4">
                <p className="text-sm text-sky-600 mb-1">رقم الطلب</p>
                <p className="text-xl font-bold text-sky-700">{submissionNumber}</p>
              </div>
            )}
            <p className="text-sm text-gray-500">
              تم إرسال رسالة تأكيد إلى بريدكم الإلكتروني
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-white p-4 md:p-6" dir="rtl">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 mb-4">
            <Send className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            طلب عرض توضيحي
          </h1>
          <p className="text-gray-600">
            أخبرنا عن جهتكم وسنتواصل معكم لتقديم عرض توضيحي مخصص
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-lg p-6 md:p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Error Alert */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">خطأ في الإرسال</p>
                    <p className="text-sm text-red-600">{error}</p>
                  </div>
                </div>
              )}

              {/* Organization Name */}
              <FormField
                control={form.control}
                name="organization_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
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

              {/* Contact Name */}
              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
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

              {/* Email & Phone Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
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
                      <FormLabel className="flex items-center gap-2">
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

              {/* City */}
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-sky-500" />
                      المدينة
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="الرياض، جدة، الدمام..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Interest Type */}
              <FormField
                control={form.control}
                name="interest_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>نوع الاهتمام *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        className="grid gap-3"
                      >
                        {interestOptions.map((option) => (
                          <label
                            key={option.value}
                            className={cn(
                              'flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                              field.value === option.value
                                ? 'border-sky-500 bg-sky-50'
                                : 'border-gray-200 hover:border-gray-300'
                            )}
                          >
                            <RadioGroupItem value={option.value} />
                            <div>
                              <p className="font-medium text-gray-900">{option.label}</p>
                              <p className="text-sm text-gray-500">{option.description}</p>
                            </div>
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Organization Size */}
              <FormField
                control={form.control}
                name="organization_size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حجم الجهة (اختياري)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="اختر حجم الجهة" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sizeOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <span>{option.label}</span>
                              <span className="text-xs text-muted-foreground">
                                ({option.description})
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Notes */}
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات / احتياج مختصر</FormLabel>
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

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full h-12 text-base bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700"
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

              {/* Privacy Note */}
              <p className="text-xs text-center text-gray-500">
                بالضغط على "إرسال الطلب" فإنك توافق على{' '}
                <a href="https://webyan.net/privacy" className="text-sky-600 hover:underline">
                  سياسة الخصوصية
                </a>
              </p>
            </form>
          </Form>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} ويبيان - حلول رقمية للقطاع غير الربحي
          </p>
        </div>
      </div>
    </div>
  );
}
