package com.roadaid.backend.dto;

import java.util.List;
import java.util.Map;

public class ReviewComplaintAnalyticsResponse {

    private long totalReviews;
    private double averageRating;
    private long fiveStarReviews;
    private long lowRatingReviews;

    private long totalComplaints;
    private long openComplaints;

    private Map<Integer, Long> ratingDistribution;

    private List<ComplaintSummary> recentComplaints;

    public long getTotalReviews() {
        return totalReviews;
    }

    public void setTotalReviews(long totalReviews) {
        this.totalReviews = totalReviews;
    }

    public double getAverageRating() {
        return averageRating;
    }

    public void setAverageRating(double averageRating) {
        this.averageRating = averageRating;
    }

    public long getFiveStarReviews() {
        return fiveStarReviews;
    }

    public void setFiveStarReviews(long fiveStarReviews) {
        this.fiveStarReviews = fiveStarReviews;
    }

    public long getLowRatingReviews() {
        return lowRatingReviews;
    }

    public void setLowRatingReviews(long lowRatingReviews) {
        this.lowRatingReviews = lowRatingReviews;
    }

    public long getTotalComplaints() {
        return totalComplaints;
    }

    public void setTotalComplaints(long totalComplaints) {
        this.totalComplaints = totalComplaints;
    }

    public long getOpenComplaints() {
        return openComplaints;
    }

    public void setOpenComplaints(long openComplaints) {
        this.openComplaints = openComplaints;
    }

    public Map<Integer, Long> getRatingDistribution() {
        return ratingDistribution;
    }

    public void setRatingDistribution(Map<Integer, Long> ratingDistribution) {
        this.ratingDistribution = ratingDistribution;
    }

    public List<ComplaintSummary> getRecentComplaints() {
        return recentComplaints;
    }

    public void setRecentComplaints(List<ComplaintSummary> recentComplaints) {
        this.recentComplaints = recentComplaints;
    }

    public static class ComplaintSummary {

        private Long id;
        private String subject;
        private String status;

        public ComplaintSummary() {
        }

        public ComplaintSummary(Long id, String subject, String status) {
            this.id = id;
            this.subject = subject;
            this.status = status;
        }

        public Long getId() {
            return id;
        }

        public String getSubject() {
            return subject;
        }

        public String getStatus() {
            return status;
        }
    }
}