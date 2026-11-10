
package com.roadaid.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
public class TowingProvider {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private String businessName;

    @Column(nullable = false)
    private String businessAddress;
    @Column
    private String businessType;

    @Column
    private String district;

    @Column
    private String pinCode;

    @Column
    private String alternateContact;

    @Column(nullable = false)
    private String contactNumber;

    @Column(nullable = false)
    private String verificationStatus = "PENDING";

    @Column
    private String rejectionReason;
}
