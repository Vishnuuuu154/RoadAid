package com.roadaid.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ServiceRequest {


    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne
    @JoinColumn(name = "customer_id", nullable = false)
    private User customer;
    @ManyToOne
    @JoinColumn(name = "vehicle_id", nullable = false)
    private Vehicle vehicle;
    @ManyToOne
    @JoinColumn(name = "mechanic_id")
    private Mechanic mechanic;
    @ManyToOne
    @JoinColumn(name = "rejected_by_mechanic_id")
    private Mechanic rejectedByMechanic;
    @Column(nullable = false)
    private String issueDescription;
    @Column(nullable = false)
    private String location;
    @Column(nullable = false)
    private String status = "PENDING";
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();




}