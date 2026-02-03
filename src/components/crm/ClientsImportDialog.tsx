import { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
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

export function ClientsImportDialog({ open, onOpenChange, onSuccess }: ClientsImportDialogProps) {
  const [parsedData, setParsedData] = useState<ParsedClient[]>([]);
  const [importing, setImporting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

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
          
          const name = row['اسم المؤسسة']?.toString().trim() || '';
          const contact_email = row['البريد الإلكتروني']?.toString().trim() || '';
          const orgType = row['نوع المؤسسة']?.toString().trim() || '';
          const status = row['حالة الاشتراك']?.toString().trim() || '';

          if (!name) errors.push('اسم المؤسسة مطلوب');
          if (!contact_email) errors.push('البريد الإلكتروني مطلوب');
          else if (!validateEmail(contact_email)) errors.push('البريد الإلكتروني غير صالح');
          
          const mappedOrgType = organizationTypeMap[orgType] || 'other';
          const mappedStatus = subscriptionStatusMap[status] || 'trial';

          return {
            name,
            organization_type: mappedOrgType,
            contact_email,
            contact_phone: row['رقم الهاتف']?.toString().trim() || '',
            city: row['المدينة']?.toString().trim() || '',
            registration_number: row['رقم الترخيص']?.toString().trim() || '',
            website_url: row['الموقع الإلكتروني']?.toString().trim() || '',
            primary_contact_name: row['اسم جهة الاتصال']?.toString().trim() || '',
            primary_contact_email: row['بريد جهة الاتصال']?.toString().trim() || '',
            primary_contact_phone: row['جوال جهة الاتصال']?.toString().trim() || '',
            subscription_status: mappedStatus,
            subscription_plan: row['الباقة']?.toString().trim() || 'basic',
            isValid: errors.length === 0,
            errors,
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
    try {
      const clientsToInsert = validClients.map(client => ({
        name: client.name,
        organization_type: client.organization_type as any,
        contact_email: client.contact_email,
        contact_phone: client.contact_phone || null,
        city: client.city || null,
        registration_number: client.registration_number || null,
        website_url: client.website_url || null,
        primary_contact_name: client.primary_contact_name || null,
        primary_contact_email: client.primary_contact_email || null,
        primary_contact_phone: client.primary_contact_phone || null,
        subscription_status: client.subscription_status as any,
        subscription_plan: client.subscription_plan || null,
      }));

      const { error } = await supabase
        .from('client_organizations')
        .insert(clientsToInsert);

      if (error) throw error;

      toast.success(`تم استيراد ${validClients.length} عميل بنجاح`);
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
              <div className="flex items-center gap-4">
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="w-3 h-3 text-green-600" />
                  صالح: {validCount}
                </Badge>
                {invalidCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    غير صالح: {invalidCount}
                  </Badge>
                )}
              </div>

              <ScrollArea className="h-[250px] border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px] sticky top-0 bg-background">الحالة</TableHead>
                      <TableHead className="sticky top-0 bg-background">اسم المؤسسة</TableHead>
                      <TableHead className="sticky top-0 bg-background">البريد الإلكتروني</TableHead>
                      <TableHead className="sticky top-0 bg-background">نوع المؤسسة</TableHead>
                      <TableHead className="sticky top-0 bg-background">المدينة</TableHead>
                      <TableHead className="sticky top-0 bg-background">الأخطاء</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.map((client, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {client.isValid ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-destructive" />
                          )}
                        </TableCell>
                        <TableCell className="font-medium">{client.name || '-'}</TableCell>
                        <TableCell>{client.contact_email || '-'}</TableCell>
                        <TableCell>{client.organization_type}</TableCell>
                        <TableCell>{client.city || '-'}</TableCell>
                        <TableCell>
                          {client.errors.length > 0 && (
                            <div className="flex items-center gap-1 text-destructive text-xs">
                              <AlertTriangle className="w-3 h-3" />
                              {client.errors.join('، ')}
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
