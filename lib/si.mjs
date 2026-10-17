/**
 * SI-unit classifier shared by the build pipeline, the data tests and the UI.
 * The whole S26 subject ("Metrology, SI Units & Standard Measures") is SI
 * content, plus any stem that explicitly discusses SI units or the SI system.
 */
export const SI_SUBJECT_IDS = new Set(['S26']);

const SI_UNIT_NAMES =
  'metre|meter|kilogram|second|ampere|kelvin|mole|candela|newton|joule|watt|pascal|hertz|coulomb|volt|ohm|farad|tesla|weber|henry|lumen|lux|becquerel|gray|sievert|katal|' +
  'मीटर|किलोग्राम|सेकंड|एम्पीयर|केल्विन|मोल|कैंडेला|न्यूटन|जूल|वाट|पास्कल|हर्ट्ज़|कूलॉम|वोल्ट|ओम|फैराड|टेस्ला|वेबर|हेनरी|ल्यूमेन|लक्स|बेकरल|सीवर्ट';

export const SI_TEXT_PATTERNS = [
  /\bS\.?\s*I\.?\s*(?:unit|units|base unit|derived unit|prefix|prefixes|symbol|system)\b/i,
  /\bS\.?\s*I\.?\s*(?:मात्रक|इकाई|उपसर्ग)/i,
  /international system of units/i,
  /\b(?:BIPM|CGPM|NIST|CIPM)\b/,
  /अंतर\s*राष्ट्रीय\s*मात्रक\s*प्रणाली|अंतर्राष्ट्रीय\s*मात्रक\s*प्रणाली/,
  /\bseven\s+(?:SI\s+)?base\s+units\b/i,
  /सात\s*(?:मूल|आधार)\s*मात्रक/,
  /\b(?:SI\s+)?(?:base|derived)\s+units?\b/i,
  /\b(?:मूल|व्युत्पन्न)\s*मात्रक/,
  new RegExp(`\\b(?:the\\s+)?(?:${SI_UNIT_NAMES})\\b[^.!?\\n]{0,40}\\b(?:is|are|was|were)\\s+(?:the\\s+)?(?:SI|base|derived)\\s+unit`, 'i'),
  new RegExp(`\\b(?:SI|base|derived)\\s+unit\\s+(?:of|for)\\s+(?:${SI_UNIT_NAMES})\\b`, 'i'),
];

export function isSIText(value) {
  const text = String(value ?? '');
  return text.trim() ? SI_TEXT_PATTERNS.some((pattern) => pattern.test(text)) : false;
}

function questionText(question) {
  return [question?.question?.en, question?.question?.hi, question?.title, question?.titleHindi, question?.en, question?.hi]
    .filter(Boolean)
    .join(' ');
}

export function isSIQuestion(question) {
  if (!question || typeof question !== 'object') return false;
  if (SI_SUBJECT_IDS.has(question.subjectId)) return true;
  if (question.siUnit === true || question.isSI === true) return true;
  return isSIText(questionText(question));
}

export function classifySI(question) {
  if (!question || typeof question !== 'object') return 'NONE';
  if (SI_SUBJECT_IDS.has(question.subjectId)) return 'SUBJECT_S26';
  if (question.siUnit === true || question.isSI === true) return 'FLAGGED';
  return isSIText(questionText(question)) ? 'TEXT_MATCH' : 'NONE';
}
