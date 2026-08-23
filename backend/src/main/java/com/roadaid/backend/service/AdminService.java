package com.roadaid.backend.service;

import com.roadaid.backend.dto.*;
import com.roadaid.backend.entity.*;
import com.roadaid.backend.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import com.roadaid.backend.dto.AdminRequestDetailsResponse;
import java.util.List;

import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final ComplaintRepository complaintRepository;
    private final PaymentRepository paymentRepository;
    private final MechanicRepository mechanicRepository;

    public AdminService(
            UserRepository userRepository,
            ServiceRequestRepository serviceRequestRepository,
            ComplaintRepository complaintRepository,
            PaymentRepository paymentRepository,
             MechanicRepository mechanicRepository
    ) {
        this.userRepository = userRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.complaintRepository = complaintRepository;
        this.paymentRepository = paymentRepository;
        this.mechanicRepository= mechanicRepository;
    }
    public AdminDashboardResponse getDashboard() {

        AdminDashboardResponse response = new AdminDashboardResponse();

        response.setTotalCustomers(
                userRepository.countByRole("CUSTOMER")
        );

        response.setTotalMechanics(
                userRepository.countByRole("MECHANIC")
        );

        response.setTotalRequests(
                serviceRequestRepository.count()
        );

        response.setPendingRequests(
                serviceRequestRepository.countByStatus("PENDING")
        );

        response.setCompletedRequests(
                serviceRequestRepository.countByStatus("COMPLETED")
        );

        response.setTotalComplaints(
                complaintRepository.count()
        );

        response.setTotalPayments(
                paymentRepository.count()
        );

        return response;
    }
    public List<User> getAllUsers(String search) {

        if (search == null || search.isBlank()) {
            return userRepository.findByRoleNot("ADMIN");
        }

        return userRepository
                .findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
                        search,
                        search
                )
                .stream()
                .filter(user -> !"ADMIN".equals(user.getRole()))
                .toList();
    }
    public User deactivateUser(Integer userId) {

        Authentication authentication = SecurityContextHolder
                .getContext()
                .getAuthentication();

        String email = authentication.getName();

        User loggedInAdmin = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Admin not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Prevent admin from deactivating themselves
        if (loggedInAdmin.getId().equals(userId)) {
            throw new RuntimeException("You cannot deactivate your own account.");
        }

        // Prevent deactivating any admin account
        if ("ADMIN".equals(user.getRole())) {
            throw new RuntimeException("Admin accounts cannot be deactivated.");
        }

        user.setIsActive(false);

        return userRepository.save(user);
    }
    public User activateUser(Integer userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if ("ADMIN".equals(user.getRole())) {
            throw new RuntimeException("Admin accounts cannot be activated using this endpoint.");
        }

        user.setIsActive(true);

        return userRepository.save(user);
    }
    public List<AdminRequestSummaryResponse> getAllRequests(
            String status,
            String customer
    ) {

        List<ServiceRequest> requests;

        if ((status == null || status.isBlank()) &&
                (customer == null || customer.isBlank())) {

            requests = serviceRequestRepository.findAllByOrderByCreatedAtDesc();

        } else if (status != null && !status.isBlank() &&
                (customer == null || customer.isBlank())) {

            requests = serviceRequestRepository
                    .findByStatusOrderByCreatedAtDesc(status);

        } else if ((status == null || status.isBlank()) &&
                customer != null && !customer.isBlank()) {

            requests = serviceRequestRepository
                    .findByCustomer_FullNameContainingIgnoreCaseOrderByCreatedAtDesc(customer);

        } else {

            requests = serviceRequestRepository
                    .findByCustomer_FullNameContainingIgnoreCaseOrderByCreatedAtDesc(customer)
                    .stream()
                    .filter(r -> r.getStatus().equalsIgnoreCase(status))
                    .toList();
        }

        return requests.stream().map(request -> {

            AdminRequestSummaryResponse response =
                    new AdminRequestSummaryResponse();

            response.setRequestId(request.getId());

            response.setCustomerName(
                    request.getCustomer().getFullName()
            );

            if (request.getMechanic() != null) {
                response.setMechanicName(
                        request.getMechanic().getUser().getFullName()
                );
            } else {
                response.setMechanicName("Not Assigned");
            }

            response.setVehicle(
                    request.getVehicle().getBrand() + " " +
                            request.getVehicle().getModel()
            );

            response.setIssue(request.getIssueDescription());
            response.setLocation(request.getLocation());
            response.setStatus(request.getStatus());
            response.setCreatedAt(request.getCreatedAt());

            return response;

        }).toList();
    }
    public List<ComplaintSummaryResponse> getAllComplaints() {

        List<Complaint> complaints = complaintRepository.findAll();

        return complaints.stream().map(complaint -> {

            ComplaintSummaryResponse response = new ComplaintSummaryResponse();

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
    public List<AdminMechanicResponse> getAllMechanics(String search) {

        List<Mechanic> mechanics = mechanicRepository.findAll();

        if (search != null && !search.isBlank()) {

            String keyword = search.toLowerCase();

            mechanics = mechanics.stream()
                    .filter(m ->
                            m.getUser().getFullName().toLowerCase().contains(keyword) ||
                                    m.getWorkshopName().toLowerCase().contains(keyword)
                    )
                    .toList();

        }

        return mechanics.stream().map(mechanic -> {

            AdminMechanicResponse response = new AdminMechanicResponse();

            response.setMechanicId(mechanic.getId());
            response.setFullName(mechanic.getUser().getFullName());
            response.setWorkshopName(mechanic.getWorkshopName());
            response.setContactNumber(mechanic.getContactNumber());
            response.setExperienceYears(mechanic.getExperienceYears());
            response.setAvailable(mechanic.getAvailable());

            return response;

        }).toList();

    }
    public AdminAnalyticsResponse getAnalytics() {

        AdminAnalyticsResponse response = new AdminAnalyticsResponse();

        response.setTotalCustomers(
                userRepository.countByRole("CUSTOMER")
        );

        response.setTotalMechanics(
                userRepository.countByRole("MECHANIC")
        );

        response.setTotalRequests(
                serviceRequestRepository.count()
        );

        response.setPendingRequests(
                serviceRequestRepository.countByStatus("PENDING")
        );

        response.setCompletedRequests(
                serviceRequestRepository.countByStatus("COMPLETED")
        );

        response.setCancelledRequests(
                serviceRequestRepository.countByStatus("CANCELLED")
        );

        response.setTotalComplaints(
                complaintRepository.count()
        );

        response.setTotalPayments(
                paymentRepository.count()
        );

        return response;

    }
    public AdminRequestDetailsResponse getRequestById(Long requestId) {

        ServiceRequest request = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        AdminRequestDetailsResponse response = new AdminRequestDetailsResponse();

        response.setRequestId(request.getId());

        response.setCustomerName(
                request.getCustomer().getFullName()
        );

        if (request.getMechanic() != null) {

            response.setMechanicName(
                    request.getMechanic().getUser().getFullName()
            );

        } else {

            response.setMechanicName("Not Assigned");

        }

        response.setVehicle(
                request.getVehicle().getBrand() + " " +
                        request.getVehicle().getModel()
        );

        response.setIssue(
                request.getIssueDescription()
        );

        response.setLocation(
                request.getLocation()
        );

        response.setStatus(
                request.getStatus()
        );

        response.setCreatedAt(
                request.getCreatedAt()
        );

        return response;

    }


}