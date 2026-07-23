import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn } from "lucide-react";

interface LoginCredentials {
  email: string;
  password: string;
}

const MOCK_USERS = [
  { email: "admin@n0va.io", password: "admin123", name: "Jane Doe", role: "admin", tenantId: "tenant_001", userId: "user_001" },
  { email: "manager@n0va.io", password: "manager123", name: "John Smith", role: "manager", tenantId: "tenant_001", userId: "user_002" },
  { email: "analyst@n0va.io", password: "analyst123", name: "Alice Wang", role: "analyst", tenantId: "tenant_001", userId: "user_003" },
];

export default function Login() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Login failed" }));
        throw new Error(err.error || "Login failed");
      }

      const data = await res.json();
      localStorage.setItem("n0va_token", data.token);
      localStorage.setItem("n0va_user", JSON.stringify(data.user));
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-n0va-600 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-4">
            N0
          </div>
          <h1 className="text-2xl font-bold text-white">N0VA Ads & Marketing</h1>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Email</label>
            <input
              type="email"
              value={credentials.email}
              onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-n0va-500 focus:outline-none"
              placeholder="admin@n0va.io"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={credentials.password}
                onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm pr-10 focus:border-n0va-500 focus:outline-none"
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-n0va-600 hover:bg-n0va-500 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <LogIn className="w-4 h-4" />
            )}
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500 mb-2 text-center">Demo accounts</p>
            <div className="space-y-1.5 text-xs text-gray-500">
              {MOCK_USERS.map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-800 transition-colors"
                  onClick={() => setCredentials({ email: u.email, password: u.password })}
                >
                  <span className="text-gray-300">{u.role}</span> — {u.email} / {u.password}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
