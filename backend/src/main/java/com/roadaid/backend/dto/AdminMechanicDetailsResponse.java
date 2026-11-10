package com.roadaid.backend.dto;

public class AdminMechanicDetailsResponse {

    private Long mechanicId;

    private String fullName;
    private String email;
    private String phone;

    private String workshopName;
    private String workshopAddress;
    private String contactNumber;

    private Integer experienceYears;
    private Boolean available;

    private Long totalRequests;
    private Long completedRequests;
    private Double averageRating;

    public Long getMechanicId() {
        return mechanicId;
    }

    public void setMechanicId(Long mechanicId) {
        this.mechanicId = mechanicId;
    }


    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }


    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }


    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }


    public String getWorkshopName() {
        return workshopName;
    }

    public void setWorkshopName(String workshopName) {
        this.workshopName = workshopName;
    }


    public String getWorkshopAddress() {
        return workshopAddress;
    }

    public void setWorkshopAddress(String workshopAddress) {
        this.workshopAddress = workshopAddress;
    }


    public String getContactNumber() {
        return contactNumber;
    }

    public void setContactNumber(String contactNumber) {
        this.contactNumber = contactNumber;
    }


    public Integer getExperienceYears() {
        return experienceYears;
    }

    public void setExperienceYears(Integer experienceYears) {
        this.experienceYears = experienceYears;
    }


    public Boolean getAvailable() {
        return available;
    }

    public void setAvailable(Boolean available) {
        this.available = available;
    }


    public Long getTotalRequests() {
        return totalRequests;
    }

    public void setTotalRequests(Long totalRequests) {
        this.totalRequests = totalRequests;
    }


    public Long getCompletedRequests() {
        return completedRequests;
    }

    public void setCompletedRequests(Long completedRequests) {
        this.completedRequests = completedRequests;
    }
    public Double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(Double averageRating) {
        this.averageRating = averageRating;
    }
}