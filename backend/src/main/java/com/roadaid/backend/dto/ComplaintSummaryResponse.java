package com.roadaid.backend.dto;

import java.time.LocalDateTime;

public class ComplaintSummaryResponse {

    private Long complaintId;
    private Long serviceRequestId;
    private String reportedBy;
    private String reportedAgainst;
    private String reason;
    private String description;
    private String status;
    private LocalDateTime createdAt;

    public Long getComplaintId() {
        return complaintId;
    }

    public void setComplaintId(Long complaintId) {
        this.complaintId = complaintId;
    }

    public Long getServiceRequestId() {
        return serviceRequestId;
    }

    public void setServiceRequestId(Long serviceRequestId) {
        this.serviceRequestId = serviceRequestId;
    }

    public String getReportedBy() {
        return reportedBy;
    }

    public void setReportedBy(String reportedBy) {
        this.reportedBy = reportedBy;
    }

    public String getReportedAgainst() {
        return reportedAgainst;
    }

    public void setReportedAgainst(String reportedAgainst) {
        this.reportedAgainst = reportedAgainst;
    }

    public String getReason() {
        return reason;
    }

    public void setReason(String reason) {
        this.reason = reason;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
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
}