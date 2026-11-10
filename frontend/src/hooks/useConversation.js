import { useCallback, useEffect, useRef, useState } from "react";
import api from "../services/api";

const CLOSED_STATUSES = ["COMPLETED", "CLOSED", "CANCELLED", "REJECTED"];
const POLL_INTERVAL_MS = 8000;

function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
        return {};
    }
}

function extractErrorMessage(err, fallback) {
    const data = err?.response?.data;

    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
        if (data.message) return String(data.message);
        if (data.error) return String(data.error);
    }
    if (err?.message) return err.message;

    return fallback;
}

/**
 * Shared conversation logic for the customer <-> mechanic chat screens.
 *
 * @param {string|number} requestId
 * @param {"customer"|"mechanic"} role - who is viewing the conversation.
 *   Determines which field on the request is used as the message receiver.
 */
export default function useConversation(requestId, role) {
    const currentUser = getCurrentUser();
    const currentUserId = Number(currentUser.id);

    const [messages, setMessages] = useState([]);
    const [request, setRequest] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const mountedRef = useRef(true);
    const pollRef = useRef(null);
    const requestSeqRef = useRef(0);
    const messagesRef = useRef(messages);
    messagesRef.current = messages;

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, []);

    const status = String(request?.status || "").toUpperCase();
    const messagingClosed = CLOSED_STATUSES.includes(status);

    // NOTE: adjust the mechanic-side field name below if your API calls it
    // something other than `customerUserId` / `customerId`. Check the
    // request-details response shape to confirm.
    const receiverId =
        role === "customer"
            ? Number(request?.mechanicUserId)
            : Number(request?.customerUserId ?? request?.customerId);

    const fetchConversation = useCallback(
        async ({ showSpinner = false } = {}) => {
            if (!currentUserId || !requestId) {
                setError("User or request information is missing.");
                setLoading(false);
                return;
            }

            const seq = ++requestSeqRef.current;

            if (showSpinner) setLoading(true);

            try {
                const requestResponse = await api.get(
                    `/requests/${requestId}/${role === "mechanic" ? "mechanic-details" : "details"}`
                );

                if (!mountedRef.current || seq !== requestSeqRef.current) return;

                setRequest(requestResponse.data);

                const messagesResponse = await api.get(
                    `/messages/request/${requestId}`,
                    { params: { userId: currentUserId } }
                );

                if (!mountedRef.current || seq !== requestSeqRef.current) return;

                // Keep any not-yet-confirmed (pending/failed) optimistic
                // bubbles that a background refresh wouldn't know about yet.
                const server = messagesResponse.data || [];
                const stillPending = messagesRef.current.filter(
                    (m) => m.pending || m.failed
                );

                setMessages([...server, ...stillPending]);
                setError("");

                // Best-effort read receipt; don't block the UI if it fails.
                api.put(`/messages/request/${requestId}/read`, null, {
                    params: { userId: currentUserId },
                }).catch(() => {});
            } catch (err) {
                if (!mountedRef.current || seq !== requestSeqRef.current) return;
                console.error("Failed to load conversation:", err);
                setError(extractErrorMessage(err, "Unable to load conversation."));
            } finally {
                if (mountedRef.current && seq === requestSeqRef.current) {
                    setLoading(false);
                }
            }
        },
        [requestId, currentUserId]
    );

    // Initial load (runs exactly once per requestId/user, no duplicates).
    useEffect(() => {
        fetchConversation({ showSpinner: true });
    }, [fetchConversation]);

    // Background polling so new messages and status changes (e.g. the
    // request being completed elsewhere) show up without a manual refresh.
    // Automatically stops as soon as messaging is closed.
    useEffect(() => {
        if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }

        if (!requestId || !currentUserId || messagingClosed) return;

        pollRef.current = setInterval(() => {
            fetchConversation({ showSpinner: false });
        }, POLL_INTERVAL_MS);

        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [requestId, currentUserId, messagingClosed, fetchConversation]);

    // Shared by first-send and retry: posts one message's content under an
    // existing optimistic bubble id, and reconciles success/failure onto it.
    const deliver = useCallback(
        async (trimmed, optimisticId) => {
            try {
                const response = await api.post(
                    `/messages/request/${requestId}`,
                    { content: trimmed },
                    { params: { senderId: currentUserId, receiverId } }
                );

                const sentMessage = response.data;

                if (mountedRef.current) {
                    setMessages((prev) =>
                        prev.map((m) =>
                            m.id === optimisticId
                                ? sentMessage
                                : m
                        )
                    );
                }

                await fetchConversation({ showSpinner: false });
            } catch (err) {
                console.error("Failed to send message:", err);
                if (!mountedRef.current) return;
                setMessages((prev) =>
                    prev.map((m) =>
                        m.id === optimisticId
                            ? { ...m, pending: false, failed: true }
                            : m
                    )
                );
                setError(
                    extractErrorMessage(
                        err,
                        "Unable to send message. Tap the message to try again."
                    )
                );
            } finally {
                if (mountedRef.current) setSending(false);
            }
        },
        [requestId, currentUserId, receiverId, fetchConversation]
    );

    const handleSendMessage = async (event) => {
        event?.preventDefault?.();

        if (messagingClosed) {
            setError("Messaging is closed for this request.");
            return;
        }

        const trimmed = message.trim();

        if (!trimmed) {
            setError("Message cannot be empty.");
            return;
        }

        if (!currentUserId || !receiverId || !requestId) {
            setError(
                "Sender, receiver, or request ID is missing. Please refresh and try again."
            );
            return;
        }

        const optimisticId = `temp-${Date.now()}`;
        const optimisticMessage = {
            id: optimisticId,
            senderId: currentUserId,
            receiverId,
            content: trimmed,
            createdAt: new Date().toISOString(),
            pending: true,
            failed: false,
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setMessage("");
        setSending(true);
        setError("");

        await deliver(trimmed, optimisticId);
    };

    // Resend a bubble that previously failed, without the person having to
    // retype it.
    const retryMessage = useCallback(
        async (id) => {
            if (messagingClosed) return;

            const target = messagesRef.current.find((m) => m.id === id);
            if (!target) return;

            setMessages((prev) =>
                prev.map((m) =>
                    m.id === id ? { ...m, pending: true, failed: false } : m
                )
            );
            setSending(true);
            setError("");

            await deliver(target.content, id);
        },
        [messagingClosed, deliver]
    );

    return {
        currentUserId,
        messages,
        request,
        message,
        setMessage,
        loading,
        sending,
        error,
        setError,
        messagingClosed,
        status,
        handleSendMessage,
        retryMessage,
        reload: () => fetchConversation({ showSpinner: true }),
    };
}