package com.roadaid.backend.controller;

import com.roadaid.backend.dto.AdminDashboardResponse;
import com.roadaid.backend.dto.AdminMechanicResponse;
import com.roadaid.backend.dto.AdminRequestSummaryResponse;
import com.roadaid.backend.dto.ComplaintSummaryResponse;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.service.AdminService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/dashboard")
    public AdminDashboardResponse getDashboard() {
        return adminService.getDashboard();
    }
    @GetMapping("/users")
    public List<User> getAllUsers(
            @RequestParam(required = false) String search
    ) {
        return adminService.getAllUsers(search);
    }
    @PutMapping("/users/{userId}/deactivate")
    public User deactivateUser(@PathVariable Integer userId) {
        return adminService.deactivateUser(userId);
    }
    @PutMapping("/users/{userId}/activate")
    public User activateUser(@PathVariable Integer userId) {
        return adminService.activateUser(userId);
    }@GetMapping("/requests")
    public List<AdminRequestSummaryResponse> getAllRequests(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String customer
    ) {
        return adminService.getAllRequests(status, customer);
    }
    @GetMapping("/complaints")
    public List<ComplaintSummaryResponse> getAllComplaints() {
        return adminService.getAllComplaints();
    }


}