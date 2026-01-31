import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';

import IBMPlexRegular from '@/assets/fonts/IBMPlexSansArabic-Regular.ttf';
import IBMPlexBold from '@/assets/fonts/IBMPlexSansArabic-Bold.ttf';
import IBMPlexMedium from '@/assets/fonts/IBMPlexSansArabic-Medium.ttf';
import IBMPlexSemiBold from '@/assets/fonts/IBMPlexSansArabic-SemiBold.ttf';
import IBMPlexLight from '@/assets/fonts/IBMPlexSansArabic-Light.ttf';

// Register IBM Plex Sans Arabic font
try {
  Font.register({
    family: 'IBM Plex Arabic',
    fonts: [
      { src: IBMPlexLight, fontWeight: 300 },
      { src: IBMPlexRegular, fontWeight: 'normal' },
      { src: IBMPlexMedium, fontWeight: 500 },
      { src: IBMPlexSemiBold, fontWeight: 600 },
      { src: IBMPlexBold, fontWeight: 'bold' },
    ],
  });
} catch (e) {
  console.warn('PDF font register failed:', e);
}

// Disable hyphenation for Arabic text
Font.registerHyphenationCallback((word) => [word]);

// Webyan Brand Colors - Clean & Professional
const colors = {
  primary: '#0f172a',       // Slate 900 - Main dark
  secondary: '#475569',     // Slate 600 - Secondary text
  accent: '#3b82f6',        // Blue 500 - Accent
  accentLight: '#60a5fa',   // Blue 400
  accentDark: '#1d4ed8',    // Blue 700
  text: '#1e293b',          // Slate 800
  textMuted: '#64748b',     // Slate 500
  border: '#e2e8f0',        // Slate 200
  borderLight: '#f1f5f9',   // Slate 100
  background: '#f8fafc',    // Slate 50
  white: '#ffffff',
  success: '#10b981',       // Emerald 500
  headerBg: '#0f172a',      // Dark header
};

