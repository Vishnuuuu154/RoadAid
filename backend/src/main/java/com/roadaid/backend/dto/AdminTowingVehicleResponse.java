package com.roadaid.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AdminTowingVehicleResponse {

    private Long vehicleId;

    // Provider details
    private Long providerId;
    private String businessName;
    private String providerName;
    private String providerEmail;
    private String providerPhone;

    // Vehicle details
    private String registrationNumber;
    private String vehicleType;
    private String brand;
    private String model;
    private Integer manufacturingYear;
    private Double towingCapacity;

    // Verification
    private String verificationStatus;
    private String rejectionReason;
    private Boolean available;

    // Documents
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