package com.roadaid.backend.controller;

import com.roadaid.backend.dto.MechanicRequestSummaryResponse;
import com.roadaid.backend.dto.NearbyMechanicResponse;
import com.roadaid.backend.service.MechanicService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.roadaid.backend.entity.Mechanic;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;
import com.roadaid.backend.service.MechanicAnalyticsService;
@RestController
@RequestMapping("/api/mechanics")
public class MechanicController {

    private final MechanicService mechanicService;
    private final MechanicAnalyticsService mechanicAnalyticsService;
    public MechanicController(
            MechanicService mechanicService,
            MechanicAnalyticsService mechanicAnalyticsService
    ) {
        this.mechanicService = mechanicService;
        this.mechanicAnalyticsService = mechanicAnalyticsService;
    }
    @PostMapping
    public Mechanic registerMechanic(@RequestBody Mechanic mechanic) {
        return mechanicService.registerMechanic(mechanic);
    }
    @GetMapping("/me")
    public Mechanic getMyProfile() {
        return mechanicService.getMyProfile();
    }
    @PutMapping("/me")
    public Mechanic updateMyProfile(@RequestBody Mechanic mechanic) {
        return mechanicService.updateMyProfile(mechanic);
    }
    @GetMapping
    public List<Mechanic> getAllMechanics() {
        return mechanicService.getAllMechanics();
    }
    @GetMapping("/search")
    public List<Mechanic> searchMechanics(@RequestParam String keyword) {
        return mechanicService.searchMechanics(keyword);
    }
    @PatchMapping("/availability")
    public ResponseEntity<Mechanic> updateAvailability(@RequestBody Map<String, Boolean> request) {

        Mechanic mechanic = mechanicService.updateAvailability(request.get("available"));

        return ResponseEntity.ok(mechanic);
    }
    @PatchMapping("/location")
    public ResponseEntity<Mechanic> updateLocation(
            @RequestBody Map<String, Double> request
    ) {

        Double latitude = request.get("latitude");
        Double longitude = request.get("longitude");

        Mechanic mechanic =
                mechanicService.updateLocation(latitude, longitude);

        return ResponseEntity.ok(mechanic);
    }
    @GetMapping("/nearby")
    public ResponseEntity<List<NearbyMechanicResponse>> getNearbyMechanics(
            @RequestParam Double latitude,
            @RequestParam Double longitude,
            @RequestParam(required = false, defaultValue = "10") Double radius
    ) {

        return ResponseEntity.ok(
                mechanicService.getNearbyMechanics(
                        latitude,
                        longitude,
                        radius
                )
        );
    }
    @GetMapping("/analytics")
    public ResponseEntity<Map<String, Object>> getMyAnalytics(
            @RequestParam(defaultValue = "30") String period
    ) {
        return ResponseEntity.ok(
                mechanicAnalyticsService.getMyAnalytics(period)
        );
    }
    @GetMapping("/requests")
    public List<MechanicRequestSummaryResponse> getMyRequests() {
        return mechanicService.getMyRequests();
    }
}