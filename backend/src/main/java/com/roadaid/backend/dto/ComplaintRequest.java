package com.roadaid.backend.dto;

import lombok.Data;

@Data
public class ComplaintRequest {

    private Long serviceRequestId;

    private String reason;
    private String description;
}