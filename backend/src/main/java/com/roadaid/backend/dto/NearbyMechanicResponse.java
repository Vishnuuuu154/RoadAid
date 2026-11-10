package com.roadaid.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NearbyMechanicResponse {

    private Long mechanicId;

    private String name;

    private String workshopName;

    private String workshopAddress;

    private String contactNumber;

    private Integer experienceYears;

    private Boolean available;

    private String verificationStatus;

    private Double latitude;

    private Double longitude;

    private Double distanceKm;

    private Double averageRating;
}