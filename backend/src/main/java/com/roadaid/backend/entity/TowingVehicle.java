package com.roadaid.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class TowingVehicle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "provider_id", nullable = false)
    private TowingProvider provider;

    @Column(nullable = false, unique = true)
    private String registrationNumber;

    @Column(nullable = false)
    private String vehicleType;

    @Column(nullable = false)
    private String brand;

    @Column(nullable = false)
    private String model;

    @Column(nullable = false)
    private Integer manufacturingYear;

    @Column(nullable = false)
    private Double towingCapacity;

    @Column(nullable = false)
    private String verificationStatus = "PENDING";

    @Column
    private String rejectionReason;

    @Column(nullable = false)
    private Boolean available = false;
}