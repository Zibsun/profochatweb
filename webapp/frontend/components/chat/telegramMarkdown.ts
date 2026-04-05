/**
 * Converts Telegram-style markdown to CommonMark.
 * Telegram uses single *text* for bold, CommonMark uses **text** for bold.
 * This function converts single asterisk bold to double asterisk bold,
 * without affecting already-double asterisks.
 */
export function telegramToCommonMark(text: string): string {
  // Replace *text* (single) with **text** (double), but skip **text** (already double)
  return text.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '**$1**')
}
