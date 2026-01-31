import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
  Svg,
  Path,
  G,
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

// Professional Colors - Slate & Blue
const colors = {
  primary: '#1e3a5f',       // Professional dark blue
  secondary: '#64748b',     // Slate 500
  accent: '#0891b2',        // Cyan 600
  accentLight: '#22d3ee',   // Cyan 400
  text: '#1e293b',          // Slate 800
  textMuted: '#64748b',     // Slate 500
  border: '#e2e8f0',        // Slate 200
  borderLight: '#f1f5f9',   // Slate 100
  background: '#f8fafc',    // Slate 50
  infoBar: '#f1f5f9',       // Light slate for info bar
  white: '#ffffff',
  success: '#10b981',       // Emerald 500
};

// Professional Compact Styles - Single Page Fit
const styles = StyleSheet.create({
  page: {
    fontFamily: 'IBM Plex Arabic',
    fontSize: 9,
    backgroundColor: colors.white,
    paddingBottom: 50,
  },
  // Header - White background with logos and title
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
    backgroundColor: colors.white,
    borderBottomWidth: 2,
    borderBottomColor: colors.border,
  },
  headerLogos: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 10,
  },
  logo: {
    width: 50,
    height: 50,
    objectFit: 'contain',
  },
  logoWebyan: {
    width: 85,
    height: 30,
    objectFit: 'contain',
  },
  logoDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
    marginHorizontal: 8,
  },
  headerTitleSection: {
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#263c84', // Navy from Webyan logo
    marginBottom: 2,
  },
  headerTitleEn: {
    fontSize: 10,
    color: '#24c2ec', // Cyan from Webyan logo
    letterSpacing: 1,
    fontWeight: 500,
  },
  // Info Bar - Below header with quote details (contained width)
  infoBarWrapper: {
    paddingHorizontal: 25,
    paddingVertical: 10,
  },
  infoBar: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: colors.infoBar,
    borderRadius: 4,
    gap: 20,
  },
  infoBarItem: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
  },
  infoBarLabel: {
    fontSize: 7,
    color: colors.textMuted,
  },
  infoBarValue: {
    fontSize: 9,
    fontWeight: 600,
    color: colors.primary,
  },
  // Content Area
  content: {
    padding: 25,
    paddingTop: 15,
  },
  // Parties Section - From & To
  partiesRow: {
    flexDirection: 'row-reverse',
    gap: 12,
    marginBottom: 12,
  },
  partyBox: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  partyLabel: {
    fontSize: 7,
    color: colors.accent,
    marginBottom: 4,
    textAlign: 'right',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    fontWeight: 600,
  },
  partyName: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'right',
  },
  partyDetail: {
    fontSize: 7,
    color: colors.secondary,
    marginBottom: 2,
    textAlign: 'right',
  },
  partyLegalInfo: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  partyLegalText: {
    fontSize: 6,
    color: colors.textMuted,
    textAlign: 'right',
  },
  // Meta Info Row
  metaRow: {
    flexDirection: 'row-reverse',
    gap: 8,
    marginBottom: 12,
  },
  metaItem: {
    flex: 1,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    padding: 6,
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 6,
    color: colors.textMuted,
    marginBottom: 2,
  },
  metaValue: {
    fontSize: 8,
    fontWeight: 600,
    color: colors.primary,
  },
  // Items Table
  table: {
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: colors.primary,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },
  tableHeaderCell: {
    color: colors.white,
    fontSize: 7,
    fontWeight: 600,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  tableRowAlt: {
    backgroundColor: colors.background,
  },
  tableCell: {
    fontSize: 7,
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
  colDesc: { width: '42%' },
  colQty: { width: '10%' },
  colPrice: { width: '18%' },
  colTotal: { width: '25%' },
  // Summary Section
  summaryContainer: {
    flexDirection: 'row-reverse',
    gap: 15,
  },
  summaryNotes: {
    flex: 1,
  },
  notesBox: {
    backgroundColor: colors.background,
    borderRadius: 3,
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notesTitle: {
    fontSize: 7,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 4,
    textAlign: 'right',
  },
  notesText: {
    fontSize: 6,
    color: colors.secondary,
    lineHeight: 1.5,
    textAlign: 'right',
  },
  summaryTotals: {
    width: '40%',
  },
  summaryBox: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  summaryRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  summaryRowLast: {
    borderBottomWidth: 0,
  },
  summaryLabel: {
    fontSize: 7,
    color: colors.secondary,
    textAlign: 'right',
  },
  summaryValue: {
    fontSize: 7,
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
    paddingVertical: 8,
    paddingHorizontal: 8,
    backgroundColor: colors.primary,
  },
  summaryTotalLabel: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.white,
    textAlign: 'right',
  },
  summaryTotalValue: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.accentLight,
    textAlign: 'left',
  },
  // Signature Section
  signatureSection: {
    marginTop: 15,
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    gap: 15,
  },
  signatureBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 3,
    padding: 10,
    alignItems: 'center',
    minHeight: 70,
  },
  signatureTitle: {
    fontSize: 7,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 6,
    textAlign: 'center',
  },
  signatureLine: {
    width: '70%',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    borderStyle: 'dashed',
    marginTop: 25,
    marginBottom: 4,
  },
  signatureLabel: {
    fontSize: 6,
    color: colors.textMuted,
  },
  stampImage: {
    width: 55,
    height: 55,
    objectFit: 'contain',
    marginTop: 4,
  },
  signatureImage: {
    width: 80,
    height: 30,
    objectFit: 'contain',
    marginTop: 4,
  },
  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingVertical: 8,
    paddingHorizontal: 25,
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
    gap: 10,
  },
  footerText: {
    fontSize: 6,
    color: colors.textMuted,
  },
  footerCompany: {
    fontSize: 7,
    fontWeight: 600,
    color: colors.primary,
  },
  footerWebsite: {
    fontSize: 6,
    color: colors.accent,
  },
  // Terms Section (Compact)
  termsSection: {
    marginTop: 10,
    padding: 6,
    backgroundColor: colors.background,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  termsTitle: {
    fontSize: 6,
    fontWeight: 600,
    color: colors.primary,
    marginBottom: 3,
    textAlign: 'right',
  },
  termsText: {
    fontSize: 5,
    color: colors.textMuted,
    lineHeight: 1.4,
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
      signatureUrl?: string;
      showStamp?: boolean;
      showSignature?: boolean;
    };
  };
}

