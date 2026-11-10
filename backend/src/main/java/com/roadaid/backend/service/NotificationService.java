
package com.roadaid.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.roadaid.backend.entity.Notification;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.repository.NotificationRepository;
import com.roadaid.backend.repository.UserRepository;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final JavaMailSender mailSender;

    public NotificationService(
            NotificationRepository notificationRepository,
            UserRepository userRepository,
            JavaMailSender mailSender) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.mailSender = mailSender;
    }

    private User getCurrentUser() {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    public Notification createNotification(String message) {
        User user = getCurrentUser();

        Notification notification = new Notification();
        notification.setUser(user);
        notification.setMessage(message);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        return notificationRepository.save(notification);
    }

    public Notification notifyUser(User user, String message) {
        Notification notification = new Notification();
        notification.setUser(user);
        notification.setMessage(message);
        notification.setRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        Notification savedNotification =
                notificationRepository.save(notification);

        sendEmail(user.getEmail(), "RoadAid Account Update", message);

        return savedNotification;
    }

    private void sendEmail(String recipient, String subject, String message) {
        if (recipient == null || recipient.isBlank()) {
            throw new RuntimeException("Recipient email is missing");
        }

        SimpleMailMessage email = new SimpleMailMessage();
        email.setTo(recipient);
        email.setSubject(subject);
        email.setText(
                "Hello,\n\n"
                        + message
                        + "\n\nRegards,\nRoadAid Team"
        );

        mailSender.send(email);
    }

    public List<Notification> getMyNotifications() {
        User user = getCurrentUser();
        return notificationRepository.findByUserOrderByCreatedAtDesc(user);
    }

    public Notification markAsRead(Long id) {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Notification notification =
                notificationRepository.findByIdAndUser(id, user)
                        .orElseThrow(() ->
                                new RuntimeException("Notification not found"));

        notification.setRead(true);
        return notificationRepository.save(notification);
    }

    @Transactional
    public int markAllAsRead() {
        User user = getCurrentUser();
        return notificationRepository.markAllAsRead(user);
    }

    public void deleteNotification(Long id) {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Notification notification =
                notificationRepository.findByIdAndUser(id, user)
                        .orElseThrow(() ->
                                new RuntimeException("Notification not found"));

        notificationRepository.delete(notification);
    }
}
