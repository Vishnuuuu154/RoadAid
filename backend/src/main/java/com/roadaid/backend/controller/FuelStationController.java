package com.roadaid.backend.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;

@RestController
@RequestMapping("/api/map")
public class FuelStationController {

    private static final Logger log = LoggerFactory.getLogger(FuelStationController.class);

    // Tried in order. overpass-api.de, lz4.overpass-api.de and
    // z.overpass-api.de are NOT independent of each other: they're three
    // front-ends for the same backend cluster, so when that cluster is
    // overloaded all three fail together. These four are run by different
    // operators on separate infrastructure, so one provider's outage doesn't
    // take out every attempt. CORS does not apply here (server-to-server).
    private static final String[] OVERPASS_ENDPOINTS = {
            "https://overpass-api.de/api/interpreter",
            "https://overpass.kumi.systems/api/interpreter",
            "https://overpass.openstreetmap.fr/api/interpreter",
            "https://overpass.private.coffee/api/interpreter"
    };

    // Petrol, diesel, LPG and CNG pumps all share one OSM place type
    // (amenity=fuel) and are told apart by fuel:* tags on that same node.
    // EV charging points are a structurally different place in OpenStreetMap
    // (amenity=charging_station) with their own tag set (operator, socket:*,
    // capacity, fee) — they are never amenity=fuel, so "show EV stations"
    // means querying a different Overpass amenity entirely, not just
    // filtering fuel stations by a tag.
    private static final String CATEGORY_FUEL = "FUEL";
    private static final String CATEGORY_EV = "EV";

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(8))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/fuel-stations")
    public List<FuelStation> getFuelStations(
            @RequestParam double lat,
            @RequestParam double lng,
            @RequestParam(defaultValue = "5") double radiusKm,
            @RequestParam(defaultValue = CATEGORY_FUEL) String category) {

        if (!Double.isFinite(lat) || lat < -90 || lat > 90
                || !Double.isFinite(lng) || lng < -180 || lng > 180
                || !Double.isFinite(radiusKm)
                || radiusKm <= 0 || radiusKm > 5) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Invalid coordinates or radius");
        }

        String normalizedCategory = category == null ? CATEGORY_FUEL : category.trim().toUpperCase(Locale.ROOT);
        if (!normalizedCategory.equals(CATEGORY_FUEL) && !normalizedCategory.equals(CATEGORY_EV)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "category must be FUEL or EV");
        }

        String amenity = normalizedCategory.equals(CATEGORY_EV) ? "charging_station" : "fuel";
        String query = String.format(
                Locale.ROOT,
                "[out:json][timeout:15];node[\"amenity\"=\"%s\"]"
                        + "(around:%.0f,%.6f,%.6f);out;",
                amenity, radiusKm * 1000, lat, lng);

        String formBody = "data=" + URLEncoder.encode(query, StandardCharsets.UTF_8);
        Exception lastError = null;

        for (String endpoint : OVERPASS_ENDPOINTS) {
            try {
                HttpRequest request = HttpRequest.newBuilder()
                        .uri(URI.create(endpoint))
                        .timeout(Duration.ofSeconds(25))
                        .header("Content-Type",
                                "application/x-www-form-urlencoded; charset=UTF-8")
                        .header("User-Agent", "RoadAid/1.0")
                        .POST(HttpRequest.BodyPublishers.ofString(formBody))
                        .build();

                HttpResponse<String> response = httpClient.send(
                        request, HttpResponse.BodyHandlers.ofString());

                if (response.statusCode() != 200) {
                    log.warn("Fuel station provider {} returned HTTP {}",
                            endpoint, response.statusCode());
                    lastError = new RuntimeException(
                            "Fuel station provider returned HTTP " + response.statusCode());
                    continue;
                }

                return parseStations(response.body(), lat, lng, normalizedCategory);

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Fuel station lookup interrupted");
            } catch (Exception e) {
                // Logging the real exception is what makes this debuggable:
                // a timeout, a DNS failure and "no outbound internet" all
                // used to collapse into the same generic 502.
                log.warn("Fuel station provider {} failed: {}", endpoint, e.toString());
                lastError = e;
            }
        }

        log.error("All fuel station providers failed for lat={}, lng={}, radiusKm={}, category={}",
                lat, lng, radiusKm, normalizedCategory, lastError);
        throw new ResponseStatusException(
                HttpStatus.BAD_GATEWAY, "Unable to retrieve fuel stations");
    }

    private List<FuelStation> parseStations(String body, double lat, double lng, String category) throws Exception {
        JsonNode elements = objectMapper.readTree(body).path("elements");
        List<FuelStation> stations = new ArrayList<>();
        boolean isEv = CATEGORY_EV.equals(category);

        for (JsonNode element : elements) {
            JsonNode tags = element.path("tags");
            double stationLat = element.path("lat").asDouble(Double.NaN);
            double stationLng = element.path("lon").asDouble(Double.NaN);

            if (!Double.isFinite(stationLat)
                    || !Double.isFinite(stationLng)) {
                continue;
            }

            double distance = distanceKm(lat, lng, stationLat, stationLng);

            String name = tags.path("name").asText(
                    tags.path("brand").asText(isEv ? "EV charging station" : "Fuel station"));
            String brand = tags.path("brand").asText("");
            String address = tags.path("addr:street").asText(
                    tags.path("addr:place").asText(""));
            String openingHours = tags.path("opening_hours").asText("");
            String phone = tags.path("phone").asText(
                    tags.path("contact:phone").asText(""));
            String website = tags.path("website").asText(
                    tags.path("contact:website").asText(""));

            stations.add(new FuelStation(
                    element.path("id").asLong(),
                    category,
                    name,
                    brand,
                    address,
                    openingHours,
                    phone,
                    website,
                    !isEv && ("yes".equals(tags.path("fuel:petrol").asText())
                            || "yes".equals(tags.path("fuel:octane_91").asText())),
                    !isEv && "yes".equals(tags.path("fuel:diesel").asText()),
                    !isEv && "yes".equals(tags.path("fuel:lpg").asText()),
                    !isEv && "yes".equals(tags.path("fuel:cng").asText()),
                    !isEv && "yes".equals(tags.path("fuel:electricity").asText()),
                    isEv ? tags.path("operator").asText("") : "",
                    isEv ? extractSocketTypes(tags) : "",
                    isEv ? tags.path("capacity").asInt(0) : 0,
                    isEv ? tags.path("fee").asText("unknown") : "",
                    stationLat,
                    stationLng,
                    Math.round(distance * 100.0) / 100.0
            ));
        }

        stations.sort(Comparator.comparingDouble(FuelStation::distanceKm));
        return stations.stream().limit(40).toList();
    }

    // Standard OSM charging_station socket tags. A node can have more than
    // one (multiple connector types at the same point), hence the list.
    private String extractSocketTypes(JsonNode tags) {
        List<String> types = new ArrayList<>();
        if (tags.has("socket:type2") || tags.has("socket:type2_cable")) types.add("Type 2");
        if (tags.has("socket:type2_combo")) types.add("CCS2");
        if (tags.has("socket:type1") || tags.has("socket:type1_cable")) types.add("Type 1");
        if (tags.has("socket:type1_combo")) types.add("CCS1");
        if (tags.has("socket:chademo")) types.add("CHAdeMO");
        if (tags.has("socket:schuko")) types.add("Schuko");
        if (tags.has("socket:tesla_standard") || tags.has("socket:tesla_supercharger")) types.add("Tesla");
        return String.join(", ", types);
    }

    private double distanceKm(
            double lat1, double lon1, double lat2, double lon2) {

        double earthRadius = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLon = Math.toRadians(lon2 - lon1);

        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1))
                * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLon / 2) * Math.sin(dLon / 2);

        return earthRadius * 2 * Math.atan2(
                Math.sqrt(a), Math.sqrt(1 - a));
    }

    public record FuelStation(
            long id,
            String type,
            String name,
            String brand,
            String address,
            String openingHours,
            String phone,
            String website,
            boolean fuelPetrol,
            boolean fuelDiesel,
            boolean fuelLpg,
            boolean fuelCng,
            boolean fuelElectricity,
            String operator,
            String socketTypes,
            int capacity,
            String fee,
            double latitude,
            double longitude,
            double distanceKm) {
    }
}