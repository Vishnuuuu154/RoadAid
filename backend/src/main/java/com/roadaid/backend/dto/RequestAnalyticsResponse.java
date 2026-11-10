package com.roadaid.backend.dto;

import java.util.Map;

public class RequestAnalyticsResponse {

    private long totalRequests;
    private long pendingRequests;
    private long waitingForQuotation;
    private long quotationPending;
    private long inProgress;
    private long completedRequests;
    private long closedRequests;
    private long cancelledRequests;

    private long monthlyRequests;
    private long lastMonthRequests;

    private Map<String, Long> dailyRequests;


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

    public long getWaitingForQuotation() {
        return waitingForQuotation;
    }

    public void setWaitingForQuotation(long waitingForQuotation) {
        this.waitingForQuotation = waitingForQuotation;
    }

    public long getQuotationPending() {
        return quotationPending;
    }

    public void setQuotationPending(long quotationPending) {
        this.quotationPending = quotationPending;
    }

    public long getInProgress() {
        return inProgress;
    }

    public void setInProgress(long inProgress) {
        this.inProgress = inProgress;
    }

    public long getCompletedRequests() {
        return completedRequests;
    }

    public void setCompletedRequests(long completedRequests) {
        this.completedRequests = completedRequests;
    }

    public long getClosedRequests() {
        return closedRequests;
    }

    public void setClosedRequests(long closedRequests) {
        this.closedRequests = closedRequests;
    }

    public long getCancelledRequests() {
        return cancelledRequests;
    }

    public void setCancelledRequests(long cancelledRequests) {
        this.cancelledRequests = cancelledRequests;
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

    public Map<String, Long> getDailyRequests() {
        return dailyRequests;
    }

    public void setDailyRequests(Map<String, Long> dailyRequests) {
        this.dailyRequests = dailyRequests;
    }
}