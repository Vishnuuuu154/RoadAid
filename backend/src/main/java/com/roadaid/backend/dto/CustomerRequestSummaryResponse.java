package com.roadaid.backend.dto;

import java.time.LocalDateTime;

public class CustomerRequestSummaryResponse {

    private Long requestId;
    private String issue;
    private String mechanic;
    private String status;
    private LocalDateTime createdAt;
    private LocalDateTime completedAt;
    private String serviceStage;

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }

    public String getIssue() {
        return issue;
    }

    public void setIssue(String issue) {
        this.issue = issue;
    }

    public String getMechanic() {
        return mechanic;
    }

    public void setMechanic(String mechanic) {
        this.mechanic = mechanic;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    public LocalDateTime getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(LocalDateTime completedAt) {
        this.completedAt = completedAt;
    }
    public String getServiceStage() {
        return serviceStage;
    }

    public void setServiceStage(String serviceStage) {
        this.serviceStage = serviceStage;
    }
}