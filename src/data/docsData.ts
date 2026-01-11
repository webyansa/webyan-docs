// Documentation Data Structure for Webyan Admin Guide

export interface DocTag {
  id: string;
  label: string;
  type: 'level' | 'role' | 'category';
}

export interface DocFAQ {
  question: string;
  answer: string;
}

export interface DocStep {
  stepNumber: number;
  title: string;
  description: string;
  imageUrl?: string;
  note?: string;
}

export interface DocArticle {
  id: string;
  slug: string;
  title: string;
  description: string;
  objective: string;
  targetRoles: string[];
  prerequisites: string[];
  steps: DocStep[];
  notes: string[];
  warnings: string[];
  commonErrors: { error: string; solution: string }[];
  faqs: DocFAQ[];
  relatedArticles: string[];
  tags: string[];
  lastUpdated: string;
  author: string;
  viewCount: number;
}

export interface DocSubModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  articles: DocArticle[];
}

export interface DocModule {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  subModules: DocSubModule[];
}

// Sample Tags
export const docTags: DocTag[] = [
  { id: 'basic', label: 'أساسي', type: 'level' },
  { id: 'advanced', label: 'متقدم', type: 'level' },
  { id: 'admin', label: 'مدير', type: 'role' },
  { id: 'editor', label: 'محرر', type: 'role' },
  { id: 'viewer', label: 'مشاهد', type: 'role' },
  { id: 'requires-permission', label: 'يتطلب صلاحية', type: 'category' },
  { id: 'governance', label: 'حوكمة', type: 'category' },
  { id: 'content', label: 'محتوى', type: 'category' },
  { id: 'site', label: 'موقع', type: 'category' },
];

// Sample Article
const sampleArticle: DocArticle = {
  id: 'add-article',
  slug: 'add-new-article',
  title: 'إضافة مقال جديد',
  description: 'تعلم كيفية إنشاء ونشر مقال جديد في النظام',
  objective: 'إنشاء مقال جديد بمحتوى غني ونشره للزوار',
  targetRoles: ['مدير', 'محرر'],
  prerequisites: [
    'تسجيل الدخول إلى لوحة التحكم',
    'صلاحية إضافة المقالات',
    'وجود فئة واحدة على الأقل للمقالات',
  ],
  steps: [
    {
      stepNumber: 1,
      title: 'الوصول إلى قائمة المقالات',
      description: 'من القائمة الجانبية، اضغط على "إدارة المحتوى" ثم اختر "المقالات".',
      note: 'تأكد من أن لديك الصلاحيات اللازمة للوصول لهذا القسم.',
    },
    {
      stepNumber: 2,
      title: 'النقر على زر إضافة مقال',
      description: 'اضغط على زر "إضافة مقال جديد" في أعلى يسار الصفحة.',
    },
    {
      stepNumber: 3,
      title: 'تعبئة البيانات الأساسية',
      description: 'أدخل عنوان المقال، الوصف المختصر، واختر الفئة المناسبة.',
      note: 'العنوان يجب أن يكون واضحاً وجذاباً للقارئ.',
    },
    {
      stepNumber: 4,
      title: 'كتابة محتوى المقال',
      description: 'استخدم المحرر النصي لكتابة محتوى المقال. يمكنك إضافة صور وروابط وتنسيقات مختلفة.',
    },
    {
      stepNumber: 5,
      title: 'رفع الصورة البارزة',
      description: 'اختر صورة بارزة للمقال بالضغط على "رفع صورة" في قسم الصورة البارزة.',
      note: 'الأبعاد المثالية للصورة: 1200×630 بكسل.',
    },
    {
      stepNumber: 6,
      title: 'ضبط إعدادات SEO',
      description: 'أدخل العنوان والوصف لمحركات البحث في قسم "تحسين محركات البحث".',
    },
    {
      stepNumber: 7,
      title: 'حفظ ونشر المقال',
      description: 'اختر حالة النشر (مسودة/منشور) ثم اضغط على "حفظ".',
    },
  ],
  notes: [
    'يمكنك حفظ المقال كمسودة والعودة لتعديله لاحقاً.',
    'المقالات المنشورة تظهر مباشرة في الموقع.',
    'يمكنك جدولة نشر المقال في تاريخ مستقبلي.',
  ],
  warnings: [
    'تأكد من مراجعة المحتوى قبل النشر لتجنب الأخطاء الإملائية.',
    'الصور الكبيرة جداً قد تؤثر على سرعة تحميل الصفحة.',
  ],
  commonErrors: [
    {
      error: 'لا يمكن حفظ المقال',
      solution: 'تأكد من تعبئة جميع الحقول المطلوبة وأن حجم الصور لا يتجاوز الحد المسموح.',
    },
    {
      error: 'الصورة لا تظهر بعد الرفع',
      solution: 'تأكد من أن صيغة الصورة مدعومة (JPG, PNG, WebP) وأن حجمها أقل من 5 ميجابايت.',
    },
  ],
  faqs: [
    {
      question: 'هل يمكنني تعديل المقال بعد نشره؟',
      answer: 'نعم، يمكنك تعديل المقال في أي وقت من خلال الضغط على زر "تعديل" بجانب المقال.',
    },
    {
      question: 'كيف أحذف مقالاً؟',
      answer: 'اضغط على أيقونة الحذف بجانب المقال، ثم أكد عملية الحذف. يمكنك استعادة المقالات المحذوفة خلال 30 يوماً.',
    },
  ],
  relatedArticles: ['edit-article', 'manage-categories', 'upload-media'],
  tags: ['basic', 'editor', 'content'],
  lastUpdated: '2026-01-10',
  author: 'فريق ويبيان',
  viewCount: 1250,
};

