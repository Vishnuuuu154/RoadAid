package com.roadaid.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    @Value("${spring.mail.username}")
    private String fromEmail;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendPasswordResetEmail(
            String recipient,
            String userName,
            String token
    ) {

        String resetLink =
                frontendUrl + "/reset-password?token=" + token;

        SimpleMailMessage message = new SimpleMailMessage();

        message.setFrom(fromEmail);
        message.setTo(recipient);
        message.setSubject("Reset your RoadAid password");

        message.setText(
                "Hello " + userName + ",\n\n" +

                        "We received a request to reset your RoadAid password.\n\n" +

                        "Click the link below to create a new password:\n\n" +

                        resetLink + "\n\n" +

                        "This link will expire in 30 minutes and can only be used once.\n\n" +

                        "If you did not request a password reset, you can safely ignore this email.\n\n" +

                        "Regards,\n" +
                        "RoadAid Support"
        );

        mailSender.send(message);
    }
}