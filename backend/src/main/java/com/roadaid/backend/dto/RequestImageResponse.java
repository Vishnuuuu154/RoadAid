package com.roadaid.backend.dto;

public class RequestImageResponse {

    private String imageUrl;

    public RequestImageResponse() {
    }

    public RequestImageResponse(String imageUrl) {
        this.imageUrl = imageUrl;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public void setImageUrl(String imageUrl) {
        this.imageUrl = imageUrl;
    }
}