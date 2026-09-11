import { useState } from "react";
import { api } from "../../services/api";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";

export function LoginScreen({ onLogin }) {
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
            <CardDescription>Use your CRM admin account to continue.</CardDescription>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
