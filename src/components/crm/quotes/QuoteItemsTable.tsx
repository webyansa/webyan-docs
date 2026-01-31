import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatCurrency } from '@/lib/crm/pipelineConfig';

export interface QuoteItem {
  id: string;
  name: string;
  description?: string;
  type: 'plan' | 'service' | 'custom';
  billing?: string;
  quantity: number;
  unit_price: number;
  total: number;
}

interface QuoteItemsTableProps {
  items: QuoteItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  showActions?: boolean;
  onRemoveItem?: (id: string) => void;
}

export default function QuoteItemsTable({
  items,
  subtotal,
  taxRate,
  taxAmount,
  total,
  showActions = false,
  onRemoveItem,
}: QuoteItemsTableProps) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="w-[50px]">#</TableHead>
            <TableHead>البند</TableHead>
            <TableHead className="text-center">المدة / الوحدة</TableHead>
            <TableHead className="text-center">الكمية</TableHead>
            <TableHead className="text-left">السعر</TableHead>
            <TableHead className="text-left">الإجمالي</TableHead>
            {showActions && <TableHead className="w-[50px]"></TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => (
            <TableRow key={item.id}>
              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{item.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center text-muted-foreground">
                {item.billing || '-'}
              </TableCell>
              <TableCell className="text-center">{item.quantity}</TableCell>
              <TableCell className="text-left">{formatCurrency(item.unit_price)}</TableCell>
              <TableCell className="text-left font-medium">{formatCurrency(item.total)}</TableCell>
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
            <TableCell colSpan={showActions ? 5 : 4} className="text-left">
              المجموع الفرعي
            </TableCell>
            <TableCell colSpan={showActions ? 2 : 1} className="text-left font-medium">
              {formatCurrency(subtotal)}
            </TableCell>
          </TableRow>
          <TableRow>
            <TableCell colSpan={showActions ? 5 : 4} className="text-left">
              ضريبة القيمة المضافة ({taxRate}%)
            </TableCell>
            <TableCell colSpan={showActions ? 2 : 1} className="text-left font-medium">
              {formatCurrency(taxAmount)}
            </TableCell>
          </TableRow>
          <TableRow className="bg-primary/5">
            <TableCell colSpan={showActions ? 5 : 4} className="text-left font-bold text-lg">
              الإجمالي
            </TableCell>
            <TableCell colSpan={showActions ? 2 : 1} className="text-left font-bold text-lg text-primary">
              {formatCurrency(total)}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
