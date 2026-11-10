package com.roadaid.backend.dto;

public class AdminAnalyticsResponse {

    private long totalCustomers;
    private long totalMechanics;
    private long totalRequests;
    private long pendingRequests;
    private long completedRequests;
    private long cancelledRequests;
    private long totalComplaints;
    private long totalPayments;

    // Overview KPIs
    private double totalRevenue;
    private long activeMechanics;
    private long pendingProviders;

    // Monthly comparison
    private long monthlyRequests;
    private long lastMonthRequests;

    private double monthlyRevenue;
    private double lastMonthRevenue;

    private long monthlyCustomers;
    private long lastMonthCustomers;

    private long monthlyCompleted;
    private long lastMonthCompleted;


    public long getTotalCustomers() {
        return totalCustomers;
    }

    public void setTotalCustomers(long totalCustomers) {
        this.totalCustomers = totalCustomers;
    }


    public long getTotalMechanics() {
        return totalMechanics;
    }

    public void setTotalMechanics(long totalMechanics) {
        this.totalMechanics = totalMechanics;
    }


    public long getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(long totalRequests) {
        this.totalRequests = totalRequests;
    }


    public long getPendingRequests() {
        return pendingRequests;
    }

    public void setPendingRequests(long pendingRequests) {
        this.pendingRequests = pendingRequests;
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


    public long getTotalComplaints() {
        return totalComplaints;
    }

    public void setTotalComplaints(long totalComplaints) {
        this.totalComplaints = totalComplaints;
    }


    public long getTotalPayments() {
        return totalPayments;
    }

    public void setTotalPayments(long totalPayments) {
        this.totalPayments = totalPayments;
    }


    public double getTotalRevenue() {
        return totalRevenue;
    }

    public void setTotalRevenue(double totalRevenue) {
        this.totalRevenue = totalRevenue;
    }


    public long getActiveMechanics() {
        return activeMechanics;
    }

    public void setActiveMechanics(long activeMechanics) {
        this.activeMechanics = activeMechanics;
    }


    public long getPendingProviders() {
        return pendingProviders;
    }

    public void setPendingProviders(long pendingProviders) {
        this.pendingProviders = pendingProviders;
    }


    public long getMonthlyRequests() {
        return monthlyRequests;
    }

    public void setMonthlyRequests(long monthlyRequests) {
        this.monthlyRequests = monthlyRequests;
    }


    public long getLastMonthRequests() {
        return lastMonthRequests;
    }

    public void setLastMonthRequests(long lastMonthRequests) {
        this.lastMonthRequests = lastMonthRequests;
    }


    public double getMonthlyRevenue() {
        return monthlyRevenue;
    }

    public void setMonthlyRevenue(double monthlyRevenue) {
        this.monthlyRevenue = monthlyRevenue;
    }


    public double getLastMonthRevenue() {
        return lastMonthRevenue;
    }

    public void setLastMonthRevenue(double lastMonthRevenue) {
        this.lastMonthRevenue = lastMonthRevenue;
    }


    public long getMonthlyCustomers() {
        return monthlyCustomers;
    }

    public void setMonthlyCustomers(long monthlyCustomers) {
        this.monthlyCustomers = monthlyCustomers;
    }


    public long getLastMonthCustomers() {
        return lastMonthCustomers;
    }

    public void setLastMonthCustomers(long lastMonthCustomers) {
        this.lastMonthCustomers = lastMonthCustomers;
    }


    public long getMonthlyCompleted() {
        return monthlyCompleted;
    }

    public void setMonthlyCompleted(long monthlyCompleted) {
        this.monthlyCompleted = monthlyCompleted;
    }


    public long getLastMonthCompleted() {
        return lastMonthCompleted;
    }

    public void setLastMonthCompleted(long lastMonthCompleted) {
        this.lastMonthCompleted = lastMonthCompleted;
    }
}