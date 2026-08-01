package com.roadaid.backend.entity;

import jakarta.persistence.*;

@Entity
@Table(name = "quotations")
public class Quotation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne
    @JoinColumn(name = "request_id", nullable = false, unique = true)
    private ServiceRequest serviceRequest;

    @Column(nullable = false)
    private Double labourCharge;

    @Column(nullable = false)
    private Double partsCharge;

    @Column(nullable = false)
    private Double travelFee;

    @Column(nullable = false)
    private Double totalAmount;

    @Column(nullable = false)
    private String paymentStatus = "PENDING";

    public Quotation() {
    }

    public Long getId() {
        return id;
    }

    public ServiceRequest getServiceRequest() {
        return serviceRequest;
    }

    public void setServiceRequest(ServiceRequest serviceRequest) {
        this.serviceRequest = serviceRequest;
    }

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

    public String getPaymentStatus() {
        return paymentStatus;
    }

    public void setPaymentStatus(String paymentStatus) {
        this.paymentStatus = paymentStatus;
    }
}