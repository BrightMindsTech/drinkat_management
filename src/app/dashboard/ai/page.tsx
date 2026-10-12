import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** Conversational AI assistant removed. Vision scoring remains on photo tasks. */
export default function AiPageRemoved() {
  redirect('/dashboard');
}
