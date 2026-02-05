import { useState, useCallback, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertTriangle, Info, UserPlus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface ClientsImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface ParsedClient {
  name: string;
  organization_type: string;
  contact_email: string;
  contact_phone: string;
  city: string;
  registration_number: string;
  website_url: string;
  primary_contact_name: string;
  primary_contact_email: string;
  primary_contact_phone: string;
  subscription_status: string;
  subscription_plan: string;
  isValid: boolean;
  errors: string[];
  autoFilled: string[];
}

const organizationTypeMap: Record<string, string> = {
  'جمعية خيرية': 'charity',
  'منظمة غير ربحية': 'nonprofit',
  'مؤسسة': 'foundation',
  'جمعية تعاونية': 'cooperative',
  'أخرى': 'other',
  'charity': 'charity',
  'nonprofit': 'nonprofit',
  'foundation': 'foundation',
  'cooperative': 'cooperative',
  'other': 'other',
};

const subscriptionStatusMap: Record<string, string> = {
  'تجريبي': 'trial',
  'نشط': 'active',
  'في انتظار التجديد': 'pending_renewal',
  'منتهي': 'expired',
  'ملغي': 'cancelled',
  'trial': 'trial',
  'active': 'active',
  'pending_renewal': 'pending_renewal',
  'expired': 'expired',
  'cancelled': 'cancelled',
};

const DEFAULT_REGISTRATION_NUMBER = '123456789';
const DEFAULT_PORTAL_PASSWORD = 'Portal@123';

export function ClientsImportDialog({ open, onOpenChange, onSuccess }: ClientsImportDialogProps) {
  const [parsedData, setParsedData] = useState<ParsedClient[]>([]);
  const [importing, setImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [createPortalAccounts, setCreatePortalAccounts] = useState(true);
  const [defaultPlanId, setDefaultPlanId] = useState<string | null>(null);
  const [defaultPlanName, setDefaultPlanName] = useState<string>('الخطة الأساسية');

  // Fetch default plan on mount
  useEffect(() => {
    const fetchDefaultPlan = async () => {
      const { data } = await supabase
        .from('pricing_plans')
        .select('id, name')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(1);
      
      if (data && data.length > 0) {
        setDefaultPlanId(data[0].id);
        setDefaultPlanName(data[0].name);
      }
    };
    fetchDefaultPlan();
  }, []);

  const downloadTemplate = () => {
    const templateData = [
      {
        'اسم المؤسسة': 'مثال: جمعية البر الخيرية',
        'نوع المؤسسة': 'جمعية خيرية',
        'البريد الإلكتروني': 'example@org.com',
        'رقم الهاتف': '0512345678',
        'المدينة': 'الرياض',
        'رقم الترخيص': '12345',
        'الموقع الإلكتروني': 'https://example.org',
        'اسم جهة الاتصال': 'أحمد محمد',
        'بريد جهة الاتصال': 'ahmed@org.com',
        'جوال جهة الاتصال': '0551234567',
        'حالة الاشتراك': 'نشط',
        'الباقة': 'basic',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'العملاء');
    
    // Set RTL and column widths
    ws['!cols'] = [
      { wch: 25 }, { wch: 15 }, { wch: 25 }, { wch: 15 },
      { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 20 },
      { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 12 },
    ];

    XLSX.writeFile(wb, 'نموذج_استيراد_العملاء.xlsx');
    toast.success('تم تحميل النموذج');
  };

  const validateEmail = (email: string): boolean => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const parseFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);

        const parsed: ParsedClient[] = jsonData.map((row: any) => {
          const errors: string[] = [];
          const autoFilled: string[] = [];
          
          const name = row['اسم المؤسسة']?.toString().trim() || '';
          const contact_email = row['البريد الإلكتروني']?.toString().trim() || '';
          const contact_phone = row['رقم الهاتف']?.toString().trim() || '';
          const orgType = row['نوع المؤسسة']?.toString().trim() || '';
          const status = row['حالة الاشتراك']?.toString().trim() || '';
          
          // Get primary contact info from file
          let primary_contact_name = row['اسم جهة الاتصال']?.toString().trim() || '';
          let primary_contact_email = row['بريد جهة الاتصال']?.toString().trim() || '';
          let primary_contact_phone = row['جوال جهة الاتصال']?.toString().trim() || '';
          
          // Get registration number
          let registration_number = row['رقم الترخيص']?.toString().trim() || '';

          // Validation
          if (!name) errors.push('اسم المؤسسة مطلوب');
          if (!contact_email) errors.push('البريد الإلكتروني مطلوب');
          else if (!validateEmail(contact_email)) errors.push('البريد الإلكتروني غير صالح');
          
          // Smart auto-fill: If no primary contact info, use organization info
          if (!primary_contact_name && name) {
            primary_contact_name = name;
            autoFilled.push('اسم جهة الاتصال');
          }
          
          if (!primary_contact_email && contact_email) {
            primary_contact_email = contact_email;
            autoFilled.push('بريد جهة الاتصال');
          }
          
          if (!primary_contact_phone && contact_phone) {
            primary_contact_phone = contact_phone;
            autoFilled.push('جوال جهة الاتصال');
          }
          
          // Smart auto-fill: If no registration number, use default
          if (!registration_number) {
            registration_number = DEFAULT_REGISTRATION_NUMBER;
            autoFilled.push('رقم الترخيص');
          }

          const mappedOrgType = organizationTypeMap[orgType] || 'other';
          const mappedStatus = subscriptionStatusMap[status] || 'trial';

          return {
            name,
            organization_type: mappedOrgType,
            contact_email,
            contact_phone,
            city: row['المدينة']?.toString().trim() || '',
            registration_number,
            website_url: row['الموقع الإلكتروني']?.toString().trim() || '',
            primary_contact_name,
            primary_contact_email,
            primary_contact_phone,
            subscription_status: mappedStatus,
            subscription_plan: row['الباقة']?.toString().trim() || 'basic',
            isValid: errors.length === 0,
            errors,
            autoFilled,
          };
        });

        setParsedData(parsed);
      } catch (error) {
        console.error('Error parsing file:', error);
        toast.error('حدث خطأ أثناء قراءة الملف');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      parseFile(file);
    } else {
      toast.error('يرجى رفع ملف Excel فقط (.xlsx أو .xls)');
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      parseFile(file);
    }
  };

  const handleImport = async () => {
    const validClients = parsedData.filter(c => c.isValid);
    if (validClients.length === 0) {
      toast.error('لا توجد بيانات صالحة للاستيراد');
      return;
    }

    setImporting(true);
    let accountsCreated = 0;
    
    try {
      const clientsToInsert = validClients.map(client => ({
        name: client.name,
        organization_type: client.organization_type as any,
        contact_email: client.contact_email,
        contact_phone: client.contact_phone || null,
        city: client.city || null,
        registration_number: client.registration_number || DEFAULT_REGISTRATION_NUMBER,
        website_url: client.website_url || null,
        primary_contact_name: client.primary_contact_name || null,
        primary_contact_email: client.primary_contact_email || null,
        primary_contact_phone: client.primary_contact_phone || null,
        subscription_status: client.subscription_status as any,
        subscription_plan: defaultPlanId, // Always use default plan
        use_org_contact_info: !client.autoFilled.length ? false : true,
      }));

      const { data: insertedOrgs, error } = await supabase
        .from('client_organizations')
        .insert(clientsToInsert)
        .select('id, contact_email, name');

      if (error) throw error;

      // Create portal accounts if enabled
      if (createPortalAccounts && insertedOrgs && insertedOrgs.length > 0) {
        for (const org of insertedOrgs) {
          if (org.contact_email) {
            try {
              const { error: accountError } = await supabase.functions.invoke('create-client-account', {
                body: {
                  organization_id: org.id,
                  full_name: org.name,
                  email: org.contact_email,
                  password: DEFAULT_PORTAL_PASSWORD,
                  is_primary_contact: true
                }
              });
              
              if (!accountError) {
                accountsCreated++;
              } else {
                console.warn(`Failed to create account for ${org.contact_email}:`, accountError);
              }
            } catch (err) {
              console.warn(`Error creating account for ${org.contact_email}:`, err);
            }
          }
        }
      }

      let successMessage = `تم استيراد ${validClients.length} عميل بنجاح`;
      
      if (createPortalAccounts && accountsCreated > 0) {
        successMessage += ` وإنشاء ${accountsCreated} حساب بوابة`;
      }
      
      const autoFilledCount = validClients.filter(c => c.autoFilled.length > 0).length;
      if (autoFilledCount > 0) {
        successMessage += ` (${autoFilledCount} تم تعبئة بياناتهم تلقائياً)`;
      }
      
      toast.success(successMessage);
      
      setParsedData([]);
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error importing clients:', error);
      toast.error('حدث خطأ أثناء استيراد العملاء');
    } finally {
      setImporting(false);
    }
  };

  const validCount = parsedData.filter(c => c.isValid).length;
  const invalidCount = parsedData.filter(c => !c.isValid).length;
  const autoFilledCount = parsedData.filter(c => c.autoFilled.length > 0).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            استيراد العملاء من Excel
          </DialogTitle>
          <DialogDescription>
            قم بتحميل نموذج Excel وتعبئته ثم رفعه لاستيراد العملاء
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Download Template */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Download className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">تحميل نموذج Excel</p>
                <p className="text-sm text-muted-foreground">قم بتحميل النموذج وتعبئته بالبيانات</p>
              </div>
            </div>
            <Button variant="outline" onClick={downloadTemplate}>
              <Download className="w-4 h-4 ml-2" />
              تحميل النموذج
            </Button>
          </div>

          {/* Smart Import Info */}
          <Alert className="border-primary/20 bg-primary/5">
            <Info className="w-4 h-4 text-primary" />
            <AlertDescription className="text-foreground/80 text-sm">
              <strong>استيراد ذكي:</strong> سيتم تطبيق الإعدادات التالية تلقائياً:
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-muted-foreground">
                <li>الخطة الافتراضية: <strong className="text-foreground">{defaultPlanName}</strong></li>
                <li>رقم الترخيص الافتراضي: <code className="bg-muted px-1 rounded">{DEFAULT_REGISTRATION_NUMBER}</code></li>
                <li>بيانات جهة الاتصال تُؤخذ من بيانات المؤسسة إذا لم تتوفر</li>
              </ul>
            </AlertDescription>
          </Alert>

          {/* Portal Account Creation Option */}
          <div className="flex items-center gap-3 p-4 bg-muted/30 rounded-lg border">
            <Checkbox
              id="create-portal-accounts"
              checked={createPortalAccounts}
              onCheckedChange={(checked) => setCreatePortalAccounts(checked as boolean)}
            />
            <div className="flex-1">
              <Label htmlFor="create-portal-accounts" className="flex items-center gap-2 cursor-pointer">
                <UserPlus className="w-4 h-4 text-primary" />
                <span className="font-medium">إنشاء حسابات بوابة العملاء تلقائياً</span>
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                سيتم إنشاء حساب لكل عميل باستخدام بريده الرسمي وكلمة المرور الافتراضية: <code className="bg-muted px-1 rounded">{DEFAULT_PORTAL_PASSWORD}</code>
              </p>
            </div>
          </div>

          {/* Upload Area */}
          {parsedData.length === 0 && (
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleFileDrop}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-lg font-medium mb-2">اسحب ملف Excel هنا</p>
              <p className="text-sm text-muted-foreground mb-4">أو انقر لاختيار الملف</p>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileSelect}
                className="hidden"
                id="excel-upload"
              />
              <Button variant="outline" asChild>
                <label htmlFor="excel-upload" className="cursor-pointer">
                  اختيار ملف
                </label>
              </Button>
            </div>
          )}

          {/* Preview Data */}
          {parsedData.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="w-3 h-3 text-primary" />
                  صالح: {validCount}
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    غير صالح: {invalidCount}
                  </Badge>
                )}
                {autoFilledCount > 0 && (
                  <Badge variant="outline" className="gap-1 border-primary/30 text-primary bg-primary/5">
                    <Info className="w-3 h-3" />
                    تعبئة تلقائية: {autoFilledCount}
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[280px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] sticky top-0 bg-background">الحالة</TableHead>
                      <TableHead className="sticky top-0 bg-background">اسم المؤسسة</TableHead>
                      <TableHead className="sticky top-0 bg-background">البريد الإلكتروني</TableHead>
                      <TableHead className="sticky top-0 bg-background">رقم الترخيص</TableHead>
                      <TableHead className="sticky top-0 bg-background">جهة الاتصال</TableHead>
                      <TableHead className="sticky top-0 bg-background">ملاحظات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((client, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {client.isValid ? (
                            <CheckCircle className="w-5 h-5 text-primary" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{client.name || '-'}</TableCell>
                        <TableCell>{client.contact_email || '-'}</TableCell>
                        <TableCell>
                          <span className={client.autoFilled.includes('رقم الترخيص') ? 'text-primary' : ''}>
                            {client.registration_number || '-'}
                          </span>
                          {client.autoFilled.includes('رقم الترخيص') && (
                            <span className="text-xs text-primary/70 mr-1">(افتراضي)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={client.autoFilled.includes('بريد جهة الاتصال') ? 'text-primary' : ''}>
                            {client.primary_contact_email || '-'}
                          </span>
                          {client.autoFilled.includes('بريد جهة الاتصال') && (
                            <span className="text-xs text-primary/70 mr-1">(من المؤسسة)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {client.errors.length > 0 && (
                            <div className="flex items-center gap-1 text-destructive text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              {client.errors.join('، ')}
                            </div>
                          )}
                          {client.autoFilled.length > 0 && client.errors.length === 0 && (
                            <div className="flex items-center gap-1 text-primary text-xs">
                              <Info className="w-3 h-3" />
                              تعبئة تلقائية: {client.autoFilled.join('، ')}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>
          )}
        </div>

        {/* Sticky Footer with Action Buttons */}
        {parsedData.length > 0 && (
          <div className="flex gap-2 justify-end pt-4 border-t mt-4 bg-background">
            <Button variant="outline" onClick={() => setParsedData([])}>
              إلغاء
            </Button>
            <Button onClick={handleImport} disabled={importing || validCount === 0}>
              {importing && <Loader2 className="w-4 h-4 ml-2 animate-spin" />}
              استيراد {validCount} عميل
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