// Webyan Logo SVG Component for PDF
const WebyanLogoSVG = () => (
  <Svg viewBox="0 0 423.05 138.69" style={{ width: 80, height: 28 }}>
    <G>
      <Path fill="#263c84" d="M44.8,118.2h-16.56v-26.55h-5.68v26.55h-7.7c-5.07,0-9.19-4.11-9.19-9.19v-17.36H0v16.93c0,8.19,6.64,14.82,14.82,14.82h35.65v-31.76h-5.67v26.55Z" />
      <Path fill="#263c84" d="M244.18,91.65h-23.54v31.76h5.67v-26.55h17.88c5.07,0,9.19,4.11,9.19,9.19v17.36h5.63v-16.93c0-8.19-6.64-14.82-14.82-14.82Z" />
      <Path fill="#263c84" d="M79.29,91.65h-23.14s0,0,0,0v18.49c0,7.32,5.94,13.26,13.26,13.26h16.61s0,0,0,0v-5.28s0,0,0,0h-16.61c-3.61,0-6.67-2.42-7.64-5.73,0,0,0,0,0,0h29.82s0,0,0,0v-8.42c0-6.79-5.51-12.3-12.3-12.3ZM86.01,106.66s0,0,0,0h-24.28s0,0,0,0v-9.43s0,0,0,0h17.55c3.72,0,6.74,3.02,6.74,6.73v2.7Z" />
      <Path fill="#263c84" d="M102.9,102.68s0,0,0,0v-11.02h-5.62v31.75s0,0,0,0h23.14c6.79,0,12.3-5.51,12.3-12.3v-8.42s0,0,0,0h-29.82ZM120.41,117.83h-17.55s0,0,0,0v-9.43s0,0,0,0h24.28s0,0,0,0v2.7c0,3.72-3.01,6.73-6.73,6.73Z" />
      <Path fill="#263c84" d="M168.26,91.65v15.02s0,0,0,0h-19.22c-2.79,0-5.06-2.26-5.06-5.06v-9.97h-5.58v10.45c0,5.65,4.62,10.28,10.28,10.28h19.55s0,0,0,0c-.97,3.31-4.02,5.73-7.64,5.73h-16.61s0,0,0,0v5.28s0,0,0,0h16.61c7.32,0,13.26-5.94,13.26-13.26v-18.5s0,0,0,0h-5.57Z" />
      <Path fill="#263c84" d="M201.7,91.65h-16.61s0,0,0,0v5.28s0,0,0,0h16.62c3.61,0,6.67,2.42,7.64,5.73,0,0,0,0,0,0h-29.82s0,0,0,0v8.42c0,6.79,5.51,12.3,12.3,12.3h23.14s0,0,0,0v-18.49c0-7.32-5.94-13.26-13.26-13.26ZM209.38,117.82s0,0,0,0h-17.55c-3.72,0-6.73-3.02-6.73-6.73v-2.7s0,0,0,0h24.28s0,0,0,0v9.43Z" />
      <Path fill="#263c84" d="M19.61,56.01h26.31V23.51h-8.74v23.76h-17.58c-5.99,0-10.87-4.88-10.87-10.87v-12.9H0v12.9C0,47.22,8.8,56.01,19.61,56.01Z" />
      <Path fill="#263c84" d="M129.51,48.72c3.6,4.44,9.09,7.29,15.24,7.29s11.64-2.85,15.24-7.29c3.6,4.44,9.09,7.29,15.24,7.29h19.61V23.51h-8.74v23.76h-10.87c-5.99,0-10.87-4.88-10.87-10.87v-12.9h-8.74v12.9c0,5.99-4.88,10.87-10.87,10.87s-10.87-4.88-10.87-10.87v-12.9h-8.74v12.9c0,5.99-4.87,10.87-10.87,10.87h-53.89V12.38h-8.74v43.64h62.63c6.15,0,11.64-2.85,15.24-7.29Z" />
    </G>
    <G>
      <Path fill="#24c2ec" d="M390.77,0h-74.13c-17.83,0-32.28,14.45-32.28,32.28v74.13c0,17.83,14.45,32.28,32.28,32.28h74.13c17.83,0,32.28-14.45,32.28-32.28V32.28c0-17.83-14.45-32.28-32.28-32.28ZM396.57,83.72h-18.99v.05c0,20.95-16.98,37.93-37.93,37.93l-.05-18.99c10.49,0,18.99-8.5,18.99-18.99h0s18.99,0,18.99,0v-18.99h-18.99v18.99h-47.74v-19.11c0-26.3,21.32-47.62,47.62-47.62h19.11v47.74h18.99v18.99Z" />
      <Path fill="#24c2ec" d="M358.55,35.98c-15.86,0-28.72,12.86-28.72,28.72v.03h28.75v-28.75h-.03Z" />
    </G>
  </Svg>
);

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
    logoUrl: '/logos/raneen-logo.png',
    webyanLogoUrl: '/logos/webyan-logo.png',
    showStamp: true,
    showSignature: true,
  };

  const showStamp = company.showStamp !== false;
  const showSignature = company.showSignature !== false;

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
        {/* Header - White Background with Logos Left, Title Right */}
        <View style={styles.header}>
          {/* Logos on the Left */}
          <View style={styles.headerLogos}>
            {company.logoUrl && (
              <Image src={company.logoUrl} style={styles.logo} />
            )}
            <View style={styles.logoDivider} />
            {company.webyanLogoUrl ? (
              <Image src={company.webyanLogoUrl} style={styles.logoWebyan} />
            ) : (
              <WebyanLogoSVG />
            )}
          </View>
          {/* Title on the Right */}
          <View style={styles.headerTitleSection}>
            <Text style={styles.headerTitle}>عرض سعر</Text>
            <Text style={styles.headerTitleEn}>Quotation</Text>
          </View>
        </View>

        {/* Info Bar - Quote Number and Date (side by side, contained width) */}
        <View style={styles.infoBarWrapper}>
          <View style={styles.infoBar}>
            <View style={styles.infoBarItem}>
              <Text style={styles.infoBarLabel}>رقم العرض: </Text>
              <Text style={styles.infoBarValue}>{data.quote_number}</Text>
            </View>
            <View style={styles.infoBarItem}>
              <Text style={styles.infoBarLabel}>تاريخ الإصدار: </Text>
              <Text style={styles.infoBarValue}>{formatDate(data.created_at)}</Text>
            </View>
          </View>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* From & To Section */}
          <View style={styles.partiesRow}>
            {/* From - Company */}
            <View style={styles.partyBox}>
              <Text style={styles.partyLabel}>من / From</Text>
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
              <Text style={styles.partyLabel}>إلى / To</Text>
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
            {data.valid_until && (
              <View style={styles.metaItem}>
                <Text style={styles.metaLabel}>صالح حتى</Text>
                <Text style={styles.metaValue}>{formatDate(data.valid_until)}</Text>
              </View>
            )}
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
                    <Text style={[styles.tableCell, styles.tableCellRight, { fontSize: 6, color: colors.textMuted }]}>
                      {item.description}
                    </Text>
                  )}
                  <Text style={[styles.tableCell, styles.tableCellRight, { fontSize: 6, color: colors.accent }]}>
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
              {showStamp && company.stampUrl ? (
                <Image src={company.stampUrl} style={styles.stampImage} />
              ) : showSignature && company.signatureUrl ? (
                <Image src={company.signatureUrl} style={styles.signatureImage} />
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
