
package com.roadaid.backend.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final ResendEmailService resendEmailService;

    @Value("${app.frontend-url}")
    private String frontendUrl;

    public EmailService(ResendEmailService resendEmailService) {
        this.resendEmailService = resendEmailService;
    }

    public void sendPasswordResetEmail(
            String recipient,
            String userName,
            String token
    ) {

        String resetLink =
                frontendUrl + "/reset-password?token=" + token;

        String message =
                "Hello " + userName + ",\n\n" +
                        "We received a request to reset your RoadAid password.\n\n" +
                        "Click the link below to create a new password:\n\n" +
                        resetLink + "\n\n" +
                        "This link will expire in 30 minutes and can only be used once.\n\n" +
                        "If you did not request a password reset, you can safely ignore this email.\n\n" +
                        "Regards,\n" +
                        "RoadAid Support";

        resendEmailService.sendEmail(
                recipient,
                "Reset your RoadAid password",
                message
        );
    }
}
