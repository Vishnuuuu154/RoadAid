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
public class Mechanic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private String workshopName;

    @Column(nullable = false)
    private String workshopAddress;

    @Column(nullable = false)
    private Integer experienceYears;

    @Column(nullable = false)
    private Boolean available = false;

    @Column(nullable = false)
    private String verificationStatus = "PENDING";

    @Column
    private String rejectionReason;

    @Column(nullable = false)
    private String contactNumber;

    @Column
    private Double latitude;

    @Column
    private Double longitude;

    public Long getId() {
        return id;
    }
    @Column
    private LocalDateTime locationUpdatedAt;
    @Transient
    private String profileImage;

}