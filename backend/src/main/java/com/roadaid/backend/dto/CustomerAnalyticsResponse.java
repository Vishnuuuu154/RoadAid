package com.roadaid.backend.dto;

import java.util.List;

public class CustomerAnalyticsResponse {

    private long totalCustomers;
    private long monthlyCustomers;
    private long lastMonthCustomers;

    private long activeCustomers;

    private long totalRequests;
    private long completedRequests;
    private long cancelledRequests;

    private double averageRequestsPerCustomer;

    private List<CustomerPerformance> topCustomers;

    public long getTotalCustomers() {
        return totalCustomers;
    }

    public void setTotalCustomers(long totalCustomers) {
        this.totalCustomers = totalCustomers;
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

    public long getActiveCustomers() {
        return activeCustomers;
    }

    public void setActiveCustomers(long activeCustomers) {
        this.activeCustomers = activeCustomers;
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

    public double getAverageRequestsPerCustomer() {
        return averageRequestsPerCustomer;
    }

    public void setAverageRequestsPerCustomer(double averageRequestsPerCustomer) {
        this.averageRequestsPerCustomer = averageRequestsPerCustomer;
    }

    public List<CustomerPerformance> getTopCustomers() {
        return topCustomers;
    }

    public void setTopCustomers(List<CustomerPerformance> topCustomers) {
        this.topCustomers = topCustomers;
    }

    public static class CustomerPerformance {

        private String name;
        private String email;
        private long requests;
        private long completed;
        private long cancelled;

        public CustomerPerformance() {
        }

        public CustomerPerformance(
                String name,
                String email,
                long requests,
                long completed,
                long cancelled
        ) {
            this.name = name;
            this.email = email;
            this.requests = requests;
            this.completed = completed;
            this.cancelled = cancelled;
        }

        public String getName() {
            return name;
        }

        public String getEmail() {
            return email;
        }

        public long getRequests() {
            return requests;
        }

        public long getCompleted() {
            return completed;
        }

        public long getCancelled() {
            return cancelled;
        }
    }
}