package com.roadaid.backend.dto;

import java.util.Map;

public class ServiceAnalyticsResponse {

    private long totalRequests;
    private long completedRequests;
    private long cancelledRequests;

    private Map<String, Long> issueCategories;

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

    public Map<String, Long> getIssueCategories() {
        return issueCategories;
    }

    public void setIssueCategories(Map<String, Long> issueCategories) {
        this.issueCategories = issueCategories;
    }
}