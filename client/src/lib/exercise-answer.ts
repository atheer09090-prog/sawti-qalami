/** Compare the configured educational answer independently of optional Arabic marks. */
export function exerciseAnswerMatches(input: string, expected: string): boolean {
  const normalize = (value: string) => value.normalize("NFC").replace(/[\u064b-\u065f\u0670\u0640]/g, "").replace(/[.!،؟؛:]/g, "").trim().replace(/\s+/g, " ");
  return normalize(input) === normalize(expected);
}
