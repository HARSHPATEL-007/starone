export interface SentimentResult {
  score: number;
  label: "positive" | "negative" | "neutral";
  confidence: number;
  aspects: { term: string; score: number; count: number }[];
}

export interface KeywordExtraction {
  keywords: { word: string; score: number; frequency: number }[];
  bigrams: { phrase: string; score: number; frequency: number }[];
  dominantTopic: string;
  topicDistribution: { topic: string; weight: number }[];
}

export interface ReadabilityScore {
  fleschKincaid: number;
  gradeLevel: string;
  averageSentenceLength: number;
  averageSyllablesPerWord: number;
  wordCount: number;
  sentenceCount: number;
  complexWordPercentage: number;
}

export interface ToneAnalysis {
  dominantTone: "urgent" | "professional" | "friendly" | "persuasive" | "informative" | "humorous" | "authoritative";
  toneScores: Record<string, number>;
  callToActionStrength: number;
  emotionalAppeal: number;
  formality: number;
}

export interface CopyOptimization {
  originalText: string;
  sentiment: SentimentResult;
  keywords: KeywordExtraction;
  readability: ReadabilityScore;
  tone: ToneAnalysis;
  suggestions: string[];
  predictedCTRLift: number;
}

export class NaturalLanguageInsightService {
  private readonly positiveWords = new Set([
    "amazing", "excellent", "great", "innovative", "best", "love", "perfect", "wonderful",
    "outstanding", "fantastic", "brilliant", "superior", "premium", "exceptional", "remarkable",
    "impressive", "top", "leading", "powerful", "effective", "proven", "trusted", "reliable",
    "advanced", "smarter", "faster", "easier", "free", "save", "discover", "transform",
    "revolutionary", "unbeatable", "guaranteed", "results", "success", "growth", "profit",
  ]);

  private readonly negativeWords = new Set([
    "bad", "terrible", "awful", "horrible", "worst", "hate", "poor", "inferior",
    "disappointing", "useless", "broken", "failure", "risk", "danger", "problem",
    "expensive", "difficult", "complicated", "slow", "ugly", "waste", "mistake",
    "regret", "annoying", "frustrating", "limited", "restricted", "stop", "never",
  ]);

  private readonly intensiveWords = new Set([
    "very", "extremely", "incredibly", "absolutely", "totally", "completely",
    "really", "highly", "deeply", "remarkably", "exceptionally",
  ]);

