package com.roadaid.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LiveTrackingResponse {

    private Long requestId;

    private String status;

    private Double customerLatitude;
    private Double customerLongitude;

    private Long mechanicId;

    private String mechanicName;
    private String workshopName;
    private String contactNumber;

    private Double mechanicLatitude;
    private Double mechanicLongitude;

    private LocalDateTime locationUpdatedAt;
}