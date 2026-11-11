'use client';

import { useEffect } from 'react';
import { flushPendingPushNavigation } from '@/lib/push-open-client';

/** Attach native push tap handlers on login and dashboard so a cold start still opens the item. */
export function PushDeepLinkHost() {
  useEffect(() => {
    void import('@/lib/native-push-client').then(({ setupNativePushDelivery }) => setupNativePushDelivery());
    flushPendingPushNavigation();
  }, []);
  return null;
}
