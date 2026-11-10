package com.roadaid.backend.controller;

import com.roadaid.backend.dto.ConversationSummaryResponse;
import com.roadaid.backend.entity.Message;
import com.roadaid.backend.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.roadaid.backend.dto.MessageResponse;
import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
@CrossOrigin
public class MessageController {

    private final MessageService messageService;
    @GetMapping("/conversations")
    public ResponseEntity<List<ConversationSummaryResponse>> getMyConversations() {

        return ResponseEntity.ok(
                messageService.getMyConversations()
        );
    }
    @GetMapping("/request/{requestId}")
    public ResponseEntity<?> getMessages(
            @PathVariable Long requestId,
            @RequestParam Integer userId) {

        try {
            System.out.println("Loading messages...");
            System.out.println("Request ID: " + requestId);
            System.out.println("User ID: " + userId);

            return ResponseEntity.ok(
                    messageService.getMessages(
                            requestId,
                            userId
                    )
            );

        } catch (Exception e) {

            e.printStackTrace();

            return ResponseEntity
                    .status(500)
                    .body(
                            "Message loading error: "
                                    + e.getClass().getSimpleName()
                                    + " - "
                                    + e.getMessage()
                    );
        }
    }

    @PostMapping("/request/{requestId}")
    public ResponseEntity<Message> sendMessage(
            @PathVariable Long requestId,
            @RequestParam Integer senderId,
            @RequestParam Integer receiverId,
            @RequestBody SendMessageRequest messageRequest) {

        return ResponseEntity.ok(
                messageService.sendMessage(
                        requestId,
                        senderId,
                        receiverId,
                        messageRequest.getContent()
                )
        );
    }

    @PutMapping("/request/{requestId}/read")
    public ResponseEntity<Void> markMessagesAsRead(
            @PathVariable Long requestId,
            @RequestParam Integer userId) {

        messageService.markMessagesAsRead(
                requestId,
                userId
        );

        return ResponseEntity.ok().build();
    }

    public static class SendMessageRequest {

        private String content;

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}