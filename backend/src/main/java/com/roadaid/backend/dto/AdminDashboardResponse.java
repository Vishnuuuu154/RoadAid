package com.roadaid.backend.dto;

import lombok.Data;

@Data
public class AdminDashboardResponse {

    private long totalCustomers;
    private long totalMechanics;
    private long totalRequests;
    private long pendingRequests;
    private long completedRequests;
    private long totalComplaints;
    private long totalPayments;
}