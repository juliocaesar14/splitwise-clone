"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/navbar";
import { Loader2, CheckCircle, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

type UserSettings = {
  name: string;
  email: string;
  phone: string;
  upiId: string;
  currency: string;
  notificationPref: string;
};

const CURRENCIES = ["INR", "USD", "EUR", "GBP", "JPY"];
const NOTIFICATION_PREFS = [
  { value: "WEEKLY", label: "Weekly digest" },
  { value: "MONTHLY", label: "Monthly digest" },
  { value: "NONE", label: "No emails" },
];

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<UserSettings>({
    name: "",
    email: "",
    phone: "",
    upiId: "",
    currency: "INR",
    notificationPref: "WEEKLY",
  });

  // Avoid hydration mismatch for theme
  useEffect(() => setMounted(true), []);

  // Load current user data
  useEffect(() => {
    fetch("/api/users/me")
      .then((r) => r.json())
      .then((data) => {
        setForm({
          name: data.name ?? "",
          email: data.email ?? "",
          phone: data.phone ?? "",
          upiId: data.upiId ?? "",
          currency: data.currency ?? "INR",
          notificationPref: data.notificationPref ?? "WEEKLY",
        });
        setLoading(false);
      });
  }, []);

  function update(key: keyof UserSettings, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          upiId: form.upiId,
          currency: form.currency,
          notificationPref: form.notificationPref,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save.");
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-8">
        <h1 className="text-xl font-bold text-gray-900 mb-6">Settings</h1>

        <form onSubmit={handleSave} className="space-y-4">

          {/* Profile */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Profile</h2>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Email</label>
              <input
                type="email"
                value={form.email}
                disabled
                className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-400 cursor-not-allowed"
              />
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">Phone number</label>
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Payments */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Payments</h2>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                UPI ID
              </label>
              <input
                type="text"
                value={form.upiId}
                onChange={(e) => update("upiId", e.target.value)}
                placeholder="yourname@upi"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Used to generate UPI payment links on the settle up page.
              </p>
            </div>

            <div>
              <label className="block text-sm text-gray-600 mb-1.5">
                Preferred currency
              </label>
              <select
                value={form.currency}
                onChange={(e) => update("currency", e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notifications */}
          <div className="bg-white rounded-xl border p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Notifications</h2>

            <div>
              <label className="block text-sm text-gray-600 mb-2">
                Email digest frequency
              </label>
              <div className="space-y-2">
                {NOTIFICATION_PREFS.map((pref) => (
                  <label
                    key={pref.value}
                    className="flex items-center gap-3 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="notificationPref"
                      value={pref.value}
                      checked={form.notificationPref === pref.value}
                      onChange={() => update("notificationPref", pref.value)}
                      className="accent-emerald-600"
                    />
                    <span className="text-sm text-gray-700">{pref.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-white rounded-xl border p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Appearance</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">Dark mode</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {mounted && theme === "dark" ? "Currently on" : "Currently off"}
                </p>
              </div>
              {mounted && (
                <button
                  type="button"
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                  className={`relative w-12 h-6 rounded-full transition-colors
                    ${theme === "dark" ? "bg-emerald-600" : "bg-gray-200"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform flex items-center justify-center
                      ${theme === "dark" ? "translate-x-6" : "translate-x-0"}`}
                  >
                    {theme === "dark"
                      ? <Moon className="h-3 w-3 text-emerald-600" />
                      : <Sun className="h-3 w-3 text-gray-400" />
                    }
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {/* Save button */}
          <button
            type="submit"
            disabled={saving}
            className="w-full bg-emerald-600 text-white rounded-xl py-3 text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            {saved
              ? <><CheckCircle className="h-4 w-4" /> Saved!</>
              : saving ? "Saving..." : "Save changes"
            }
          </button>
        </form>
      </main>
    </div>
  );
}


