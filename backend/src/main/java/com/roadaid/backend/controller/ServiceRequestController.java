package com.roadaid.backend.controller;

import com.roadaid.backend.dto.*;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.service.ServiceRequestService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.io.IOException;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.bind.annotation.RequestPart;


@RestController
@RequestMapping("/api/requests")
public class ServiceRequestController {

    private final ServiceRequestService serviceRequestService;

    public ServiceRequestController(ServiceRequestService serviceRequestService) {
        this.serviceRequestService = serviceRequestService;
    }
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ServiceRequest createRequest(
            @RequestPart("request") ServiceRequest serviceRequest,
            @RequestParam Long vehicleId,
            @RequestParam Long mechanicId,
            @RequestPart(value = "images", required = false)
            List<MultipartFile> images
    ) throws IOException {

        return serviceRequestService.createRequest(
                serviceRequest,
                vehicleId,
                mechanicId,
                images
        );
    }

    @GetMapping("/pending")
    public List<ServiceRequest> getPendingRequests() {
        return serviceRequestService.getPendingRequests();
    }
    @PutMapping("/{requestId}/accept")
    public ServiceRequest acceptRequest(@PathVariable Long requestId) {
        return serviceRequestService.acceptRequest(requestId);
    }
    @GetMapping("/assigned")
    public List<ServiceRequest> getMyAssignedRequests() {
        return serviceRequestService.getMyAssignedRequests();
    }
    @PutMapping("/{requestId}/start")
    public ServiceRequest startWork(@PathVariable Long requestId) {
        return serviceRequestService.startWork(requestId);
    }
    @PutMapping("/{requestId}/arrived")
    public ServiceRequest markArrived(@PathVariable Long requestId) {
        return serviceRequestService.markArrived(requestId);
    }

    @PutMapping("/{requestId}/start-repair")
    public ServiceRequest startRepair(@PathVariable Long requestId) {
        return serviceRequestService.startRepair(requestId);
    }
    @PutMapping("/{requestId}/complete")
    public ServiceRequest completeWork(@PathVariable Long requestId) {
        return serviceRequestService.completeWork(requestId);
    }
    @GetMapping("/my/active")
    public List<ServiceRequest> getMyActiveRequests() {
        return serviceRequestService.getMyActiveRequests();
    }
    @PutMapping("/{requestId}/cancel")
    public ServiceRequest cancelRequest(@PathVariable Long requestId) {
        return serviceRequestService.cancelRequest(requestId);
    }
    @PutMapping("/{requestId}/reject")
    public ServiceRequest rejectRequest(@PathVariable Long requestId) {
        return serviceRequestService.rejectRequest(requestId);

    }
    @PutMapping("/{requestId}/reassign/{mechanicId}")
    public ServiceRequest reassignMechanic(
            @PathVariable Long requestId,
            @PathVariable Long mechanicId
    ) {
        return serviceRequestService.reassignMechanic(
                requestId,
                mechanicId
        );
    }
    @PutMapping("/{requestId}/auto-reassign")
    public ServiceRequest autoReassignMechanic(
            @PathVariable Long requestId
    ) {
        return serviceRequestService.autoReassignMechanic(requestId);
    }
    @GetMapping("/{requestId}")
    public ServiceRequest trackRequest(@PathVariable Long requestId) {
        return serviceRequestService.trackRequest(requestId);
    }
    @GetMapping("/{requestId}/images")
    public List<RequestImageResponse> getRequestImages(
            @PathVariable Long requestId
    ) {
        return serviceRequestService.getRequestImages(requestId);
    }
    @GetMapping("/{requestId}/details")
    public RequestDetailsResponse getRequestDetails(
            @PathVariable Long requestId
    ) {
        return serviceRequestService.getRequestDetails(requestId);
    }
    @GetMapping("/assigned/summary")
    public List<MechanicRequestSummaryResponse> getAssignedRequestSummaries() {
        return serviceRequestService.getAssignedRequestSummaries();
    }
    @GetMapping("/my")
    public List<CustomerRequestSummaryResponse> getMyRequests() {
        return serviceRequestService.getMyRequests();
    }
    @GetMapping("/{requestId}/mechanic-details")
    public RequestDetailsResponse getMechanicRequestDetails(
            @PathVariable Long requestId
    ) {
        return serviceRequestService.getMechanicRequestDetails(requestId);
    }
    @GetMapping("/{requestId}/tracking")
    public LiveTrackingResponse getLiveTracking(
            @PathVariable Long requestId
    ) {
        return serviceRequestService.getLiveTracking(requestId);
    }
}