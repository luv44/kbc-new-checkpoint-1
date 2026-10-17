import { hashId, jaccard, mulberry32, norm, pickSimilarLength, seedFrom, shuffle, truncate } from './util.mjs';

const DESCRIPTORS = [
  ['key', 'प्रमुख'], ['core', 'मूल'], ['essential', 'आवश्यक'], ['notable', 'उल्लेखनीय'],
  ['defining', 'परिभाषित'], ['important', 'महत्वपूर्ण'], ['fundamental', 'मौलिक'], ['representative', 'प्रतिनिधि'],
];
const article = (word) => (/^[aeiou]/i.test(word) ? 'an' : 'a');
const T1_EN = [
  (d, t) => `Which of the following ${d} statements about ${t} is correct?`,
  (d, t) => `Identify the ${d} statement related to ${t}.`,
  (d, t) => `Select the statement that correctly describes ${article(d)} ${d} aspect of ${t}.`,
  (d, t) => `Which ${d} fact about ${t} is stated correctly?`,
  (d, t) => `Choose the accurate statement about ${t} in ${d} terms.`,
  (d, t) => `Which statement about ${t} is correct in ${d} terms?`,
  (d, t) => `From ${article(d)} ${d} perspective, which statement about ${t} is correct?`,
  (d, t) => `Which of these ${d} statements about ${t} is accurate?`,
];
const T1_HI = [
  (d, t) => `${t} के संबंध में निम्नलिखित में से कौन-सा ${d} कथन सही है?`,
  (d, t) => `${t} से संबंधित ${d} कथन पहचानिए।`,
  (d, t) => `वह कथन चुनिए जो ${t} के ${d} पहलू का सही वर्णन करता है।`,
  (d, t) => `${t} के बारे में कौन-सा ${d} तथ्य सही है?`,
  (d, t) => `${t} के बारे में ${d} दृष्टि से सही कथन चुनिए।`,
  (d, t) => `${d} दृष्टि से ${t} के बारे में कौन-सा कथन सही है?`,
  (d, t) => `${d} परिप्रेक्ष्य से ${t} के संबंध में कौन-सा कथन सही है?`,
  (d, t) => `इनमें से कौन-सा ${d} कथन ${t} के बारे में सही है?`,
];

const opt = (en, hi) => ({ en: String(en).trim(), hi: String(hi || en).trim() });
const meanLen = (list) => (list.length ? list.reduce((sum, item) => sum + item.en.length, 0) / list.length : 0);
const numberClass = (token) => (/^(?:1[5-9]\d{2}|20\d{2})$/.test(token) ? 'year' : token.includes('.') ? 'decimal' : 'integer');

function splitPair(concept) {
  const at = concept.en.indexOf(':');
  if (at < 2) return null;
  const leftEn = concept.en.slice(0, at).trim();
  const rightEn = concept.en.slice(at + 1).trim();
  const hiAt = concept.hi.indexOf(':');
  const leftHi = hiAt > 1 ? concept.hi.slice(0, hiAt).trim() : leftEn;
  const rightHi = hiAt > 1 ? concept.hi.slice(hiAt + 1).trim() : rightEn;
  if (leftEn.length < 3 || rightEn.length < 3 || leftEn.length > 140 || rightEn.length > 240) return null;
  return { leftEn, rightEn, leftHi, rightHi };
}

function numericTokens(concept) {
  const found = [];
  for (const match of concept.en.matchAll(/\b\d[\d,]*(?:\.\d+)?\s?%?/g)) {
    const token = match[0].replace(/[,\s]+$/, '');
    if (token.length >= 2 && !found.includes(token)) found.push(token);
  }
  return found;
}

/**
 * Build candidate questions for one topic from its catalogue concepts and fact
 * card.  Every candidate carries the exact option text, the explanation and the
 * grounding tag; the accept loop below enforces quality rules.
 */
