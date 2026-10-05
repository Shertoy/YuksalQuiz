import React, { useState, useEffect, useRef } from 'react';
import { useQuizStore } from '../store/useQuizStore';
import {
  Bell,
  X,
  Calendar,
  Clock,
  Send,
  MessageSquare,
  ShieldCheck,
  CheckCircle2,
  Users,
  Building2,
  MapPin,
  User,
  ExternalLink,
  Sparkles,
  Bot,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { isAnnouncementForUser, formatDateTime } from '../utils/announcements';
import { SupportMessage } from '../types';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_SUGGESTIONS = [
  "Test qanday yaratiladi?",
  "20 000 so'm vaucher qanday ishlaydi?",
  "Reyting ballari qanday hisoblanadi?",
  "To'lov kvitansiyasini qanday yuklayman?",
];

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const {
    profile,
    announcements,
    markAnnouncementsAsRead,
  } = useQuizStore();

  const [activeTab, setActiveTab] = useState<'announcements' | 'support'>('announcements');

  // Support Chat State
  const [chatMessages, setChatMessages] = useState<SupportMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch chat history
  const fetchChatHistory = async () => {
    if (!profile?.id) return;
    setIsLoadingHistory(true);
    setChatError(null);
    try {
      const res = await fetch(`/api/support-chat?userId=${encodeURIComponent(profile.id)}`);
      const data = await res.json();
      if (data.ok && Array.isArray(data.messages)) {
        setChatMessages(data.messages);
      }
    } catch (err: any) {
      console.warn('Chat history fetch error:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      markAnnouncementsAsRead();
      fetchChatHistory();
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTab === 'support') {
      scrollToBottom();
    }
  }, [activeTab, chatMessages, isSending]);

  if (!isOpen) return null;

  // Filter announcements for current user
  const userAnnouncements = (announcements || []).filter((item) =>
    isAnnouncementForUser(item, profile)
  );

  const handleSendQuestion = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isSending) return;

    triggerHaptic('medium');
    setInputMessage('');
    setIsSending(true);
    setChatError(null);

    // Optimistic user bubble
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: SupportMessage = {
      id: tempId,
      user_id: profile.id || 'guest',
      user_name: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Talaba',
      user_username: profile.username || '',
      message: text,
      sender: 'user',
      status: 'resolved_by_ai',
      created_at: new Date().toISOString(),
    };

    setChatMessages((prev) => [...prev, optimisticMsg]);

    try {
      const res = await fetch('/api/support-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          userName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Talaba',
          userUsername: profile.username || '',
          message: text,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        triggerHaptic('success');
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: data.messageId || m.id,
                  reply: data.reply,
                  status: data.status,
                  created_at: data.created_at || m.created_at,
                }
              : m
          )
        );
      } else {
        setChatError(data.error || "Xatolik yuz berdi");
      }
    } catch (err: any) {
      setChatError("Tarmoq xatosi. Iltimos qaytadan urinib ko'ring.");
    } finally {
      setIsSending(false);
    }
  };

  const getTargetIcon = (type?: string) => {
    switch (type) {
      case 'university':
        return <Building2 className="w-2.5 h-2.5" />;
      case 'region':
        return <MapPin className="w-2.5 h-2.5" />;
      case 'user':
        return <User className="w-2.5 h-2.5" />;
      case 'all':
      default:
        return <Users className="w-2.5 h-2.5" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full h-[88vh] max-h-[700px] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              {activeTab === 'announcements' ? (
                <Bell className="w-5 h-5" strokeWidth={1.75} />
              ) : (
                <Bot className="w-5 h-5 text-emerald-500" strokeWidth={1.75} />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>{activeTab === 'announcements' ? 'Bildirishnomalar' : 'AI Yordam & Maslahatchi'}</span>
                {activeTab === 'support' && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                )}
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {activeTab === 'announcements'
                  ? 'Yangiliklar va rasmiy xabarlar'
                  : 'Savol bering, AI va Admin doimiy yordamda'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {activeTab === 'support' && (
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('light');
                  fetchChatHistory();
                }}
                disabled={isLoadingHistory}
                className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center justify-center leading-none"
                title="Yangilash"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHistory ? 'animate-spin' : ''}`} strokeWidth={1.75} />
              </button>
            )}

            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center leading-none"
            >
              <X className="w-4 h-4" strokeWidth={1.75} />
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="p-2 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-2xl text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('announcements');
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center leading-none gap-1.5 ${
                activeTab === 'announcements'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Bell className="w-3.5 h-3.5" />
              <span>E'lonlar ({userAnnouncements.length})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                triggerHaptic('selection');
                setActiveTab('support');
              }}
              className={`py-2 rounded-xl transition-all flex items-center justify-center leading-none gap-1.5 ${
                activeTab === 'support'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Yordam & Savol</span>
            </button>
          </div>
        </div>

        {/* Content Container */}
        {activeTab === 'announcements' ? (
          /* Announcements List */
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
            {(!userAnnouncements || userAnnouncements.length === 0) ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" strokeWidth={1.75} />
                <p className="font-bold">Hozircha siz uchun bildirishnomalar yo'q</p>
                <p className="text-[11px] mt-0.5 text-slate-400">
                  Yangi xabar yoki yangiliklar shu yerda aks etadi.
                </p>
              </div>
            ) : (
              userAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5 transition-all hover:border-emerald-300 dark:hover:border-emerald-700"
                >
                  {/* Top Bar: Tag, Target & Date/Time */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                          item.tag === 'muhim'
                            ? 'bg-orange-100 dark:bg-orange-950 text-orange-600 dark:text-orange-400'
                            : item.tag === 'eslatma'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400'
                            : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        {item.tag || 'yangilik'}
                      </span>

                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        {getTargetIcon(item.targetType)}
                        <span>{item.targetLabel || 'Barchaga'}</span>
                      </span>
                    </div>

                    <div className="text-[10px] text-slate-400 font-semibold flex items-center gap-1 shrink-0">
                      <Calendar className="w-2.5 h-2.5" strokeWidth={1.75} />
                      <span>{item.date}</span>
                      {item.time && (
                        <>
                          <span className="opacity-40">•</span>
                          <Clock className="w-2.5 h-2.5 ml-0.5" strokeWidth={1.75} />
                          <span>{item.time}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title & Body */}
                  <div>
                    <h4 className="font-extrabold text-xs text-slate-900 dark:text-white mb-1">
                      {item.title}
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {item.message}
                    </p>
                    {item.link && (
                      <div className="pt-2">
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-200 dark:border-emerald-800 transition-colors shadow-2xs"
                        >
                          <ExternalLink className="w-3.5 h-3.5" strokeWidth={1.75} />
                          <span>Havolani ochish</span>
                        </a>
                      </div>
                    )}
                  </div>

                  {/* Action Button: Opens Support Chat */}
                  <div className="pt-1 border-t border-slate-200/50 dark:border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setActiveTab('support');
                        setInputMessage(`"${item.title}" haqida savolim bor edi: `);
                      }}
                      className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1.5 transition-colors py-1"
                    >
                      <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                      <span>Javob yozish / Savol berish</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          /* Hybrid AI-Admin Support Chat View */
          <div className="flex-1 flex flex-col min-h-0 bg-slate-50/50 dark:bg-slate-950/40">
            {/* Chat Messages Scrollable Box */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {/* Introduction Card */}
              <div className="p-3.5 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-950 text-emerald-300 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-5 h-5 text-emerald-400" />
                </div>
                <div className="text-xs space-y-1">
                  <h4 className="font-extrabold text-slate-900 dark:text-white">
                    Yuksal Quiz AI Maslahatchisi
                  </h4>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    Ilova, testlar, vaucher va reyting bo'yicha savollarga sun'iy intellekt darhol javob beradi. To'lov yoki ma'muriy masalalar esa to'g'ridan-to'g'ri administratorga yo'naltiriladi.
                  </p>
                </div>
              </div>

              {/* Suggestions chips when chat has few messages */}
              {chatMessages.length === 0 && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
                    Tezkor savollar:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {QUICK_SUGGESTIONS.map((sug, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          handleSendQuestion(sug);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-200 font-semibold text-[11px] transition-all text-left active:scale-95 shadow-2xs"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Error banner */}
              {chatError && (
                <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-300 text-xs font-semibold">
                  {chatError}
                </div>
              )}

              {/* Render History Messages */}
              {chatMessages.map((msg) => (
                <div key={msg.id} className="space-y-2">
                  {/* User message bubble */}
                  <div className="flex justify-end">
                    <div className="max-w-[85%] p-3 rounded-2xl rounded-tr-xs bg-emerald-600 text-white text-xs shadow-sm space-y-1">
                      <p className="whitespace-pre-wrap leading-relaxed font-medium">{msg.message}</p>
                      <div className="text-[9px] text-emerald-100 text-right opacity-80">
                        {new Date(msg.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>

                  {/* AI or Admin reply bubble */}
                  {msg.reply && (
                    <div className="flex justify-start">
                      <div className="max-w-[88%] p-3 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs shadow-sm border border-slate-200/80 dark:border-slate-700/80 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700 pb-1.5">
                          <span className="flex items-center gap-1 font-bold text-[10px]">
                            {msg.status === 'replied_by_admin' || msg.sender === 'admin' ? (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                                <span className="text-blue-600 dark:text-blue-400">Administrator javobi</span>
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                                <span className="text-emerald-600 dark:text-emerald-400">AI Maslahatchi</span>
                              </>
                            )}
                          </span>

                          {msg.status === 'forwarded_to_admin' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 text-[9px] font-bold flex items-center gap-1 border border-amber-200/60 dark:border-amber-800/60">
                              <Clock className="w-2.5 h-2.5" />
                              <span>Adminga yo'naltirildi</span>
                            </span>
                          )}
                        </div>

                        <p className="whitespace-pre-wrap leading-relaxed text-slate-800 dark:text-slate-200 font-medium">
                          {msg.reply}
                        </p>

                        <div className="text-[9px] text-slate-400 text-right font-medium">
                          {new Date(msg.created_at).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isSending && (
                <div className="flex items-start gap-2 max-w-[85%] animate-in fade-in">
                  <div className="w-7 h-7 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl rounded-tl-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shadow-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 ml-1">
                      AI maslahatchi tahlil qilmoqda...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Area */}
            <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0 space-y-1.5">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuestion();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Savol yoki muammoingizni yozing..."
                  disabled={isSending}
                  className="flex-1 px-3.5 py-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />

                <button
                  type="submit"
                  disabled={!inputMessage.trim() || isSending}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center leading-none gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95 shrink-0"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Yuborish</span>
                </button>
              </form>

              <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center">
                💡 To'lov va ma'muriy masalalar avtomatik adminga yo'naltiriladi.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-right shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center justify-center leading-none ml-auto"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
