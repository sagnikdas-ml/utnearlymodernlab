export function normalize(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function searchEntries(entries, query, limit = 20) {
  const phrase = normalize(query), words = phrase.split(/\s+/).filter(Boolean);
  if (!words.length) return entries.filter(entry => entry.category === 'Page').slice(0, 6);
  return entries.map(entry => {
    const title = normalize(entry.title), body = normalize(`${entry.category} ${entry.text}`);
    if (!words.every(word => title.includes(word) || body.includes(word))) return null;
    return { entry, score: (title === phrase ? 100 : title.includes(phrase) ? 40 : 0) + words.reduce((n, word) => n + (title.includes(word) ? 10 : 1), 0) };
  }).filter(Boolean).sort((a, b) => b.score - a.score).slice(0, limit).map(item => item.entry);
}
