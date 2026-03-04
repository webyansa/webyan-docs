import { Eye, BarChart3, Heart, Share2, MousePointerClick, UserPlus, Play, Bookmark, User, ShoppingCart } from 'lucide-react';

export interface KpiMetric {
  key: string;
  label: string;
  labelEn: string;
  description: string;
  icon: any;
  color: string; // tailwind color class suffix
  category: 'awareness' | 'engagement' | 'conversion' | 'growth';
}

export const KPI_METRICS: KpiMetric[] = [
  {
    key: 'reach',
    label: 'الوصول',
    labelEn: 'Reach',
    description: 'عدد الأشخاص الفريدين الذين شاهدوا المحتوى',
    icon: Eye,
    color: 'blue',
    category: 'awareness',
  },
  {
    key: 'impressions',
    label: 'الظهور',
    labelEn: 'Impressions',
    description: 'إجمالي مرات عرض المحتوى',
    icon: BarChart3,
    color: 'indigo',
    category: 'awareness',
  },
  {
    key: 'engagement',
    label: 'التفاعل',
    labelEn: 'Engagement',
    description: 'إعجابات + تعليقات + حفظ',
    icon: Heart,
    color: 'pink',
    category: 'engagement',
  },
  {
    key: 'shares',
    label: 'المشاركات',
    labelEn: 'Shares',
    description: 'مشاركات وإعادة نشر',
    icon: Share2,
    color: 'violet',
    category: 'engagement',
  },
  {
    key: 'link_clicks',
    label: 'نقرات الروابط',
    labelEn: 'Link Clicks',
    description: 'عدد النقرات على الروابط',
    icon: MousePointerClick,
    color: 'amber',
    category: 'conversion',
  },
  {
    key: 'new_followers',
    label: 'متابعون جدد',
    labelEn: 'New Followers',
    description: 'عدد المتابعين الجدد',
    icon: UserPlus,
    color: 'emerald',
    category: 'growth',
  },
  {
    key: 'video_views',
    label: 'مشاهدات الفيديو',
    labelEn: 'Video Views',
    description: 'عدد مشاهدات محتوى الفيديو',
    icon: Play,
    color: 'red',
    category: 'awareness',
  },
  {
    key: 'saves',
    label: 'الحفظ',
    labelEn: 'Saves',
    description: 'عدد مرات حفظ المحتوى',
    icon: Bookmark,
    color: 'orange',
    category: 'engagement',
  },
  {
    key: 'profile_visits',
    label: 'زيارات الملف',
    labelEn: 'Profile Visits',
    description: 'زيارات الملف الشخصي من المحتوى',
    icon: User,
    color: 'cyan',
    category: 'growth',
  },
  {
    key: 'conversions',
    label: 'التحويلات',
    labelEn: 'Conversions',
    description: 'تسجيل أو شراء أو طلب عرض',
    icon: ShoppingCart,
    color: 'green',
    category: 'conversion',
  },
];

export const KPI_CATEGORIES = [
  { key: 'awareness', label: 'الوعي والانتشار' },
  { key: 'engagement', label: 'التفاعل' },
  { key: 'conversion', label: 'التحويل' },
  { key: 'growth', label: 'النمو' },
] as const;

export type KpiTargets = Record<string, number>;
export type KpiMetrics = Record<string, number>;

export function getMetricConfig(key: string): KpiMetric | undefined {
  return KPI_METRICS.find(m => m.key === key);
}

export function calculatePerformance(actual: number, target: number): number {
  if (target <= 0) return 0;
  return Math.round((actual / target) * 100);
}

export function getPerformanceColor(pct: number): string {
  if (pct >= 80) return 'text-green-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-red-600';
}

export function getPerformanceBgColor(pct: number): string {
  if (pct >= 80) return 'bg-green-500';
  if (pct >= 50) return 'bg-amber-500';
  return 'bg-red-500';
}

export function aggregateMetrics(items: Array<{ metrics?: KpiMetrics | null }>): KpiMetrics {
  const result: KpiMetrics = {};
  for (const item of items) {
    if (!item.metrics) continue;
    for (const [key, value] of Object.entries(item.metrics)) {
      if (typeof value === 'number') {
        result[key] = (result[key] || 0) + value;
      }
    }
  }
  return result;
}
