package com.roadaid.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class TowingDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "provider_id")
    private TowingProvider provider;

    @ManyToOne
    @JoinColumn(name = "vehicle_id")
    private TowingVehicle vehicle;

    @Column(nullable = false)
    private String documentType;

    @Column(nullable = false)
    private String fileName;

    @Column(nullable = false)
    private String filePath;

    @Column(nullable = false)
    private String verificationStatus = "PENDING";

    @Column
    private String rejectionReason;

    @Column
    private LocalDateTime uploadedAt = LocalDateTime.now();
}