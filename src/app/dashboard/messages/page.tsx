import { redirect } from 'next/navigation';

/** Phase 1: general chat is removed from the QC product. History and APIs are preserved. */
export default function MessagesPage() {
  redirect('/dashboard');
}