  private readonly stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "by", "from", "as", "is", "was", "are", "were", "be", "been", "being",
    "have", "has", "had", "do", "does", "did", "will", "would", "could", "should",
    "may", "might", "shall", "can", "need", "dare", "ought", "used", "it", "its",
    "this", "that", "these", "those", "we", "you", "they", "he", "she", "i",
    "my", "your", "our", "their", "his", "her", "not", "no", "nor", "so",
  ]);

  private readonly positiveWordsArr = Array.from(this.positiveWords);
  private readonly negativeWordsArr = Array.from(this.negativeWords);

  /**
   * Analyze the sentiment of ad copy text.
   * Uses a lexicon-based approach with negation handling and intensifiers.
   */
  analyzeSentiment(text: string): SentimentResult {
    const clean = text.toLowerCase().replace(/[^a-z\s']/g, "").trim();
    const tokens = clean.split(/\s+/).filter((t) => t.length > 0);
    let score = 0;
    let posCount = 0, negCount = 0, totalCount = 0;
    const aspectMap = new Map<string, { score: number; count: number }>();

    let negationWindow = false;
    for (let i = 0; i < tokens.length; i++) {
      const word = tokens[i];

      // Negation detection
      if (["not", "no", "never", "neither", "nor", "none", "nothing", "nowhere"].includes(word)) {
        negationWindow = true;
        continue;
      }

      // If we encounter punctuation-like boundary or intensive word, reset negation
      if (this.intensiveWords.has(word)) {
        negationWindow = false;
        continue;
      }
      if (["but", "however", "although", "though"].includes(word)) {
        negationWindow = false;
        continue;
      }

      let wordScore = 0;
      if (this.positiveWords.has(word)) {
        wordScore = negationWindow ? -1 : 1;
        posCount++;
      } else if (this.negativeWords.has(word)) {
        wordScore = negationWindow ? 1 : -1;
        negCount++;
      }

      if (wordScore !== 0) {
        totalCount++;
        score += wordScore;

        // Track aspects (nouns that are modified by sentiment words)
        const nextWord = tokens[i + 1];
        if (nextWord && !this.stopWords.has(nextWord) && !this.positiveWords.has(nextWord) && !this.negativeWords.has(nextWord)) {
          const aspect = nextWord;
          const curr = aspectMap.get(aspect) || { score: 0, count: 0 };
          curr.score += wordScore;
          curr.count++;
          aspectMap.set(aspect, curr);
        }
      }

      // Reset negation after 3 tokens
      if (negationWindow && i > 0 && i % 3 === 0) negationWindow = false;
    }

    const avgScore = totalCount > 0 ? score / totalCount : 0;
    const label: "positive" | "negative" | "neutral" = avgScore > 0.15 ? "positive" : avgScore < -0.15 ? "negative" : "neutral";
    const confidence = totalCount > 0 ? Math.min(1, Math.abs(avgScore) * 2) : 0;

    const aspects = Array.from(aspectMap.entries())
      .map(([term, data]) => ({ term, score: Math.round((data.score / data.count) * 100) / 100, count: data.count }))
      .sort((a, b) => Math.abs(b.score) - Math.abs(a.score))
      .slice(0, 5);

    return {
      score: Math.round(avgScore * 10000) / 10000,
      label,
      confidence: Math.round(confidence * 10000) / 10000,
      aspects,
    };
  }

  /**
   * Extract keywords and topics from ad copy using TF-IDF-like scoring.
   */
  extractKeywords(text: string): KeywordExtraction {
    const clean = text.toLowerCase().replace(/[^a-z\s'-]/g, "").trim();
    const tokens = clean.split(/\s+/).filter((t) => t.length > 2 && !this.stopWords.has(t));

    // Unigram frequencies
    const freq = new Map<string, number>();
    for (const t of tokens) freq.set(t, (freq.get(t) || 0) + 1);
    const maxFreq = Math.max(...freq.values(), 1);

    // Score: frequency * (1 - idf_penalty for commonness)
    const keywords = Array.from(freq.entries())
      .map(([word, f]) => ({
        word,
        score: Math.round(((f / maxFreq) * (1 - Math.min(0.5, (f / tokens.length) * 2))) * 10000) / 10000,
        frequency: f,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 15);

    // Bigrams
    const bigramFreq = new Map<string, number>();
    for (let i = 0; i < tokens.length - 1; i++) {
      const phrase = `${tokens[i]} ${tokens[i + 1]}`;
      bigramFreq.set(phrase, (bigramFreq.get(phrase) || 0) + 1);
    }
    const maxBigramFreq = Math.max(...bigramFreq.values(), 1);
    const bigrams = Array.from(bigramFreq.entries())
      .map(([phrase, f]) => ({
        phrase,
        score: Math.round((f / maxBigramFreq) * 10000) / 10000,
        frequency: f,
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    // Topic modeling (simple LDA-like via co-occurrence)
    const topics = this.extractTopics(tokens, keywords.slice(0, 5).map((k) => k.word));
    const dominantTopic = topics.sort((a, b) => b.weight - a.weight)[0]?.topic || "general";

    return { keywords, bigrams, dominantTopic, topicDistribution: topics };
  }

  private extractTopics(tokens: string[], topWords: string[]): { topic: string; weight: number }[] {
    const topicDefinitions: { name: string; words: string[] }[] = [
      { name: "pricing", words: ["price", "cost", "save", "money", "discount", "free", "deal", "offer", "value", "cheap"] },
      { name: "quality", words: ["quality", "premium", "best", "top", "excellent", "superior", "trusted", "reliable"] },
      { name: "innovation", words: ["new", "innovative", "revolutionary", "advanced", "modern", "cutting", "edge", "breakthrough"] },
      { name: "convenience", words: ["easy", "fast", "simple", "quick", "instant", "seamless", "automatic", "effortless"] },
      { name: "trust", words: ["trusted", "secure", "safe", "guaranteed", "proven", "reliable", "protected", "certified"] },
      { name: "growth", words: ["growth", "success", "profit", "results", "increase", "improve", "transform", "achieve"] },
    ];

    return topicDefinitions.map((topic) => {
      const matchCount = tokens.filter((t) => topic.words.includes(t)).length;
      return { topic: topic.name, weight: tokens.length > 0 ? Math.round((matchCount / tokens.length) * 10000) / 100 : 0 };
    }).filter((t) => t.weight > 0);
  }

  /**
   * Compute Flesch-Kincaid readability score for ad copy.
   */
  computeReadability(text: string): ReadabilityScore {
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    const words = text.split(/\s+/).filter((w) => w.length > 0);
    const wordCount = words.length;
    const sentenceCount = sentences.length;

    const countSyllables = (word: string): number => {
      const w = word.toLowerCase().replace(/[^a-z]/g, "");
      if (w.length <= 3) return 1;
      let syllables = 0;
      let prevVowel = false;
      for (const ch of w) {
        const isVowel = "aeiouy".includes(ch);
        if (isVowel && !prevVowel) syllables++;
        prevVowel = isVowel;
      }
      if (w.endsWith("e")) syllables = Math.max(1, syllables - 1);
      if (w.endsWith("le") && w.length > 2) syllables = Math.max(1, syllables + 1);
      return Math.max(1, syllables);
    };

    const totalSyllables = words.reduce((s, w) => s + countSyllables(w), 0);
    const complexWords = words.filter((w) => countSyllables(w) >= 3).length;
    const avgSyllablesPerWord = wordCount > 0 ? totalSyllables / wordCount : 0;
    const avgSentenceLength = sentenceCount > 0 ? wordCount / sentenceCount : 0;

    // Flesch-Kincaid Grade Level: 0.39 * (words/sentences) + 11.8 * (syllables/words) - 15.59
    const fleschKincaid = 0.39 * avgSentenceLength + 11.8 * avgSyllablesPerWord - 15.59;

    const gradeLevel = fleschKincaid < 6 ? "very_easy" : fleschKincaid < 8 ? "easy" : fleschKincaid < 10 ? "moderate" : fleschKincaid < 13 ? "difficult" : "very_difficult";

    return {
      fleschKincaid: Math.round(fleschKincaid * 100) / 100,
      gradeLevel,
      averageSentenceLength: Math.round(avgSentenceLength * 100) / 100,
      averageSyllablesPerWord: Math.round(avgSyllablesPerWord * 100) / 100,
      wordCount,
      sentenceCount,
      complexWordPercentage: wordCount > 0 ? Math.round((complexWords / wordCount) * 10000) / 100 : 0,
    };
  }

  /**
   * Analyze the tone of ad copy using keyword and pattern matching.
   */
  analyzeTone(text: string): ToneAnalysis {
    const clean = text.toLowerCase();
    const tokens = clean.split(/\s+/).filter((t) => t.length > 0);
    const toneScores: Record<string, number> = {
      urgent: 0, professional: 0, friendly: 0, persuasive: 0, informative: 0, humorous: 0, authoritative: 0,
    };

    // Urgency markers
    const urgencyWords = ["now", "today", "hurry", "limited", "last chance", "act now", "don't wait", "exclusive", "ending soon", "while supplies last", "urgent"];
    toneScores.urgent = urgencyWords.filter((w) => clean.includes(w)).length * 0.2;

    // Professional markers
    const professionalWords = ["professional", "solution", "enterprise", "business", "corporate", "industry", "expertise", "strategic", "optimize", "efficient", "comprehensive"];
    toneScores.professional = professionalWords.filter((w) => clean.includes(w)).length * 0.15;

    // Friendly markers
    const friendlyWords = ["you", "your", "we", "us", "let's", "together", "friend", "join", "welcome", "share", "help", "hello", "hi"];
    toneScores.friendly = friendlyWords.filter((w) => clean.includes(w)).length * 0.12;

    // Persuasive markers
    const persuasiveWords = ["imagine", "discover", "unlock", "transform", "achieve", "experience", "benefits", "proven", "results", "guaranteed", "success"];
    toneScores.persuasive = persuasiveWords.filter((w) => clean.includes(w)).length * 0.18;

    // Informative markers
    const informativeWords = ["learn", "understand", "know", "how", "what", "why", "tips", "guide", "insights", "information", "data", "research"];
    toneScores.informative = informativeWords.filter((w) => clean.includes(w)).length * 0.15;

    // Humor markers
    const humorWords = ["fun", "funny", "hilarious", "lol", "haha", "crazy", "silly", "awesome", "cool", "wow", "oops", "surprise"];
    toneScores.humorous = humorWords.filter((w) => clean.includes(w)).length * 0.2;

    // Authority markers
    const authorityWords = ["expert", "leader", "award", "certified", "official", "#1", "top rated", "trusted by", "recommended", "pro", "powered by"];
    toneScores.authoritative = authorityWords.filter((w) => clean.includes(w)).length * 0.18;

    // Normalize
    const maxScore = Math.max(...Object.values(toneScores), 0.01);
    for (const key of Object.keys(toneScores)) toneScores[key] = Math.round((toneScores[key] / maxScore) * 10000) / 100;

    // Call-to-action strength
    const ctaPhrases = [
      "sign up", "buy now", "get started", "learn more", "shop now", "subscribe", "download",
      "try free", "claim offer", "register", "book now", "get it", "start free trial",
    ];
    const callToActionStrength = Math.min(1, ctaPhrases.filter((p) => clean.includes(p)).length * 0.25 +
      (clean.includes("!") ? 0.1 : 0) + (clean.includes("cta") ? 0.2 : 0));

    // Emotional appeal
    const emotionalWords = ["love", "amazing", "incredible", "fantastic", "beautiful", "happy", "excited", "proud", "inspired"];
    const emotionalAppeal = Math.min(1, emotionalWords.filter((w) => clean.includes(w)).length * 0.15 +
      this.positiveWordsArr.filter((w) => clean.includes(w)).length * 0.05);

    // Formality
    const contractions = ["don't", "can't", "won't", "it's", "you're", "they're", "we're", "i'm", "isn't", "aren't"];
    const formalIndicators = ["therefore", "however", "furthermore", "nevertheless", "consequently", "accordingly", "thus"];
    const contractionCount = contractions.filter((c) => clean.includes(c)).length;
    const formalCount = formalIndicators.filter((f) => clean.includes(f)).length;
    const formality = Math.round(Math.min(1, Math.max(0, 0.5 + formalCount * 0.1 - contractionCount * 0.08)) * 100) / 100;

    const dominantTone = (Object.entries(toneScores) as [string, number][])
      .sort((a, b) => b[1] - a[1])[0][0] as ToneAnalysis["dominantTone"];

    return {
      dominantTone,
      toneScores,
      callToActionStrength: Math.round(callToActionStrength * 10000) / 10000,
      emotionalAppeal: Math.round(emotionalAppeal * 10000) / 10000,
      formality,
    };
  }

  /**
   * Full copy optimization analysis with actionable suggestions.
   */
  optimizeCopy(text: string): CopyOptimization {
    const sentiment = this.analyzeSentiment(text);
    const keywords = this.extractKeywords(text);
    const readability = this.computeReadability(text);
    const tone = this.analyzeTone(text);
    const suggestions: string[] = [];

    // Generate suggestions based on analysis
    if (sentiment.label === "negative") suggestions.push("Add more positive language to improve sentiment (e.g., 'innovative', 'trusted', 'proven').");
    if (sentiment.label === "neutral") suggestions.push("Try adding emotionally resonant words to make the copy more compelling.");
    if (readability.fleschKincaid > 12) suggestions.push("Simplify language — aim for Flesch-Kincaid grade level < 10 for broader appeal.");
    if (readability.fleschKincaid < 4) suggestions.push("Consider slightly more sophisticated language to build credibility with decision-makers.");
    if (tone.callToActionStrength < 0.3) suggestions.push("Add a clearer call-to-action phrase (e.g., 'Get Started', 'Learn More', 'Sign Up Now').");
    if (tone.formality > 0.7) suggestions.push("Consider a more conversational tone to increase relatability and engagement.");
    if (tone.formality < 0.3 && tone.dominantTone !== "humorous") suggestions.push("Add a touch of professionalism to build trust with B2B audiences.");
    if (keywords.bigrams.length === 0) suggestions.push("Use more descriptive two-word phrases (bigrams) to improve keyword targeting.");
    if (readability.complexWordPercentage > 20) suggestions.push("Replace complex words (3+ syllables) with simpler alternatives for better readability.");
    if (!text.includes("!")) suggestions.push("An exclamation point can increase energy and urgency in ad copy.");
    if (keywords.keywords.length < 3) suggestions.push("Incorporate more targeted keywords relevant to your audience's search intent.");
    if (tone.emotionalAppeal < 0.3) suggestions.push("Increase emotional appeal with words like 'love', 'amazing', 'discover', 'transform'.");

    // Predicted CTR lift based on improvements
    const positiveDelta = sentiment.label === "positive" ? 0.05 : sentiment.label === "neutral" ? -0.02 : -0.05;
    const readabilityDelta = readability.fleschKincaid < 8 ? 0.03 : readability.fleschKincaid > 12 ? -0.03 : 0;
    const ctaDelta = tone.callToActionStrength > 0.5 ? 0.04 : -0.02;
    const predictedCTRLift = Math.round((positiveDelta + readabilityDelta + ctaDelta + 1) * 10000) / 100;

    return {
      originalText: text,
      sentiment,
      keywords,
      readability,
      tone,
      suggestions,
      predictedCTRLift,
    };
  }

  generateSampleCopy(): string[] {
    return [
      "Discover the future of marketing AI. Our revolutionary platform transforms how you connect with customers — delivering 3x better ROAS. Start your free trial today!",
      "Limited time offer: Save 50% on annual enterprise plans. Industry-leading security, proven results, and dedicated support. Don't miss out — sign up now.",
      "Our comprehensive analytics suite provides deep insights into campaign performance, audience behavior, and ROI optimization. Learn how leading brands achieve 200% growth.",
      "Hey! Ready to take your ads to the next level? Join thousands of happy marketers who've doubled their conversions with our easy-to-use platform. It's awesome!",
      "Warning: Your competitors are already using AI optimization. Get the enterprise solution trusted by Fortune 500 companies. Book a demo today.",
    ];
  }
}

export const naturalLanguageInsightService = new NaturalLanguageInsightService();
