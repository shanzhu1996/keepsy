"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              full_name: `${firstName.trim()} ${lastName.trim()}`.trim(),
            },
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) throw error;
        setCheckEmail(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push("/today");
        router.refresh();
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword() {
    if (!email.trim()) {
      setError("Enter your email first");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback`,
      });
      if (error) throw error;
      setResetSent(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  // ─── Password reset states ───
  if (resetSent) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div
            className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-5 keepsy-rise keepsy-rise-1"
            style={{ backgroundColor: "var(--accent-soft)" }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>
          <h1 className="font-display text-[26px] mb-2 keepsy-rise keepsy-rise-2" style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}>
            check your inbox
          </h1>
          <p className="text-[14px] leading-relaxed mb-8 keepsy-rise keepsy-rise-3" style={{ color: "var(--ink-secondary)" }}>
            we sent a password reset link to{" "}
            <span style={{ color: "var(--ink-primary)", fontWeight: 500 }}>{email}</span>.
          </p>
          <button
            type="button"
            onClick={() => { setResetSent(false); setShowReset(false); }}
            className="text-[13px] font-medium keepsy-rise keepsy-rise-4"
            style={{ color: "var(--accent)" }}
          >
            back to log in
          </button>
        </div>
      </div>
    );
  }

  if (showReset) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8 keepsy-rise keepsy-rise-1">
            <h1 className="font-display text-[34px] mb-1" style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}>
              reset password
            </h1>
            <p className="text-[14px]" style={{ color: "var(--ink-secondary)" }}>
              enter your email and we&apos;ll send a reset link
            </p>
          </div>
          <div className="keepsy-rise keepsy-rise-2">
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              className="w-full h-11 px-3 text-[14px] rounded-[10px] outline-none transition-colors"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--line-strong)",
                color: "var(--ink-primary)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--line-strong)")}
              onKeyDown={(e) => { if (e.key === "Enter") handleResetPassword(); }}
            />
            {error && (
              <div className="mt-3 px-3 py-2.5 rounded-[10px] text-[13px]" style={{ backgroundColor: "var(--accent-soft)", color: "var(--danger)", border: "1px solid rgba(179, 50, 31, 0.12)" }}>
                {error}
              </div>
            )}
            <button
              type="button"
              onClick={handleResetPassword}
              disabled={loading}
              className="w-full h-11 mt-4 text-[14px] font-semibold rounded-[10px] transition-colors"
              style={{
                backgroundColor: loading ? "var(--bg-muted)" : "var(--accent)",
                color: loading ? "var(--ink-tertiary)" : "#fff",
                boxShadow: loading ? "none" : "var(--shadow-cta)",
              }}
            >
              {loading ? "..." : "send reset link"}
            </button>
          </div>
          <p className="text-center mt-6 text-[13px] keepsy-rise keepsy-rise-3" style={{ color: "var(--ink-secondary)" }}>
            <button type="button" onClick={() => { setShowReset(false); setError(""); }} className="font-medium" style={{ color: "var(--accent)" }}>
              back to log in
            </button>
          </p>
        </div>
      </div>
    );
  }

  // ─── Check-email success state ───
  if (checkEmail) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          {/* Mail icon */}
          <div
            className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-5 keepsy-rise keepsy-rise-1"
            style={{ backgroundColor: "var(--accent-soft)" }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="20" height="16" x="2" y="4" rx="2" />
              <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
            </svg>
          </div>

          <h1
            className="font-display text-[26px] mb-2 keepsy-rise keepsy-rise-2"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.01em" }}
          >
            check your inbox
          </h1>
          <p
            className="text-[14px] leading-relaxed mb-8 keepsy-rise keepsy-rise-3"
            style={{ color: "var(--ink-secondary)" }}
          >
            we sent a confirmation link to{" "}
            <span style={{ color: "var(--ink-primary)", fontWeight: 500 }}>
              {email}
            </span>
            . click it to get started.
          </p>

          <div className="flex items-center justify-center gap-4 keepsy-rise keepsy-rise-4">
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                await supabase.auth.resend({ type: "signup", email });
                setLoading(false);
                setError("confirmation email resent!");
              }}
              disabled={loading}
              className="text-[13px] font-medium"
              style={{ color: "var(--accent)" }}
            >
              {loading ? "sending..." : "resend email"}
            </button>
            <button
              type="button"
              onClick={() => {
                setCheckEmail(false);
                setMode("login");
                setPassword("");
                setError("");
              }}
              className="text-[13px]"
              style={{ color: "var(--ink-tertiary)" }}
            >
              back to log in
            </button>
          </div>
          {error && (
            <p className="text-[12px] mt-3" style={{ color: "var(--success)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    );
  }

  // ─── Main login / signup form ───
  const isSignup = mode === "signup";

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8 keepsy-rise keepsy-rise-1">
          <h1
            className="font-display text-[34px] mb-1"
            style={{ color: "var(--ink-primary)", letterSpacing: "-0.02em" }}
          >
            keepsy
          </h1>
          <p
            className="text-[14px]"
            style={{ color: "var(--ink-secondary)" }}
          >
            you teach, we handle the rest
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="keepsy-rise keepsy-rise-2"
        >
          <div className="space-y-3">
            {/* Name fields — signup only */}
            {isSignup && (
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="first name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  required
                  autoComplete="given-name"
                  className="flex-1 min-w-0 h-11 px-3 text-[14px] rounded-[10px] outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--line-strong)",
                    color: "var(--ink-primary)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--line-strong)")
                  }
                />
                <input
                  type="text"
                  placeholder="last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  required
                  autoComplete="family-name"
                  className="flex-1 min-w-0 h-11 px-3 text-[14px] rounded-[10px] outline-none transition-colors"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: "1px solid var(--line-strong)",
                    color: "var(--ink-primary)",
                  }}
                  onFocus={(e) =>
                    (e.currentTarget.style.borderColor = "var(--accent)")
                  }
                  onBlur={(e) =>
                    (e.currentTarget.style.borderColor = "var(--line-strong)")
                  }
                />
              </div>
            )}

            {/* Email */}
            <input
              type="email"
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full h-11 px-3 text-[14px] rounded-[10px] outline-none transition-colors"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--line-strong)",
                color: "var(--ink-primary)",
              }}
              onFocus={(e) =>
                (e.currentTarget.style.borderColor = "var(--accent)")
              }
              onBlur={(e) =>
                (e.currentTarget.style.borderColor = "var(--line-strong)")
              }
            />

            {/* Password */}
            <div>
              <input
                type="password"
                placeholder="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="w-full h-11 px-3 text-[14px] rounded-[10px] outline-none transition-colors"
                style={{
                  backgroundColor: "var(--bg-surface)",
                  border: "1px solid var(--line-strong)",
                  color: "var(--ink-primary)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--accent)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "var(--line-strong)")
                }
              />
              {isSignup ? (
                <p
                  className="text-[11px] mt-1.5 ml-1"
                  style={{ color: "var(--ink-tertiary)" }}
                >
                  at least 6 characters
                </p>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); setShowReset(true); setError(""); }}
                  className="text-[11px] mt-1.5 ml-1"
                  style={{ color: "var(--ink-tertiary)" }}
                >
                  forgot password?
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              className="mt-3 px-3 py-2.5 rounded-[10px] text-[13px]"
              style={{
                backgroundColor: "var(--accent-soft)",
                color: "var(--danger)",
                border: "1px solid rgba(179, 50, 31, 0.12)",
              }}
            >
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full h-11 mt-4 text-[14px] font-semibold rounded-[10px] transition-colors"
            style={{
              backgroundColor: loading
                ? "var(--bg-muted)"
                : "var(--accent)",
              color: loading ? "var(--ink-tertiary)" : "#fff",
              boxShadow: loading ? "none" : "var(--shadow-cta)",
              letterSpacing: "-0.005em",
            }}
          >
            {loading
              ? "..."
              : isSignup
                ? "create account"
                : "log in"}
          </button>
        </form>

        {/* Divider */}
        <div
          className="flex items-center gap-3 my-5 keepsy-rise keepsy-rise-3"
        >
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: "var(--line-strong)" }}
          />
          <span
            className="text-[12px]"
            style={{ color: "var(--ink-tertiary)" }}
          >
            or
          </span>
          <div
            className="flex-1 h-px"
            style={{ backgroundColor: "var(--line-strong)" }}
          />
        </div>

        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full h-11 flex items-center justify-center gap-2.5 rounded-[10px] text-[14px] font-medium transition-colors keepsy-rise keepsy-rise-3"
          style={{
            backgroundColor: "var(--bg-surface)",
            border: "1px solid var(--line-strong)",
            color: "var(--ink-primary)",
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--bg-muted)")
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.backgroundColor = "var(--bg-surface)")
          }
        >
          {/* Google G icon */}
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
              fill="#4285F4"
            />
            <path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              fill="#FBBC05"
            />
            <path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              fill="#EA4335"
            />
          </svg>
          continue with Google
        </button>

        {/* Mode toggle */}
        <p
          className="text-center mt-6 text-[13px] keepsy-rise keepsy-rise-4"
          style={{ color: "var(--ink-secondary)" }}
        >
          {isSignup ? (
            <>
              already have an account?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className="font-medium"
                style={{ color: "var(--accent)" }}
              >
                log in
              </button>
            </>
          ) : (
            <>
              new here?{" "}
              <button
                type="button"
                onClick={() => {
                  setMode("signup");
                  setError("");
                }}
                className="font-medium"
                style={{ color: "var(--accent)" }}
              >
                create an account
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
