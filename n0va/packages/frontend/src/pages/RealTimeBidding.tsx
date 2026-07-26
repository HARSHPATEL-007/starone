import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Zap, DollarSign, TrendingUp, Activity, Shield, Play, RotateCcw } from "lucide-react";
import { useToast } from "../components/Toast";
import { api } from "../api/client";

export default function RealTimeBidding() {
  const { addToast } = useToast();
  const [bidRequest, setBidRequest] = useState<any>(null);
  const [bidResponse, setBidResponse] = useState<any>(null);
  const [targetCPA, setTargetCPA] = useState(10);
  const [publisherScore, setPublisherScore] = useState<any>(null);
  const [publisherId, setPublisherId] = useState("pub_001");
  const [auctionResult, setAuctionResult] = useState<any>(null);
  const [winModel, setWinModel] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"bid" | "publisher" | "auction" | "model">("bid");

  async function loadSampleRequest() {
    setLoading(true);
    try {
      const res = await api.realTimeBidding.sampleRequest();
      setBidRequest(res.data);
    } catch { addToast("error", "Failed to load sample request"); }
    setLoading(false);
  }

  async function handleEvaluate() {
    if (!bidRequest) await loadSampleRequest();
    setLoading(true);
    try {
      const res = await api.realTimeBidding.evaluateBid(bidRequest, targetCPA);
      setBidResponse(res.data);
    } catch { addToast("error", "Bid evaluation failed"); }
    setLoading(false);
  }

  async function handlePublisherScore() {
    setLoading(true);
    try {
      const res = await api.realTimeBidding.publisherScore(publisherId);
      setPublisherScore(res.data);
    } catch { addToast("error", "Failed to get publisher score"); }
    setLoading(false);
  }

  async function handleSimulateAuction() {
    setLoading(true);
    try {
      const bidders = [
        { bidderId: "n0va", bidAmount: bidResponse?.bidAmount || targetCPA },
        { bidderId: "competitor_a", bidAmount: targetCPA * (0.8 + Math.random() * 0.6) },
        { bidderId: "competitor_b", bidAmount: targetCPA * (0.7 + Math.random() * 0.5) },
        { bidderId: "competitor_c", bidAmount: targetCPA * (0.5 + Math.random() * 0.4) },
      ];
      const res = await api.realTimeBidding.simulateAuction(bidders);
      setAuctionResult(res.data);
    } catch { addToast("error", "Auction simulation failed"); }
    setLoading(false);
  }

  async function handleLoadModel() {
    setLoading(true);
    try {
      const res = await api.realTimeBidding.winRateModel();
      setWinModel(res.data);
    } catch { addToast("error", "Failed to load win rate model"); }
    setLoading(false);
  }

  const publisherColor = (score: number) => score >= 80 ? "text-emerald-400" : score >= 60 ? "text-yellow-400" : score >= 40 ? "text-orange-400" : "text-red-400";

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Zap className="w-8 h-8 text-yellow-400" />
        <div>
          <h1 className="text-2xl font-bold">Real-Time Bidding</h1>
          <p className="text-gray-400 text-sm">Programmatic RTB with win rate modeling and bid shading</p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-400">Target CPA:</label>
          <input type="number" value={targetCPA} onChange={(e) => setTargetCPA(parseFloat(e.target.value) || 10)} className="w-24 p-2 bg-gray-700 rounded text-sm" min={1} />
        </div>
        <button onClick={loadSampleRequest} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50">
          <RotateCcw className="w-4 h-4" /> New Request
        </button>
        <button onClick={handleEvaluate} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-yellow-600 rounded-lg hover:bg-yellow-500 disabled:opacity-50">
          <Zap className="w-4 h-4" /> Evaluate Bid
        </button>
        <button onClick={handleSimulateAuction} disabled={!bidResponse} className="flex items-center gap-2 px-4 py-2 bg-purple-600 rounded-lg hover:bg-purple-500 disabled:opacity-50">
          <Play className="w-4 h-4" /> Simulate Auction
        </button>
      </div>

      <div className="flex gap-2">
        {(["bid", "publisher", "model"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm ${tab === t ? "bg-yellow-700 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"}`}>
            {t === "bid" ? "Bid Results" : t === "publisher" ? "Publisher Scores" : "Win Model"}
          </button>
        ))}
      </div>

      {bidRequest && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Bid Request</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div><span className="text-gray-400">Publisher:</span> <span className="text-white">{bidRequest.publisherId}</span></div>
            <div><span className="text-gray-400">Format:</span> <span>{bidRequest.adFormat}</span></div>
            <div><span className="text-gray-400">Device:</span> <span>{bidRequest.deviceType}</span></div>
            <div><span className="text-gray-400">Floor:</span> <span>${bidRequest.floorPrice}</span></div>
            <div><span className="text-gray-400">Category:</span> <span>{bidRequest.pageCategory}</span></div>
            <div><span className="text-gray-400">Hour:</span> <span>{bidRequest.hour}:00</span></div>
          </div>
        </div>
      )}

      {tab === "bid" && bidResponse && (
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Bid Amount</p><p className="text-xl font-bold text-yellow-400">${bidResponse.bidAmount.toFixed(2)}</p></div>
          <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Bid CPM</p><p className="text-xl font-bold">${bidResponse.bidCpm.toFixed(2)}</p></div>
          <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Win Probability</p><p className="text-xl font-bold text-emerald-400">{bidResponse.winProbability}%</p></div>
          <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Expected Value</p><p className="text-xl font-bold">${bidResponse.expectedValue.toFixed(2)}</p></div>
          <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Strategy</p><p className="text-xl font-bold text-blue-400 capitalize">{bidResponse.strategy}</p></div>
        </div>
      )}

      {tab === "bid" && auctionResult && (
        <div className="bg-gray-800 p-4 rounded-lg">
          <h3 className="font-semibold mb-3">Auction Results</h3>
          <div className="text-sm mb-3">Winner: <span className="font-bold text-emerald-400">{auctionResult.winner}</span> | Win Price: <span className="font-bold">${auctionResult.winPrice.toFixed(2)}</span></div>
          <table className="w-full text-sm">
            <thead><tr className="text-gray-400 border-b border-gray-700">
              <th className="p-2 text-left">Rank</th><th className="p-2 text-left">Bidder</th><th className="p-2 text-right">Bid Amount</th>
            </tr></thead>
            <tbody>
              {auctionResult.allBids.map((b: any) => (
                <tr key={b.bidderId} className={`border-b border-gray-700 ${b.bidderId === auctionResult.winner ? "bg-emerald-900/20" : ""}`}>
                  <td className="p-2">{b.rank}</td>
                  <td className="p-2 font-medium">{b.bidderId}</td>
                  <td className="p-2 text-right">${b.bidAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === "publisher" && (
        <div className="space-y-4">
          <div className="flex gap-2">
            <input type="text" value={publisherId} onChange={(e) => setPublisherId(e.target.value)} placeholder="Publisher ID" className="p-2 bg-gray-700 rounded text-sm flex-1 max-w-xs" />
            <button onClick={handlePublisherScore} disabled={loading} className="px-4 py-2 bg-blue-600 rounded-lg hover:bg-blue-500 disabled:opacity-50">Get Score</button>
          </div>
          {publisherScore && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Quality Score</p><p className={`text-xl font-bold ${publisherColor(publisherScore.qualityScore)}`}>{publisherScore.qualityScore}</p></div>
              <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Viewability</p><p className="text-xl font-bold">{publisherScore.viewabilityRate}%</p></div>
              <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Brand Safety</p><p className="text-xl font-bold">{publisherScore.brandSafetyScore}%</p></div>
              <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Win Rate</p><p className="text-xl font-bold">{publisherScore.historicalWinRate}%</p></div>
              <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">CTR</p><p className="text-xl font-bold">{publisherScore.clickThroughRate}%</p></div>
              <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Avg CPM</p><p className="text-xl font-bold">${publisherScore.avgCpm}</p></div>
              <div className="bg-gray-800 p-4 rounded-lg col-span-2"><p className="text-sm text-gray-400">Recommendation</p><p className={`text-xl font-bold capitalize ${publisherColor(publisherScore.qualityScore)}`}>{publisherScore.recommendation.replace(/_/g, " ")}</p></div>
            </div>
          )}
        </div>
      )}

      {tab === "model" && (
        <div className="space-y-4">
          <button onClick={handleLoadModel} disabled={loading} className="px-4 py-2 bg-cyan-600 rounded-lg hover:bg-cyan-500 disabled:opacity-50">Load Win Rate Model</button>
          {winModel && winModel.trainingSamples > 0 ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Accuracy</p><p className="text-xl font-bold text-emerald-400">{winModel.accuracy}%</p></div>
              <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Training Samples</p><p className="text-xl font-bold">{winModel.trainingSamples}</p></div>
              <div className="bg-gray-800 p-4 rounded-lg"><p className="text-sm text-gray-400">Intercept</p><p className="text-xl font-bold">{winModel.intercept.toFixed(4)}</p></div>
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Win rate model requires at least 10 auction results to train. Evaluate bids and record results to build the model.</p>
          )}
        </div>
      )}
    </div>
  );
}
