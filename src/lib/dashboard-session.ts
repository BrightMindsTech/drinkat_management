import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

/** Dashboard RSC pages — layout gates auth; never redirect to /login from a child page. */
export async function getDashboardSession() {
  return getServerSession(authOptions);
}
