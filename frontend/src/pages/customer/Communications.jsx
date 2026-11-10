import { useNavigate, useLocation, useParams } from "react-router-dom";
import CustomerLayout from "../../layouts/CustomerLayout";
import ChatWindow from "../../components/communication/ChatWindow";
import useConversation from "../../hooks/useConversation";

const QUICK_REPLIES = [
    "Thanks, sounds good!",
    "How much longer?",
    "Can you call me?",
    "Here's my exact location",
];

function CustomerCommunication() {
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
    } = useConversation(requestId, "customer");

    // Go back to wherever the person came from (Messages, Notifications, the
    // request page...). Only when this chat was opened directly (a bookmark or
    // a fresh tab, so there's no earlier page of ours) fall back to the request.
    const handleBack = () => {
        if (location.key !== "default") {
            navigate(-1);
        } else {
            navigate(`/customer/requests/${requestId}`);
        }
    };

    return (
        <CustomerLayout>
            <ChatWindow
                variant="customer"
                title="Message Mechanic"
                subtitleName={request?.mechanicName}
                subtitleFallback="Assigned mechanic"
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
        </CustomerLayout>
    );
}

export default CustomerCommunication;