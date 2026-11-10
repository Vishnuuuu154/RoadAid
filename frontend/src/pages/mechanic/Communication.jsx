import { useNavigate, useLocation, useParams } from "react-router-dom";
import MechanicLayout from "../../layouts/MechanicLayout";
import ChatWindow from "../../components/communication/ChatWindow";
import useConversation from "../../hooks/useConversation";

const QUICK_REPLIES = [
    "On my way",
    "About 15 minutes away",
    "Job's done ✅",
    "Can you share your exact location?",
];

function Communication() {
    const { requestId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const {
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
    } = useConversation(requestId, "mechanic");

    // Go back to wherever the person came from (Messages, Notifications, the
    // request page...). Only when this chat was opened directly (a bookmark or
    // a fresh tab, so there's no earlier page of ours) fall back to the request.
    const handleBack = () => {
        if (location.key !== "default") {
            navigate(-1);
        } else {
            navigate(`/mechanic/requests/${requestId}`);
        }
    };

    return (
        <MechanicLayout>
            <ChatWindow
                variant="mechanic"
                title="Message Customer"
                subtitleName={request?.customerName}
                subtitleFallback="Customer"
                requestRef={`Request #${requestId}`}
                onBack={handleBack}
                loading={loading}
                error={error}
                onDismissError={() => setError("")}
                messages={messages}
                currentUserId={currentUserId}
                sending={sending}
                message={message}
                setMessage={setMessage}
                onSubmit={handleSendMessage}
                onRetryMessage={retryMessage}
                messagingClosed={messagingClosed}
                status={status}
                quickReplies={QUICK_REPLIES}
            />
        </MechanicLayout>
    );
}

export default Communication;