package com.roadaid.backend.dto;

public class AnalyticsReportResponse {

    private String startDate;
    private String endDate;

    private long totalRequests;
    private long completedRequests;
    private long cancelledRequests;

    private long newCustomers;

    private long totalPayments;
    private long successfulPayments;

    private double revenue;

    public String getStartDate() {
        return startDate;
    }

    public void setStartDate(String startDate) {
        this.startDate = startDate;
    }

    public String getEndDate() {
        return endDate;
    }

    public void setEndDate(String endDate) {
        this.endDate = endDate;
    }

    public long getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(long totalRequests) {
        this.totalRequests = totalRequests;
    }

    public long getCompletedRequests() {
        return completedRequests;
    }

    public void setCompletedRequests(long completedRequests) {
        this.completedRequests = completedRequests;
    }

    public long getCancelledRequests() {
        return cancelledRequests;
    }

    public void setCancelledRequests(long cancelledRequests) {
        this.cancelledRequests = cancelledRequests;
    }

    public long getNewCustomers() {
        return newCustomers;
    }

    public void setNewCustomers(long newCustomers) {
        this.newCustomers = newCustomers;
    }

    public long getTotalPayments() {
        return totalPayments;
    }

    public void setTotalPayments(long totalPayments) {
        this.totalPayments = totalPayments;
    }

    public long getSuccessfulPayments() {
        return successfulPayments;
    }

    public void setSuccessfulPayments(long successfulPayments) {
        this.successfulPayments = successfulPayments;
    }

    public double getRevenue() {
        return revenue;
    }

    public void setRevenue(double revenue) {
        this.revenue = revenue;
    }
}