// Professional Compact Styles - Single Page Fit
const styles = StyleSheet.create({
  page: {
    fontFamily: 'IBM Plex Arabic',
    fontSize: 9,
    backgroundColor: colors.white,
    paddingBottom: 60,
  },
  // Header - Clean with dual logos
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 30,
    paddingVertical: 15,
    backgroundColor: colors.headerBg,
  },
  headerLogos: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 12,
  },
  logo: {
    width: 50,
    height: 50,
    objectFit: 'contain',
  },
  logoWebyan: {
    width: 90,
    height: 30,
    objectFit: 'contain',
  },
  logoDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.secondary,
    marginHorizontal: 8,
  },
  headerInfo: {
    alignItems: 'flex-start',
  },
  quoteLabel: {
    fontSize: 8,
    color: colors.accentLight,
    letterSpacing: 1,
    marginBottom: 2,
  },
  quoteNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.white,
    letterSpacing: 0.5,
  },
  // Content Area
  content: {
    padding: 30,
    paddingTop: 20,
  },
  // Title Section
  titleSection: {
    marginBottom: 15,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  docTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'right',
  },
  docSubtitle: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'right',
  },
  // Parties Section - From & To
  partiesRow: {
    flexDirection: 'row-reverse',
    gap: 15,
    marginBottom: 15,
  },
  partyBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 6,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partyLabel: {
    fontSize: 7,
    color: colors.textMuted,
    marginBottom: 6,
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partyName: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 6,
    textAlign: 'right',
  },
  partyDetail: {
    fontSize: 8,
    color: colors.secondary,
    marginBottom: 2,
    textAlign: 'right',
  },
  partyLegalInfo: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  partyLegalText: {
    fontSize: 7,
    color: colors.textMuted,
    textAlign: 'right',
  },
  // Meta Info Row
  metaRow: {
    flexDirection: 'row-reverse',
    gap: 10,
    marginBottom: 15,
  },
  metaItem: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 8,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 7,
    color: colors.textMuted,
    marginBottom: 3,
  },
  metaValue: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.primary,
  },
  // Items Table
  table: {
    marginBottom: 15,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.primary,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  tableHeaderCell: {
    color: colors.white,
    fontSize: 8,
    fontWeight: 600,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableRowAlt: {
    backgroundColor: colors.background,
  },
  tableCell: {
    fontSize: 8,
    color: colors.text,
    textAlign: 'center',
  },
  tableCellRight: {
    textAlign: 'right',
  },
  tableCellBold: {
    fontWeight: 600,
  },
  // Column widths
  colNum: { width: '5%' },
  colDesc: { width: '40%' },
  colQty: { width: '10%' },
  colPrice: { width: '20%' },
  colTotal: { width: '25%' },
  // Summary Section
  summaryContainer: {
    flexDirection: 'row-reverse',
    gap: 20,
  },
  summaryNotes: {
    flex: 1,
  },
  notesBox: {
    backgroundColor: colors.background,
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesTitle: {
    fontSize: 8,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 5,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 7,
    color: colors.secondary,
    lineHeight: 1.6,
    textAlign: 'right',
  },
  summaryTotals: {
    width: '40%',
  },
  summaryBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 8,
    color: colors.secondary,
    textAlign: 'right',
  },
  summaryValue: {
    fontSize: 8,
    fontWeight: 600,
    color: colors.text,
    textAlign: 'left',
  },
  summaryDiscount: {
    color: colors.success,
  },
  summaryTotalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: colors.primary,
  },
  summaryTotalLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'right',
  },
  summaryTotalValue: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.accentLight,
    textAlign: 'left',
  },
  // Signature Section
  signatureSection: {
    marginTop: 20,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 20,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
    padding: 12,
    alignItems: 'center',
    minHeight: 80,
  },
  signatureTitle: {
    fontSize: 8,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  signatureLine: {
    width: '70%',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
    marginTop: 30,
    marginBottom: 5,
  },
  signatureLabel: {
    fontSize: 7,
    color: colors.textMuted,
  },
  stampImage: {
    width: 60,
    height: 60,
    objectFit: 'contain',
    marginTop: 5,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerContent: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 15,
  },
  footerText: {
    fontSize: 7,
    color: colors.textMuted,
  },
  footerCompany: {
    fontSize: 8,
    fontWeight: 600,
    color: colors.primary,
  },
  footerWebsite: {
    fontSize: 7,
    color: colors.accent,
  },
  // Terms Section (Compact)
  termsSection: {
    marginTop: 12,
    padding: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  termsTitle: {
    fontSize: 7,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'right',
  },
  termsText: {
    fontSize: 6,
    color: colors.textMuted,
    lineHeight: 1.5,
    textAlign: 'right',
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
    month: 'short',
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
    subtotalBeforeDiscount?: number;
    calculatedDiscount?: number;
    discountType?: string;
    discountAmount?: number;
    subtotalAfterDiscount?: number;
    taxRate?: number;
    taxAmount?: number;
    totalAmount?: number;
    subtotal?: number;
    total_amount?: number;
    account?: {
      name: string;
      contact_email?: string;
      contact_phone?: string;
      city?: string;
      address?: string;
    };
    company?: {
      name: string;
      nameEn?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      taxNumber?: string;
      crNumber?: string;
      website?: string;
      logoUrl?: string;
      webyanLogoUrl?: string;
      stampUrl?: string;
    };
  };
}

const QuotePDFDocument = ({ data }: QuotePDFProps) => {
  const items = data.items || [];
  const subtotalBeforeDiscount = data.subtotalBeforeDiscount || items.reduce((sum, item) => sum + item.total, 0);
  const calculatedDiscount = data.calculatedDiscount || 0;
  const subtotalAfterDiscount = data.subtotalAfterDiscount || (subtotalBeforeDiscount - calculatedDiscount);
  const taxRate = data.taxRate || 15;
  const taxAmount = data.taxAmount || (subtotalAfterDiscount * taxRate / 100);
  const totalAmount = data.totalAmount || data.total_amount || (subtotalAfterDiscount + taxAmount);

  const company = data.company || {
    name: 'شركة رنين للتقنية',
    nameEn: 'Raneen Technology',
    email: 'info@raneen.sa',
    phone: '+966 50 123 4567',
    address: 'طريق الملك فهد',
    city: 'الرياض',
    taxNumber: '300000000000003',
    crNumber: '1010000000',
    website: 'https://webyan.io',
    logoUrl: '/raneen-logo.png',
    webyanLogoUrl: '/webyan-logo-02.svg',
  };

  const billingLabels: Record<string, string> = {
    monthly: 'شهري',
    yearly: 'سنوي',
    once: 'مرة واحدة',
  };

  const typeLabels: Record<string, string> = {
    plan: 'باقة',
    service: 'خدمة',
    custom: 'مخصص',
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with Dual Logos */}
        <View style={styles.header}>
          <View style={styles.headerLogos}>
            {company.logoUrl && (
              <Image src={company.logoUrl} style={styles.logo} />
            )}
            <View style={styles.logoDivider} />
            {company.webyanLogoUrl && (
              <Image src={company.webyanLogoUrl} style={styles.logoWebyan} />
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.quoteLabel}>QUOTATION</Text>
            <Text style={styles.quoteNumber}>{data.quote_number}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Title Section */}
          <View style={styles.titleSection}>
            <Text style={styles.docTitle}>{data.title || 'عرض سعر'}</Text>
            <Text style={styles.docSubtitle}>
              تاريخ الإصدار: {formatDate(data.created_at)}
              {data.valid_until && ` • صالح حتى: ${formatDate(data.valid_until)}`}
            </Text>
          </View>

          {/* From & To Section */}
          <View style={styles.partiesRow}>
            {/* From - Company */}
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>من</Text>
              <Text style={styles.partyName}>{company.name}</Text>
              {company.nameEn && (
                <Text style={styles.partyDetail}>{company.nameEn}</Text>
              )}
              <Text style={styles.partyDetail}>{company.email}</Text>
              <Text style={styles.partyDetail}>{company.phone}</Text>
              <Text style={styles.partyDetail}>{company.city}، {company.address}</Text>
              <View style={styles.partyLegalInfo}>
                <Text style={styles.partyLegalText}>السجل التجاري: {company.crNumber}</Text>
                <Text style={styles.partyLegalText}>الرقم الضريبي: {company.taxNumber}</Text>
              </View>
            </View>

            {/* To - Client */}
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>إلى</Text>
              <Text style={styles.partyName}>{data.account?.name || 'العميل'}</Text>
              {data.account?.contact_email && (
                <Text style={styles.partyDetail}>{data.account.contact_email}</Text>
              )}
              {data.account?.contact_phone && (
                <Text style={styles.partyDetail}>{data.account.contact_phone}</Text>
              )}
              {(data.account?.city || data.account?.address) && (
                <Text style={styles.partyDetail}>
                  {[data.account?.city, data.account?.address].filter(Boolean).join('، ')}
                </Text>
              )}
            </View>
          </View>

          {/* Meta Info Row */}
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>نوع العرض</Text>
              <Text style={styles.metaValue}>
                {data.quote_type === 'subscription' ? 'اشتراك' : 
                 data.quote_type === 'custom_platform' ? 'منصة مخصصة' : 'خدمات'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>دورة الفوترة</Text>
              <Text style={styles.metaValue}>
                {billingLabels[data.billing_cycle || 'yearly'] || 'سنوي'}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>الحالة</Text>
              <Text style={styles.metaValue}>
                {data.status === 'draft' ? 'مسودة' :
                 data.status === 'sent' ? 'مرسل' :
                 data.status === 'accepted' ? 'معتمد' :
                 data.status === 'rejected' ? 'مرفوض' : 'مسودة'}
              </Text>
            </View>
            {data.created_by_staff_name && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>معد العرض</Text>
                <Text style={styles.metaValue}>{data.created_by_staff_name}</Text>
              </View>
            )}
          </View>

          {/* Items Table */}
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.colNum]}>#</Text>
              <Text style={[styles.tableHeaderCell, styles.colDesc]}>الوصف</Text>
              <Text style={[styles.tableHeaderCell, styles.colQty]}>الكمية</Text>
              <Text style={[styles.tableHeaderCell, styles.colPrice]}>السعر</Text>
              <Text style={[styles.tableHeaderCell, styles.colTotal]}>الإجمالي</Text>
            </View>
            {items.map((item, index) => (
              <View key={item.id || index} style={[styles.tableRow, index % 2 === 1 && styles.tableRowAlt]}>
                <Text style={[styles.tableCell, styles.colNum]}>{index + 1}</Text>
                <View style={styles.colDesc}>
                  <Text style={[styles.tableCell, styles.tableCellRight, styles.tableCellBold]}>
                    {item.name}
                  </Text>
                  {item.description && (
                    <Text style={[styles.tableCell, styles.tableCellRight, { fontSize: 7, color: colors.textMuted }]}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={[styles.tableCell, styles.tableCellRight, { fontSize: 7, color: colors.accent }]}>
                    {typeLabels[item.type] || item.type}
                    {item.billing && ` • ${billingLabels[item.billing] || item.billing}`}
                  </Text>
                </View>
                <Text style={[styles.tableCell, styles.colQty]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.colPrice]}>{formatCurrency(item.unit_price)}</Text>
                <Text style={[styles.tableCell, styles.colTotal, styles.tableCellBold]}>{formatCurrency(item.total)}</Text>
              </View>
            ))}
          </View>

          {/* Summary Section */}
          <View style={styles.summaryContainer}>
            {/* Notes */}
            <View style={styles.summaryNotes}>
              {data.notes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesTitle}>ملاحظات</Text>
                  <Text style={styles.notesText}>{data.notes}</Text>
                </View>
              )}
            </View>

            {/* Totals */}
            <View style={styles.summaryTotals}>
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>المجموع الفرعي</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(subtotalBeforeDiscount)}</Text>
                </View>
                {calculatedDiscount > 0 && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>الخصم</Text>
                    <Text style={[styles.summaryValue, styles.summaryDiscount]}>
                      - {formatCurrency(calculatedDiscount)}
                    </Text>
                  </View>
                )}
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>ضريبة القيمة المضافة ({taxRate}%)</Text>
                  <Text style={styles.summaryValue}>{formatCurrency(taxAmount)}</Text>
                </View>
                <View style={styles.summaryTotalRow}>
                  <Text style={styles.summaryTotalLabel}>الإجمالي</Text>
                  <Text style={styles.summaryTotalValue}>{formatCurrency(totalAmount)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Terms & Conditions */}
          {data.terms_and_conditions && (
            <View style={styles.termsSection}>
              <Text style={styles.termsTitle}>الشروط والأحكام</Text>
              <Text style={styles.termsText}>{data.terms_and_conditions}</Text>
            </View>
          )}

          {/* Signature Section */}
          <View style={styles.signatureSection}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>توقيع وختم الشركة</Text>
              {company.stampUrl ? (
                <Image src={company.stampUrl} style={styles.stampImage} />
              ) : (
                <>
                  <View style={styles.signatureLine} />
                  <Text style={styles.signatureLabel}>التوقيع والتاريخ</Text>
                </>
              )}
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureTitle}>توقيع العميل</Text>
              <View style={styles.signatureLine} />
              <Text style={styles.signatureLabel}>التوقيع والتاريخ</Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <View style={styles.footerContent}>
            <View style={styles.footerLeft}>
              <Text style={styles.footerText}>{company.email}</Text>
              <Text style={styles.footerText}>|</Text>
              <Text style={styles.footerText}>{company.phone}</Text>
            </View>
            <View>
              <Text style={styles.footerCompany}>{company.name}</Text>
              {company.website && (
                <Text style={styles.footerWebsite}>{company.website}</Text>
              )}
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default QuotePDFDocument;
