import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';

import AmiriRegular from '@/assets/fonts/Amiri-Regular.ttf';
import AmiriBold from '@/assets/fonts/Amiri-Bold.ttf';

// Register Arabic font from local TTF files
try {
  Font.register({
    family: 'Amiri',
    fonts: [
      { src: AmiriRegular, fontWeight: 'normal' },
      { src: AmiriBold, fontWeight: 'bold' },
    ],
  });
} catch (e) {
  console.warn('PDF font register failed:', e);
}

// Disable hyphenation for Arabic text
Font.registerHyphenationCallback((word) => [word]);

// Professional Color Palette
const colors = {
  primary: '#1a365d',      // Deep navy blue
  primaryLight: '#2c5282', // Lighter navy
  accent: '#c4a35a',       // Gold accent
  accentLight: '#d4b86a',  // Light gold
  text: '#1a202c',         // Dark text
  textSecondary: '#4a5568',// Secondary text
  textMuted: '#718096',    // Muted text
  border: '#e2e8f0',       // Light border
  borderDark: '#cbd5e0',   // Darker border
  background: '#f7fafc',   // Light background
  white: '#ffffff',
  success: '#38a169',      // Green for discounts
  headerBg: '#1a365d',     // Header background
};

// Professional Styles
const styles = StyleSheet.create({
  page: {
    fontFamily: 'Amiri',
    fontSize: 10,
    backgroundColor: colors.white,
    direction: 'rtl',
  },
  // Header with dual logos
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 30,
    paddingBottom: 20,
    backgroundColor: colors.headerBg,
  },
  headerLogos: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 15,
  },
  logo: {
    width: 80,
    height: 40,
    objectFit: 'contain',
  },
  logoWebyan: {
    width: 70,
    height: 35,
    objectFit: 'contain',
  },
  headerTitle: {
    alignItems: 'flex-start',
  },
  quoteTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 1,
  },
  quoteTitleEn: {
    fontSize: 12,
    color: colors.accentLight,
    marginTop: 2,
    letterSpacing: 2,
  },
  // Quote number banner
  quoteBanner: {
    backgroundColor: colors.accent,
    paddingVertical: 10,
    paddingHorizontal: 40,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quoteNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.headerBg,
  },
  quoteDate: {
    fontSize: 10,
    color: colors.headerBg,
  },
  // Main content container
  content: {
    padding: 40,
    paddingTop: 25,
  },
  // Company and Client Section
  partiesSection: {
    flexDirection: 'row-reverse',
    gap: 20,
    marginBottom: 25,
  },
  partyBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  partyHeader: {
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  partyHeaderText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.textSecondary,
    textAlign: 'right',
  },
  partyContent: {
    padding: 12,
  },
  partyName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'right',
  },
  partyDetail: {
    fontSize: 9,
    color: colors.textSecondary,
    marginBottom: 3,
    textAlign: 'right',
  },
  partyLabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginTop: 8,
    marginBottom: 2,
    textAlign: 'right',
  },
  // Meta info grid
  metaGrid: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 25,
  },
  metaItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    padding: 10,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 8,
    color: colors.textMuted,
    marginBottom: 4,
  },
  metaValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
  },
  // Section Title
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    paddingBottom: 6,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    textAlign: 'right',
  },
  // Items Table
  table: {
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  tableHeaderCell: {
    color: colors.white,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: colors.white,
  },
  tableRowAlt: {
    backgroundColor: colors.background,
  },
  tableCell: {
    fontSize: 9,
    color: colors.text,
    textAlign: 'center',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  tableCellLeft: {
    textAlign: 'left',
  },
  // Column widths
  colNum: { width: '6%' },
  colDesc: { width: '34%' },
  colType: { width: '12%' },
  colPeriod: { width: '12%' },
  colQty: { width: '8%' },
  colPrice: { width: '14%' },
  colTotal: { width: '14%' },
  // Summary Section
  summaryContainer: {
    flexDirection: 'row-reverse',
    marginTop: 10,
  },
  summaryLeft: {
    flex: 1,
    paddingLeft: 20,
  },
  summaryRight: {
    width: '45%',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 10,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  summaryValue: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'left',
  },
  summaryDiscount: {
    color: colors.success,
  },
  summaryTotal: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.primary,
  },
  summaryTotalLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'right',
  },
  summaryTotalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.accent,
    textAlign: 'left',
  },
  // Notes Section
  notesSection: {
    marginTop: 20,
    padding: 15,
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 9,
    color: colors.textSecondary,
    lineHeight: 1.8,
    textAlign: 'right',
  },
  // Signature Section
  signatureSection: {
    marginTop: 30,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 30,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 15,
    minHeight: 100,
    alignItems: 'center',
  },
  signatureTitle: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 10,
    textAlign: 'center',
  },
  signatureLine: {
    width: '80%',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderDark,
    marginTop: 40,
    marginBottom: 8,
  },
  signatureLabel: {
    fontSize: 8,
    color: colors.textMuted,
  },
  stampArea: {
    width: 70,
    height: 70,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  stampImage: {
    width: 65,
    height: 65,
    objectFit: 'contain',
  },
  stampPlaceholder: {
    fontSize: 8,
    color: colors.textMuted,
    textAlign: 'center',
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.headerBg,
    paddingVertical: 12,
    paddingHorizontal: 40,
  },
  footerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 20,
  },
  footerText: {
    fontSize: 8,
    color: colors.accentLight,
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.primaryLight,
  },
  footerRight: {
    alignItems: 'flex-start',
  },
  footerCompany: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.white,
  },
  footerWebsite: {
    fontSize: 8,
    color: colors.accent,
    marginTop: 2,
  },
  // Plan Box
  planBox: {
    marginBottom: 20,
    padding: 15,
    backgroundColor: '#ebf4ff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#90cdf4',
    borderRightWidth: 4,
    borderRightColor: colors.primary,
  },
  planTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 5,
    textAlign: 'right',
  },
  planDesc: {
    fontSize: 9,
    color: colors.textSecondary,
    textAlign: 'right',
  },
  planBadge: {
    backgroundColor: colors.primary,
    color: colors.white,
    padding: '3 8',
    borderRadius: 4,
    fontSize: 8,
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
      website?: string;
      logoUrl?: string;
      webyanLogoUrl?: string;
      stampUrl?: string;
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
  plan: 'خطة اشتراك',
  service: 'خدمة',
  custom: 'بند مخصص',
};

