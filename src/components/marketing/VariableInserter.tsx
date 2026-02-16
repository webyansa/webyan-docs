import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Variable } from 'lucide-react';

const variables = [
  { key: '{{OrganizationName}}', label: 'اسم المنظمة' },
  { key: '{{PlanName}}', label: 'اسم الباقة' },
  { key: '{{SubscriptionStatus}}', label: 'حالة الاشتراك' },
  { key: '{{SubscriptionEndDate}}', label: 'تاريخ انتهاء الاشتراك' },
  { key: '{{RemainingDays}}', label: 'الأيام المتبقية' },
  { key: '{{City}}', label: 'المدينة' },
  { key: '{{ContactName}}', label: 'اسم جهة الاتصال' },
  { key: '{{ContactEmail}}', label: 'البريد الإلكتروني' },
  { key: '{{LoginUrl}}', label: 'رابط تسجيل الدخول' },
  { key: '{{UnsubscribeUrl}}', label: 'رابط إلغاء الاشتراك' },
];

interface Props {
  onInsert: (variable: string) => void;
}

export default function VariableInserter({ onInsert }: Props) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Variable className="h-4 w-4" />
          إدراج متغير
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground px-2 py-1">المتغيرات الديناميكية</p>
          {variables.map((v) => (
            <button
              key={v.key}
              onClick={() => onInsert(v.key)}
              className="w-full text-right px-3 py-2 text-sm rounded-md hover:bg-muted transition-colors flex justify-between items-center"
            >
              <span>{v.label}</span>
              <code className="text-xs text-muted-foreground">{v.key}</code>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
