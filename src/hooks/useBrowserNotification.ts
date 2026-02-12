import { useCallback, useEffect, useRef } from 'react';

export function useBrowserNotification() {
  const permissionRef = useRef<NotificationPermission>('default');

  useEffect(() => {
    if ('Notification' in window) {
      permissionRef.current = Notification.permission;
      if (Notification.permission === 'default') {
        Notification.requestPermission().then(perm => {
          permissionRef.current = perm;
        });
      }
    }
  }, []);

  const showBrowserNotification = useCallback((title: string, body: string, options?: {
    icon?: string;
    tag?: string;
    onClick?: () => void;
  }) => {
    if (!('Notification' in window) || permissionRef.current !== 'granted') return;
    // Only show when tab is not focused
    if (document.hasFocus()) return;

    try {
      const notification = new Notification(title, {
        body,
        icon: options?.icon || '/favicon.svg',
        tag: options?.tag || `webyan-${Date.now()}`,
        badge: '/favicon.svg',
        dir: 'rtl',
        lang: 'ar',
        silent: false,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        options?.onClick?.();
      };

      // Auto-close after 8 seconds
      setTimeout(() => notification.close(), 8000);
    } catch (e) {
      // Fallback silently
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      permissionRef.current = perm;
      return perm;
    }
    return permissionRef.current;
  }, []);

  return { showBrowserNotification, requestPermission };
}