const slidersArticle: DocArticle = {
  id: 'manage-sliders',
  slug: 'manage-sliders',
  title: 'إدارة السلايدات المتحركة',
  description: 'دليل شامل لإنشاء وإدارة السلايدات والبنرات الإعلانية',
  objective: 'إنشاء سلايدات جذابة لعرض المحتوى المميز على الصفحة الرئيسية',
  targetRoles: ['مدير', 'محرر'],
  prerequisites: [
    'تسجيل الدخول إلى لوحة التحكم',
    'صلاحية إدارة السلايدات',
  ],
  steps: [
    {
      stepNumber: 1,
      title: 'الوصول إلى قسم السلايدات',
      description: 'من القائمة الجانبية، اختر "إدارة المحتوى" ثم "السلايدات المتحركة".',
    },
    {
      stepNumber: 2,
      title: 'إنشاء سلايد جديد',
      description: 'اضغط على "إضافة سلايد" وأدخل العنوان والوصف.',
    },
    {
      stepNumber: 3,
      title: 'رفع صورة السلايد',
      description: 'اختر صورة عالية الجودة بأبعاد 1920×600 بكسل للحصول على أفضل عرض.',
      note: 'استخدم صور بدقة عالية لضمان وضوح العرض على جميع الأجهزة.',
    },
    {
      stepNumber: 4,
      title: 'إضافة رابط CTA',
      description: 'أدخل نص زر الدعوة للإجراء (CTA) والرابط المستهدف.',
    },
    {
      stepNumber: 5,
      title: 'ترتيب السلايدات',
      description: 'استخدم السحب والإفلات لترتيب السلايدات حسب الأولوية.',
    },
  ],
  notes: [
    'يُنصح بعدم إضافة أكثر من 5 سلايدات للحفاظ على تجربة مستخدم جيدة.',
    'يمكنك جدولة ظهور السلايد في فترة زمنية محددة.',
  ],
  warnings: [
    'تأكد من اختبار السلايدات على الأجهزة المحمولة.',
  ],
  commonErrors: [
    {
      error: 'السلايد لا يظهر على الصفحة الرئيسية',
      solution: 'تأكد من أن حالة السلايد "منشور" وأنه ضمن الفترة الزمنية المحددة.',
    },
  ],
  faqs: [
    {
      question: 'ما هي الأبعاد المثالية لصور السلايد؟',
      answer: 'الأبعاد المثالية هي 1920×600 بكسل لضمان عرض مثالي على جميع الشاشات.',
    },
  ],
  relatedArticles: ['add-article', 'upload-media'],
  tags: ['basic', 'editor', 'content'],
  lastUpdated: '2026-01-09',
  author: 'فريق ويبيان',
  viewCount: 890,
};

