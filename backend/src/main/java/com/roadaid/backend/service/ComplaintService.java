package com.roadaid.backend.service;

import com.roadaid.backend.dto.ComplaintRequest;
import com.roadaid.backend.dto.ComplaintSummaryResponse;
import com.roadaid.backend.entity.Complaint;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.repository.ComplaintRepository;
import com.roadaid.backend.repository.ServiceRequestRepository;
import com.roadaid.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ComplaintService {

    private static final long COMPLAINT_WINDOW_DAYS = 7;

    private final ComplaintRepository complaintRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final UserRepository userRepository;
    private final SystemLogService systemLogService;

    public ComplaintService(
            ComplaintRepository complaintRepository,
            ServiceRequestRepository serviceRequestRepository,
            UserRepository userRepository,
            SystemLogService systemLogService
    ) {
        this.complaintRepository = complaintRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.userRepository = userRepository;
        this.systemLogService = systemLogService;
    }

    public Complaint createComplaint(ComplaintRequest request) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User reportedBy = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ServiceRequest serviceRequest = serviceRequestRepository
                .findById(request.getServiceRequestId())
                .orElseThrow(() -> new RuntimeException("Service request not found"));

        // Complaints are only valid for completed/closed services.
        if (!"COMPLETED".equals(serviceRequest.getStatus())
                && !"CLOSED".equals(serviceRequest.getStatus())) {
            throw new RuntimeException(
                    "A complaint can only be raised after the service is completed"
            );
        }

        // The backend is the final authority for the 7-day complaint window.
        if (serviceRequest.getCompletedAt() == null) {
            throw new RuntimeException(
                    "The completion time for this service is unavailable"
            );
        }

        LocalDateTime complaintDeadline =
                serviceRequest.getCompletedAt().plusDays(COMPLAINT_WINDOW_DAYS);

        if (LocalDateTime.now().isAfter(complaintDeadline)) {
            throw new RuntimeException(
                    "The 7-day complaint window for this service has expired"
            );
        }

        User reportedAgainst;

        if (reportedBy.getRole().equals("CUSTOMER")) {

            // Prevent a customer from filing against someone else's request.
            if (serviceRequest.getCustomer() == null
                    || !serviceRequest.getCustomer().getId().equals(reportedBy.getId())) {
                throw new RuntimeException(
                        "You can only raise complaints for your own service requests"
                );
            }

            if (serviceRequest.getMechanic() == null) {
                throw new RuntimeException(
                        "No mechanic has been assigned to this request"
                );
            }

            reportedAgainst = serviceRequest.getMechanic().getUser();

        } else if (reportedBy.getRole().equals("MECHANIC")) {

            // Prevent a mechanic from filing against someone else's request.
            if (serviceRequest.getMechanic() == null
                    || !serviceRequest.getMechanic().getUser().getId().equals(reportedBy.getId())) {
                throw new RuntimeException(
                        "You can only raise complaints for your own service requests"
                );
            }

            if (serviceRequest.getCustomer() == null) {
                throw new RuntimeException(
                        "No customer is associated with this request"
                );
            }

            reportedAgainst = serviceRequest.getCustomer();

        } else {

            throw new RuntimeException(
                    "Only customers and mechanics can raise complaints"
            );
        }

        Complaint complaint = new Complaint();

        complaint.setServiceRequest(serviceRequest);
        complaint.setReportedBy(reportedBy);
        complaint.setReportedAgainst(reportedAgainst);
        complaint.setReason(request.getReason());
        complaint.setDescription(request.getDescription());
        complaint.setStatus("OPEN");
        complaint.setCreatedAt(LocalDateTime.now());

        return complaintRepository.save(complaint);
    }

    public List<Complaint> getMyComplaints() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return complaintRepository.findByReportedBy(user);
    }

    public List<ComplaintSummaryResponse> getAllComplaints() {

        List<Complaint> complaints = complaintRepository.findAll();

        return complaints.stream().map(complaint -> {

            ComplaintSummaryResponse response =
                    new ComplaintSummaryResponse();

            response.setComplaintId(complaint.getId());
            response.setServiceRequestId(
                    complaint.getServiceRequest().getId()
            );
            response.setReportedBy(
                    complaint.getReportedBy().getFullName()
            );
            response.setReportedAgainst(
                    complaint.getReportedAgainst().getFullName()
            );
            response.setReason(complaint.getReason());
            response.setDescription(complaint.getDescription());
            response.setStatus(complaint.getStatus());
            response.setCreatedAt(complaint.getCreatedAt());

            return response;

        }).toList();
    }

    public Complaint resolveComplaint(Long complaintId) {

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        complaint.setStatus("RESOLVED");

        Complaint savedComplaint = complaintRepository.save(complaint);

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        User admin = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Admin user not found"));

        systemLogService.log(
                admin,
                "COMPLAINT_RESOLVED",
                "COMPLAINT",
                complaintId,
                "Complaint resolved"
        );

        return savedComplaint;
    }

    public Complaint rejectComplaint(Long complaintId) {

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        complaint.setStatus("REJECTED");

        Complaint savedComplaint = complaintRepository.save(complaint);

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        User admin = userRepository.findByEmail(authentication.getName())
                .orElseThrow(() -> new RuntimeException("Admin user not found"));

        systemLogService.log(
                admin,
                "COMPLAINT_REJECTED",
                "COMPLAINT",
                complaintId,
                "Complaint rejected"
        );

        return savedComplaint;
    }
}
