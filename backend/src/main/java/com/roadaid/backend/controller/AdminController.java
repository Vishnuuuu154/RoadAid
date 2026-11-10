package com.roadaid.backend.controller;
import com.roadaid.backend.dto.*;
import com.roadaid.backend.entity.Complaint;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.SystemLog;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.service.AdminService;
import com.roadaid.backend.service.SystemLogService;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import com.roadaid.backend.dto.AdminRequestDetailsResponse;import com.roadaid.backend.dto.RequestAnalyticsResponse;import com.roadaid.backend.dto.RevenueAnalyticsResponse;
@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;
    private final SystemLogService systemLogService;
    public AdminController(
            AdminService adminService,
            SystemLogService systemLogService) {
        this.adminService = adminService;
        this.systemLogService = systemLogService;
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
    @GetMapping("/users/{userId}")
    public AdminUserDetailsResponse getUserDetails(
            @PathVariable Integer userId
    ) {
        return adminService.getUserDetails(userId);
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
    @PutMapping("/complaints/{complaintId}/status")
    public Complaint updateComplaintStatus(
            @PathVariable Long complaintId,
            @RequestBody Map<String, String> request
    ) {
        return adminService.updateComplaintStatus(
                complaintId,
                request.get("status")
        );
    }
    @GetMapping("/mechanics")
    public List<AdminMechanicResponse> getAllMechanics(
            @RequestParam(required = false) String search
    ) {
        return adminService.getAllMechanics(search);
    }
    @GetMapping("/analytics")
    public AdminAnalyticsResponse getAnalytics() {
        return adminService.getAnalytics();
    }

    @GetMapping("/requests/{requestId}")
    public AdminRequestDetailsResponse getRequestById(
            @PathVariable Long requestId
    ) {
        System.out.println(">>> Controller reached. Request ID = " + requestId);
        return adminService.getRequestById(requestId);
    }
    @GetMapping("/payments")
    public List<AdminPaymentResponse> getPayments(
            @RequestParam(required = false) String status
    ) {
        return adminService.getAllPayments(status);
    }
    @GetMapping("/mechanics/{mechanicId}")
    public AdminMechanicDetailsResponse getMechanicDetails(
            @PathVariable Long mechanicId
    ) {
        return adminService.getMechanicDetails(mechanicId);
    }
    @GetMapping("/mechanics/{mechanicId}/requests")
    public List<AdminMechanicRequestResponse> getMechanicRequests(
            @PathVariable Long mechanicId
    ) {
        return adminService.getMechanicRequests(mechanicId);
    }
    @GetMapping("/mechanics/{mechanicId}/reviews")
    public List<AdminMechanicReviewResponse> getMechanicReviews(
            @PathVariable Long mechanicId
    ) {
        return adminService.getMechanicReviews(mechanicId);
    }
    @GetMapping("/towing-providers/pending")
    public List<AdminTowingProviderResponse> getPendingTowingProviders() {
        return adminService.getPendingTowingProviders();
    }
    @GetMapping("/towing-providers")
    public List<AdminTowingProviderResponse> getAllTowingProviders() {
        return adminService.getAllTowingProviders();
    }
    @GetMapping("/mechanics/pending")
    public List<AdminMechanicResponse> getPendingMechanics() {
        return adminService.getPendingMechanics();
    }

    @PutMapping("/towing-providers/{providerId}/approve")
    public AdminTowingProviderResponse approveTowingProvider(@PathVariable Long providerId) {
        return adminService.approveTowingProvider(providerId);
    }
    @PutMapping("/mechanics/{mechanicId}/approve")
    public AdminMechanicResponse approveMechanic(
            @PathVariable Long mechanicId
    ) {
        return adminService.approveMechanic(mechanicId);
    }
    @PutMapping("/towing-providers/{providerId}/reject")
    public AdminTowingProviderResponse rejectTowingProvider(
            @PathVariable Long providerId,
            @RequestBody Map<String, String> request) {
        return adminService.rejectTowingProvider(providerId, request.get("reason"));
    }
    // ===============================
// TOWING VEHICLE VERIFICATION
// ===============================

    @GetMapping("/towing-vehicles/pending")
    public List<AdminTowingVehicleResponse> getPendingTowingVehicles() {
        return adminService.getPendingTowingVehicles();
    }

    @GetMapping("/towing-vehicles")
    public List<AdminTowingVehicleResponse> getAllTowingVehicles() {
        return adminService.getAllTowingVehicles();
    }

    @PutMapping("/towing-vehicles/{vehicleId}/approve")
    public AdminTowingVehicleResponse approveTowingVehicle(
            @PathVariable Long vehicleId
    ) {
        return adminService.approveTowingVehicle(vehicleId);
    }

    @PutMapping("/towing-vehicles/{vehicleId}/reject")
    public AdminTowingVehicleResponse rejectTowingVehicle(
            @PathVariable Long vehicleId,
            @RequestBody Map<String, String> request
    ) {
        return adminService.rejectTowingVehicle(
                vehicleId,
                request.get("reason")
        );
    }
    @PutMapping("/towing-documents/{documentId}/approve")
    public AdminTowingVehicleResponse.DocumentResponse approveTowingDocument(
            @PathVariable Long documentId
    ) {
        return adminService.approveTowingDocument(documentId);
    }

    @PutMapping("/towing-documents/{documentId}/reject")
    public AdminTowingVehicleResponse.DocumentResponse rejectTowingDocument(
            @PathVariable Long documentId,
            @RequestBody Map<String, String> request
    ) {
        return adminService.rejectTowingDocument(
                documentId,
                request.get("reason")
        );
    }

    @PutMapping("/mechanics/{mechanicId}/reject")
    public AdminMechanicResponse rejectMechanic(
            @PathVariable Long mechanicId,
            @RequestBody Map<String, String> request
    ) {
        return adminService.rejectMechanic(
                mechanicId,
                request.get("reason")
        );
    }
    @GetMapping("/analytics/requests")
    public RequestAnalyticsResponse getRequestAnalytics() {
        return adminService.getRequestAnalytics();
    }
    @GetMapping("/analytics/revenue")
    public RevenueAnalyticsResponse getRevenueAnalytics() {
        return adminService.getRevenueAnalytics();
    }
    @GetMapping("/analytics/services")
    public ServiceAnalyticsResponse getServiceAnalytics() {
        return adminService.getServiceAnalytics();
    }
    @GetMapping("/analytics/providers")
    public ProviderAnalyticsResponse getProviderAnalytics() {
        return adminService.getProviderAnalytics();
    }
    @GetMapping("/analytics/customers")
    public CustomerAnalyticsResponse getCustomerAnalytics() {
        return adminService.getCustomerAnalytics();
    }
    @GetMapping("/analytics/reviews")
    public ReviewComplaintAnalyticsResponse getReviewComplaintAnalytics() {
        return adminService.getReviewComplaintAnalytics();
    }
    @GetMapping("/analytics/reports")
    public AnalyticsReportResponse getAnalyticsReport(
            @RequestParam LocalDate startDate,
            @RequestParam LocalDate endDate
    ) {
        return adminService.getAnalyticsReport(
                startDate,
                endDate
        );
    }
    @GetMapping("/analytics/location")
    public LocationAnalyticsResponse getLocationAnalytics() {
        return adminService.getLocationAnalytics();
    }
    @GetMapping("/users/{userId}/requests")
    public List<ServiceRequest> getUserRequests(
            @PathVariable Integer userId) {

        return adminService.getUserRequests(userId);
    }


    @GetMapping("/logs")
    public List<SystemLog> getSystemLogs(
            @RequestParam(required = false) String action
    ) {

        if (action != null && !action.isBlank()) {
            return systemLogService.getLogsByAction(action);
        }

        return systemLogService.getAllLogs();
    }

}