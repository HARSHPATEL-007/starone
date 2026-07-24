import { useState, useEffect } from "react";
import { Smartphone, Tablet, Monitor, Share2, Copy, Check, RefreshCw, ExternalLink, Image, Layers, Eye } from "lucide-react";
import { useToast } from "../components/Toast";

interface DeviceFrame {
  id: string;
  label: string;
  icon: any;
  width: number;
  height: number;
  bezel: number;
  borderRadius: number;
}

interface PlatformPreset {
  id: string;
  label: string;
  device: string;
  width: number;
  height: number;
  desc: string;
}

const DEVICES: DeviceFrame[] = [
  { id: "iphone14", label: "iPhone 14", icon: Smartphone, width: 390, height: 844, bezel: 12, borderRadius: 44 },
  { id: "galaxy", label: "Galaxy S23", icon: Smartphone, width: 360, height: 780, bezel: 10, borderRadius: 36 },
  { id: "ipad", label: "iPad Pro", icon: Tablet, width: 820, height: 1180, bezel: 14, borderRadius: 16 },
  { id: "desktop", label: "Desktop", icon: Monitor, width: 1280, height: 800, bezel: 6, borderRadius: 8 },
];

const PLATFORMS: PlatformPreset[] = [
  { id: "fb-feed", label: "Facebook Feed", device: "desktop", width: 500, height: 500, desc: "Square ad in desktop feed" },
  { id: "fb-mobile", label: "Facebook Mobile", device: "iphone14", width: 356, height: 356, desc: "Square ad in mobile feed" },
  { id: "ig-feed", label: "Instagram Feed", device: "iphone14", width: 358, height: 358, desc: "Square post in feed" },
  { id: "ig-story", label: "Instagram Story", device: "iphone14", width: 390, height: 844, desc: "Full-screen story ad" },
  { id: "linkedin", label: "LinkedIn Feed", device: "desktop", width: 520, height: 520, desc: "Sponsored content in feed" },
  { id: "twitter", label: "Twitter/X", device: "desktop", width: 600, height: 400, desc: "Promoted tweet" },
  { id: "google-display", label: "Google Display", device: "desktop", width: 728, height: 90, desc: "Leaderboard banner" },
  { id: "google-square", label: "Google Square", device: "desktop", width: 300, height: 250, desc: "Medium rectangle" },
  { id: "tiktok", label: "TikTok", device: "iphone14", width: 390, height: 844, desc: "Full-screen video ad" },
  { id: "youtube", label: "YouTube", device: "desktop", width: 640, height: 360, desc: "Pre-roll / in-stream" },
];