export function generateTopicQuestions({ topic, fact, sourceUrl, pools, existing, count, startIndex = 0, version = 'offline-fact-v2' }) {
  if (count <= 0) return [];
  const rng = mulberry32(seedFrom(`${topic.id}:${version}`));
  const concepts = topic.concepts;
  const currentNorm = new Set(concepts.map((c) => norm(c.en)));
  const accepted = [];
  const usedStems = new Set(existing.map((q) => norm(q.question?.en)));
  const usedStemsRaw = existing.map((q) => q.question?.en || '');
  const signatures = new Set(existing.map((q) => `${(q.options || []).map((o) => norm(o.en)).sort().join('|')}#${norm(q.options?.[q.correctIndex]?.en)}`));

  const pool = (list, avoid = currentNorm) => {
    const seen = new Set(avoid);
    return list.filter((item) => {
      const key = norm(item.en);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const topicOption = (list, avoid = new Set([norm(topic.en)])) => pool(list.map((t) => ({ en: t.en, hi: t.hi, topic: t })), avoid).map((item) => ({ ...item, id: item.topic.id }));

  const chapterConcepts = (pools.chapterTopics || []).flatMap((t) => t.concepts.map((c) => ({ ...c, topic: t })));
  const subjectConcepts = (pools.subjectTopics || []).flatMap((t) => t.concepts.map((c) => ({ ...c, topic: t })));
  const foreignConcepts = pool([...chapterConcepts, ...subjectConcepts]);
  const chapterOptions = topicOption([...(pools.chapterSiblings || []).map((id) => pools.topics.get(id)), ...(pools.subjectChapters || []).map((id) => pools.topics.get(id))].filter(Boolean), new Set([norm(topic.chapter.title)]));
  const subjectOptions = topicOption([...(pools.otherSubjects || [])]);

  const candidates = [];
  const filler = [];
  let collecting = candidates;
  const add = (type, angle, difficulty, stemEn, stemHi, correct, distractors, conceptIds, explanation, grounding) => {
    collecting.push({
      type, angle, difficulty,
      stem: { en: stemEn.trim(), hi: stemHi.trim() },
      correct: opt(correct.en, correct.hi),
      distractors: distractors.map((item) => opt(item.en, item.hi)),
      conceptIds, explanation, grounding,
    });
  };

  // 1. Statement selection — the volume filler, 8 descriptors × 8 stems.
  collecting = filler;
  for (let d = 0; d < DESCRIPTORS.length; d += 1) {
    for (let p = 0; p < T1_EN.length; p += 1) {
      for (const concept of concepts) {
        const [descEn, descHi] = DESCRIPTORS[d];
        const near = [...chapterConcepts, ...subjectConcepts].filter(
          (item) => item.en.length >= concept.en.length * 0.45 && item.en.length <= concept.en.length * 2.2,
        );
        if (near.length < 3) continue;
        const distractors = shuffle(rng, pool(near)).slice(0, 3);
        if (distractors.length < 3) continue;
        add(
          'T1', 'FACT_RECALL', 'MEDIUM',
          T1_EN[p](descEn, topic.en), T1_HI[p](descHi, topic.hi),
          { en: concept.en, hi: concept.hi },
          distractors,
          [concept.id],
          { en: `According to the verified catalogue, “${concept.en}” is a key concept of “${topic.en}”.`, hi: `सत्यापित कैटलॉग के अनुसार, “${concept.hi}” टॉपिक “${topic.hi}” की मुख्य अवधारणा है।` },
          'CONCEPT',
        );
      }
    }
  }

  collecting = candidates;

  // 2. Concept → topic.
  for (const concept of concepts) {
    const distractors = pickSimilarLength(topicOption([...(pools.chapterTopics || []), ...(pools.subjectTopics || [])]), topic.en.length, 3, rng);
    if (distractors.length < 3) continue;
    add(
      'T2', 'IDENTIFICATION', 'EASY',
      `The concept “${truncate(concept.en, 220)}” is studied under which of the following topics?`,
      `“${truncate(concept.hi, 220)}” अवधारणा निम्नलिखित में से किस टॉपिक के अंतर्गत पढ़ी जाती है?`,
      { en: topic.en, hi: topic.hi }, distractors, [concept.id],
      { en: `This concept belongs to “${topic.en}” in chapter “${topic.chapter.title}”.`, hi: `यह अवधारणा अध्याय “${topic.chapter.titleHindi || topic.chapter.title}” के टॉपिक “${topic.hi}” से संबंधित है।` },
      'CATALOG_TOPIC',
    );
  }

  // 3. NOT a concept of this topic.
  const t3 = [
    [(t) => `Which of the following is NOT a key concept of ${t}?`, (t) => `निम्नलिखित में से कौन ${t} की मुख्य अवधारणा नहीं है?`],
    [(t) => `Which option is not listed as a key concept of ${t}?`, (t) => `कौन-सा विकल्प ${t} की मुख्य अवधारणा के रूप में सूचीबद्ध नहीं है?`],
    [(t) => `Which one does not belong to the concept list of ${t}?`, (t) => `कौन-सा विकल्प ${t} की अवधारणा सूची में नहीं आता?`],
  ];
  for (let variant = 0; variant < 3; variant += 1) {
    const foreign = foreignConcepts[variant * 7 % Math.max(1, foreignConcepts.length)];
    const own = shuffle(rng, concepts).slice(0, 3);
    if (!foreign || own.length < 3) continue;
    add(
      'T3', 'CONTRAST', 'MEDIUM', t3[variant][0](topic.en), t3[variant][1](topic.hi),
      { en: foreign.en, hi: foreign.hi },
      own.map((c) => ({ en: c.en, hi: c.hi })),
      own.map((c) => c.id),
      { en: `“${truncate(foreign.en, 160)}” belongs to “${foreign.topic.en}”, not to “${topic.en}”.`, hi: `“${truncate(foreign.hi, 160)}” टॉपिक “${foreign.topic.hi}” से है, “${topic.hi}” से नहीं।` },
      'EXCLUSION',
    );
  }

  // 4. Numeric cloze.
  for (const concept of concepts) {
    for (const token of numericTokens(concept)) {
      const kind = numberClass(token);
      const value = Number(token.replace(/[%,]/g, ''));
      const poolValues = [...new Set([
        ...numericTokens({ en: concepts.map((c) => c.en).join(' ') }),
        ...(pools.numericPool || []),
      ])].filter((candidate) => candidate !== token && numberClass(candidate) === kind);
      const near = poolValues.filter((candidate) => {
        const parsed = Number(candidate.replace(/[%,]/g, ''));
        if (!Number.isFinite(parsed) || !Number.isFinite(value) || value <= 0) return kind === 'year';
        return parsed >= value * 0.4 && parsed <= value * 2.5;
      });
      const wrapped = (kind === 'year' ? poolValues : near).map((candidate) => ({ en: candidate, hi: candidate }));
      const distractors = pickSimilarLength(wrapped, token.length, 3, rng, new Set([norm(token)]));
      if (distractors.length < 3) continue;
      add(
        'T4', 'DATA_INTERPRETATION', 'HARD',
        `Complete the statement about ${topic.en}: “${concept.en.replace(token, '______')}”`,
        `${topic.hi} के बारे में कथन पूरा करें: “${concept.hi.replace(token, '______')}”`,
        { en: token, hi: token }, distractors, [concept.id],
        { en: `The complete verified statement is: ${concept.en}`, hi: `पूर्ण सत्यापित कथन है: ${concept.hi}` },
        'CLOZE',
      );
    }
  }

  // 5/6. Chapter and subject membership.
  const chapterStems = [
    [(t) => `Under which chapter is ${t} studied?`, (t) => `${t} किस अध्याय के अंतर्गत पढ़ा जाता है?`],
    [(t) => `${t} is part of which chapter?`, (t) => `${t} किस अध्याय का भाग है?`],
  ];
  for (const [en, hi] of chapterStems) {
    const distractors = pickSimilarLength(chapterOptions, topic.chapter.title.length, 3, rng, new Set([norm(topic.chapter.title)]));
    if (distractors.length < 3) continue;
    add('T5', 'SYLLABUS_MAPPING', 'EASY', en(topic.en), hi(topic.hi),
      { en: topic.chapter.title, hi: topic.chapter.titleHindi || topic.chapter.title }, distractors,
      [concepts[0]?.id].filter(Boolean),
      { en: `“${topic.en}” is a topic of chapter “${topic.chapter.title}”.`, hi: `“${topic.hi}” अध्याय “${topic.chapter.titleHindi || topic.chapter.title}” का टॉपिक है।` },
      'CATALOG_CHAPTER');
  }
  const subjectStems = [
    [(t) => `Which subject includes the topic ${t}?`, (t) => `किस विषय में ${t} टॉपिक शामिल है?`],
    [(t) => `${t} belongs to which subject?`, (t) => `${t} किस विषय का है?`],
  ];
  for (const [en, hi] of subjectStems) {
    const distractors = pickSimilarLength(subjectOptions, topic.subject.title.length, 3, rng, new Set([norm(topic.subject.title)]));
    if (distractors.length < 3) continue;
    add('T6', 'SYLLABUS_MAPPING', 'EASY', en(topic.en), hi(topic.hi),
      { en: topic.subject.title, hi: topic.subject.titleHindi || topic.subject.title }, distractors,
      [concepts[0]?.id].filter(Boolean),
      { en: `“${topic.en}” belongs to the subject “${topic.subject.title}”.`, hi: `“${topic.hi}” विषय “${topic.subject.titleHindi || topic.subject.title}” से संबंधित है।` },
      'CATALOG_SUBJECT');
  }

  // 7. Topic–concept pair matching.
  for (let variant = 0; variant < 2 && variant < concepts.length; variant += 1) {
    const concept = concepts[variant];
    const wrongTopics = pickSimilarLength(topicOption([...(pools.chapterTopics || []), ...(pools.subjectTopics || [])]), topic.en.length, 2, rng);
    const wrongConcepts = pickSimilarLength(pool([...chapterConcepts, ...subjectConcepts], new Set([norm(concept.en)])), concept.en.length, 2, rng);
    if (!wrongTopics.length || !wrongConcepts.length) continue;
    add('T7', 'MATCHING', 'MEDIUM',
      `Which topic–concept pair is correctly matched for ${topic.en}?`,
      `${topic.hi} के लिए कौन-सा टॉपिक-अवधारणा युग्म सही रूप से सुमेलित है?`,
      { en: `${topic.en} — ${concept.en}`, hi: `${topic.hi} — ${concept.hi}` },
      [
        opt(`${wrongTopics[0].en} — ${concept.en}`, `${wrongTopics[0].hi} — ${concept.hi}`),
        opt(`${topic.en} — ${wrongConcepts[0].en}`, `${topic.hi} — ${wrongConcepts[0].hi}`),
        opt(`${wrongTopics[wrongTopics.length - 1].en} — ${wrongConcepts[wrongConcepts.length - 1].en}`, `${wrongTopics[wrongTopics.length - 1].hi} — ${wrongConcepts[wrongConcepts.length - 1].hi}`),
      ],
      [concept.id],
      { en: `“${concept.en}” is a key concept of “${topic.en}”.`, hi: `“${concept.hi}” टॉपिक “${topic.hi}” की मुख्य अवधारणा है।` },
      'PAIR');
  }

  // 8. Definition split (Concept: definition).
  const pairs = concepts.map((concept) => ({ concept, pair: splitPair(concept) })).filter((item) => item.pair);
  for (const { concept, pair } of pairs) {
    const others = pairs.filter((item) => item.concept.id !== concept.id).map((item) => opt(item.pair.rightEn, item.pair.rightHi));
    const distractors = pickSimilarLength(others, pair.rightEn.length, 3, rng);
    if (distractors.length < 3) continue;
    add('T8', 'DEFINITION', 'MEDIUM',
      `Which of the following correctly describes ${truncate(pair.leftEn, 130)}?`,
      `निम्नलिखित में से कौन ${truncate(pair.leftHi, 130)} का सही वर्णन करता है?`,
      { en: pair.rightEn, hi: pair.rightHi }, distractors, [concept.id],
      { en: `“${pair.leftEn}” is defined as “${pair.rightEn}”.`, hi: `“${pair.leftHi}” की परिभाषा “${pair.rightHi}” है।` },
      'DEFINITION');
  }

  // 9. Concept list → topic.
  for (let variant = 0; variant < 2; variant += 1) {
    const subset = shuffle(rng, concepts).slice(0, Math.min(3, Math.max(2, concepts.length - 1)));
    if (subset.length < 2) continue;
    const distractors = pickSimilarLength(topicOption([...(pools.chapterTopics || []), ...(pools.subjectTopics || [])]), topic.en.length, 3, rng);
    if (distractors.length < 3) continue;
    add('T9', 'SYNTHESIS', 'MEDIUM',
      `Which topic covers the following concepts: ${subset.map((c) => `“${truncate(c.en, 90)}”`).join(', ')}?`,
      `निम्नलिखित अवधारणाएं किस टॉपिक में आती हैं: ${subset.map((c) => `“${truncate(c.hi, 90)}”`).join(', ')}?`,
      { en: topic.en, hi: topic.hi }, distractors, subset.map((c) => c.id),
      { en: `All listed concepts belong to “${topic.en}”.`, hi: `सूचीबद्ध सभी अवधारणाएं “${topic.hi}” से संबंधित हैं।` },
      'CATALOG_TOPIC');
  }

  // 10. Concept order inside the topic.
  if (concepts.length >= 3) {
    for (const window of [{ label: 'first', hi: 'पहली', items: concepts.slice(0, 3) }, { label: 'last', hi: 'अंतिम', items: concepts.slice(-3) }]) {
      const correct = window.items.map((c) => c.en).join(' → ');
      const correctHi = window.items.map((c) => c.hi).join(' → ');
      const reversed = [...window.items].reverse();
      const swapped = [window.items[1], window.items[0], window.items[2]];
      const alternatives = [reversed, swapped].map((items) => opt(items.map((c) => c.en).join(' → '), items.map((c) => c.hi).join(' → ')));
      if (new Set([correct, ...alternatives.map((a) => a.en)]).size !== 3) continue;
      add('T10', 'CHRONOLOGY', 'MEDIUM',
        `Which option shows the correct order of the ${window.label} three concepts under ${topic.en}?`,
        `${topic.hi} के अंतर्गत ${window.hi} तीन अवधारणाओं का सही क्रम कौन-सा विकल्प दर्शाता है?`,
        { en: correct, hi: correctHi }, alternatives, window.items.map((c) => c.id),
        { en: `The catalogue order is: ${window.items.map((c) => c.en).join(' → ')}.`, hi: `कैटलॉग क्रम है: ${window.items.map((c) => c.hi).join(' → ')}।` },
        'CATALOG_ORDER');
    }
  }

  // Variety first, then the statement-selection filler.
  candidates.push(...filler);

  // ---- accept loop ---------------------------------------------------------
  const factEn = fact?.canonicalStatement || topic.en;
  const factHi = fact?.canonicalStatementHindi || factEn;
  for (const candidate of candidates) {
    if (accepted.length >= count) break;
    const stemNorm = norm(candidate.stem.en);
    if (!stemNorm || usedStems.has(stemNorm)) continue;
    if (candidate.stem.en.length < 18 || candidate.stem.en.length > 460) continue;
    if (candidate.stem.hi.length < 12 || candidate.stem.hi.length > 560) continue;
    if (!candidate.correct.en || !candidate.correct.hi) continue;
    if (candidate.distractors.length !== 3) continue;
    const all = [candidate.correct, ...candidate.distractors];
    if (new Set(all.map((o) => norm(o.en))).size !== 4) continue;
    if (new Set(all.map((o) => norm(o.hi))).size !== 4) continue;
    if (all.some((o) => !o.en || !o.hi)) continue;
    if (all.some((o) => /^(?:all|none) of (?:the )?above$/i.test(o.en))) continue;
    if (stemNorm.includes(norm(candidate.correct.en))) continue;
    const ratio = candidate.correct.en.length / Math.max(1, meanLen(candidate.distractors));
    if (ratio > 2.6 || ratio < 0.3) continue;
    if (usedStemsRaw.some((text) => jaccard(text, candidate.stem.en) > 0.94)) continue;
    const signature = `${all.map((o) => norm(o.en)).sort().join('|')}#${norm(candidate.correct.en)}`;
    if (signatures.has(signature)) continue;

    const desired = (startIndex + accepted.length) % 4;
    const shuffled = shuffle(rng, all);
    const found = shuffled.findIndex((o) => norm(o.en) === norm(candidate.correct.en) && norm(o.hi) === norm(candidate.correct.hi));
    if (found < 0) continue;
    [shuffled[found], shuffled[desired]] = [shuffled[desired], shuffled[found]];

    const index = existing.length + accepted.length + 1;
    const explanation = candidate.explanation || {
      en: `The verified fact card records: ${truncate(factEn, 320)}`,
      hi: `सत्यापित फैक्ट कार्ड दर्ज करता है: ${truncate(factHi, 320)}`,
    };
    const id = `G_${topic.id}_${String(index).padStart(3, '0')}`;
    accepted.push({
      id,
      subjectId: topic.subjectId,
      chapterId: topic.chapterId,
      topicId: topic.id,
      conceptIds: candidate.conceptIds.filter(Boolean),
      question: { en: candidate.stem.en, hi: candidate.stem.hi },
      options: shuffled,
      correctIndex: desired,
      difficulty: candidate.difficulty,
      angle: candidate.angle,
      explanation,
      detailedExplanation: explanation,
      memoryCue: { en: `Link this fact to “${truncate(topic.en, 90)}”.`, hi: `इस तथ्य को “${truncate(topic.hi, 90)}” से जोड़कर याद रखें।` },
      factCardIds: [fact?.id].filter(Boolean),
      sourceIds: [...(fact?.sourceIds || [])],
      sourceUrl: sourceUrl || '',
      fingerprint: hashId(`${id}|${candidate.stem.en}`),
      lifecycle: 'VERIFIED',
      dynamic: false,
      validUntil: null,
      kind: 'FACT_DERIVED',
      generator: version,
      grounding: candidate.grounding,
    });
    usedStems.add(stemNorm);
    usedStemsRaw.push(candidate.stem.en);
    signatures.add(signature);
  }
  return accepted;
}
