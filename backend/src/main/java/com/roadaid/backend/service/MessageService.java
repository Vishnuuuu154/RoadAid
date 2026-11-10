package com.roadaid.backend.service;

import com.roadaid.backend.entity.Message;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.repository.MessageRepository;
import com.roadaid.backend.repository.ServiceRequestRepository;
import com.roadaid.backend.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.roadaid.backend.dto.MessageResponse;
import com.roadaid.backend.dto.ConversationSummaryResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.List;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final UserRepository userRepository;
    @Transactional(readOnly = true)
    public List<ConversationSummaryResponse> getMyConversations() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        List<Message> messages =
                messageRepository.findBySenderOrReceiverOrderByCreatedAtDesc(
                        currentUser,
                        currentUser
                );

        Map<Long, ConversationSummaryResponse> conversations =
                new LinkedHashMap<>();

        Map<Long, Long> unreadCounts = new LinkedHashMap<>();

        for (Message message : messages) {

            Long requestId = message.getServiceRequest().getId();

            User otherUser;

            if (message.getSender().getId().equals(currentUser.getId())) {
                otherUser = message.getReceiver();
            } else {
                otherUser = message.getSender();
            }

            if (message.getReceiver().getId().equals(currentUser.getId())
                    && !Boolean.TRUE.equals(message.getIsRead())) {

                unreadCounts.put(
                        requestId,
                        unreadCounts.getOrDefault(requestId, 0L) + 1
                );
            }

            // Because messages are already sorted newest → oldest,
            // the first message we encounter is the latest message
            // for that conversation.
            if (!conversations.containsKey(requestId)) {

                conversations.put(
                        requestId,
                        new ConversationSummaryResponse(
                                requestId,
                                otherUser.getId(),
                                otherUser.getFullName(),
                                otherUser.getProfileImage(),
                                message.getContent(),
                                message.getCreatedAt(),
                                0,
                                message.getServiceRequest().getStatus()
                        )
                );
            }
        }

        List<ConversationSummaryResponse> result =
                new ArrayList<>(conversations.values());

        for (ConversationSummaryResponse conversation : result) {

            long unread =
                    unreadCounts.getOrDefault(
                            conversation.getRequestId(),
                            0L
                    );

            // Rebuild the object with the final unread count
            int index = result.indexOf(conversation);

            result.set(
                    index,
                    new ConversationSummaryResponse(
                            conversation.getRequestId(),
                            conversation.getOtherUserId(),
                            conversation.getOtherUserName(),
                            conversation.getOtherUserProfileImage(),
                            conversation.getLastMessage(),
                            conversation.getLastMessageAt(),
                            unread,
                            conversation.getRequestStatus()
                    )
            );
        }

        return result;
    }
    /*
     * Get all messages for a service request
     */
    @Transactional(readOnly = true)
    public List<MessageResponse> getMessages(
            Long requestId,
            Integer userId) {

        ServiceRequest request = serviceRequestRepository
                .findById(requestId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Request not found: " + requestId
                        ));

        User user = userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found: " + userId
                        ));

        validateParticipant(request, user);

        return messageRepository
                .findByServiceRequestOrderByCreatedAtAsc(request)
                .stream()
                .map(MessageResponse::new)
                .toList();
    }

    /*
     * Send a message
     */
    @Transactional
    public Message sendMessage(
            Long requestId,
            Integer senderId,
            Integer receiverId,
            String content) {

        if (content == null || content.trim().isEmpty()) {
            throw new RuntimeException("Message cannot be empty");
        }

        ServiceRequest request = serviceRequestRepository
                .findById(requestId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Request not found: " + requestId
                        ));
        if ("COMPLETED".equalsIgnoreCase(request.getStatus())
                || "CANCELLED".equalsIgnoreCase(request.getStatus())
                || "REJECTED".equalsIgnoreCase(request.getStatus())
                || "CLOSED".equalsIgnoreCase(request.getStatus())) {
            throw new RuntimeException(
                    "Messaging is closed for this request."
            );
        }

        User sender = userRepository
                .findById(senderId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Sender not found: " + senderId
                        ));

        User receiver = userRepository
                .findById(receiverId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Receiver not found: " + receiverId
                        ));

        validateParticipant(request, sender);
        validateParticipant(request, receiver);

        Message message = new Message();

        message.setServiceRequest(request);
        message.setSender(sender);
        message.setReceiver(receiver);
        message.setContent(content.trim());
        message.setIsRead(false);

        return messageRepository.save(message);
    }

    /*
     * Mark received messages as read
     */
    @Transactional
    public void markMessagesAsRead(
            Long requestId,
            Integer userId) {

        ServiceRequest request = serviceRequestRepository
                .findById(requestId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Request not found: " + requestId
                        ));

        User receiver = userRepository
                .findById(userId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "User not found: " + userId
                        ));

        validateParticipant(request, receiver);

        List<Message> messages =
                messageRepository
                        .findByServiceRequestAndReceiverAndIsReadFalse(
                                request,
                                receiver
                        );

        messages.forEach(message ->
                message.setIsRead(true)
        );

        messageRepository.saveAll(messages);
    }

    /*
     * Check whether the user belongs to the request
     */
    private void validateParticipant(
            ServiceRequest request,
            User user) {

        boolean isCustomer =
                request.getCustomer() != null
                        && request.getCustomer()
                        .getId()
                        .equals(user.getId());

        boolean isMechanic =
                request.getMechanic() != null
                        && request.getMechanic().getUser() != null
                        && request.getMechanic()
                        .getUser()
                        .getId()
                        .equals(user.getId());

        if (!isCustomer && !isMechanic) {
            throw new RuntimeException(
                    "User is not a participant in this request"
            );
        }
    }
}