const DEFAULT_IMAGES = [
  { label: "Hero Banner", url: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80" },
  { label: "Product Shot", url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=600&q=80" },
  { label: "Brand Logo", url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&q=80" },
  { label: "Lifestyle", url: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=600&q=80" },
  { label: "Abstract", url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=600&q=80" },
];

export default function AdPreview() {
  const { addToast } = useToast();
  const [imageUrl, setImageUrl] = useState(DEFAULT_IMAGES[0].url);
  const [selectedPlatform, setSelectedPlatform] = useState(PLATFORMS[0]);
  const [selectedDevice, setSelectedDevice] = useState(DEVICES[0]);
  const [copied, setCopied] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [bgColor, setBgColor] = useState("#1a1a2e");

  function selectPlatform(p: PlatformPreset) {
    setSelectedPlatform(p);
    const device = DEVICES.find(d => d.id === p.device) || DEVICES[0];
    setSelectedDevice(device);
    setShowPlatforms(false);
  }

  const device = selectedDevice;
  const platform = selectedPlatform;
  const scale = Math.min(380 / platform.width, 600 / platform.height, 0.9);
  const scaledW = Math.round(platform.width * scale);
  const scaledH = Math.round(platform.height * scale);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Eye className="w-6 h-6 text-n0va-400" />
            Ad Preview
          </h1>
          <p className="text-gray-400 mt-1">Preview creatives on devices and platforms</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* Image URL */}
          <div className="card p-4 space-y-3">
            <p className="text-sm font-medium text-white">Creative</p>
            <div className="flex gap-2">
              <input className="input flex-1 text-sm" placeholder="Image URL..." value={imageUrl} onChange={e => { setImageUrl(e.target.value); setImgError(false); }} />
              <button onClick={() => setImgError(false)} className="btn-ghost p-2"><RefreshCw className="w-4 h-4" /></button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {DEFAULT_IMAGES.map(img => (
                <button key={img.label} onClick={() => { setImageUrl(img.url); setImgError(false); }} className={`text-[10px] px-2 py-1 rounded border ${imageUrl === img.url ? "border-n0va-500 bg-n0va-500/10 text-n0va-400" : "border-gray-800 text-gray-500 hover:text-gray-300"}`}>
                  {img.label}
                </button>
              ))}
            </div>
            {imgError && <p className="text-xs text-red-400">Failed to load image. Check the URL.</p>}
          </div>

          {/* Device */}
          <div className="card p-4 space-y-3">
            <p className="text-sm font-medium text-white">Device Frame</p>
            <div className="grid grid-cols-4 gap-2">
              {DEVICES.map(d => {
                const Icon = d.icon;
                return (
                  <button key={d.id} onClick={() => setSelectedDevice(d)} className={`p-2 rounded-lg border text-center transition-colors ${selectedDevice.id === d.id ? "border-n0va-500 bg-n0va-500/10" : "border-gray-800 hover:border-gray-700"}`}>
                    <Icon className="w-5 h-5 mx-auto mb-1" style={{ color: selectedDevice.id === d.id ? "#818cf8" : "#6b7280" }} />
                    <p className="text-[10px] text-gray-500">{d.label}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Platform */}
          <div className="card p-4 space-y-3">
            <p className="text-sm font-medium text-white">Platform Context</p>
            <button onClick={() => setShowPlatforms(!showPlatforms)} className="w-full input text-sm text-left flex items-center justify-between">
              <span>{platform.label}</span>
              <span className="text-xs text-gray-600">{platform.width}×{platform.height}</span>
            </button>
            {showPlatforms && (
              <div className="max-h-48 overflow-y-auto space-y-1">
                {PLATFORMS.map(p => (
                  <button key={p.id} onClick={() => selectPlatform(p)} className={`w-full text-left text-xs px-3 py-2 rounded-lg transition-colors ${selectedPlatform.id === p.id ? "bg-n0va-500/10 text-n0va-400" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50"}`}>
                    <span className="font-medium">{p.label}</span>
                    <span className="text-gray-700 ml-2">{p.width}×{p.height}</span>
                    <p className="text-[10px] text-gray-700">{p.desc}</p>
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span>Aspect: {platform.width / platform.height > 1 ? "Landscape" : platform.width / platform.height < 1 ? "Portrait" : "Square"}</span>
              <span>{platform.width}×{platform.height}px</span>
            </div>
          </div>

          {/* Background */}
          <div className="card p-4 space-y-2">
            <p className="text-sm font-medium text-white">Background</p>
            <div className="flex items-center gap-3">
              <input type="color" className="w-10 h-10 rounded cursor-pointer bg-transparent border border-gray-700" value={bgColor} onChange={e => setBgColor(e.target.value)} />
              <span className="text-xs text-gray-500 font-mono">{bgColor}</span>
              <button onClick={() => setBgColor("#1a1a2e")} className="text-xs text-gray-600 hover:text-gray-400">Reset</button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            <button onClick={() => { navigator.clipboard.writeText(imageUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn-ghost text-sm flex-1">
              {copied ? <Check className="w-4 h-4 mr-1 text-green-400" /> : <Copy className="w-4 h-4 mr-1" />} Copy URL
            </button>
            <a href={imageUrl} target="_blank" rel="noopener noreferrer" className="btn-ghost text-sm flex-1 text-center"><ExternalLink className="w-4 h-4 mr-1" /> Open</a>
          </div>
        </div>

        {/* Preview */}
        <div className="lg:col-span-2">
          <div className="card p-6 flex items-center justify-center min-h-[500px]" style={{ backgroundColor: bgColor }}>
            {platform.device === "desktop" ? (
              <div className="rounded-lg overflow-hidden shadow-2xl" style={{ width: scaledW, border: `${device.bezel}px solid #2d2d3d` }}>
                <div className="relative bg-white overflow-hidden" style={{ width: platform.width * scale, height: platform.height * scale }}>
                  {!imgError && <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={() => setImgError(true)} />}
                  {imgError && (
                    <div className="w-full h-full flex items-center justify-center bg-gray-900">
                      <div className="text-center"><Image className="w-10 h-10 text-gray-700 mx-auto mb-2" /><p className="text-xs text-gray-700">Failed to load</p></div>
                    </div>
                  )}
                  {/* Platform label overlay */}
                  <div className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">{platform.label}</div>
                </div>
              </div>
            ) : (
              <div className="relative" style={{ width: device.width * scale, height: device.height * scale }}>
                {/* Device frame */}
                <div className="absolute inset-0 rounded-[40px] shadow-2xl" style={{ border: `${device.bezel}px solid #1a1a2e`, background: "#000" }}>
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-black rounded-b-xl z-10" />
                  <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-1.5 bg-gray-800 rounded-full z-20" />
                  {/* Screen */}
                  <div className="absolute inset-[4px] rounded-[32px] overflow-hidden bg-white">
                    {!imgError && <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" onError={() => setImgError(true)} />}
                    {imgError && (
                      <div className="w-full h-full flex items-center justify-center bg-gray-900">
                        <div className="text-center"><Image className="w-10 h-10 text-gray-700 mx-auto mb-2" /><p className="text-xs text-gray-700">Failed to load</p></div>
                      </div>
                    )}
                    {/* Platform label */}
                    <div className="absolute bottom-3 left-3 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded">{platform.label}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Preview info */}
          <div className="card p-4 mt-4">
            <div className="grid grid-cols-4 gap-4 text-center text-xs">
              <div><p className="text-gray-600">Platform</p><p className="text-gray-300 font-medium mt-0.5">{platform.label}</p></div>
              <div><p className="text-gray-600">Device</p><p className="text-gray-300 font-medium mt-0.5">{device.label}</p></div>
              <div><p className="text-gray-600">Dimensions</p><p className="text-gray-300 font-medium mt-0.5">{platform.width}×{platform.height}</p></div>
              <div><p className="text-gray-600">Scale</p><p className="text-gray-300 font-medium mt-0.5">{Math.round(scale * 100)}%</p></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
