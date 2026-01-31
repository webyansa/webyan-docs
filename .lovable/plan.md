

## Plan: Professional Quote System Enhancement

This plan covers a comprehensive redesign of the PDF quotation document and enhanced quote management functionality with proper status-based restrictions.

---

### Overview

The improvements will be organized into two main areas:

1. **PDF Document Redesign** - A clean, professional single-page layout with proper visual hierarchy
2. **Quote Actions & Status Management** - Proper restrictions on edit/delete and ability to change status back

---

### Part 1: PDF Document Redesign

The new PDF layout will follow this structure:

```text
+--------------------------------------------------+
|  [Raneen Logo]  [Webyan Logo]    عرض سعر         |
|                               Price Quotation     |
+--------------------------------------------------+
|    رقم العرض: QT-2024-0001                       |
|    تاريخ الإصدار: 15 يناير 2024                  |
|    عنوان العرض: منصة إدارة المحتوى               |
+--------------------------------------------------+
|  من / From              |    إلى / To            |
|  شركة رنين للتقنية      |    اسم العميل          |
|  ...                    |    ...                 |
+--------------------------------------------------+
|  # | البند | الكمية | السعر | الإجمالي           |
|  1 | ...   | ...    | ...   | ...                |
+--------------------------------------------------+
|  المجموع الفرعي: xxx ر.س                         |
|  الخصم: -xxx ر.س                                 |
|  ضريبة القيمة المضافة (15%): xxx ر.س             |
|  الإجمالي: xxx ر.س                               |
+--------------------------------------------------+
|  توقيع الشركة  |  توقيع العميل                   |
+--------------------------------------------------+
```

#### Design Changes:

| Element | Current | New |
|---------|---------|-----|
| Header Background | Dark Navy (#1e3a5f) | White (#ffffff) |
| Logos Position | Left side | Left side (unchanged) |
| Document Title | Center below header | Right side of header |
| Quote Info | Multiple cards | Unified info bar with accent background |
| Color Scheme | Navy & Cyan | Slate & Soft Blue (Webyan identity) |

#### File Changes:
- **QuotePDFDocument.tsx**: Complete style overhaul with new header layout, info bar section, and professional typography

---

### Part 2: Quote Management Enhancements

#### 2.1 Edit/Delete Restrictions

New validation logic for quote actions:

| Quote Status | Can Edit | Can Delete | Message |
|--------------|----------|------------|---------|
| draft | Yes | Yes | - |
| sent | Yes | Yes | - |
| viewed | Yes | Yes | - |
| accepted | No | No | "لا يمكن تعديل/حذف عرض سعر معتمد" |
| rejected | No | No | "لا يمكن تعديل/حذف عرض سعر مرفوض" |

#### 2.2 Status Change Feature

Add ability to revert quote status:
- New dropdown item: "إعادة فتح العرض" (Reopen Quote)
- Only visible for `accepted` or `rejected` quotes
- Changes status back to `draft`
- Shows confirmation dialog before changing

#### 2.3 Edit Action in Dropdown

Currently exists but needs enhancement:
- Show for non-approved quotes only
- Add toast message when attempting to edit approved quote
- Add delete action with same restrictions

#### File Changes:
- **QuoteDetailsPage.tsx**: 
  - Add status validation functions
  - Add "Reopen Quote" action
  - Add delete quote functionality with restrictions
  - Update dropdown menu with proper conditions

---

### Technical Implementation Details

#### QuotePDFDocument.tsx Changes:

1. **Header Styles Update**:
```javascript
header: {
  backgroundColor: '#ffffff',  // White background
  borderBottomWidth: 2,
  borderBottomColor: '#e2e8f0',
}
```

2. **New Info Bar Section**:
```javascript
infoBar: {
  backgroundColor: '#f1f5f9',  // Light slate background
  paddingVertical: 10,
  paddingHorizontal: 25,
}
```

3. **Title Position**: Move document title to header right side with proper bilingual labels

#### QuoteDetailsPage.tsx Changes:

1. **New mutation for status revert**:
```javascript
const revertStatusMutation = useMutation({
  mutationFn: async () => {
    // Change status back to draft
  }
});
```

2. **Delete mutation with validation**:
```javascript
const deleteQuoteMutation = useMutation({
  mutationFn: async () => {
    if (quote.status === 'accepted') {
      throw new Error('Cannot delete approved quote');
    }
    // Delete logic
  }
});
```

3. **Helper function for edit/delete validation**:
```javascript
const canModifyQuote = () => {
  return !['accepted', 'rejected'].includes(quote?.status || '');
};
```

---

### Implementation Sequence

1. Update `QuotePDFDocument.tsx`:
   - Redesign header with white background
   - Move document title to right side
   - Add new info bar section below header
   - Adjust colors and spacing for professional look

2. Update `QuoteDetailsPage.tsx`:
   - Add `canModifyQuote` helper function
   - Add delete mutation with validation
   - Add revert status mutation
   - Update dropdown menu items with conditions
   - Add delete confirmation dialog
   - Add reopen confirmation dialog
   - Update web UI header to match new design

---

### Expected Outcome

- Professional, clean PDF design on a single page
- Clear visual hierarchy with white header and accent info bar
- Both logos clearly visible
- Proper edit/delete restrictions based on quote status
- Ability to reopen closed quotes when needed
- Clear feedback messages for restricted actions

