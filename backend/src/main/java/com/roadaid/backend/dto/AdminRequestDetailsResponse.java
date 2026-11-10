package com.roadaid.backend.dto;

import java.time.LocalDateTime;

public class AdminRequestDetailsResponse {

    private Long requestId;

    private String customerName;
    private String mechanicName;
    private String vehicle;

    private String issue;
    private String location;
    private String status;
    private LocalDateTime createdAt;

    private QuotationDetails quotation;
    private PaymentDetails payment;
    private ReviewDetails review;


    // =========================
    // GETTERS & SETTERS
    // =========================

    public Long getRequestId() {
        return requestId;
    }

    public void setRequestId(Long requestId) {
        this.requestId = requestId;
    }

    public String getCustomerName() {
        return customerName;
    }

    public void setCustomerName(String customerName) {
        this.customerName = customerName;
    }

    public String getMechanicName() {
        return mechanicName;
    }

    public void setMechanicName(String mechanicName) {
        this.mechanicName = mechanicName;
    }

    public String getVehicle() {
        return vehicle;
    }

    public void setVehicle(String vehicle) {
        this.vehicle = vehicle;
    }

    public String getIssue() {
        return issue;
    }

    public void setIssue(String issue) {
        this.issue = issue;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
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

    public QuotationDetails getQuotation() {
        return quotation;
    }

    public void setQuotation(QuotationDetails quotation) {
        this.quotation = quotation;
    }

    public PaymentDetails getPayment() {
        return payment;
    }

    public void setPayment(PaymentDetails payment) {
        this.payment = payment;
    }

    public ReviewDetails getReview() {
        return review;
    }

    public void setReview(ReviewDetails review) {
        this.review = review;
    }


    // =========================
    // QUOTATION
    // =========================

    public static class QuotationDetails {

        private Double labourCharge;
        private Double partsCharge;
        private Double travelFee;

        private Double totalAmount;

        public Double getLabourCharge() {
            return labourCharge;
        }

        public void setLabourCharge(Double labourCharge) {
            this.labourCharge = labourCharge;
        }

        public Double getPartsCharge() {
            return partsCharge;
        }

        public void setPartsCharge(Double partsCharge) {
            this.partsCharge = partsCharge;
        }

        public Double getTravelFee() {
            return travelFee;
        }

        public void setTravelFee(Double travelFee) {
            this.travelFee = travelFee;
        }





        public Double getTotalAmount() {
            return totalAmount;
        }

        public void setTotalAmount(Double totalAmount) {
            this.totalAmount = totalAmount;
        }
    }


    // =========================
    // PAYMENT
    // =========================

    public static class PaymentDetails {

        private Double amount;
        private String paymentMethod;
        private String paymentStatus;
        private LocalDateTime paymentDate;

        public Double getAmount() {
            return amount;
        }

        public void setAmount(Double amount) {
            this.amount = amount;
        }

        public String getPaymentMethod() {
            return paymentMethod;
        }

        public void setPaymentMethod(String paymentMethod) {
            this.paymentMethod = paymentMethod;
        }

        public String getPaymentStatus() {
            return paymentStatus;
        }

        public void setPaymentStatus(String paymentStatus) {
            this.paymentStatus = paymentStatus;
        }

        public LocalDateTime getPaymentDate() {
            return paymentDate;
        }

        public void setPaymentDate(LocalDateTime paymentDate) {
            this.paymentDate = paymentDate;
        }
    }


    // =========================
    // REVIEW
    // =========================

    public static class ReviewDetails {

        private Integer rating;
        private String comment;
        private LocalDateTime createdAt;

        public Integer getRating() {
            return rating;
        }

        public void setRating(Integer rating) {
            this.rating = rating;
        }

        public String getComment() {
            return comment;
        }

        public void setComment(String comment) {
            this.comment = comment;
        }

        public LocalDateTime getCreatedAt() {
            return createdAt;
        }

        public void setCreatedAt(LocalDateTime createdAt) {
            this.createdAt = createdAt;
        }
    }
}