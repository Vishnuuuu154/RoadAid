package com.roadaid.backend.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class AdminPaymentResponse {

    private Long paymentId;

    private Long requestId;

    private String customerName;

    private String mechanicName;

    private Double amount;



    private String paymentMethod;

    private String paymentStatus;

    private LocalDateTime paymentDate;
}