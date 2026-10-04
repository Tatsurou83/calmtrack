"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldCheck,
  PlusCircle,
  BarChart3,
  List,
  AlertTriangle,
  Sparkles,
  Timer,
  Check,
  RefreshCw,
  Settings,
  Printer,
  Trash2,
  X,
  Paperclip,
  Users,
  Mail,
  Loader2,
  TrendingUp,
  Clock,
  PieChart,
  HeartHandshake,
  Mic,
  Upload,
  Camera,
  Music,
  ImageIcon
} from "lucide-react";
import { Chart as ChartJS, registerables } from "chart.js";
import { createClient } from "@/utils/supabase/client";

ChartJS.register(...registerables);

const TAXONOMY = {
  triggers: [
    "Noise / Sensory Overload",
    "Unexpected Transition",
    "Denied Request / Limit Set",
    "Fatigue / Overtired",
    "Hunger / Thirst",
    "Academic / Task Demand",
    "Change in Routine",
    "Crowded Space",
    "Screen Time Ending",
    "Bright Lights",
    "Clothing / Tag Sensitivity",
  ],
  behaviors: [
    "Verbal Outburst / Screaming",
    "Crying / Tears",
    "Physical Aggression",
    "Self-Injurious (Head/Biting)",
    "Flopping / Refusal to Walk",
    "Elopement / Running",
    "Property Destruction / Throwing",
    "Repetitive Vocal / Stimming",
    "Covering Ears / Eyes",
    "Great Communication (Win)",
    "Calm Body During Transition (Win)",
  ],
  interventions: [
    "Noise-Cancelling Headphones",
    "Deep Pressure / Heavy Work",
    "Quiet Dark Room / Break Corner",
    "Visual Timer / Countdown",
    "Chewelry / Sensory Toy",
    "Favorite Music / Lofi Beats",
    "Weighted Blanket / Lap Pad",
    "Cold Water / Snack",
    "Validating Words / Co-Regulation",
    "Reduced Demands",
    "Visual Schedule Revisit",
  ],
};

interface StagedMedia {
  name: string;
  mimeType: string;
  previewUrl: string;
  type: "audio" | "image";
}

interface Entry {
  id: string;
  timestamp: string;
  type: "incident" | "win";
  intensity: string;
  duration: string;
  triggers: string[];
  behaviors: string[];
  interventions: string[];
  notes: string;
  loggedBy: string;
  location: string;
  media?: StagedMedia[];
}

interface Contact {
  name: string;
  email: string;
}

