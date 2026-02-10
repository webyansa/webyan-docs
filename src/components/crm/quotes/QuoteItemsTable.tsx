import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/crm/pipelineConfig';
import { Gift, RotateCw } from 'lucide-react';

export interface QuoteItem {
  id: string;
  name: string;
  description?: string;
  type: 'plan' | 'service' | 'custom';
  billing?: string;
  quantity: number;
  unit_price: number;
  total: number;
  item_category?: 'execution' | 'recurring_annual' | 'service';
  first_year_free?: boolean;
  recurring_amount?: number;
}

interface RecurringItemSummary {
  name: string;
  amount: number;
  firstYearFree: boolean;
}

interface QuoteItemsTableProps {
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  showActions?: boolean;
  onRemoveItem?: (id: string) => void;
  recurringItems?: RecurringItemSummary[];
}

export default function QuoteItemsTable({
  items,
  subtotal,
  taxRate,
  taxAmount,
  total,
  showActions = false,
  onRemoveItem,
  recurringItems = [],
}: QuoteItemsTableProps) {
  return (
    <div className="space-y-4">
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>البند</TableHead>
              <TableHead className="text-center">النوع</TableHead>
              <TableHead className="text-center">المدة / الوحدة</TableHead>
              <TableHead className="text-center">الكمية</TableHead>
              <TableHead className="text-left">السعر</TableHead>
              <TableHead className="text-left">الإجمالي</TableHead>
              {showActions && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, index) => (
              <TableRow key={item.id} className={item.first_year_free ? 'bg-green-50/50' : ''}>
                <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    )}
                    {item.first_year_free && (
                      <Badge variant="outline" className="mt-1 text-green-700 border-green-300 bg-green-50">
                        <Gift className="w-3 h-3 ml-1" />
                        السنة الأولى مجانية
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {item.item_category === 'execution' && (
                    <Badge variant="secondary" className="text-xs">تنفيذ</Badge>
                  )}
                  {item.item_category === 'recurring_annual' && (
                    <Badge variant="outline" className="text-xs">
                      <RotateCw className="w-3 h-3 ml-1" />
                      سنوي
                    </Badge>
                  )}
                  {item.item_category === 'service' && (
                    <Badge variant="secondary" className="text-xs">خدمة</Badge>
                  )}
                  {!item.item_category && (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </TableCell>
                <TableCell className="text-center text-muted-foreground">
                  {item.billing || '-'}
                </TableCell>
                <TableCell className="text-center">{item.quantity}</TableCell>
                <TableCell className="text-left">
                  {item.first_year_free ? (
                    <span className="line-through text-muted-foreground">{formatCurrency(item.unit_price)}</span>
                  ) : (
                    formatCurrency(item.unit_price)
                  )}
                </TableCell>
                <TableCell className="text-left font-medium">
                  {item.first_year_free ? (
                    <span className="text-green-600 font-medium">مجاناً</span>
                  ) : (
                    formatCurrency(item.total)
                  )}
                </TableCell>
                {showActions && onRemoveItem && (
                  <TableCell>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="text-destructive hover:text-destructive/80 text-sm"
                    >
                      حذف
                    </button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="text-left">
                المجموع الفرعي
              </TableCell>
              <TableCell colSpan={showActions ? 2 : 1} className="text-left font-medium">
                {formatCurrency(subtotal)}
              </TableCell>
            </TableRow>
            <TableRow>
              <TableCell colSpan={showActions ? 6 : 5} className="text-left">
                ضريبة القيمة المضافة ({taxRate}%)
              </TableCell>
              <TableCell colSpan={showActions ? 2 : 1} className="text-left font-medium">
                {formatCurrency(taxAmount)}
              </TableCell>
            </TableRow>
            <TableRow className="bg-primary/5">
              <TableCell colSpan={showActions ? 6 : 5} className="text-left font-bold text-lg">
                الإجمالي
              </TableCell>
              <TableCell colSpan={showActions ? 2 : 1} className="text-left font-bold text-lg text-primary">
                {formatCurrency(total)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {/* Recurring Items Summary */}
      {recurringItems.length > 0 && (
        <div className="border rounded-lg p-4 bg-blue-50/50 border-blue-200">
          <h4 className="font-medium text-sm mb-3 flex items-center gap-2 text-blue-800">
            <RotateCw className="w-4 h-4" />
            الرسوم السنوية المستقبلية (للمعلومية)
          </h4>
          <div className="space-y-2">
            {recurringItems.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span>{item.name}</span>
                  {item.firstYearFree && (
                    <Badge variant="outline" className="text-xs text-green-700 border-green-300">
                      تبدأ بعد السنة الأولى
                    </Badge>
                  )}
                </div>
                <span className="font-medium">{formatCurrency(item.amount)} / سنوياً</span>
              </div>
            ))}
            <div className="border-t border-blue-200 pt-2 mt-2 flex items-center justify-between font-medium text-blue-900">
              <span>إجمالي الرسوم السنوية</span>
              <span>{formatCurrency(recurringItems.reduce((sum, i) => sum + i.amount, 0))} / سنوياً</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}