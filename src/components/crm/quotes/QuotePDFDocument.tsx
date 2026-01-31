import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer';

// Register Arabic font with error handling
Font.register({
  family: 'Amiri',
  fonts: [
    { 
      src: 'https://fonts.gstatic.com/s/amiri/v27/J7aRnpd8CGxBHqUpvrIw74NL.ttf', 
      fontWeight: 'normal' 
    },
    { 
      src: 'https://fonts.gstatic.com/s/amiri/v27/J7acnpd8CGxBHp2VkZY4xK9CGyAa.ttf', 
      fontWeight: 'bold' 
    },
  ],
});

// Disable hyphenation for Arabic text
Font.registerHyphenationCallback((word) => [word]);

// Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Amiri',
    fontSize: 10,
    padding: 40,
    backgroundColor: '#ffffff',
    direction: 'rtl',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1e40af',
  },
  headerLeft: {
    alignItems: 'flex-start',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
    textAlign: 'right',
  },
  quoteNumber: {
    fontSize: 14,
    color: '#374151',
    fontFamily: 'Courier',
    marginBottom: 5,
  },
  statusBadge: {
    backgroundColor: '#dbeafe',
    color: '#1e40af',
    padding: '4 12',
    borderRadius: 4,
    fontSize: 10,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 10,
    paddingBottom: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    textAlign: 'right',
  },
  infoGrid: {
    flexDirection: 'row-reverse',
    gap: 20,
  },
  infoBox: {
    flex: 1,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  infoLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 5,
    textAlign: 'right',
  },
  infoValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'right',
  },
  infoText: {
    fontSize: 10,
    color: '#4b5563',
    marginTop: 3,
    textAlign: 'right',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#1e40af',
    padding: 10,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    padding: 10,
    backgroundColor: '#ffffff',
  },
  tableRowAlt: {
    backgroundColor: '#f9fafb',
  },
  tableCell: {
    fontSize: 10,
    color: '#374151',
    textAlign: 'center',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  tableCellLeft: {
    textAlign: 'left',
  },
  colNum: { width: '5%' },
  colDesc: { width: '35%' },
  colType: { width: '12%' },
  colPeriod: { width: '12%' },
  colQty: { width: '8%' },
  colPrice: { width: '14%' },
  colTotal: { width: '14%' },
  summarySection: {
    marginTop: 20,
    marginRight: 'auto',
    width: '45%',
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  summaryLabel: {
    fontSize: 10,
    color: '#6b7280',
    textAlign: 'right',
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'left',
  },
  summaryDiscount: {
    color: '#059669',
  },
  summaryTotal: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 2,
    borderTopColor: '#1e40af',
    marginTop: 10,
  },
  summaryTotalLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1f2937',
    textAlign: 'right',
  },
  summaryTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'left',
  },
  notesSection: {
    marginTop: 30,
    padding: 15,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  notesTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 10,
    color: '#6b7280',
    lineHeight: 1.6,
    textAlign: 'right',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  footerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 9,
    color: '#9ca3af',
    textAlign: 'right',
  },
  footerCompany: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  metaGrid: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  metaItem: {
    flex: 1,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  planBox: {
    padding: 15,
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 20,
  },
  planTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
    marginBottom: 5,
    textAlign: 'right',
  },
  planDesc: {
    fontSize: 10,
    color: '#4b5563',
    textAlign: 'right',
  },
  planBadge: {
    backgroundColor: '#1e40af',
    color: '#ffffff',
    padding: '3 8',
    borderRadius: 4,
    fontSize: 9,
    marginRight: 10,
  },
});

// Format currency
const formatCurrency = (amount: number) => {
  return `${amount.toLocaleString('ar-SA')} ر.س`;
};

// Format date
const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

