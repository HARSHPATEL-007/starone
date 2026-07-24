import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, LogIn, UserPlus } from "lucide-react";

interface LoginCredentials {
  email: string;
  password: string;
  name?: string;
}

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [credentials, setCredentials] = useState<LoginCredentials>({ email: "", password: "", name: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const endpoint = mode === "login" ? "/api/v1/auth/login" : "/api/v1/auth/register";
      const body = mode === "login"
        ? { email: credentials.email, password: credentials.password }
        : { email: credentials.email, password: credentials.password, name: credentials.name };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: mode === "login" ? "Login failed" : "Registration failed" }));
        throw new Error(err.error || (mode === "login" ? "Login failed" : "Registration failed"));
      }

      const data = await res.json();
      localStorage.setItem("n0va_token", data.token);
      localStorage.setItem("n0va_user", JSON.stringify(data.user));
      navigate("/");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
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
          <p className="text-gray-500 mt-1">{mode === "login" ? "Sign in to your account" : "Create your account"}</p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {mode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Name</label>
              <input
                type="text"
                value={credentials.name}
                onChange={(e) => setCredentials({ ...credentials, name: e.target.value })}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-white text-sm focus:border-n0va-500 focus:outline-none"
                placeholder="Your name"
                required
              />
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
                minLength={6}
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
            ) : mode === "login" ? (
              <LogIn className="w-4 h-4" />
            ) : (
              <UserPlus className="w-4 h-4" />
            )}
            {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
          </button>

          <div className="text-center">
            <button
              type="button"
              onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
              className="text-sm text-n0va-400 hover:text-n0va-300"
            >
              {mode === "login" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>

          <div className="border-t border-gray-800 pt-4">
            <p className="text-xs text-gray-500 mb-2 text-center">Demo accounts</p>
            <div className="space-y-1.5 text-xs text-gray-500">
              {[
                { email: "admin@n0va.io", password: "admin123", role: "admin" },
                { email: "manager@n0va.io", password: "manager123", role: "manager" },
                { email: "analyst@n0va.io", password: "analyst123", role: "analyst" },
              ].map((u) => (
                <button
                  key={u.email}
                  type="button"
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-gray-800 transition-colors"
                  onClick={() => setCredentials({ ...credentials, email: u.email, password: u.password })}
                >
                  <span className="text-gray-300">{u.role}</span> — {u.email}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
