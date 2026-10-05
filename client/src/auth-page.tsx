import { useEffect, useState } from "react";
import { api } from "./api.js";

type LoginResult = { token: string; user: import("./api.js").User };

export function AuthPage({ onLogin }: { onLogin: (result: LoginResult) => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [signupAvailable, setSignupAvailable] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [signIn, setSignIn] = useState({ identifier: "", password: "" });
  const [signUp, setSignUp] = useState({ name: "", email: "", mobile: "", password: "" });
  const [photo, setPhoto] = useState<File | null>(null);

  useEffect(() => {
    api("/auth/signup-available")
      .then((result: { available: boolean }) => {
        setSignupAvailable(result.available);
        if (!result.available) setMode("signin");
      })
      .catch(() => setSignupAvailable(false));
  }, []);

  async function handleSignIn(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      onLogin(
        await api("/auth/login", {
          method: "POST",
          body: JSON.stringify(signIn),
        })
      );
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSignUp(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result: LoginResult = await api("/auth/signup/owner", {
        method: "POST",
        body: JSON.stringify(signUp),
      });
      if (photo) {
        const data = new FormData();
        data.append("image", photo);
        const response = await fetch("/api/uploads/avatar", {
          method: "POST",
          headers: { Authorization: `Bearer ${result.token}` },
          body: data,
        });
        const uploaded = await response.json().catch(() => null);
        if (response.ok && uploaded?.avatarUrl) {
          result.user = { ...result.user, avatarUrl: uploaded.avatarUrl };
        }
      }
      onLogin(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-layout">
      <section className="auth-brand">
        <h1>☕ Cafe POS</h1>
        <p>Good Food · Better Vibes</p>
        <ul>
          <li>Owners manage menu, sales, and cashier accounts</li>
          <li>Cashiers bill customers with mobile login only</li>
          <li>Cashier accounts are created by the owner — not public sign-up</li>
        </ul>
      </section>
      <section className="auth-panel">
        <div className="auth-tabs">
          <button type="button" className={mode === "signin" ? "active" : ""} onClick={() => { setMode("signin"); setError(""); }}>
            Sign In
          </button>
          {signupAvailable && (
            <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>
              Sign Up
            </button>
          )}
        </div>
        {mode === "signin" ? (
          <>
            <h2>Welcome back</h2>
            <p className="auth-sub">Owners use email or mobile. Cashiers use the mobile number set by the owner.</p>
            <form onSubmit={handleSignIn}>
              <label>
                Email or mobile number
                <input
                  required
                  autoComplete="username"
                  placeholder="owner@email.com or +91 98765 43210"
                  value={signIn.identifier}
                  onChange={(event) => setSignIn({ ...signIn, identifier: event.target.value })}
                />
              </label>
              <label>
                Password
                <input
                  required
                  type="password"
                  minLength={8}
                  autoComplete="current-password"
                  value={signIn.password}
                  onChange={(event) => setSignIn({ ...signIn, password: event.target.value })}
                />
              </label>
              <button disabled={loading}>{loading ? "Signing in…" : "Sign In"}</button>
            </form>
          </>
        ) : (
          <>
            <h2>Create owner account</h2>
            <p className="auth-sub">One owner account per cafe. You can add cashiers after signing in.</p>
            <form onSubmit={handleSignUp}>
              <label>
                Full name
                <input required value={signUp.name} onChange={(event) => setSignUp({ ...signUp, name: event.target.value })} />
              </label>
              <label>
                Email
                <input required type="email" autoComplete="email" value={signUp.email} onChange={(event) => setSignUp({ ...signUp, email: event.target.value })} />
              </label>
              <label>
                Mobile number
                <input required inputMode="tel" placeholder="+91 98765 43210" value={signUp.mobile} onChange={(event) => setSignUp({ ...signUp, mobile: event.target.value })} />
              </label>
              <label>
                Password
                <input required type="password" minLength={8} autoComplete="new-password" value={signUp.password} onChange={(event) => setSignUp({ ...signUp, password: event.target.value })} />
              </label>
              <label className="auth-photo">
                Profile photo <small>(optional)</small>
                <input type="file" accept="image/*" onChange={(event) => setPhoto(event.target.files?.[0] ?? null)} />
              </label>
              <button disabled={loading}>{loading ? "Creating account…" : "Create owner account"}</button>
            </form>
          </>
        )}
        {error && <p className="error auth-error">{error}</p>}
      </section>
    </main>
  );
}