export default function QuotePDFDocument({ data }: QuotePDFProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Professional Header with Dual Logos */}
        <View style={styles.header}>
          <View style={styles.headerLogos}>
            {/* Raneen Logo (Primary Company) */}
            {data.company.logoUrl && (
              <Image src={data.company.logoUrl} style={styles.logo} />
            )}
            {/* Webyan Logo (Platform) */}
            {data.company.webyanLogoUrl && (
              <Image src={data.company.webyanLogoUrl} style={styles.logoWebyan} />
            )}
          </View>
          <View style={styles.headerTitle}>
            <Text style={styles.quoteTitle}>عرض سعر</Text>
            <Text style={styles.quoteTitleEn}>QUOTATION</Text>
          </View>
        </View>

        {/* Quote Number & Status Banner */}
        <View style={styles.quoteBanner}>
          <Text style={styles.quoteNumber}>رقم العرض: {data.quote_number}</Text>
          <Text style={styles.quoteDate}>
            تاريخ الإصدار: {formatDate(data.created_at)}
          </Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Company & Client Information */}
          <View style={styles.partiesSection}>
            {/* Company Info (Seller) */}
            <View style={styles.partyBox}>
              <View style={styles.partyHeader}>
                <Text style={styles.partyHeaderText}>من (المورد)</Text>
              </View>
              <View style={styles.partyContent}>
                <Text style={styles.partyName}>{data.company.name}</Text>
                <Text style={styles.partyDetail}>{data.company.email}</Text>
                <Text style={styles.partyDetail}>{data.company.phone}</Text>
                <Text style={styles.partyDetail}>
                  {data.company.city}، {data.company.address}
                </Text>
                <Text style={styles.partyLabel}>الرقم الضريبي</Text>
                <Text style={styles.partyDetail}>{data.company.taxNumber}</Text>
                <Text style={styles.partyLabel}>السجل التجاري</Text>
                <Text style={styles.partyDetail}>{data.company.crNumber}</Text>
              </View>
            </View>

            {/* Client Info (Buyer) */}
            <View style={styles.partyBox}>
              <View style={styles.partyHeader}>
                <Text style={styles.partyHeaderText}>إلى (العميل)</Text>
              </View>
              <View style={styles.partyContent}>
                {data.account ? (
                  <>
                    <Text style={styles.partyName}>{data.account.name}</Text>
                    {data.account.contact_email && (
                      <Text style={styles.partyDetail}>{data.account.contact_email}</Text>
                    )}
                    {data.account.contact_phone && (
                      <Text style={styles.partyDetail}>{data.account.contact_phone}</Text>
                    )}
                    {data.account.city && (
                      <Text style={styles.partyDetail}>
                        {data.account.city}
                        {data.account.address && ` - ${data.account.address}`}
                      </Text>
                    )}
                  </>
                ) : (
                  <Text style={styles.partyDetail}>لا يوجد عميل مرتبط</Text>
                )}
              </View>
            </View>
          </View>

          {/* Quote Meta Information */}
          <View style={styles.metaGrid}>
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
            {data.valid_until && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>صالح حتى</Text>
                <Text style={styles.metaValue}>{formatDate(data.valid_until)}</Text>
              </View>
            )}
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>الحالة</Text>
              <Text style={styles.metaValue}>{statusLabels[data.status] || data.status}</Text>
            </View>
          </View>

          {/* Plan Info (if subscription) */}
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
          <Text style={styles.sectionTitle}>تفاصيل البنود</Text>
          <View style={styles.table}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>البند / الوصف</Text>
              <Text style={[styles.tableHeaderCell, styles.colType]}>النوع</Text>
              <Text style={[styles.tableHeaderCell, styles.colPeriod]}>الفترة</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>الكمية</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>سعر الوحدة</Text>
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
                  {item.billing ? billingLabels[item.billing] || item.billing : '-'}
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

          {/* Summary Section */}
          <View style={styles.summaryContainer}>
            <View style={styles.summaryLeft}>
              {/* Space for additional info or signature */}
            </View>
            <View style={styles.summaryRight}>
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

              <View style={[styles.summaryRow, !data.calculatedDiscount && styles.summaryRowLast]}>
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
          </View>

          {/* Signature & Stamp Section */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>توقيع وختم المورد</Text>
              {data.company.stampUrl ? (
                <Image src={data.company.stampUrl} style={styles.stampImage} />
              ) : (
                <View style={styles.stampArea}>
                  <Text style={styles.stampPlaceholder}>الختم</Text>
                </View>
              )}
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>{data.created_by_staff_name || 'المفوض بالتوقيع'}</Text>
            </View>

            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>توقيع وختم العميل</Text>
              <View style={styles.stampArea}>
                <Text style={styles.stampPlaceholder}>الختم</Text>
              </View>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>اسم المفوض: ____________</Text>
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
            <View style={[styles.notesSection, { marginTop: 10 }]}>
              <Text style={styles.notesTitle}>الشروط والأحكام</Text>
              <Text style={styles.notesText}>{data.terms_and_conditions}</Text>
            </View>
          )}
        </View>

        {/* Professional Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerText}>{data.company.email}</Text>
              <View style={styles.footerDivider} />
              <Text style={styles.footerText}>{data.company.phone}</Text>
              <View style={styles.footerDivider} />
              <Text style={styles.footerText}>{data.company.city}</Text>
            </View>
            <View style={styles.footerRight}>
              <Text style={styles.footerCompany}>{data.company.name}</Text>
              {data.company.website && (
                <Text style={styles.footerWebsite}>{data.company.website}</Text>
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
}
