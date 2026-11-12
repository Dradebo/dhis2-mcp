/** Largest tool reply sent to the agent. A live 2.41 server returned 18 MB for one unpaged list and the
 *  connection closed; replies above this are cut with a clear note so no single answer can end the session. */
export const MAX_TOOL_RESULT_CHARS = 200_000;
export function limitToolResult<T>(result: T): T {
  const r = result as unknown as { content?: Array<{ type?: string; text?: string }> };
  if (!r || !Array.isArray(r.content)) return result;
  let budget = MAX_TOOL_RESULT_CHARS;
  let cut = false;
  for (const part of r.content) {
    if (typeof part.text !== 'string') continue;
    if (part.text.length > budget) {
      // Pretty-printed JSON roughly doubles the size; send it compact before cutting anything.
      const compact = compactJson(part.text);
      if (compact !== undefined && compact.length <= budget) { part.text = compact; budget -= compact.length; continue; }
      if (compact !== undefined) part.text = compact;
    }
    if (part.text.length > budget) {
      const total = part.text.length;
      part.text = part.text.slice(0, Math.max(0, budget)) +
        `\n\n[Reply cut at ${MAX_TOOL_RESULT_CHARS.toLocaleString('en')} of ${total.toLocaleString('en')} characters. Ask for less: use filter, a smaller pageSize, or the next page.]`;
      cut = true;
      budget = 0;
    } else budget -= part.text.length;
  }
  if (cut) process.stderr.write(`[LIMIT] tool reply truncated to ${MAX_TOOL_RESULT_CHARS} characters\n`);
  return result;
}
function compactJson(text: string): string | undefined {
  const t = text.trimStart();
  if (!(t.startsWith('{') || t.startsWith('['))) return undefined;
  try { return JSON.stringify(JSON.parse(text)); } catch { return undefined; }
}

export function withResultLimit<A extends unknown[], R>(fn: (...a: A) => Promise<R>): (...a: A) => Promise<R> {
  return async (...a: A) => limitToolResult(await fn(...a));
}

