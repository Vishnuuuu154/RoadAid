package com.roadaid.backend.dto;

public class ProviderAnalyticsResponse {

    private long totalProviders;
    private long approvedProviders;
    private long pendingProviders;
    private long rejectedProviders;
    private long onlineProviders;
    private long offlineProviders;
    private long totalCompletedJobs;

    public long getTotalProviders() {
        return totalProviders;
    }

    public void setTotalProviders(long totalProviders) {
        this.totalProviders = totalProviders;
    }

    public long getApprovedProviders() {
        return approvedProviders;
    }

    public void setApprovedProviders(long approvedProviders) {
        this.approvedProviders = approvedProviders;
    }

    public long getPendingProviders() {
        return pendingProviders;
    }

    public void setPendingProviders(long pendingProviders) {
        this.pendingProviders = pendingProviders;
    }

    public long getRejectedProviders() {
        return rejectedProviders;
    }

    public void setRejectedProviders(long rejectedProviders) {
        this.rejectedProviders = rejectedProviders;
    }

    public long getOnlineProviders() {
        return onlineProviders;
    }

    public void setOnlineProviders(long onlineProviders) {
        this.onlineProviders = onlineProviders;
    }

    public long getOfflineProviders() {
        return offlineProviders;
    }

    public void setOfflineProviders(long offlineProviders) {
        this.offlineProviders = offlineProviders;
    }

    public long getTotalCompletedJobs() {
        return totalCompletedJobs;
    }

    public void setTotalCompletedJobs(long totalCompletedJobs) {
        this.totalCompletedJobs = totalCompletedJobs;
    }
}