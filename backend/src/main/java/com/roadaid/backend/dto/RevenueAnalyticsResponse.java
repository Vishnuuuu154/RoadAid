package com.roadaid.backend.dto;

import java.util.Map;

public class RevenueAnalyticsResponse {

    private double totalRevenue;
    private double monthlyRevenue;
    private double lastMonthRevenue;

    private long totalPayments;
    private long successfulPayments;

    private Map<String, Double> dailyRevenue;

    public double getTotalRevenue() {
        return totalRevenue;
    }

    public void setTotalRevenue(double totalRevenue) {
        this.totalRevenue = totalRevenue;
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

    public Map<String, Double> getDailyRevenue() {
        return dailyRevenue;
    }

    public void setDailyRevenue(Map<String, Double> dailyRevenue) {
        this.dailyRevenue = dailyRevenue;
    }
}