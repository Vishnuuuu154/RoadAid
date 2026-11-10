package com.roadaid.backend.dto;

import java.time.LocalDateTime;

public class ConversationSummaryResponse {

    private Long requestId;
    private Integer otherUserId;
    private String otherUserName;
    private String otherUserProfileImage;
    private String lastMessage;
    private LocalDateTime lastMessageAt;
    private long unreadCount;
    private String requestStatus;

    public ConversationSummaryResponse() {
    }

    public ConversationSummaryResponse(
            Long requestId,
            Integer otherUserId,
            String otherUserName,
            String otherUserProfileImage,
            String lastMessage,
            LocalDateTime lastMessageAt,
            long unreadCount,
            String requestStatus
    ) {
        this.requestId = requestId;
        this.otherUserId = otherUserId;
        this.otherUserName = otherUserName;
        this.otherUserProfileImage = otherUserProfileImage;
        this.lastMessage = lastMessage;
        this.lastMessageAt = lastMessageAt;
        this.unreadCount = unreadCount;
        this.requestStatus = requestStatus;
    }

    public Long getRequestId() {
        return requestId;
    }

    public Integer getOtherUserId() {
        return otherUserId;
    }

    public String getOtherUserName() {
        return otherUserName;
    }

    public String getOtherUserProfileImage() {
        return otherUserProfileImage;
    }

    public String getLastMessage() {
        return lastMessage;
    }

    public LocalDateTime getLastMessageAt() {
        return lastMessageAt;
    }

    public long getUnreadCount() {
        return unreadCount;
    }

    public String getRequestStatus() {
        return requestStatus;
    }
}