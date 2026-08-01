package com.roadaid.backend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
    private Boolean available = true;
    @Column(nullable = false)
    private String contactNumber;





}