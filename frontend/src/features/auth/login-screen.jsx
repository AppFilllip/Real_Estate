import { useState } from "react";
import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export function LoginScreen({ onLogin }) {
  const [mode, setMode] = useState("otp"); // "otp" | "password"

  return (
    <main className="grid min-h-screen bg-slate-950 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden lg:block">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1600&q=80')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute bottom-8 left-8 text-white">
          <p className="text-sm text-white/70">EstateOS CRM</p>
          <h1 className="mt-2 max-w-md text-3xl font-semibold tracking-normal">Real estate operations, without the spreadsheet mess.</h1>
        </div>
      </section>
      <section className="flex items-center justify-center p-5">
        <Card className="w-full max-w-sm border-slate-200">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              {mode === "otp" ? "Only invited team members can sign in." : "Use your CRM admin account to continue."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mode === "otp" ? <OtpLoginForm onLogin={onLogin} /> : <PasswordLoginForm onLogin={onLogin} />}
            <button
              type="button"
              className="mt-4 text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
              onClick={() => setMode(mode === "otp" ? "password" : "otp")}
            >
              {mode === "otp" ? "Sign in with a password instead" : "Sign in with an email code instead"}
            </button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function OtpLoginForm({ onLogin }) {
  const [step, setStep] = useState("email"); // "email" | "code"
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [info, setInfo] = useState("");

  async function requestCode(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/otp/request", { email: email.trim().toLowerCase() });
      setStep("code");
      setInfo("If that email has an invited account, a 6-digit code was just sent to it.");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Could not send the code. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/otp/verify", { email: email.trim().toLowerCase(), code: code.trim() });
      onLogin(response.data.data.accessToken, response.data.data.user);
    } catch (err) {
      setError(err.response?.data?.error?.message || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "email") {
    return (
      <form className="space-y-4" onSubmit={requestCode}>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700">Email</label>
          <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="you@company.com" required />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button className="w-full" type="submit" disabled={loading}>
          {loading ? "Sending code..." : "Send me a code"}
        </Button>
      </form>
    );
  }

  return (
    <form className="space-y-4" onSubmit={verifyCode}>
      {info && <p className="text-sm text-slate-600">{info}</p>}
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">6-digit code</label>
        <Input
          value={code}
          onChange={(event) => setCode(event.target.value)}
          inputMode="numeric"
          maxLength={6}
          placeholder="000000"
          required
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? "Verifying..." : "Verify & sign in"}
      </Button>
      <button
        type="button"
        className="w-full text-xs font-medium text-slate-500 underline underline-offset-2 hover:text-slate-700"
        onClick={() => {
          setStep("email");
          setCode("");
          setError("");
        }}
      >
        Use a different email
      </button>
    </form>
  );
}

function PasswordLoginForm({ onLogin }) {
  const [email, setEmail] = useState("admin@estateos.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const response = await api.post("/auth/login", { email: email.trim().toLowerCase(), password });
      onLogin(response.data.data.accessToken, response.data.data.user);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Check backend and credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Email</label>
        <Input value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
      </div>
      <div className="space-y-2">
        <label className="text-sm font-medium text-slate-700">Password</label>
        <Input value={password} onChange={(event) => setPassword(event.target.value)} type="password" required />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button className="w-full" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
}