interface QuoteItem {
  id?: string;
  name: string;
  description?: string;
  type: 'plan' | 'service' | 'custom';
  billing?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuotePDFProps {
  data: {
    quote_number: string;
    title: string;
    status: string;
    created_at: string;
    sent_at?: string;
    valid_until?: string;
    quote_type?: string;
    billing_cycle?: string;
    items: QuoteItem[];
    notes?: string;
    terms_and_conditions?: string;
    created_by_staff_name?: string;
    company: {
      name: string;
      nameEn: string;
      email: string;
      phone: string;
      address: string;
      city: string;
      taxNumber: string;
      crNumber: string;
    };
    account?: {
      name: string;
      contact_email?: string;
      contact_phone?: string;
      city?: string;
      address?: string;
    };
    plan?: {
      name: string;
      description?: string;
    };
    subtotalBeforeDiscount: number;
    calculatedDiscount: number;
    discountType: string;
    discountAmount: number;
    subtotalAfterDiscount: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
  };
}

const statusLabels: Record<string, string> = {
  draft: 'مسودة',
  sent: 'مرسل',
  viewed: 'تمت المشاهدة',
  accepted: 'معتمد',
  rejected: 'مرفوض',
  expired: 'منتهي',
};

const quoteTypeLabels: Record<string, string> = {
  subscription: 'اشتراك منصة',
  custom_platform: 'منصة مخصصة',
  services_only: 'خدمات فقط',
};

const billingLabels: Record<string, string> = {
  monthly: 'شهري',
  yearly: 'سنوي',
};

const typeLabels: Record<string, string> = {
  plan: 'خطة',
  service: 'خدمة',
  custom: 'مخصص',
};

export default function QuotePDFDocument({ data }: QuotePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerRight}>
            <Text style={styles.title}>عرض سعر</Text>
            <Text style={styles.quoteNumber}>#{data.quote_number}</Text>
            <View style={styles.statusBadge}>
              <Text>{statusLabels[data.status] || data.status}</Text>
            </View>
          </View>
          <View style={styles.headerLeft}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e40af' }}>
              {data.company.name}
            </Text>
            <Text style={{ fontSize: 9, color: '#6b7280', marginTop: 3 }}>
              {data.company.email}
            </Text>
            <Text style={{ fontSize: 9, color: '#6b7280' }}>
              {data.company.phone}
            </Text>
          </View>
        </View>

