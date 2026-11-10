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
    private long cancelledRequests;
    private long inProgressRequests;
    private long quotationPendingRequests;
    private long onlineMechanics;
    private double totalRevenue;
    private long pendingProviders;

    public long getCancelledRequests() {
        return cancelledRequests;
    }

    public void setCancelledRequests(long cancelledRequests) {
        this.cancelledRequests = cancelledRequests;
    }

    public long getInProgressRequests() {
        return inProgressRequests;
    }

    public void setInProgressRequests(long inProgressRequests) {
        this.inProgressRequests = inProgressRequests;
    }

    public long getQuotationPendingRequests() {
        return quotationPendingRequests;
    }

    public void setQuotationPendingRequests(long quotationPendingRequests) {
        this.quotationPendingRequests = quotationPendingRequests;
    }

    public long getOnlineMechanics() {
        return onlineMechanics;
    }

    public void setOnlineMechanics(long onlineMechanics) {
        this.onlineMechanics = onlineMechanics;
    }

    public double getTotalRevenue() {
        return totalRevenue;
    }

    public void setTotalRevenue(double totalRevenue) {
        this.totalRevenue = totalRevenue;
    }
    public long getPendingProviders() {
        return pendingProviders;
    }

    public void setPendingProviders(long pendingProviders) {
        this.pendingProviders = pendingProviders;
    }
}