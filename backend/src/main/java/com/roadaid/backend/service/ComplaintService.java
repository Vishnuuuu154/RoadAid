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

    private final ComplaintRepository complaintRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final UserRepository userRepository;

    public ComplaintService(
            ComplaintRepository complaintRepository,
            ServiceRequestRepository serviceRequestRepository,
            UserRepository userRepository
    ) {
        this.complaintRepository = complaintRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.userRepository = userRepository;
    }
    public Complaint createComplaint(ComplaintRequest request) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User reportedBy = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ServiceRequest serviceRequest = serviceRequestRepository
                .findById(request.getServiceRequestId())
                .orElseThrow(() -> new RuntimeException("Service request not found"));

        User reportedAgainst;

        if (reportedBy.getRole().equals("CUSTOMER")) {

            if (serviceRequest.getMechanic() == null) {
                throw new RuntimeException("No mechanic has been assigned to this request yet");
            }

            reportedAgainst = serviceRequest.getMechanic().getUser();

        } else {

            reportedAgainst = serviceRequest.getCustomer();
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

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
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

        return complaintRepository.save(complaint);
    }
    public Complaint rejectComplaint(Long complaintId) {

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() -> new RuntimeException("Complaint not found"));

        complaint.setStatus("REJECTED");

        return complaintRepository.save(complaint);
    }
}