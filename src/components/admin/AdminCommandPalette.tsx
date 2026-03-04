import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { SIDEBAR_MODULES } from './AdminSidebar';
import { type RolePermissions } from '@/lib/permissions';

interface AdminCommandPaletteProps {
  permissions: RolePermissions | null;
}

export default function AdminCommandPalette({ permissions }: AdminCommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen(prev => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const filteredModules = permissions
    ? SIDEBAR_MODULES
        .filter(mod => !mod.sectionPermission || permissions[mod.sectionPermission])
        .map(mod => ({
          ...mod,
          items: mod.items.filter(item => !item.permission || permissions[item.permission]),
        }))
        .filter(mod => mod.items.length > 0)
    : [];

  const handleSelect = (href: string) => {
    setOpen(false);
    navigate(href);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="ابحث عن صفحة أو ميزة..." className="text-right" dir="rtl" />
      <CommandList dir="rtl">
        <CommandEmpty>لا توجد نتائج</CommandEmpty>
        {filteredModules.map((mod) => (
          <CommandGroup key={mod.id} heading={mod.title}>
            {mod.items.map((item) => (
              <CommandItem
                key={item.href}
                value={`${mod.title} ${item.title}`}
                onSelect={() => handleSelect(item.href)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <item.icon className="h-4 w-4 text-muted-foreground" />
                <span>{item.title}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
