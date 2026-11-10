import { useEffect, useMemo, useRef, useState } from "react";
import {
    FaChevronLeft,
    FaChevronDown,
    FaPaperPlane,
    FaRedoAlt,
    FaExclamationCircle,
    FaCheck,
    FaCheckDouble,
    FaCommentDots,
    FaLock,
} from "react-icons/fa";
import "../../styles/Communication.css";

const MAX_MESSAGE_LENGTH = 1000;
const WARN_AT = MAX_MESSAGE_LENGTH - 120; // only show the counter once it's actually useful
const GROUP_GAP_MS = 5 * 60 * 1000; // consecutive messages from the same sender within 5 min are grouped
const NEAR_BOTTOM_PX = 96;

const DEFAULT_ICON = { mechanic: "🔧", customer: "🚗" };

const DEFAULT_EMPTY_COPY = {
    mechanic: "No messages yet. Say hello and confirm the job details with your customer.",
    customer: "No messages yet. Say hello and describe the issue so your mechanic can prep.",
};

function formatTime(date) {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("en-IN", {
        hour: "numeric",
        minute: "2-digit",
    });
}

function formatDateLabel(date) {
    if (!date) return "";

    const d = new Date(date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const isSameDay = (a, b) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

    if (isSameDay(d, today)) return "Today";
    if (isSameDay(d, yesterday)) return "Yesterday";

    return d.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
    });
}

function initials(name) {
    if (!name) return "?";
    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");
}

/**
 * Shared chat UI for the customer <-> mechanic conversation. All the actual
 * data fetching/sending lives in useConversation(); this component is
 * presentation + local interaction (scrolling, grouping, quick replies)
 * only, so it can be reused unchanged from either side.
 *
 * @param {"mechanic"|"customer"} variant - controls the accent colour, the
 *   default avatar glyph, and the empty-state copy.
 * @param {string[]} quickReplies - optional canned phrases shown as tappable
 *   chips above the composer; tapping one inserts it into the draft rather
 *   than sending immediately, so it can still be edited.
 * @param {(id: string|number) => void} onRetryMessage - called when the
 *   person taps a failed message to resend it.
 */
