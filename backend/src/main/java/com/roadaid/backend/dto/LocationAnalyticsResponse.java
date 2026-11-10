package com.roadaid.backend.dto;

import java.util.List;

public class LocationAnalyticsResponse {

    private long totalLocations;
    private String topLocation;
    private long topLocationRequests;
    private long otherLocationRequests;

    private List<LocationHotspot> hotspots;

    public long getTotalLocations() {
        return totalLocations;
    }

    public void setTotalLocations(long totalLocations) {
        this.totalLocations = totalLocations;
    }

    public String getTopLocation() {
        return topLocation;
    }

    public void setTopLocation(String topLocation) {
        this.topLocation = topLocation;
    }

    public long getTopLocationRequests() {
        return topLocationRequests;
    }

    public void setTopLocationRequests(long topLocationRequests) {
        this.topLocationRequests = topLocationRequests;
    }

    public long getOtherLocationRequests() {
        return otherLocationRequests;
    }

    public void setOtherLocationRequests(long otherLocationRequests) {
        this.otherLocationRequests = otherLocationRequests;
    }

    public List<LocationHotspot> getHotspots() {
        return hotspots;
    }

    public void setHotspots(List<LocationHotspot> hotspots) {
        this.hotspots = hotspots;
    }

    public static class LocationHotspot {

        private String location;
        private long requests;
        private double percentage;

        public LocationHotspot() {
        }

        public LocationHotspot(
                String location,
                long requests,
                double percentage
        ) {
            this.location = location;
            this.requests = requests;
            this.percentage = percentage;
        }

        public String getLocation() {
            return location;
        }

        public long getRequests() {
            return requests;
        }

        public double getPercentage() {
            return percentage;
        }
    }
}