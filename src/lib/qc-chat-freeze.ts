/**
 * General chat is removed from DRINKAT QC. Navigation is hidden and APIs
 * must reject every caller — including authenticated users who guess the URL.
 */
export const QC_CHAT_DISABLED_MESSAGE = 'Chat is not available in DRINKAT QC';

export function qcChatForbiddenResponse(): Response {
  return Response.json({ error: QC_CHAT_DISABLED_MESSAGE }, { status: 403 });
}