export default function CalmTrackApp() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<"log" | "analytics" | "history">("log");
  const [childName, setChildName] = useState("Garret");
  const [contacts, setContacts] = useState<Contact[]>([
    { name: "Dad", email: "JNobbs2@gmail.com" },
    { name: "Mom", email: "Pamela.Nobbs@yahoo.com" },
  ]);
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([
    "JNobbs2@gmail.com",
    "Pamela.Nobbs@yahoo.com",
  ]);

  // Form State
  const [logType, setLogType] = useState<"incident" | "win">("incident");
  const [timestamp, setTimestamp] = useState("");
  const [loggedBy, setLoggedBy] = useState("Dad");
  const [location, setLocation] = useState("Home");
  const [duration, setDuration] = useState("");
  const [intensity, setIntensity] = useState("Moderate");
  const [selectedTriggers, setSelectedTriggers] = useState<string[]>([]);
  const [selectedBehaviors, setSelectedBehaviors] = useState<string[]>([]);
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  // Stopwatch
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [stopwatchSeconds, setStopwatchSeconds] = useState(0);

  // Audio Recording (Live Voice Memo)
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [audioSeconds, setAudioSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const [liveAudioUrl, setLiveAudioUrl] = useState<string | null>(null);

  // Staged Media Attachments
  const [stagedMedia, setStagedMedia] = useState<StagedMedia[]>([]);

  // Data & Modals
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState("30");

  const [newContactName, setNewContactName] = useState("");
  const [newContactEmail, setNewContactEmail] = useState("");

  // Canvas Refs for Chart.js
  const chartDailyRef = useRef<HTMLCanvasElement | null>(null);
  const chartTimeRef = useRef<HTMLCanvasElement | null>(null);
  const chartTrigRef = useRef<HTMLCanvasElement | null>(null);
  const chartIntervRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstances = useRef<{ [key: string]: ChartJS | null }>({});

  const resetTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setTimestamp(now.toISOString().slice(0, 16));
  };

  useEffect(() => {
    resetTime();
    loadEntries();
  }, []);

  const loadEntries = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("behavior_entries")
        .select("*")
        .order("timestamp", { ascending: false });

      if (data && !error && data.length > 0) {
        const mapped: Entry[] = data.map((d: any) => ({
          id: d.id,
          timestamp: d.timestamp,
          type: d.type,
          intensity: d.intensity,
          duration: d.duration,
          triggers: d.triggers || [],
          behaviors: d.behaviors || [],
          interventions: d.interventions || [],
          notes: d.notes || "",
          loggedBy: d.logged_by_name || "Parent",
          location: d.location || "Home",
          media: d.media || [],
        }));
        setEntries(mapped);
      } else {
        const local = localStorage.getItem("calmtrack_entries");
        if (local) setEntries(JSON.parse(local));
      }
    } catch {
      const local = localStorage.getItem("calmtrack_entries");
      if (local) setEntries(JSON.parse(local));
    } finally {
      setLoading(false);
    }
  };

  // Stopwatch interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (stopwatchRunning) {
      interval = setInterval(() => setStopwatchSeconds((s) => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [stopwatchRunning]);

  const toggleStopwatch = () => {
    if (stopwatchRunning) {
      setStopwatchRunning(false);
      const m = Math.floor(stopwatchSeconds / 60);
      const s = stopwatchSeconds % 60;
      setDuration(m > 0 ? (s > 0 ? `${m}m ${s}s` : `${m}m`) : `${s}s`);
    } else {
      setStopwatchSeconds(0);
      setStopwatchRunning(true);
    }
  };

  // Audio Recording (Up to 5 min)
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (recordingAudio) {
      interval = setInterval(() => {
        setAudioSeconds((s) => {
          if (s >= 300) {
            stopAudioRecording();
            return 300;
          }
          return s + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [recordingAudio]);

  const startAudioRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const url = URL.createObjectURL(blob);
        setLiveAudioUrl(url);
        setStagedMedia((prev) => [
          ...prev,
          {
            name: `Recorded Memo (${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`,
            mimeType: "audio/webm",
            previewUrl: url,
            type: "audio",
          },
        ]);
      };

      recorder.start();
      setAudioSeconds(0);
      setRecordingAudio(true);
    } catch (err: any) {
      alert("Microphone permission denied: " + err.message);
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && recordingAudio) {
      mediaRecorderRef.current.stop();
      setRecordingAudio(false);
    }
  };

  // Upload Pre-recorded Audio
  const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setStagedMedia((prev) => [
        ...prev,
        {
          name: file.name,
          mimeType: file.type || "audio/mpeg",
          previewUrl: URL.createObjectURL(file),
          type: "audio",
        },
      ]);
    }
    e.target.value = "";
  };

  // Camera / File Upload (Image Compression)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !files.length) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const maxDim = 1280;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx?.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) return;
          setStagedMedia((prev) => [
            ...prev,
            {
              name: file.name,
              mimeType: "image/jpeg",
              previewUrl: URL.createObjectURL(blob),
              type: "image",
            },
          ]);
        }, "image/jpeg", 0.82);
      };
    }
    e.target.value = "";
  };

  const removeStagedMedia = (index: number) => {
    setStagedMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleChip = (
    list: string[],
    setList: React.Dispatch<React.SetStateAction<string[]>>,
    item: string
  ) => {
    setList((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const parseDurationToMins = (dur: string) => {
    if (!dur) return 0;
    const str = String(dur).toLowerCase();
    const mMatch = str.match(/(\d+)\s*m/);
    const sMatch = str.match(/(\d+)\s*s/);
    let m = mMatch ? parseInt(mMatch[1]) : 0;
    let s = sMatch ? parseInt(sMatch[1]) : 0;
    if (!mMatch && !sMatch) {
      const num = parseFloat(str);
      return isNaN(num) ? 0 : num;
    }
    return m + Math.round((s / 60) * 10) / 10;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const newEntry: Entry = {
      id: "entry_" + Date.now(),
      timestamp: timestamp,
      type: logType,
      intensity: intensity,
      duration: duration || "0m",
      triggers: selectedTriggers,
      behaviors: selectedBehaviors,
      interventions: selectedInterventions,
      notes: notes,
      loggedBy: loggedBy,
      location: location,
      media: stagedMedia,
    };

    const updated = [newEntry, ...entries];
    setEntries(updated);
    localStorage.setItem("calmtrack_entries", JSON.stringify(updated));

    try {
      await supabase.from("behavior_entries").insert([
        {
          timestamp: newEntry.timestamp,
          type: newEntry.type,
          intensity: newEntry.intensity,
          duration: newEntry.duration,
          triggers: newEntry.triggers,
          behaviors: newEntry.behaviors,
          interventions: newEntry.interventions,
          notes: newEntry.notes,
          logged_by_name: newEntry.loggedBy,
          location: newEntry.location,
        },
      ]);
    } catch (err) {
      console.warn("Supabase insert deferred:", err);
    }

    if (selectedRecipients.length > 0) {
      try {
        await fetch("/api/alerts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            childName,
            actionType: "New Entry",
            entry: newEntry,
            recipients: selectedRecipients,
          }),
        });
      } catch (err) {
        console.warn("Resend alert dispatch error:", err);
      }
    }

    setSelectedTriggers([]);
    setSelectedBehaviors([]);
    setSelectedInterventions([]);
    setNotes("");
    setDuration("");
    setStagedMedia([]);
    setLiveAudioUrl(null);
    resetTime();
    setSaving(false);
  };

  // Filtered dataset for Analytics
  const cutoffTime =
    analyticsRange === "all"
      ? 0
      : new Date().setDate(new Date().getDate() - parseInt(analyticsRange));
  const filteredEntries = entries.filter(
    (e) => new Date(e.timestamp).getTime() >= cutoffTime
  );

  const totalEvents = filteredEntries.length;
  const totalWins = filteredEntries.filter((e) => e.type === "win").length;
  const totalChallenges = totalEvents - totalWins;

  const validDurations = filteredEntries
    .map((e) => parseDurationToMins(e.duration))
    .filter((d) => d > 0);
  const avgDuration = validDurations.length
    ? Math.round(validDurations.reduce((a, b) => a + b, 0) / validDurations.length)
    : 0;

  const trigCounts: { [key: string]: number } = {};
  filteredEntries.forEach((e) =>
    (e.triggers || []).forEach((t) => (trigCounts[t] = (trigCounts[t] || 0) + 1))
  );
  const topTrigger = Object.entries(trigCounts).sort((a, b) => b[1] - a[1])[0];

  const intervCounts: { [key: string]: number } = {};
  filteredEntries.forEach((e) =>
    (e.interventions || []).forEach((i) => (intervCounts[i] = (intervCounts[i] || 0) + 1))
  );
  const topCalmer = Object.entries(intervCounts).sort((a, b) => b[1] - a[1])[0];

  // Render Charts
  useEffect(() => {
    if (activeTab !== "analytics") return;

    Object.values(chartInstances.current).forEach((c) => c?.destroy());

    // 1. Daily Trend
    if (chartDailyRef.current) {
      const dailyMap: { [key: string]: { challenges: number; wins: number } } = {};
      filteredEntries.forEach((e) => {
        const d = e.timestamp.slice(0, 10);
        if (!dailyMap[d]) dailyMap[d] = { challenges: 0, wins: 0 };
        if (e.type === "win") dailyMap[d].wins++;
        else dailyMap[d].challenges++;
      });
      const days = Object.keys(dailyMap).sort();

      chartInstances.current.daily = new ChartJS(chartDailyRef.current, {
        type: "bar",
        data: {
          labels: days.map((d) => d.slice(5)),
          datasets: [
            {
              label: "Behaviors",
              data: days.map((d) => dailyMap[d].challenges),
              backgroundColor: "#f43f5e",
            },
            {
              label: "Wins",
              data: days.map((d) => dailyMap[d].wins),
              backgroundColor: "#10b981",
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
        },
      });
    }

    // 2. Time of Day Pattern
    if (chartTimeRef.current) {
      const hoursMap = {
        "Morning (6-10a)": 0,
        "Midday (10a-2p)": 0,
        "Afternoon (2-6p)": 0,
        "Evening (6-9p)": 0,
        "Bedtime/Night": 0,
      };
      filteredEntries.forEach((e) => {
        const h = new Date(e.timestamp).getHours();
        if (h >= 6 && h < 10) hoursMap["Morning (6-10a)"]++;
        else if (h >= 10 && h < 14) hoursMap["Midday (10a-2p)"]++;
        else if (h >= 14 && h < 18) hoursMap["Afternoon (2-6p)"]++;
        else if (h >= 18 && h < 21) hoursMap["Evening (6-9p)"]++;
        else hoursMap["Bedtime/Night"]++;
      });

      chartInstances.current.time = new ChartJS(chartTimeRef.current, {
        type: "line",
        data: {
          labels: Object.keys(hoursMap),
          datasets: [
            {
              label: "Incidents by Time",
              data: Object.values(hoursMap),
              borderColor: "#0284c7",
              backgroundColor: "rgba(2, 132, 199, 0.1)",
              fill: true,
              tension: 0.3,
            },
          ],
        },
        options: { responsive: true, maintainAspectRatio: false },
      });
    }

    // 3. Top Antecedents & Triggers
    if (chartTrigRef.current) {
      const topTrigs = Object.entries(trigCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      chartInstances.current.triggers = new ChartJS(chartTrigRef.current, {
        type: "doughnut",
        data: {
          labels: topTrigs.map((t) => t[0]),
          datasets: [
            {
              data: topTrigs.map((t) => t[1]),
              backgroundColor: ["#f59e0b", "#ec4899", "#8b5cf6", "#3b82f6", "#14b8a6"],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 10 } } } },
        },
      });
    }

    // 4. Effective Interventions
    if (chartIntervRef.current) {
      const topIntervs = Object.entries(intervCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
      chartInstances.current.interventions = new ChartJS(chartIntervRef.current, {
        type: "bar",
        data: {
          labels: topIntervs.map((i) => i[0]),
          datasets: [
            {
              label: "Times Calmed Successfully",
              data: topIntervs.map((i) => i[1]),
              backgroundColor: "#0d9488",
            },
          ],
        },
        options: {
          indexAxis: "y",
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { beginAtZero: true } },
        },
      });
    }
  }, [activeTab, entries, analyticsRange]);

  return (
    <div className="bg-slate-50 text-slate-800 antialiased min-h-screen flex flex-col font-sans">
      {/* HEADER */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 shadow-sm no-print">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-sm font-bold text-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="font-bold text-lg text-slate-900 leading-tight">
                  {childName}'s Journey
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                  Cloud Synced
                </span>
              </div>
              <p className="text-xs text-slate-500">Shared Behavior & Milestone Log</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 sm:space-x-2">
            <button
              onClick={loadEntries}
              title="Refresh"
              className="p-2 text-slate-600 hover:text-teal-600 rounded-lg hover:bg-slate-100"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="p-2 text-slate-600 hover:text-teal-600 rounded-lg hover:bg-slate-100"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="flex-grow max-w-4xl w-full mx-auto p-4 space-y-6">
        {/* TABS */}
        <div className="flex bg-slate-200/70 p-1 rounded-xl font-medium text-sm text-slate-600 no-print">
          <button
            onClick={() => setActiveTab("log")}
            className={`flex-1 py-2 rounded-lg text-center flex items-center justify-center space-x-2 ${
              activeTab === "log" ? "bg-white text-slate-900 shadow-sm" : ""
            }`}
          >
            <PlusCircle className="w-4 h-4 text-teal-600" />
            <span>Log Entry</span>
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`flex-1 py-2 rounded-lg text-center flex items-center justify-center space-x-2 ${
              activeTab === "analytics" ? "bg-white text-slate-900 shadow-sm" : ""
            }`}
          >
            <BarChart3 className="w-4 h-4 text-blue-600" />
            <span>Trends & Data</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 rounded-lg text-center flex items-center justify-center space-x-2 ${
              activeTab === "history" ? "bg-white text-slate-900 shadow-sm" : ""
            }`}
          >
            <List className="w-4 h-4 text-purple-600" />
            <span>Records</span>
          </button>
        </div>

        {/* TAB 1: LOG ENTRY */}
        {activeTab === "log" && (
          <div className="space-y-5">
            {/* INCIDENT VS WIN TOGGLE */}
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setLogType("incident");
                  if (intensity === "Win") setIntensity("Moderate");
                }}
                className={`p-4 rounded-xl border-2 text-left transition flex items-start space-x-3 shadow-sm ${
                  logType === "incident"
                    ? "border-rose-500 bg-rose-50/50 text-rose-800"
                    : "border-transparent bg-white text-slate-700"
                }`}
              >
                <div className="p-2 bg-rose-200/70 rounded-lg text-rose-700">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm sm:text-base">Behavior / Sensory</div>
                  <div className="text-xs text-rose-600">Meltdowns, overloads, ABC tracking</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setLogType("win");
                  setIntensity("Win");
                }}
                className={`p-4 rounded-xl border-2 text-left transition flex items-start space-x-3 shadow-sm ${
                  logType === "win"
                    ? "border-emerald-500 bg-emerald-50/50 text-emerald-800"
                    : "border-transparent bg-white text-slate-700"
                }`}
              >
                <div className="p-2 bg-emerald-100 rounded-lg text-emerald-700">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-bold text-sm sm:text-base">Win / Milestone</div>
                  <div className="text-xs text-slate-500">Self-regulation, good transition</div>
                </div>
              </button>
            </div>

            {/* FORM */}
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-6"
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    When
                  </label>
                  <input
                    type="datetime-local"
                    value={timestamp}
                    onChange={(e) => setTimestamp(e.target.value)}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Logged By
                  </label>
                  <select
                    value={loggedBy}
                    onChange={(e) => setLoggedBy(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Dad">Dad</option>
                    <option value="Mom">Mom</option>
                    <option value="Therapist">Therapist / Clinician</option>
                    <option value="School / Aide">School / Aide</option>
                    <option value="Babysitter / Family">Babysitter / Family</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Location
                  </label>
                  <select
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Home">Home</option>
                    <option value="School / Classroom">School / Classroom</option>
                    <option value="Therapy Clinic">Therapy Clinic</option>
                    <option value="Car / Transit">Car / Transit</option>
                    <option value="Store / Public">Store / Public Place</option>
                    <option value="Park / Outside">Park / Outside</option>
                  </select>
                </div>
              </div>

              {/* DURATION & STOPWATCH */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                    <Timer className="w-4 h-4 text-teal-600 mr-1" />
                    <span>Duration (Minutes / Seconds)</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-sm font-semibold text-slate-700">
                      {String(Math.floor(stopwatchSeconds / 60)).padStart(2, "0")}:
                      {String(stopwatchSeconds % 60).padStart(2, "0")}
                    </span>
                    <button
                      type="button"
                      onClick={toggleStopwatch}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md text-white ${
                        stopwatchRunning ? "bg-rose-600" : "bg-teal-600"
                      }`}
                    >
                      {stopwatchRunning ? "Stop Timer" : "Start Timer"}
                    </button>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 1m 24s or 5m"
                    className="w-36 px-3 py-2 rounded-lg border border-slate-300 text-sm font-medium focus:ring-2 focus:ring-teal-500"
                  />
                  <div className="flex flex-wrap gap-1">
                    {["30s", "1m", "2m", "5m", "10m", "20m"].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDuration(d)}
                        className="px-2 py-1 text-xs rounded bg-white border border-slate-200 hover:bg-slate-100"
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* INTENSITY LEVEL SELECTION */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Intensity Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setIntensity("Mild")}
                    className={`p-3 text-center rounded-xl border transition text-sm font-medium ${
                      intensity === "Mild"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🌱 Mild
                    <div className="text-[10px] text-slate-400 font-normal">Fussing / Whining</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntensity("Moderate")}
                    className={`p-3 text-center rounded-xl border transition text-sm font-medium ${
                      intensity === "Moderate"
                        ? "border-amber-500 bg-amber-50 text-amber-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    ⚡ Moderate
                    <div className="text-[10px] text-slate-400 font-normal">Refusal / Screaming</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntensity("High")}
                    className={`p-3 text-center rounded-xl border transition text-sm font-medium ${
                      intensity === "High"
                        ? "border-rose-500 bg-rose-50 text-rose-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🔥 High
                    <div className="text-[10px] text-slate-400 font-normal">Aggression / SIB</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIntensity("Win")}
                    className={`p-3 text-center rounded-xl border transition text-sm font-medium ${
                      intensity === "Win"
                        ? "border-purple-500 bg-purple-50 text-purple-800 shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    🌟 Win
                    <div className="text-[10px] text-slate-400 font-normal">Great Progress</div>
                  </button>
                </div>
              </div>

              {/* ABC TAGS */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs font-bold mr-1.5">
                    A
                  </span>
                  Antecedents / Triggers
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAXONOMY.triggers.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleChip(selectedTriggers, setSelectedTriggers, t)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        selectedTriggers.includes(t)
                          ? "bg-amber-100 border-amber-400 text-amber-900"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs font-bold mr-1.5">
                    B
                  </span>
                  Behaviors Observed
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAXONOMY.behaviors.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => toggleChip(selectedBehaviors, setSelectedBehaviors, b)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        selectedBehaviors.includes(b)
                          ? "bg-rose-100 border-rose-400 text-rose-900"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 inline-flex items-center justify-center text-xs font-bold mr-1.5">
                    C
                  </span>
                  Consequences / What Helped
                </label>
                <div className="flex flex-wrap gap-2">
                  {TAXONOMY.interventions.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() =>
                        toggleChip(selectedInterventions, setSelectedInterventions, i)
                      }
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                        selectedInterventions.includes(i)
                          ? "bg-teal-100 border-teal-400 text-teal-900"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* NOTES */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Observation Notes (Multi-line supported)
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Describe context, sensory inputs, or what calmed him down..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* MEDIA ATTACHMENTS (AUDIO & PHOTOS) */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center">
                    <Paperclip className="w-4 h-4 text-teal-600 mr-1.5" />
                    MEDIA ATTACHMENTS (AUDIO & PHOTOS)
                  </label>
                  <span className="text-[11px] text-slate-400">Isolated & encrypted</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Option 1: Live Audio Recording */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 flex flex-col justify-between">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                      <span className="flex items-center">
                        <Mic className="w-3.5 h-3.5 text-rose-500 mr-1" />
                        Audio Memo (up to 5m)
                      </span>
                      <span className="font-mono text-[11px] text-slate-500">
                        {String(Math.floor(audioSeconds / 60)).padStart(2, "0")}:
                        {String(audioSeconds % 60).padStart(2, "0")}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={recordingAudio ? stopAudioRecording : startAudioRecording}
                      className={`w-full py-2 px-3 rounded text-xs font-medium flex items-center justify-center space-x-1 transition ${
                        recordingAudio
                          ? "bg-rose-100 text-rose-700 font-semibold"
                          : "bg-rose-50 text-rose-700 hover:bg-rose-100"
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full bg-rose-500 mr-1 ${
                          recordingAudio ? "animate-ping" : ""
                        }`}
                      />
                      <span>{recordingAudio ? "Stop Recording" : "Record Audio Memo"}</span>
                    </button>
                    {liveAudioUrl && (
                      <audio src={liveAudioUrl} controls className="h-7 w-full mt-1" />
                    )}
                  </div>

                  {/* Option 2: Upload Audio File */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-slate-700 flex items-center">
                      <Music className="w-3.5 h-3.5 text-purple-600 mr-1" />
                      Upload Audio / Voice Memo
                    </div>
                    <label className="w-full py-2 px-3 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded text-xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition">
                      <Upload className="w-3.5 h-3.5 mr-1" />
                      <span>Choose Audio File</span>
                      <input
                        type="file"
                        accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg,.webm"
                        multiple
                        onChange={handleAudioUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {/* Option 3: Camera / File Upload */}
                  <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-2 flex flex-col justify-between">
                    <div className="text-xs font-semibold text-slate-700 flex items-center">
                      <Camera className="w-3.5 h-3.5 text-blue-600 mr-1" />
                      Camera / File Upload
                    </div>
                    <label className="w-full py-2 px-3 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-medium flex items-center justify-center space-x-1 cursor-pointer transition">
                      <ImageIcon className="w-3.5 h-3.5 mr-1" />
                      <span>Take / Pick Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Staged Attachments Preview List */}
                {stagedMedia.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 space-y-2">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Staged Attachments ({stagedMedia.length}):
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {stagedMedia.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center space-x-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg text-xs shadow-sm"
                        >
                          <span>{m.type === "audio" ? "🎙️" : "📷"}</span>
                          <span className="max-w-[150px] truncate text-slate-700 font-medium">
                            {m.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => removeStagedMedia(idx)}
                            className="text-rose-500 hover:text-rose-700 ml-1 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RECIPIENTS */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center">
                  <Mail className="w-3.5 h-3.5 text-teal-600 mr-1.5" />
                  Send Email Notification To:
                </label>
                <div className="flex flex-wrap gap-3 text-xs">
                  {contacts.map((c) => (
                    <label
                      key={c.email}
                      className="inline-flex items-center space-x-1.5 bg-white px-2 py-1 rounded border border-slate-200 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedRecipients.includes(c.email)}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedRecipients([...selectedRecipients, c.email]);
                          else setSelectedRecipients(selectedRecipients.filter((em) => em !== c.email));
                        }}
                        className="rounded text-teal-600 focus:ring-teal-500"
                      />
                      <span className="text-slate-700 font-medium">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3.5 px-4 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl shadow-md transition flex items-center justify-center space-x-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Saving Entry...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-5 h-5" />
                    <span>Save Entry & Send Alerts</span>
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* TAB 2: ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between bg-white p-4 rounded-xl border border-slate-200 gap-3">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold text-slate-700">Range:</span>
                <select
                  value={analyticsRange}
                  onChange={(e) => setAnalyticsRange(e.target.value)}
                  className="text-sm border border-slate-300 rounded-lg px-2.5 py-1.5"
                >
                  <option value="7">Last 7 Days</option>
                  <option value="14">Last 14 Days</option>
                  <option value="30">Last 30 Days</option>
                  <option value="90">Last 90 Days</option>
                  <option value="all">All Time</option>
                </select>
              </div>
              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center space-x-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print / PDF for IEP</span>
              </button>
            </div>

            {/* KPI METRICS */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Total Events</div>
                <div className="text-2xl font-bold text-slate-900 mt-1">{totalEvents}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {totalChallenges} challenges, {totalWins} wins
                </div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Avg Duration</div>
                <div className="text-2xl font-bold text-teal-700 mt-1">{avgDuration}m</div>
                <div className="text-[11px] text-slate-400 mt-0.5">per episode</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Top Trigger</div>
                <div className="text-base font-bold text-rose-600 mt-1 truncate">
                  {topTrigger ? `${topTrigger[0]} (${topTrigger[1]})` : "None"}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Most frequent antecedent</div>
              </div>
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <div className="text-xs text-slate-500 font-medium">Top Calming Tool</div>
                <div className="text-base font-bold text-emerald-600 mt-1 truncate">
                  {topCalmer ? `${topCalmer[0]} (${topCalmer[1]})` : "None"}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">Highest success soother</div>
              </div>
            </div>

            {/* ALL 4 CHARTS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                  <TrendingUp className="w-4 h-4 text-teal-600 mr-2" />
                  Daily Incident & Win Counts
                </h3>
                <div className="h-60 relative">
                  <canvas ref={chartDailyRef} />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                  <Clock className="w-4 h-4 text-blue-600 mr-2" />
                  Time-of-Day Pattern
                </h3>
                <div className="h-60 relative">
                  <canvas ref={chartTimeRef} />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                  <PieChart className="w-4 h-4 text-amber-600 mr-2" />
                  Top Antecedents & Triggers
                </h3>
                <div className="h-60 relative">
                  <canvas ref={chartTrigRef} />
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200">
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center">
                  <HeartHandshake className="w-4 h-4 text-purple-600 mr-2" />
                  What Helped Regulate
                </h3>
                <div className="h-60 relative">
                  <canvas ref={chartIntervRef} />
                </div>
              </div>
            </div>

            {/* OBSERVATION RECORDS (IEP ADDENDUM) */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  Observation Records in Selected Range ({filteredEntries.length})
                </h3>
                <span className="text-xs text-slate-400">Included on printouts for IEP & Clinical team</span>
              </div>
              <div className="space-y-3">
                {filteredEntries.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">No observation logs found in this time range.</p>
                ) : (
                  filteredEntries.map((e) => {
                    const isWin = e.type === "win";
                    return (
                      <div
                        key={e.id}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5 text-xs"
                      >
                        <div className="flex justify-between items-center">
                          <span className={`font-bold ${isWin ? "text-emerald-700" : "text-slate-800"}`}>
                            {isWin ? "🌟 Win" : e.intensity} • {e.timestamp.replace("T", " ")}
                          </span>
                          <span className="text-slate-500">
                            {e.location} • By {e.loggedBy} {e.duration !== "0m" ? `(${e.duration})` : ""}
                          </span>
                        </div>
                        {e.triggers.length > 0 && (
                          <div>
                            <span className="font-semibold text-slate-600">Triggers:</span> {e.triggers.join(", ")}
                          </div>
                        )}
                        {e.behaviors.length > 0 && (
                          <div>
                            <span className="font-semibold text-slate-600">Behaviors:</span> {e.behaviors.join(", ")}
                          </div>
                        )}
                        {e.interventions.length > 0 && (
                          <div>
                            <span className="font-semibold text-teal-700">What Helped:</span>{" "}
                            {e.interventions.join(", ")}
                          </div>
                        )}
                        {e.notes && (
                          <div className="italic text-slate-600 bg-white p-2 rounded border border-slate-100 whitespace-pre-line">
                            "{e.notes}"
                          </div>
                        )}
                        {e.media && e.media.length > 0 && (
                          <div className="text-[11px] text-teal-700 font-semibold pt-1">
                            📎 Attachments ({e.media.length}): {e.media.map((m) => m.name).join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RECORDS HISTORY */}
        {activeTab === "history" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800">Historical Logs</h2>
              <button
                onClick={loadEntries}
                className="px-3 py-1.5 text-xs font-medium bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg flex items-center space-x-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Logs</span>
              </button>
            </div>

            <div className="space-y-3">
              {entries.length === 0 ? (
                <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                  <p className="text-sm">No behavior entries recorded yet.</p>
                </div>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className={`bg-white p-4 rounded-xl border ${
                      entry.type === "win"
                        ? "border-emerald-200 bg-emerald-50/20"
                        : "border-slate-200"
                    } shadow-sm space-y-2`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            entry.type === "win"
                              ? "bg-emerald-100 text-emerald-800"
                              : entry.intensity === "High"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {entry.type === "win" ? "🌟 Win" : entry.intensity}
                        </span>
                        <span className="text-xs font-medium text-slate-500 ml-2">
                          {entry.timestamp.replace("T", " ")}
                        </span>
                        <span className="text-xs text-slate-400">
                          {" "}
                          • {entry.location} • By {entry.loggedBy}
                        </span>
                      </div>
                      <span className="text-xs font-mono font-medium bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                        {entry.duration}
                      </span>
                    </div>

                    {entry.triggers.length > 0 && (
                      <div className="text-xs">
                        <span className="font-semibold text-slate-600">Triggers: </span>
                        <span className="text-slate-700">{entry.triggers.join(", ")}</span>
                      </div>
                    )}
                    {entry.behaviors.length > 0 && (
                      <div className="text-xs">
                        <span className="font-semibold text-slate-600">Behaviors: </span>
                        <span className="text-slate-700">{entry.behaviors.join(", ")}</span>
                      </div>
                    )}
                    {entry.interventions.length > 0 && (
                      <div className="text-xs">
                        <span className="font-semibold text-teal-700">What Helped: </span>
                        <span className="text-slate-700">{entry.interventions.join(", ")}</span>
                      </div>
                    )}
                    {entry.notes && (
                      <div className="text-xs text-slate-600 italic bg-slate-50 p-2.5 rounded border border-slate-100 whitespace-pre-line">
                        "{entry.notes}"
                      </div>
                    )}
                    {entry.media && entry.media.length > 0 && (
                      <div className="pt-2 border-t border-slate-100 mt-2 space-y-1.5">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center">
                          <Paperclip className="w-3 h-3 mr-1 text-teal-600" />
                          Attachments ({entry.media.length}):
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {entry.media.map((m, idx) => (
                            <a
                              key={idx}
                              href={m.previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition"
                            >
                              <span>{m.type === "audio" ? "🎙️" : "📷"}</span>
                              <span className="font-medium">{m.name}</span>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {/* SETTINGS MODAL */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Child & Email Settings</h3>
              <button
                onClick={() => setSettingsOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Child's Name
                </label>
                <input
                  type="text"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>

              <div className="border-t border-slate-100 pt-3 space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center">
                  <Users className="w-3.5 h-3.5 text-teal-600 mr-1.5" />
                  Email Notification Recipients
                </label>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {contacts.map((c, idx) => (
                    <div
                      key={c.email}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div>
                        <span className="font-semibold text-slate-800">{c.name}</span>
                        <span className="text-slate-500 ml-1.5">({c.email})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setContacts(contacts.filter((_, i) => i !== idx))}
                        className="text-rose-500 hover:text-rose-700 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="text"
                    value={newContactName}
                    onChange={(e) => setNewContactName(e.target.value)}
                    placeholder="Name (e.g. BCBA)"
                    className="w-1/3 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <input
                    type="email"
                    value={newContactEmail}
                    onChange={(e) => setNewContactEmail(e.target.value)}
                    placeholder="Email address"
                    className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (!newContactName || !newContactEmail) return;
                      setContacts([
                        ...contacts,
                        { name: newContactName, email: newContactEmail },
                      ]);
                      setNewContactName("");
                      setNewContactEmail("");
                    }}
                    className="px-3 py-1.5 bg-teal-600 text-white rounded-lg text-xs font-medium"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSettingsOpen(false)}
                className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}