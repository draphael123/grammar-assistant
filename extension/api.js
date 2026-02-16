/**
 * LinguistAI - Mock API Handler
 * Replace this with a real LLM call (OpenAI/Gemini) when ready.
 * 
 * Example real implementation:
 * const response = await fetch('https://api.openai.com/v1/chat/completions', {...});
 */

const MOCK_DELAY_MS = 500;

/**
 * Simulates grammar/spelling check with a 500ms delay.
 * Returns mock corrections for common error patterns.
 * 
 * @param {string} text - The text to check
 * @returns {Promise<Array<{original: string, suggestion: string, explanation: string, startIndex: number, endIndex: number}>>}
 */
async function checkGrammar(text) {
  await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

  const corrections = [];
  const words = text.split(/\b/);

  // Mock patterns for common errors
  const mockPatterns = [
    { pattern: /\bteh\b/gi, suggestion: 'the', explanation: 'Common typo: "teh" should be "the"' },
    { pattern: /\brecieve\b/gi, suggestion: 'receive', explanation: 'Spelling: "i before e except after c"' },
    { pattern: /\boccured\b/gi, suggestion: 'occurred', explanation: 'Double "r" needed in past tense of "occur"' },
    { pattern: /\btheir\s+are\b/gi, suggestion: 'there are', explanation: '"Their" = possessive; "there" = location/existence' },
    { pattern: /\byou're\s+right\b/gi, suggestion: "you're right", explanation: '"You\'re" = you are (contraction)' },
    { pattern: /\bits\s+(\w+)\b/gi, suggestion: "it's $1", explanation: '"It\'s" = it is (contraction); "its" = possessive' },
    { pattern: /\bdefinately\b/gi, suggestion: 'definitely', explanation: 'Spelling: "definitely" has no "a"' },
    { pattern: /\bseperate\b/gi, suggestion: 'separate', explanation: '"Separate" is spelled with "a" not "e"' },
    { pattern: /\baccomodate\b/gi, suggestion: 'accommodate', explanation: 'Double "m" and double "d" in accommodate' },
    { pattern: /\baffect\s+vs\s+effect\b/gi, suggestion: 'effect', explanation: '"Effect" = noun (result); "affect" = verb (influence)' },
  ];

  mockPatterns.forEach(({ pattern, suggestion, explanation }) => {
    let match;
    const regex = new RegExp(pattern.source, 'gi');
    while ((match = regex.exec(text)) !== null) {
      corrections.push({
        original: match[0],
        suggestion: suggestion.includes('$1') ? suggestion.replace('$1', match[1] || '') : suggestion,
        explanation,
        startIndex: match.index,
        endIndex: match.index + match[0].length,
      });
    }
  });

  // If no mock matches, inject a fake one on first word for demo (optional)
  if (corrections.length === 0 && text.trim().length > 0) {
    const firstWord = text.match(/^\s*(\S+)/);
    if (firstWord) {
      const word = firstWord[1];
      if (word.length > 3) {
        corrections.push({
          original: word,
          suggestion: word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
          explanation: 'Consider capitalizing the first word of your sentence.',
          startIndex: firstWord.index + (firstWord[0].length - word.length),
          endIndex: firstWord.index + firstWord[0].length,
        });
      }
    }
  }

  return corrections;
}

// Export for use in content script (IIFE or global in extension context)
if (typeof window !== 'undefined') {
  window.LinguistAPI = { checkGrammar };
} else if (typeof self !== 'undefined') {
  self.LinguistAPI = { checkGrammar };
}