export default function ChatWindow({
                                       variant = "customer",
                                       icon,
                                       title,
                                       subtitleName,
                                       subtitleFallback,
                                       requestRef,
                                       backLabel = "Back",
                                       onBack,
                                       loading,
                                       error,
                                       onDismissError,
                                       messages,
                                       currentUserId,
                                       sending,
                                       message,
                                       setMessage,
                                       onSubmit,
                                       onRetryMessage,
                                       messagingClosed,
                                       status,
                                       quickReplies = [],
                                   }) {
    const scrollRef = useRef(null);
    const textareaRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const prevCountRef = useRef(messages.length);

    const [showJump, setShowJump] = useState(false);
    const [newCount, setNewCount] = useState(0);

    const resolvedIcon = icon || DEFAULT_ICON[variant] || "💬";
    const displayName = subtitleName || subtitleFallback || "Conversation";

    const handleScroll = () => {
        const el = scrollRef.current;
        if (!el) return;
        const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const near = distanceFromBottom < NEAR_BOTTOM_PX;
        isNearBottomRef.current = near;
        setShowJump(!near && messages.length > 0);
        if (near) setNewCount(0);
    };

    useEffect(() => {
        const grew = messages.length - prevCountRef.current;

        if (scrollRef.current && isNearBottomRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        } else if (grew > 0) {
            setNewCount((c) => c + grew);
            setShowJump(true);
        }

        prevCountRef.current = messages.length;
    }, [messages]);

    // Land on the latest message when the conversation first appears.
    useEffect(() => {
        if (!loading && scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [loading]);

    useEffect(() => {
        const el = textareaRef.current;
        if (!el) return;
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }, [message]);

    const grouped = useMemo(() => {
        const groups = [];
        let lastDateKey = null;
        let lastSender = null;
        let lastTime = 0;

        messages.forEach((item) => {
            const dateKey = item.createdAt
                ? new Date(item.createdAt).toDateString()
                : "unknown";
            const t = item.createdAt ? new Date(item.createdAt).getTime() : 0;

            if (dateKey !== lastDateKey) {
                groups.push({
                    type: "date",
                    key: `d-${dateKey}-${groups.length}`,
                    label: formatDateLabel(item.createdAt),
                });
                lastDateKey = dateKey;
                lastSender = null;
            }

            const sameSender = String(item.senderId) === String(lastSender);
            const closeInTime = t - lastTime < GROUP_GAP_MS;

            groups.push({
                type: "message",
                key: item.id,
                item,
                isFirstInGroup: !(sameSender && closeInTime),
            });

            lastSender = item.senderId;
            lastTime = t;
        });

        return groups;
    }, [messages]);

    const jumpToBottom = () => {
        const el = scrollRef.current;
        if (el) el.scrollTop = el.scrollHeight;
        setShowJump(false);
        setNewCount(0);
    };

    const handleKeyDown = (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            if (!sending && !messagingClosed && message.trim()) onSubmit(event);
        }
    };

    const applyQuickReply = (text) => {
        setMessage((prev) => (prev && prev.trim() ? `${prev.trim()} ${text}` : text));
        textareaRef.current?.focus();
    };

    if (loading) {
        return (
            <div className="cw cw-loading" data-variant={variant}>
                <div className="cw-spinner" role="status" aria-label="Loading conversation" />
                <p>Loading conversation…</p>
            </div>
        );
    }

    const nearLimit = message.length >= WARN_AT;

    return (
        <div className="cw" data-variant={variant}>
            <div className="cw-card" role="region" aria-label={title || "Conversation"}>
                <header className="cw-header">
                    <div className="cw-header-id">
                        {onBack && (
                            <button type="button" className="cw-back" onClick={onBack} aria-label={backLabel}>
                                <FaChevronLeft aria-hidden="true" />
                                <span>{backLabel}</span>
                            </button>
                        )}

                        <span className="cw-avatar" aria-hidden="true">
                            {subtitleName ? initials(subtitleName) : resolvedIcon}
                        </span>

                        <div className="cw-header-text">
                            <h2 className="cw-name">{displayName}</h2>
                            <p className="cw-sub">
                                {title && <span>{title}</span>}
                                {title && requestRef && <span className="cw-dot" aria-hidden="true" />}
                                {requestRef && <span>{requestRef}</span>}
                            </p>
                        </div>
                    </div>

                    <span className={`cw-status ${messagingClosed ? "is-closed" : "is-active"}`}>
                        {messagingClosed ? String(status || "Closed").replace(/_/g, " ").toLowerCase() : "Active"}
                    </span>
                </header>

                {error && (
                    <div className="cw-alert" role="alert">
                        <FaExclamationCircle aria-hidden="true" />
                        <span>{error}</span>
                        {onDismissError && (
                            <button type="button" className="cw-alert-x" aria-label="Dismiss" onClick={onDismissError}>
                                ×
                            </button>
                        )}
                    </div>
                )}

                <div className="cw-body">
                    <div className="cw-scroll" ref={scrollRef} onScroll={handleScroll} aria-live="polite">
                        {messages.length === 0 ? (
                            <div className="cw-empty">
                                <span className="cw-empty-icon" aria-hidden="true">
                                    <FaCommentDots />
                                </span>
                                <p>{DEFAULT_EMPTY_COPY[variant] || "No messages yet. Start the conversation."}</p>
                            </div>
                        ) : (
                            grouped.map((entry) => {
                                if (entry.type === "date") {
                                    return (
                                        <div key={entry.key} className="cw-date">
                                            <span>{entry.label}</span>
                                        </div>
                                    );
                                }

                                const item = entry.item;
                                const isMine = Number(item.senderId) === currentUserId;

                                return (
                                    <div
                                        key={entry.key}
                                        className={[
                                            "cw-row",
                                            isMine ? "cw-row-mine" : "cw-row-theirs",
                                            entry.isFirstInGroup ? "cw-row-first" : "",
                                        ].join(" ").trim()}
                                    >
                                        <div
                                            className={[
                                                "cw-bubble",
                                                isMine ? "cw-bubble-mine" : "cw-bubble-theirs",
                                                item.pending ? "is-pending" : "",
                                                item.failed ? "is-failed" : "",
                                            ].join(" ").trim()}
                                        >
                                            <div className="cw-bubble-text">{item.content}</div>

                                            {item.failed ? (
                                                <button type="button" className="cw-retry" onClick={() => onRetryMessage?.(item.id)}>
                                                    <FaRedoAlt aria-hidden="true" />
                                                    Not sent. Tap to retry
                                                </button>
                                            ) : (
                                                <div className="cw-meta">
                                                    <span>{item.pending ? "Sending…" : formatTime(item.createdAt)}</span>
                                                    {isMine && !item.pending && (
                                                        <span className="cw-tick" aria-label={item.read ? "Read" : "Sent"}>
                                                            {item.read ? (
                                                                <FaCheckDouble className="is-read" aria-hidden="true" />
                                                            ) : (
                                                                <FaCheck aria-hidden="true" />
                                                            )}
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {showJump && (
                        <button type="button" className="cw-jump" onClick={jumpToBottom} aria-label="Jump to latest message">
                            <FaChevronDown aria-hidden="true" />
                            {newCount > 0 && <span className="cw-jump-badge">{newCount}</span>}
                        </button>
                    )}
                </div>

                <footer className="cw-footer">
                    {messagingClosed ? (
                        <div className="cw-closed">
                            <FaLock aria-hidden="true" />
                            Messaging is closed because this request is {String(status || "closed").replace(/_/g, " ").toLowerCase()}.
                        </div>
                    ) : (
                        <>
                            {quickReplies.length > 0 && (
                                <div className="cw-quick" role="group" aria-label="Quick replies">
                                    {quickReplies.map((text) => (
                                        <button key={text} type="button" className="cw-chip" onClick={() => applyQuickReply(text)}>
                                            {text}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <form onSubmit={onSubmit} className="cw-composer">
                                <textarea
                                    ref={textareaRef}
                                    rows={1}
                                    className="cw-input"
                                    placeholder="Write a message…"
                                    aria-label="Message"
                                    value={message}
                                    maxLength={MAX_MESSAGE_LENGTH}
                                    onChange={(e) => setMessage(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    disabled={sending}
                                />

                                <button type="submit" className="cw-send" disabled={sending || !message.trim()} aria-label="Send message">
                                    {sending ? <span className="cw-send-spin" aria-hidden="true" /> : <FaPaperPlane aria-hidden="true" />}
                                </button>
                            </form>

                            <div className="cw-hint">
                                <span className="cw-keys">Enter to send · Shift+Enter for a new line</span>
                                {nearLimit && (
                                    <span className={`cw-counter${message.length >= MAX_MESSAGE_LENGTH - 20 ? " is-near" : ""}`}>
                                        {message.length}/{MAX_MESSAGE_LENGTH}
                                    </span>
                                )}
                            </div>
                        </>
                    )}
                </footer>
            </div>
        </div>
    );
}