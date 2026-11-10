package com.roadaid.backend.dto;

import com.roadaid.backend.entity.Message;
import lombok.Getter;

import java.time.LocalDateTime;

@Getter
public class MessageResponse {

    private final Long id;
    private final Integer senderId;
    private final Integer receiverId;
    private final String content;
    private final Boolean isRead;
    private final LocalDateTime createdAt;

    public MessageResponse(Message message) {
        this.id = message.getId();
        this.senderId = message.getSender().getId();
        this.receiverId = message.getReceiver().getId();
        this.content = message.getContent();
        this.isRead = message.getIsRead();
        this.createdAt = message.getCreatedAt();
    }
}