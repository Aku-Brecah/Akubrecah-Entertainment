"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { 
  Mail, Phone, Building, Calendar, MessageSquare, 
  Search, CheckCircle2, Clock, 
  AlertCircle, ChevronRight, Send, Trash2,
  Archive, ShieldAlert, Eye, EyeOff, RefreshCw,
  Copy, Check, ExternalLink, MessageCircle, X,
  Inbox, Reply, ArrowLeft
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

interface Note {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
}

interface ReplyItem {
  id: string;
  senderEmail: string;
  recipientEmail: string;
  subject: string;
  body: string;
  deliveryStatus: "sent" | "failed" | "draft";
  providerId: string | null;
  errorMessage: string | null;
  createdAt: string;
}

interface Inquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  company: string | null;
  projectType: string;
  budget: string | null;
  subject: string | null;
  message: string;
  status: string;
  source: string;
  isRead: boolean;
  ipAddress: string | null;
  createdAt: string;
  updatedAt: string;
  notes: Note[];
  replies: ReplyItem[];
}

interface Stats {
  total: number;
  unread: number;
  new: number;
  awaitingReply: number;
  archived: number;
  spam: number;
}

type TabType = "all" | "unread" | "awaiting" | "archived" | "spam";

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20" },
  { value: "contacted", label: "Contacted", color: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" },
  { value: "qualified", label: "Qualified", color: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20" },
  { value: "proposal_sent", label: "Proposal Sent", color: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" },
  { value: "won", label: "Won / Active", color: "bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 border-emerald-600/20" },
  { value: "lost", label: "Lost", color: "bg-neutral-500/10 text-neutral-600 dark:text-neutral-400 border-neutral-500/20" },
  { value: "archived", label: "Archived", color: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20" },
  { value: "spam", label: "Spam", color: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" },
];

export default function AdminInquiriesPage() {
  const { user } = useUser();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState<Stats>({
    total: 0,
    unread: 0,
    new: 0,
    awaitingReply: 0,
    archived: 0,
    spam: 0,
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null);

  // Note composer state
  const [newNote, setNewNote] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);

  // Email Reply composer state
  const [replySubject, setReplySubject] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySuccess, setReplySuccess] = useState<string | null>(null);

  // Actions state
  const [isUpdating, setIsUpdating] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const fetchInquiries = useCallback(async (overrideSearch?: string, targetPage = 1) => {
    setLoading(true);
    try {
      const effectiveSearch = overrideSearch !== undefined ? overrideSearch : searchQuery;
      let url = `/api/admin/inquiries?q=${encodeURIComponent(effectiveSearch)}&page=${targetPage}&limit=25`;

      if (activeTab === "unread") {
        url += "&unread=true";
      } else if (activeTab === "awaiting") {
        url += "&awaitingReply=true";
      } else if (activeTab === "archived") {
        url += "&status=archived";
      } else if (activeTab === "spam") {
        url += "&status=spam";
      }

      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setInquiries(data.inquiries || []);
        setPage(data.pagination?.page || targetPage);
        setTotalPages(data.pagination?.totalPages || 1);
        if (data.stats) {
          setStats(data.stats);
        }
        if (selectedInquiry) {
          const fresh = (data.inquiries || []).find((i: Inquiry) => i.id === selectedInquiry.id);
          if (fresh) {
            setSelectedInquiry(fresh);
          }
        }
      } else {
        toast.error(data.error || "Failed to load inquiries.");
      }
    } catch (err) {
      console.error("Failed to load inquiries:", err);
      toast.error("Network error loading inquiries.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, selectedInquiry]);

  useEffect(() => {
    fetchInquiries(undefined, 1);
  }, [activeTab]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInquiries(searchQuery, 1);
  };

  const handleSelectInquiry = async (item: Inquiry) => {
    setSelectedInquiry(item);
    setReplySubject(`Re: ${item.subject || item.projectType}`);
    setReplyBody("");
    setReplyError(null);
    setReplySuccess(null);

    // If unread, mark read automatically
    if (!item.isRead) {
      try {
        await fetch("/api/admin/inquiries", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: item.id, isRead: true }),
        });
        setInquiries((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i))
        );
        setStats((prev) => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
      } catch (err) {
        console.error("Failed to mark read:", err);
      }
    }
  };

  const handleToggleRead = async (inquiryId: string, currentRead: boolean) => {
    setIsUpdating(true);
    try {
      const nextRead = !currentRead;
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inquiryId, isRead: nextRead }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiries((prev) =>
          prev.map((i) => (i.id === inquiryId ? { ...i, isRead: nextRead } : i))
        );
        if (selectedInquiry?.id === inquiryId) {
          setSelectedInquiry((prev) => prev ? { ...prev, isRead: nextRead } : null);
        }
        setStats((prev) => ({
          ...prev,
          unread: nextRead ? Math.max(0, prev.unread - 1) : prev.unread + 1,
        }));
      }
    } catch (err) {
      console.error("Failed to toggle read state:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusChange = async (inquiryId: string, nextStatus: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: inquiryId, status: nextStatus }),
      });
      const data = await res.json();
      if (data.success) {
        setInquiries((prev) =>
          prev.map((item) => (item.id === inquiryId ? { ...item, status: nextStatus } : item))
        );
        if (selectedInquiry?.id === inquiryId) {
          setSelectedInquiry((prev) => (prev ? { ...prev, status: nextStatus } : null));
        }
        fetchInquiries();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      toast.error("Failed to update status. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (inquiryId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/admin/inquiries?id=${inquiryId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setInquiries((prev) => prev.filter((i) => i.id !== inquiryId));
        if (selectedInquiry?.id === inquiryId) {
          setSelectedInquiry(null);
        }
        setConfirmDeleteId(null);
        fetchInquiries();
      } else {
        toast.error(data.error || "Failed to delete inquiry. Please try again.");
      }
    } catch (err) {
      console.error("Failed to delete inquiry:", err);
      toast.error("Failed to delete inquiry. Please check your connection and try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry || !newNote.trim()) return;

    setSubmittingNote(true);
    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "note",
          inquiryId: selectedInquiry.id,
          content: newNote.trim(),
          authorName:
            user?.fullName ||
            user?.primaryEmailAddress?.emailAddress ||
            "Admin Operator",
        }),
      });
      const data = await res.json();
      if (data.success && data.note) {
        const updatedNotes = [data.note, ...(selectedInquiry.notes || [])];
        const updatedInquiry = { ...selectedInquiry, notes: updatedNotes };
        setSelectedInquiry(updatedInquiry);
        setInquiries((prev) =>
          prev.map((i) => (i.id === selectedInquiry.id ? updatedInquiry : i))
        );
        setNewNote("");
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setSubmittingNote(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInquiry || !replyBody.trim()) return;

    setSendingReply(true);
    setReplyError(null);
    setReplySuccess(null);

    try {
      const res = await fetch("/api/admin/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reply",
          inquiryId: selectedInquiry.id,
          replySubject: replySubject.trim(),
          replyBody: replyBody.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setReplyError(data.error || "Failed to dispatch email reply.");
        if (data.reply) {
          // Record failed reply attempt in thread
          const freshReplies = [data.reply, ...(selectedInquiry.replies || [])];
          setSelectedInquiry({ ...selectedInquiry, replies: freshReplies });
        }
        return;
      }

      setReplySuccess("Reply email dispatched successfully to " + selectedInquiry.email);
      setReplyBody("");

      if (data.inquiry) {
        setSelectedInquiry(data.inquiry);
        setInquiries((prev) =>
          prev.map((i) => (i.id === selectedInquiry.id ? data.inquiry : i))
        );
      }
      fetchInquiries();
    } catch (err: any) {
      setReplyError(err.message || "An unexpected network error occurred while sending email.");
    } finally {
      setSendingReply(false);
    }
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Title & Quick Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-on-surface tracking-tight">Messages & Client Inbox</h1>
            {stats.unread > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-primary text-white">
                {stats.unread} unread
              </span>
            )}
          </div>
          <p className="text-xs text-on-surface-variant mt-1">
            Real-time management for contact briefs, service inquiries, and client correspondence.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchInquiries()}
            disabled={loading}
            className="h-9 px-3.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Total Inquiries", value: stats.total, color: "text-on-surface" },
          { label: "Unread Messages", value: stats.unread, color: stats.unread > 0 ? "text-primary" : "text-on-surface" },
          { label: "New Leads", value: stats.new, color: "text-blue-600 dark:text-blue-400" },
          { label: "Awaiting Reply", value: stats.awaitingReply, color: "text-amber-600 dark:text-amber-400" },
          { label: "Archived", value: stats.archived, color: "text-neutral-500" },
          { label: "Spam Filtered", value: stats.spam, color: "text-rose-500" },
        ].map((m) => (
          <div
            key={m.label}
            className="p-3.5 rounded-2xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-1"
          >
            <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">
              {m.label}
            </span>
            <span className={`text-xl font-black ${m.color}`}>
              {m.value}
            </span>
          </div>
        ))}
      </div>

      {/* Main Split-View Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Pane: Inbox Message List (5 cols on lg) */}
        <div className={`lg:col-span-5 space-y-4 ${selectedInquiry ? "hidden lg:block" : "block"}`}>
          
          {/* Filter Tabs & Search Header */}
          <div className="p-4 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-3">
            
            {/* Search Bar */}
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
              <input
                type="text"
                placeholder="Search name, email, subject, or message..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-8 rounded-xl bg-surface-container border border-outline-variant text-xs text-on-surface placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); fetchInquiries("", 1); }}
                  aria-label="Clear search"
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </form>

            {/* Filter Tabs */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { id: "all", label: "All" },
                { id: "unread", label: "Unread", badge: stats.unread },
                { id: "awaiting", label: "Awaiting Reply", badge: stats.awaitingReply },
                { id: "archived", label: "Archived" },
                { id: "spam", label: "Spam" },
              ].map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`h-7 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-primary text-white shadow-xs"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                    }`}
                  >
                    <span>{tab.label}</span>
                    {typeof tab.badge === "number" && tab.badge > 0 && (
                      <span className={`px-1 rounded-full text-[9px] font-black ${
                        isActive ? "bg-white text-primary" : "bg-primary text-white"
                      }`}>
                        {tab.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Messages Scrollable List */}
          <div className="p-2 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-1.5 max-h-[calc(100vh-280px)] overflow-y-auto">
            {loading && inquiries.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-xs text-on-surface-variant font-medium">Loading messages...</p>
              </div>
            ) : inquiries.length === 0 ? (
              <div className="p-10 text-center space-y-3">
                <Inbox className="w-8 h-8 text-on-surface-variant/40 mx-auto" />
                <p className="text-xs font-bold text-on-surface">No messages found</p>
                <p className="text-[11px] text-on-surface-variant max-w-xs mx-auto">
                  {searchQuery ? "Try refining your search terms or clearing the filter." : "New client inquiries will appear here as soon as they are submitted."}
                </p>
              </div>
            ) : (
              inquiries.map((item) => {
                const isSelected = selectedInquiry?.id === item.id;
                const statusMeta = STATUS_OPTIONS.find((s) => s.value === item.status) || STATUS_OPTIONS[0];
                const hasReplies = item.replies && item.replies.length > 0;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectInquiry(item)}
                    className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                      isSelected
                        ? "bg-primary/5 border-primary/40 shadow-xs"
                        : "bg-surface-container-lowest hover:bg-surface-container/60 border-outline-variant/60"
                    } relative space-y-2`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        {/* Unread dot */}
                        {!item.isRead ? (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0 animate-pulse" title="Unread" />
                        ) : (
                          <span className="w-2 h-2 rounded-full bg-transparent shrink-0" />
                        )}
                        <h4 className={`text-xs truncate ${!item.isRead ? "font-black text-on-surface" : "font-semibold text-on-surface/90"}`}>
                          {item.name}
                        </h4>
                      </div>

                      <span className="text-[10px] text-on-surface-variant/80 shrink-0 font-medium">
                        {formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}
                      </span>
                    </div>

                    {/* Subject line */}
                    <p className={`text-xs truncate ${!item.isRead ? "font-bold text-on-surface" : "font-medium text-on-surface-variant"}`}>
                      {item.subject || item.projectType}
                    </p>

                    {/* Snippet preview */}
                    <p className="text-[11px] text-on-surface-variant/80 line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>

                    {/* Footer pills */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${statusMeta.color}`}>
                        {statusMeta.label}
                      </span>
                      {hasReplies && (
                        <span className="px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" /> Replied ({item.replies.length})
                        </span>
                      )}
                      {item.company && (
                        <span className="text-[10px] text-on-surface-variant truncate ml-auto">
                          {item.company}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-3 py-2 rounded-2xl bg-surface-container-lowest border border-outline-variant text-xs">
              <span className="text-on-surface-variant">
                Page <strong className="text-on-surface">{page}</strong> of <strong className="text-on-surface">{totalPages}</strong>
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => fetchInquiries(undefined, page - 1)}
                  className="px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant font-bold text-on-surface disabled:opacity-40"
                >
                  Prev
                </button>
                <button
                  type="button"
                  disabled={page >= totalPages || loading}
                  onClick={() => fetchInquiries(undefined, page + 1)}
                  className="px-2.5 py-1 rounded-lg bg-surface-container border border-outline-variant font-bold text-on-surface disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Pane: Message Viewer & Action Workspace (7 cols on lg) */}
        <div className={`lg:col-span-7 space-y-6 ${!selectedInquiry ? "hidden lg:block" : "block"}`}>
          {!selectedInquiry ? (
            <div className="p-16 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-surface-container flex items-center justify-center mx-auto text-on-surface-variant/40">
                <Mail className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-on-surface">No Message Selected</h3>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  Select an inquiry from the inbox list on the left to inspect its full brief, team notes, and dispatch an email response.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              
              {/* Message Header & Action Toolbar */}
              <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-4">
                
                {/* Back button for mobile */}
                <button
                  onClick={() => setSelectedInquiry(null)}
                  className="lg:hidden flex items-center gap-1.5 text-xs font-bold text-primary mb-2"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Back to Message List
                </button>

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 border-b border-outline-variant/60 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black text-on-surface">{selectedInquiry.name}</h2>
                      {!selectedInquiry.isRead && (
                        <span className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                    <p className="text-xs font-bold text-primary">
                      {selectedInquiry.subject || selectedInquiry.projectType}
                    </p>
                    <p className="text-[11px] text-on-surface-variant">
                      Received on {format(new Date(selectedInquiry.createdAt), "EEEE, MMMM do yyyy, h:mm a")} • via {selectedInquiry.source}
                    </p>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleToggleRead(selectedInquiry.id, selectedInquiry.isRead)}
                      disabled={isUpdating}
                      className="h-8 px-2.5 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface flex items-center gap-1.5 transition-colors"
                      title={selectedInquiry.isRead ? "Mark as unread" : "Mark as read"}
                    >
                      {selectedInquiry.isRead ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      <span>{selectedInquiry.isRead ? "Mark Unread" : "Mark Read"}</span>
                    </button>

                    {/* Status Dropdown */}
                    <select
                      value={selectedInquiry.status}
                      onChange={(e) => handleStatusChange(selectedInquiry.id, e.target.value)}
                      disabled={isUpdating}
                      className="h-8 px-2.5 rounded-xl bg-surface-container border border-outline-variant text-xs font-bold text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          Status: {opt.label}
                        </option>
                      ))}
                    </select>

                    {/* Archive / Restore Button */}
                    <button
                      onClick={() =>
                        handleStatusChange(
                          selectedInquiry.id,
                          selectedInquiry.status === "archived" ? "new" : "archived"
                        )
                      }
                      disabled={isUpdating}
                      className="h-8 p-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-on-surface transition-colors"
                      title={selectedInquiry.status === "archived" ? "Restore inquiry" : "Archive inquiry"}
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>

                    {/* Flag as Spam Button */}
                    <button
                      onClick={() =>
                        handleStatusChange(
                          selectedInquiry.id,
                          selectedInquiry.status === "spam" ? "new" : "spam"
                        )
                      }
                      disabled={isUpdating}
                      className="h-8 p-2 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-rose-600 transition-colors"
                      title="Flag as Spam"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" />
                    </button>

                    {/* Delete with Confirmation */}
                    {confirmDeleteId === selectedInquiry.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(selectedInquiry.id)}
                          className="h-8 px-2.5 rounded-xl bg-red-600 text-white text-xs font-black"
                        >
                          Confirm
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="h-8 px-2 rounded-xl bg-surface-container text-xs font-bold text-on-surface"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(selectedInquiry.id)}
                        className="h-8 p-2 rounded-xl bg-surface-container hover:bg-red-500/10 border border-outline-variant text-red-600 transition-colors"
                        title="Delete inquiry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sender Metadata Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                  
                  {/* Email with copy */}
                  <div className="p-3 rounded-2xl bg-surface-container space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">Email Address</span>
                    <div className="flex items-center justify-between gap-1">
                      <a href={`mailto:${selectedInquiry.email}`} className="text-xs font-bold text-primary truncate hover:underline">
                        {selectedInquiry.email}
                      </a>
                      <button
                        onClick={() => copyToClipboard(selectedInquiry.email, "email")}
                        className="text-on-surface-variant hover:text-on-surface"
                        title="Copy email"
                      >
                        {copiedField === "email" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                  </div>

                  {/* Phone with WhatsApp click */}
                  <div className="p-3 rounded-2xl bg-surface-container space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">Phone / WhatsApp</span>
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-on-surface truncate">
                        {selectedInquiry.phone || "Not provided"}
                      </span>
                      {selectedInquiry.phone && (
                        <a
                          href={`https://wa.me/${selectedInquiry.phone.replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:opacity-80"
                          title="Open WhatsApp chat"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Company */}
                  <div className="p-3 rounded-2xl bg-surface-container space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">Company / Org</span>
                    <span className="text-xs font-bold text-on-surface truncate block">
                      {selectedInquiry.company || "Individual / Startup"}
                    </span>
                  </div>

                  {/* Budget */}
                  <div className="p-3 rounded-2xl bg-surface-container space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant block">Budget Bracket</span>
                    <span className="text-xs font-bold text-on-surface truncate block">
                      {selectedInquiry.budget || "Flexible"}
                    </span>
                  </div>
                </div>

                {/* Complete Message Content */}
                <div className="space-y-2 pt-2">
                  <span className="text-xs font-black uppercase tracking-wider text-on-surface-variant block">
                    Message / Project Brief
                  </span>
                  <div className="p-4 rounded-2xl bg-surface-container text-xs text-on-surface whitespace-pre-line leading-relaxed font-normal">
                    {selectedInquiry.message}
                  </div>
                </div>
              </div>

              {/* Email Reply Composer */}
              <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Reply className="w-4 h-4 text-primary" />
                    <h3 className="text-sm font-bold text-on-surface">Respond to {selectedInquiry.name} via Email</h3>
                  </div>
                  <span className="text-[11px] text-on-surface-variant font-medium">
                    To: {selectedInquiry.email}
                  </span>
                </div>

                {replySuccess && (
                  <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{replySuccess}</span>
                  </div>
                )}

                {replyError && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs font-semibold flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{replyError}</span>
                  </div>
                )}

                <form onSubmit={handleSendReply} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface">Subject Line</label>
                    <input
                      type="text"
                      value={replySubject}
                      onChange={(e) => setReplySubject(e.target.value)}
                      required
                      className="w-full h-9 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-on-surface">Response Body</label>
                    <textarea
                      rows={5}
                      value={replyBody}
                      onChange={(e) => setReplyBody(e.target.value)}
                      required
                      placeholder="Write your professional proposal, discovery scoping details, or answers to their inquiry..."
                      className="w-full p-3 rounded-xl bg-surface-container border border-outline-variant text-xs text-on-surface resize-none focus:outline-none focus:ring-1 focus:ring-primary leading-relaxed"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                    <p className="text-[10px] text-on-surface-variant">
                      Sent from your verified engineering domain using configured SMTP / Mailcow transport.
                    </p>
                    <button
                      type="submit"
                      disabled={sendingReply || !replyBody.trim()}
                      className="h-10 px-5 rounded-xl bg-primary text-white font-bold text-xs flex items-center justify-center gap-2 hover:opacity-90 transition-opacity disabled:opacity-50 shrink-0"
                    >
                      {sendingReply ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                          Sending Email...
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" /> Send Reply
                        </>
                      )}
                    </button>
                  </div>
                </form>

                {/* Reply Audit History */}
                {selectedInquiry.replies && selectedInquiry.replies.length > 0 && (
                  <div className="space-y-3 pt-4 border-t border-outline-variant/60">
                    <span className="text-xs font-bold text-on-surface uppercase tracking-wider block">
                      Sent Response History ({selectedInquiry.replies.length})
                    </span>
                    <div className="space-y-2">
                      {selectedInquiry.replies.map((r) => (
                        <div
                          key={r.id}
                          className="p-3 rounded-xl bg-surface-container text-xs space-y-1 border border-outline-variant/60"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-on-surface">{r.subject}</span>
                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${
                              r.deliveryStatus === "sent"
                                ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-600 border border-red-500/20"
                            }`}>
                              {r.deliveryStatus}
                            </span>
                          </div>
                          <p className="text-[11px] text-on-surface-variant whitespace-pre-line leading-relaxed">
                            {r.body}
                          </p>
                          <div className="text-[10px] text-on-surface-variant/70 flex items-center gap-3 pt-1">
                            <span>Sent: {format(new Date(r.createdAt), "MMM d, yyyy h:mm a")}</span>
                            {r.providerId && <span className="font-mono">ID: {r.providerId}</span>}
                            {r.errorMessage && <span className="text-red-600 font-semibold">{r.errorMessage}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Internal Team Notes Thread */}
              <div className="p-6 rounded-3xl bg-surface-container-lowest border border-outline-variant shadow-soft space-y-4">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-bold text-on-surface">Private Internal Notes</h3>
                  <span className="text-[10px] text-on-surface-variant ml-auto font-medium">
                    (Visible only to authenticated engineers & admins)
                  </span>
                </div>

                <form onSubmit={handleAddNote} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Add an internal note or action item..."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl bg-surface-container border border-outline-variant text-xs text-on-surface focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    type="submit"
                    disabled={submittingNote || !newNote.trim()}
                    className="h-9 px-4 rounded-xl bg-surface-container hover:bg-surface-container-high border border-outline-variant text-xs font-bold text-on-surface transition-colors disabled:opacity-50"
                  >
                    {submittingNote ? "Saving..." : "Add Note"}
                  </button>
                </form>

                {selectedInquiry.notes && selectedInquiry.notes.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    {selectedInquiry.notes.map((note) => (
                      <div
                        key={note.id}
                        className="p-3 rounded-xl bg-surface-container text-xs space-y-1 border border-outline-variant/60"
                      >
                        <div className="flex items-center justify-between text-[10px] text-on-surface-variant">
                          <span className="font-bold text-on-surface">{note.authorName}</span>
                          <span>{formatDistanceToNow(new Date(note.createdAt), { addSuffix: true })}</span>
                        </div>
                        <p className="text-xs text-on-surface leading-relaxed">{note.content}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-on-surface-variant italic pt-1">
                    No internal notes yet. Use the field above to record follow-up tasks or client details.
                  </p>
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </div>
  );
}
