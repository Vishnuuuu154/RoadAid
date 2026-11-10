package com.roadaid.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminTowingProviderResponse {

    private Long providerId;
    private Integer userId;
    private Boolean isActive;

    private String fullName;
    private String email;
    private String phone;

    private String businessName;
    private String businessAddress;
    private String contactNumber;

    private String businessType;
    private String district;
    private String pinCode;
    private String alternateContact;

    private String verificationStatus;
    private String rejectionReason;

    private LocalDateTime registeredAt;

    private List<DocumentResponse> documents;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DocumentResponse {
        private Long documentId;
        private String documentType;
        private String fileName;
        private String verificationStatus;
        private String rejectionReason;
        private LocalDateTime uploadedAt;
    }
}