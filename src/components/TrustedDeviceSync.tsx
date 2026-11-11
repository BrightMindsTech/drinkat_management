'use client';

import { useEffect } from 'react';
import { registerThisTrustedDevice } from '@/lib/trusted-device-client';

/** After a live dashboard session, remember this phone for every employee. */
export function TrustedDeviceSync() {
  useEffect(() => {
    void registerThisTrustedDevice();
  }, []);
  return null;
}
