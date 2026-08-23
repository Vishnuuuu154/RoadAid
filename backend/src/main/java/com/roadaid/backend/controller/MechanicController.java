package com.roadaid.backend.controller;

import com.roadaid.backend.dto.MechanicRequestSummaryResponse;
import com.roadaid.backend.service.MechanicService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.roadaid.backend.entity.Mechanic;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/mechanics")
public class MechanicController {

    private final MechanicService mechanicService;

    public MechanicController(MechanicService mechanicService) {
        this.mechanicService = mechanicService;
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
    @GetMapping("/requests")
    public List<MechanicRequestSummaryResponse> getMyRequests() {
        return mechanicService.getMyRequests();
    }
}