// Documentation Modules Structure
export const docModules: DocModule[] = [
  {
    id: 'introduction',
    slug: 'introduction',
    title: 'مقدمة ويبيان',
    description: 'تعرف على منصة ويبيان وهيكل لوحة التحكم',
    icon: 'BookOpen',
    color: 'primary',
    subModules: [
      {
        id: 'what-is-webyan',
        slug: 'what-is-webyan',
        title: 'ما هي منصة ويبيان؟',
        description: 'نظرة عامة على المنصة وإمكانياتها',
        icon: 'Info',
        articles: [],
      },
      {
        id: 'dashboard-overview',
        slug: 'dashboard-overview',
        title: 'هيكل لوحة التحكم',
        description: 'تعرف على أقسام لوحة التحكم وكيفية التنقل',
        icon: 'Layout',
        articles: [],
      },
      {
        id: 'basic-concepts',
        slug: 'basic-concepts',
        title: 'المفاهيم الأساسية',
        description: 'النشر، المسودات، التصنيفات، الوسائط، الصلاحيات',
        icon: 'Lightbulb',
        articles: [],
      },
    ],
  },
  {
    id: 'pages',
    slug: 'pages',
    title: 'إدارة الصفحات',
    description: 'إنشاء وإدارة صفحات الموقع والأقسام والقوائم',
    icon: 'FileText',
    color: 'secondary',
    subModules: [
      {
        id: 'page-management',
        slug: 'page-management',
        title: 'إدارة الصفحات',
        description: 'إنشاء وتعديل وحذف صفحات الموقع',
        icon: 'File',
        articles: [],
      },
      {
        id: 'sections',
        slug: 'sections',
        title: 'إدارة الأقسام',
        description: 'تنظيم محتوى الصفحات في أقسام',
        icon: 'Layers',
        articles: [],
      },
      {
        id: 'menus',
        slug: 'menus',
        title: 'إدارة القوائم',
        description: 'إنشاء وترتيب قوائم التنقل',
        icon: 'Menu',
        articles: [],
      },
    ],
  },
  {
    id: 'content',
    slug: 'content',
    title: 'إدارة المحتوى',
    description: 'المقالات والفئات والسلايدات المتحركة',
    icon: 'PenTool',
    color: 'accent',
    subModules: [
      {
        id: 'articles',
        slug: 'articles',
        title: 'إدارة المقالات',
        description: 'إنشاء وتحرير ونشر المقالات',
        icon: 'FileEdit',
        articles: [sampleArticle],
      },
      {
        id: 'article-categories',
        slug: 'article-categories',
        title: 'فئات المقالات',
        description: 'تنظيم المقالات في فئات',
        icon: 'FolderTree',
        articles: [],
      },
      {
        id: 'sliders',
        slug: 'sliders',
        title: 'السلايدات المتحركة',
        description: 'إدارة البنرات والسلايدات الإعلانية',
        icon: 'Image',
        articles: [slidersArticle],
      },
    ],
  },
  {
    id: 'services',
    slug: 'services',
    title: 'إدارة الخدمات',
    description: 'عرض وإدارة خدمات المؤسسة',
    icon: 'Briefcase',
    color: 'primary',
    subModules: [
      {
        id: 'service-management',
        slug: 'service-management',
        title: 'إدارة الخدمات',
        description: 'إضافة وتعديل الخدمات المقدمة',
        icon: 'Settings',
        articles: [],
      },
      {
        id: 'service-categories',
        slug: 'service-categories',
        title: 'فئات الخدمات',
        description: 'تصنيف الخدمات في مجموعات',
        icon: 'FolderTree',
        articles: [],
      },
    ],
  },
  {
    id: 'projects',
    slug: 'projects',
    title: 'إدارة المشاريع',
    description: 'توثيق وعرض مشاريع المؤسسة',
    icon: 'FolderKanban',
    color: 'secondary',
    subModules: [
      {
        id: 'project-management',
        slug: 'project-management',
        title: 'إدارة المشاريع',
        description: 'إضافة وتعديل المشاريع',
        icon: 'Folder',
        articles: [],
      },
      {
        id: 'project-categories',
        slug: 'project-categories',
        title: 'فئات المشاريع',
        description: 'تصنيف المشاريع',
        icon: 'FolderTree',
        articles: [],
      },
      {
        id: 'project-phases',
        slug: 'project-phases',
        title: 'مراحل المشروع',
        description: 'إدارة مراحل تنفيذ المشاريع',
        icon: 'GitBranch',
        articles: [],
      },
    ],
  },
  {
    id: 'events',
    slug: 'events',
    title: 'الأنشطة والفعاليات',
    description: 'إدارة الفعاليات والأنشطة',
    icon: 'Calendar',
    color: 'accent',
    subModules: [
      {
        id: 'event-management',
        slug: 'event-management',
        title: 'إدارة الفعاليات',
        description: 'إنشاء وجدولة الفعاليات',
        icon: 'CalendarPlus',
        articles: [],
      },
      {
        id: 'event-categories',
        slug: 'event-categories',
        title: 'فئات الفعاليات',
        description: 'تصنيف الفعاليات',
        icon: 'FolderTree',
        articles: [],
      },
    ],
  },
  {
    id: 'governance',
    slug: 'governance',
    title: 'إدارة الحوكمة',
    description: 'ملفات وسياسات الحوكمة المؤسسية',
    icon: 'Shield',
    color: 'primary',
    subModules: [
      {
        id: 'governance-files',
        slug: 'governance-files',
        title: 'ملفات الحوكمة',
        description: 'رفع وإدارة وثائق الحوكمة',
        icon: 'FileCheck',
        articles: [],
      },
      {
        id: 'governance-categories',
        slug: 'governance-categories',
        title: 'فئات الحوكمة',
        description: 'تصنيف وثائق الحوكمة',
        icon: 'FolderTree',
        articles: [],
      },
    ],
  },
  {
    id: 'hr',
    slug: 'hr',
    title: 'الموارد البشرية',
    description: 'إدارة فريق العمل والأقسام والوظائف',
    icon: 'Users',
    color: 'secondary',
    subModules: [
      {
        id: 'team',
        slug: 'team',
        title: 'فريق العمل',
        description: 'إدارة بيانات الموظفين',
        icon: 'UserCircle',
        articles: [],
      },
      {
        id: 'departments',
        slug: 'departments',
        title: 'الأقسام',
        description: 'الهيكل التنظيمي للأقسام',
        icon: 'Building',
        articles: [],
      },
      {
        id: 'jobs',
        slug: 'jobs',
        title: 'الوظائف',
        description: 'إدارة المسميات الوظيفية',
        icon: 'Briefcase',
        articles: [],
      },
    ],
  },
  {
    id: 'communication',
    slug: 'communication',
    title: 'إدارة التواصل',
    description: 'الرسائل والطلبات الواردة',
    icon: 'MessageSquare',
    color: 'accent',
    subModules: [
      {
        id: 'messages',
        slug: 'messages',
        title: 'الرسائل الواردة',
        description: 'إدارة رسائل الزوار',
        icon: 'Mail',
        articles: [],
      },
      {
        id: 'job-applicants',
        slug: 'job-applicants',
        title: 'المتقدمين للتوظيف',
        description: 'مراجعة طلبات التوظيف',
        icon: 'UserCheck',
        articles: [],
      },
      {
        id: 'volunteers',
        slug: 'volunteers',
        title: 'المتقدمين للتطوع',
        description: 'إدارة طلبات التطوع',
        icon: 'Heart',
        articles: [],
      },
    ],
  },
  {
    id: 'users',
    slug: 'users',
    title: 'إدارة المستخدمين',
    description: 'المستخدمين والأدوار والصلاحيات',
    icon: 'UserCog',
    color: 'primary',
    subModules: [
      {
        id: 'user-management',
        slug: 'user-management',
        title: 'المستخدمين',
        description: 'إدارة حسابات المستخدمين',
        icon: 'Users',
        articles: [],
      },
      {
        id: 'roles-permissions',
        slug: 'roles-permissions',
        title: 'الأدوار والصلاحيات',
        description: 'نظام RBAC وإدارة الأذونات',
        icon: 'Key',
        articles: [],
      },
    ],
  },
  {
    id: 'settings',
    slug: 'settings',
    title: 'الإعدادات والتهيئة',
    description: 'إعدادات الموقع والنظام',
    icon: 'Settings',
    color: 'secondary',
    subModules: [
      {
        id: 'site-settings',
        slug: 'site-settings',
        title: 'إعدادات الموقع',
        description: 'الإعدادات العامة للموقع',
        icon: 'Globe',
        articles: [],
      },
      {
        id: 'languages',
        slug: 'languages',
        title: 'اللغات والترجمة',
        description: 'إدارة لغات الموقع',
        icon: 'Languages',
        articles: [],
      },
      {
        id: 'locations',
        slug: 'locations',
        title: 'الدول والمناطق',
        description: 'قوائم الدول والمناطق',
        icon: 'MapPin',
        articles: [],
      },
      {
        id: 'identity-types',
        slug: 'identity-types',
        title: 'أنواع الهويات',
        description: 'إدارة أنواع وثائق الهوية',
        icon: 'CreditCard',
        articles: [],
      },
      {
        id: 'issuers',
        slug: 'issuers',
        title: 'جهات الإصدار',
        description: 'قائمة الجهات المصدرة',
        icon: 'Building2',
        articles: [],
      },
      {
        id: 'clients',
        slug: 'clients',
        title: 'إدارة العملاء',
        description: 'العملاء وأنواعهم',
        icon: 'UsersRound',
        articles: [],
      },
      {
        id: 'partners',
        slug: 'partners',
        title: 'الشركاء والموردين',
        description: 'إدارة شركاء النجاح',
        icon: 'Handshake',
        articles: [],
      },
    ],
  },
];

// Helper functions
export function findArticleBySlug(slug: string): DocArticle | undefined {
  for (const module of docModules) {
    for (const subModule of module.subModules) {
      const article = subModule.articles.find(a => a.slug === slug);
      if (article) return article;
    }
  }
  return undefined;
}

export function findModuleBySlug(slug: string): DocModule | undefined {
  return docModules.find(m => m.slug === slug);
}

export function findSubModuleBySlug(moduleSlug: string, subModuleSlug: string): DocSubModule | undefined {
  const module = findModuleBySlug(moduleSlug);
  return module?.subModules.find(sm => sm.slug === subModuleSlug);
}

export function getAllArticles(): DocArticle[] {
  const articles: DocArticle[] = [];
  for (const module of docModules) {
    for (const subModule of module.subModules) {
      articles.push(...subModule.articles);
    }
  }
  return articles;
}

export function getPopularArticles(limit: number = 5): DocArticle[] {
  return getAllArticles()
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, limit);
}

export function searchArticles(query: string): DocArticle[] {
  const lowerQuery = query.toLowerCase();
  return getAllArticles().filter(article => 
    article.title.toLowerCase().includes(lowerQuery) ||
    article.description.toLowerCase().includes(lowerQuery) ||
    article.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}
