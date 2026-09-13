/**
 * Identity redaction for CV text before it is sent to an AI provider.
 *
 * Rationale: screening CVs for employment is an Annex III high-risk use under
 * the EU AI Act, and Article 10 requires that the data driving the decision is
 * examined for bias. Names, email addresses, phone numbers, photos and personal
 * URLs carry strong signals of gender, ethnicity and national origin while
 * adding nothing to a skills assessment. Removing them before the prompt is
 * built is the cheapest available bias control and costs no accuracy.
 *
 * This is a mitigation, not a guarantee. Free text can still leak identity
 * (university names, languages, military service, career gaps). Document that
 * honestly rather than claiming the pipeline is blind.
 */

export interface RedactionResult {
  /** CV text with direct identifiers replaced by neutral placeholders. */
  text: string;
  /** Count of replacements by category — recorded for the audit trail. */
  counts: Record<string, number>;
}

const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;

/**
 * Phone numbers. Deliberately conservative: either an explicit international
 * prefix, or a run of 7+ digits with no separator. Loose patterns eat date
 * ranges like "2019 - 2023" and destroy the work history the model needs.
 */
const PHONE =
  /(?:\+|\b00)\d{1,3}[\s.-]?(?:\(\d{1,4}\)[\s.-]?)?\d(?:[\d\s.-]{5,13})\d|\b\d{7,15}\b/g;

const URL = /\bhttps?:\/\/\S+|\b(?:www\.|linkedin\.com\/|github\.com\/)\S+/gi;

/** Postal-ish address lines are too varied to match safely; we only drop obvious ones. */
const DOB =
  /\b(?:date of birth|d\.?o\.?b\.?|geboortedatum|fødselsdato)\b\s*[:\-]?\s*\S.*/gi;

const NATIONALITY =
  /\b(?:nationality|citizenship|marital status|gender|sex)\b\s*[:\-]?\s*\S.*/gi;

function countAndReplace(
  text: string,
  pattern: RegExp,
  replacement: string,
  counts: Record<string, number>,
  key: string,
): string {
  let n = 0;
  const out = text.replace(pattern, () => {
    n += 1;
    return replacement;
  });
  if (n > 0) counts[key] = (counts[key] ?? 0) + n;
  return out;
}

/**
 * Removes direct identifiers from CV text.
 *
 * The candidate's stored name is passed in explicitly because it is the one
 * identifier we know for certain and cannot find by pattern alone.
 */
export function redactIdentity(
  resumeText: string,
  candidateName?: string,
): RedactionResult {
  const counts: Record<string, number> = {};
  let text = resumeText;

  text = countAndReplace(text, EMAIL, "[EMAIL]", counts, "email");
  text = countAndReplace(text, URL, "[URL]", counts, "url");
  text = countAndReplace(text, DOB, "[DATE OF BIRTH REMOVED]", counts, "dob");
  text = countAndReplace(
    text,
    NATIONALITY,
    "[PERSONAL ATTRIBUTE REMOVED]",
    counts,
    "personalAttribute",
  );
  text = countAndReplace(text, PHONE, "[PHONE]", counts, "phone");

  if (candidateName) {
    const parts = candidateName
      .split(/\s+/)
      .map((p) => p.trim())
      .filter((p) => p.length > 1);
    for (const part of parts) {
      const escaped = part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      text = countAndReplace(
        text,
        new RegExp(`\\b${escaped}\\b`, "gi"),
        "[CANDIDATE]",
        counts,
        "name",
      );
    }
  }

  return { text, counts };
}
