import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from "recharts";
import { MessageSquare, Search, BookOpen, Mic, Sparkles, Copy, ThumbsUp, ThumbsDown, Minus, Send, RefreshCw } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

const SAMPLE_TEXTS = [
  "Discover the future of marketing AI. Our revolutionary platform transforms how you connect with customers — delivering 3x better ROAS. Start your free trial today!",
  "Limited time offer: Save 50% on annual enterprise plans. Industry-leading security, proven results, and dedicated support. Don't miss out — sign up now.",
  "This product is terrible. Worst purchase I've ever made. Completely useless and a waste of money.",
  "Hey! Ready to take your ads to the next level? Join thousands of happy marketers who've doubled their conversions. It's awesome!",
];

export default function AdCopyOptimizer() {
  const { addToast } = useToast();
  const [text, setText] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"all" | "sentiment" | "keywords" | "readability" | "tone">("all");

  async function analyze() {
    if (!text.trim()) { addToast("error", "Enter text to analyze"); return; }
    setLoading(true);
    try {
      const res = await api.nlp.optimize(text);
      setResult(res.data);
    } catch { addToast("error", "Analysis failed"); }
    setLoading(false);
  }

  function useSample(i: number) {
    setText(SAMPLE_TEXTS[i]);
  }

  const toneRadar = result?.tone?.toneScores ? Object.entries(result.tone.toneScores).map(([key, val]) => ({ tone: key, score: (val as number) * 100 })) : [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Sparkles className="w-8 h-8 text-pink-400" />
        <div>
          <h1 className="text-2xl font-bold">Ad Copy Optimizer</h1>
          <p className="text-gray-400 text-sm">NLP-powered sentiment, tone, readability & keyword analysis</p>
        </div>
      </div>

      <div className="bg-gray-800 p-4 rounded-lg space-y-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} className="w-full bg-gray-700 p-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none resize-none" placeholder="Enter your ad copy text to analyze..." />
        <div className="flex gap-2 flex-wrap">
          <button onClick={analyze} disabled={loading} className="px-4 py-2 bg-pink-600 rounded-lg hover:bg-pink-700 flex items-center gap-2"><Send className="w-4 h-4" />{loading ? "Analyzing..." : "Analyze"}</button>
          {SAMPLE_TEXTS.map((_, i) => (
            <button key={i} onClick={() => useSample(i)} className="px-3 py-1 text-xs bg-gray-700 rounded-lg hover:bg-gray-600">Sample {i + 1}</button>
          ))}
        </div>
      </div>

      {result && (
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-4">
            <div className="flex items-center gap-2">
              {result.sentiment.label === "positive" ? <ThumbsUp className="w-5 h-5 text-green-400" /> : result.sentiment.label === "negative" ? <ThumbsDown className="w-5 h-5 text-red-400" /> : <Minus className="w-5 h-5 text-yellow-400" />}
              <span className="text-lg font-semibold capitalize">{result.sentiment.label}</span>
            </div>
            <div className="text-sm text-gray-400">Confidence: {(result.sentiment.confidence * 100).toFixed(0)}%</div>
            <div className="text-sm text-gray-400">Score: {result.sentiment.score}</div>
            <div className="text-sm text-gray-400">Sentences: {result.readability.sentenceCount}</div>
            <div className="text-sm text-gray-400">Grade: <span className="text-purple-400 capitalize">{result.readability.gradeLevel.replace("_", " ")}</span></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold flex items-center gap-2"><Search className="w-4 h-4 text-blue-400" />Keywords</h3>
              <div className="flex flex-wrap gap-2">
                {result.keywords.keywords.slice(0, 10).map((kw: any, i: number) => (
                  <span key={i} className="px-2 py-1 bg-blue-900 text-blue-300 rounded text-xs">{kw.word} <span className="text-blue-500">({kw.frequency})</span></span>
                ))}
              </div>
              {result.keywords.bigrams.length > 0 && (
                <>
                  <h4 className="text-sm text-gray-400 mt-2">Bigrams</h4>
                  <div className="flex flex-wrap gap-2">
                    {result.keywords.bigrams.slice(0, 5).map((bg: any, i: number) => (
                      <span key={i} className="px-2 py-1 bg-indigo-900 text-indigo-300 rounded text-xs">{bg.phrase}</span>
                    ))}
                  </div>
                </>
              )}
              <div className="text-xs text-gray-500 mt-1">Dominant Topic: <span className="text-yellow-400 capitalize">{result.keywords.dominantTopic}</span></div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold flex items-center gap-2"><BookOpen className="w-4 h-4 text-green-400" />Readability</h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-700 p-2 rounded"><span className="text-xs text-gray-400">Flesch-Kincaid</span><p className="font-mono">{result.readability.fleschKincaid}</p></div>
                <div className="bg-gray-700 p-2 rounded"><span className="text-xs text-gray-400">Avg Sentence</span><p className="font-mono">{result.readability.averageSentenceLength.toFixed(1)} words</p></div>
                <div className="bg-gray-700 p-2 rounded"><span className="text-xs text-gray-400">Syllables/Word</span><p className="font-mono">{result.readability.averageSyllablesPerWord.toFixed(2)}</p></div>
                <div className="bg-gray-700 p-2 rounded"><span className="text-xs text-gray-400">Complex Words</span><p className="font-mono">{result.readability.complexWordPercentage.toFixed(1)}%</p></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold flex items-center gap-2"><Mic className="w-4 h-4 text-pink-400" />Tone Analysis</h3>
              <div className="text-sm mb-2">Dominant: <span className="text-pink-400 font-semibold capitalize">{result.tone.dominantTone}</span></div>
              {toneRadar.length > 0 && (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={toneRadar}>
                    <PolarGrid stroke="#374151" />
                    <PolarAngleAxis dataKey="tone" stroke="#9CA3AF" tick={{ fontSize: 10 }} />
                    <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
                    <Radar dataKey="score" stroke="#EC4899" fill="#EC4899" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
              <div className="flex gap-3 text-xs text-gray-400">
                <span>CTA: {(result.tone.callToActionStrength * 100).toFixed(0)}%</span>
                <span>Emotion: {(result.tone.emotionalAppeal * 100).toFixed(0)}%</span>
                <span>Formality: {(result.tone.formality * 100).toFixed(0)}%</span>
              </div>
            </div>

            <div className="bg-gray-800 p-4 rounded-lg space-y-2">
              <h3 className="font-semibold flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-400" />Suggestions</h3>
              {result.suggestions.length > 0 ? (
                <ul className="space-y-1">
                  {result.suggestions.map((s: string, i: number) => (
                    <li key={i} className="text-sm text-gray-300 flex items-start gap-2">
                      <span className="text-yellow-400 mt-0.5">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-green-400">No suggestions — copy looks great!</p>}
              <div className="mt-2 p-2 bg-gray-700 rounded flex items-center gap-2">
                <TrendingUpIcon className="w-4 h-4 text-green-400" />
                <span className="text-sm">Predicted CTR Lift: <span className="font-mono text-green-400">{(result.predictedCTRLift * 100 - 100).toFixed(1)}%</span></span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