        {/* Meta Info */}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>تاريخ الإصدار</Text>
            <Text style={styles.metaValue}>{formatDate(data.created_at)}</Text>
          </View>
          {data.valid_until && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>صالح حتى</Text>
              <Text style={styles.metaValue}>{formatDate(data.valid_until)}</Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Text style={styles.metaLabel}>نوع العرض</Text>
            <Text style={styles.metaValue}>
              {quoteTypeLabels[data.quote_type || 'subscription']}
            </Text>
          </View>
          {data.billing_cycle && (
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>دورة الفوترة</Text>
              <Text style={styles.metaValue}>{billingLabels[data.billing_cycle]}</Text>
            </View>
          )}
        </View>

        {/* Company & Client Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>من (المورد)</Text>
            <Text style={styles.infoValue}>{data.company.name}</Text>
            <Text style={styles.infoText}>{data.company.email}</Text>
            <Text style={styles.infoText}>{data.company.phone}</Text>
            <Text style={styles.infoText}>{data.company.city}، {data.company.address}</Text>
            <Text style={[styles.infoText, { marginTop: 8 }]}>
              الرقم الضريبي: {data.company.taxNumber}
            </Text>
            <Text style={styles.infoText}>
              السجل التجاري: {data.company.crNumber}
            </Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoLabel}>إلى (العميل)</Text>
            {data.account ? (
              <>
                <Text style={styles.infoValue}>{data.account.name}</Text>
                {data.account.contact_email && (
                  <Text style={styles.infoText}>{data.account.contact_email}</Text>
                )}
                {data.account.contact_phone && (
                  <Text style={styles.infoText}>{data.account.contact_phone}</Text>
                )}
                {data.account.city && (
                  <Text style={styles.infoText}>
                    {data.account.city}
                    {data.account.address && ` - ${data.account.address}`}
                  </Text>
                )}
              </>
            ) : (
              <Text style={styles.infoText}>لا يوجد عميل مرتبط</Text>
            )}
          </View>
        </View>

        {/* Plan Info */}
        {data.plan && (
          <View style={styles.planBox}>
            <View style={{ flexDirection: 'row-reverse', alignItems: 'center' }}>
              <Text style={styles.planTitle}>{data.plan.name}</Text>
              {data.billing_cycle && (
                <Text style={styles.planBadge}>{billingLabels[data.billing_cycle]}</Text>
              )}
            </View>
            {data.plan.description && (
              <Text style={styles.planDesc}>{data.plan.description}</Text>
            )}
          </View>
        )}

        {/* Items Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>بنود العرض</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>البند / الوصف</Text>
              <Text style={[styles.tableHeaderCell, styles.colType]}>النوع</Text>
              <Text style={[styles.tableHeaderCell, styles.colPeriod]}>المدة</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>الكمية</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>السعر</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>الإجمالي</Text>
            </View>
            
            {/* Table Rows */}
            {data.items.map((item, index) => (
              <View 
                key={item.id || index} 
                style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}
              >
                <Text style={[styles.tableCell, styles.colNum]}>{index + 1}</Text>
                <Text style={[styles.tableCell, styles.colDesc, styles.tableCellRight]}>
                  {item.name}
                  {item.description ? `\n${item.description}` : ''}
                </Text>
                <Text style={[styles.tableCell, styles.colType]}>
                  {typeLabels[item.type] || item.type}
                </Text>
                <Text style={[styles.tableCell, styles.colPeriod]}>
                  {item.billing || '-'}
                </Text>
                <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.colPrice, styles.tableCellLeft]}>
                  {formatCurrency(item.unit_price)}
                </Text>
                <Text style={[styles.tableCell, styles.colTotal, styles.tableCellLeft]}>
                  {formatCurrency(item.total)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summarySection}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(data.subtotalBeforeDiscount)}
            </Text>
          </View>
          
          {data.calculatedDiscount > 0 && (
            <>
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLabel, styles.summaryDiscount]}>
                  الخصم {data.discountType === 'percentage' ? `(${data.discountAmount}%)` : ''}
                </Text>
                <Text style={[styles.summaryValue, styles.summaryDiscount]}>
                  - {formatCurrency(data.calculatedDiscount)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>المجموع بعد الخصم</Text>
                <Text style={styles.summaryValue}>
                  {formatCurrency(data.subtotalAfterDiscount)}
                </Text>
              </View>
            </>
          )}
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>
              ضريبة القيمة المضافة ({data.taxRate}%)
            </Text>
            <Text style={styles.summaryValue}>
              {formatCurrency(data.taxAmount)}
            </Text>
          </View>
          
          <View style={styles.summaryTotal}>
            <Text style={styles.summaryTotalLabel}>الإجمالي المستحق</Text>
            <Text style={styles.summaryTotalValue}>
              {formatCurrency(data.totalAmount)}
            </Text>
          </View>
        </View>

        {/* Notes */}
        {data.notes && (
          <View style={styles.notesSection}>
            <Text style={styles.notesTitle}>ملاحظات</Text>
            <Text style={styles.notesText}>{data.notes}</Text>
          </View>
        )}

        {/* Terms */}
        {data.terms_and_conditions && (
          <View style={[styles.notesSection, { marginTop: 15 }]}>
            <Text style={styles.notesTitle}>الشروط والأحكام</Text>
            <Text style={styles.notesText}>{data.terms_and_conditions}</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View>
              <Text style={styles.footerCompany}>{data.company.name}</Text>
              <Text style={styles.footerText}>{data.company.email} | {data.company.phone}</Text>
            </View>
            <View>
              <Text style={styles.footerText}>
                أُعد بواسطة: {data.created_by_staff_name || 'غير محدد'}
              </Text>
              <Text style={styles.footerText}>
                تاريخ الإصدار: {formatDate(data.created_at)}
              </Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
