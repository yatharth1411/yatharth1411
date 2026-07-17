/** Tiny extractive summarizer — pure, no dependencies. */

const STOP = new Set(
  ("a,an,the,and,or,but,if,then,else,of,at,by,for,with,about,into,through,during,before,after,above,below,to,from,up,down,in,out,on,off,over,under,again,further,once,here,there,when,where,why,how,all,any,both,each,few,more,most,other,some,such,no,nor,not,only,own,same,so,than,too,very,can,will,just,should,now,is,are,was,were,be,been,being,have,has,had,having,do,does,did,doing,would,could,shall,may,might,must,i,you,he,she,it,we,they,them,his,her,their,this,that,these,those,as,also,its,it's,your,our,my,me,him,us").split(",")
);

export function summarizeText(text: string, maxSentences = 5): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "_(I couldn't extract readable text from this file.)_";
  const sentences = clean.match(/[^.!?।]+[.!?।]+/g) ?? [clean];
  if (sentences.length <= maxSentences) {
    return "- " + sentences.map((s) => s.trim()).join("\n- ");
  }
  const freq: Record<string, number> = {};
  for (const w of clean.toLowerCase().match(/[a-z\u0900-\u097F']+/g) ?? []) {
    if (!STOP.has(w) && w.length > 2) freq[w] = (freq[w] ?? 0) + 1;
  }
  const scored = sentences.map((s, i) => {
    let score = 0;
    for (const w of s.toLowerCase().match(/[a-z\u0900-\u097F']+/g) ?? []) {
      if (freq[w]) score += freq[w];
    }
    // favour earlier sentences slightly, penalise very short/long ones
    score = score / Math.max(8, s.split(" ").length) + (sentences.length - i) * 0.01;
    return { s: s.trim(), score, i };
  });
  const chosen = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, maxSentences)
    .sort((a, b) => a.i - b.i);
  const words = clean.split(" ").length;
  const head = `_~${words.toLocaleString()} words · ${sentences.length} sentences_\n\n`;
  return head + "- " + chosen.map((c) => c.s).join("\n- ");
}
