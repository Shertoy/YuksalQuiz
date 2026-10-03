import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { triggerHaptic } from '../utils/telegram';
import { isAnnouncementForUser, formatDateTime } from '../utils/announcements';

interface NotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ isOpen, onClose }) => {
  const {
    profile,
    announcements,
    announcementReplies,
    addAnnouncementReply,
    markAnnouncementsAsRead,
  } = useQuizStore();

  // Reply inputs per announcement ID
  const [replyTexts, setReplyTexts] = useState<Record<string, string>>({});
  const [activeReplyAnnId, setActiveReplyAnnId] = useState<string | null>(null);
  const [sentFeedback, setSentFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      markAnnouncementsAsRead();
    }
  }, [isOpen, markAnnouncementsAsRead]);

  if (!isOpen) return null;

  // Filter announcements for current user
  const userAnnouncements = (announcements || []).filter((item) =>
    isAnnouncementForUser(item, profile)
  );

  const handleSendReply = (announcementId: string) => {
    const text = (replyTexts[announcementId] || '').trim();
    if (!text) return;

    addAnnouncementReply(announcementId, text);
    setReplyTexts((prev) => ({ ...prev, [announcementId]: '' }));
    setActiveReplyAnnId(null);
    setSentFeedback("Xabaringiz adminga yuborildi! Tez orada javob qaytariladi.");
    setTimeout(() => setSentFeedback(null), 4000);
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
      <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full max-h-[88vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center">
              <Bell className="w-5 h-5" strokeWidth={1.75} />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Bildirishnomalar</span>
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
                  {userAnnouncements.length} ta
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Yangiliklar, xabarlar va admin bilan muloqot
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic('light');
              onClose();
            }}
            className="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>

        {/* Global Feedback Banner */}
        {sentFeedback && (
          <div className="mx-4 mt-3 p-2.5 rounded-xl bg-emerald-500 text-white text-xs font-bold shadow-md flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" strokeWidth={1.75} />
            <span>{sentFeedback}</span>
          </div>
        )}

        {/* Announcements List */}
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
            userAnnouncements.map((item) => {
              // User's own replies to this announcement
              const userReplies = (announcementReplies || []).filter(
                (r) => r.announcementId === item.id && r.userId === profile.id
              );
              const isReplying = activeReplyAnnId === item.id;
              const currentReplyText = replyTexts[item.id] || '';

              return (
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

                      {/* Target badge */}
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-200/80 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                        {getTargetIcon(item.targetType)}
                        <span>{item.targetLabel || 'Barchaga'}</span>
                      </span>
                    </div>

                    {/* Date and Time Display */}
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
                  </div>

                  {/* User Discussion / Thread (if any) */}
                  {userReplies.length > 0 && (
                    <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2">
                      <div className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-emerald-500" strokeWidth={1.75} />
                        <span>Sizning yozishmalaringiz ({userReplies.length}):</span>
                      </div>

                      {userReplies.map((reply) => (
                        <div key={reply.id} className="space-y-1.5">
                          {/* User's Message Bubble */}
                          <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 text-xs">
                            <div className="flex items-center justify-between text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                              <span>Siz ({reply.userName})</span>
                              <span>{formatDateTime(reply.date, reply.time)}</span>
                            </div>
                            <p className="text-slate-800 dark:text-slate-200 font-medium">
                              {reply.message}
                            </p>
                          </div>

                          {/* Admin's Response Bubble (if answered) */}
                          {reply.adminReply ? (
                            <div className="ml-3 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs animate-in fade-in">
                              <div className="flex items-center justify-between text-[9px] text-emerald-600 dark:text-emerald-400 font-bold mb-1">
                                <span className="flex items-center gap-1">
                                  <ShieldCheck className="w-3 h-3" strokeWidth={1.75} />
                                  <span>{reply.adminReply.adminName || 'Admin'} javobi:</span>
                                </span>
                                <span>{formatDateTime(reply.adminReply.date, reply.adminReply.time)}</span>
                              </div>
                              <p className="text-emerald-950 dark:text-emerald-100 font-semibold">
                                {reply.adminReply.message}
                              </p>
                            </div>
                          ) : (
                            <div className="ml-3 text-[10px] text-amber-500 font-medium flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" strokeWidth={1.75} />
                              <span>Admin javobi kutilmoqda...</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Interactive Reply Input / Action */}
                  <div className="pt-1">
                    {!isReplying ? (
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setActiveReplyAnnId(item.id);
                        }}
                        className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 flex items-center gap-1.5 transition-colors py-1"
                      >
                        <MessageSquare className="w-3.5 h-3.5" strokeWidth={1.75} />
                        <span>Javob yozish / Savol berish</span>
                      </button>
                    ) : (
                      <div className="space-y-1.5 animate-in fade-in">
                        <textarea
                          rows={2}
                          value={currentReplyText}
                          onChange={(e) =>
                            setReplyTexts((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
                          placeholder="Savolingiz yoki fikringizni yozing..."
                          className="w-full px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 resize-none"
                        />
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setActiveReplyAnnId(null)}
                            className="px-2.5 py-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 text-[11px] font-bold"
                          >
                            Bekor qilish
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSendReply(item.id)}
                            disabled={!currentReplyText.trim()}
                            className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-[11px] flex items-center gap-1 transition-all"
                          >
                            <Send className="w-3 h-3" strokeWidth={1.75} />
                            <span>Yuborish</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800 text-right">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs"
          >
            Yopish
          </button>
        </div>
      </div>
    </div>
  );
};
