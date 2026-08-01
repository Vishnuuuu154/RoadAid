package com.roadaid.backend.service;

import com.roadaid.backend.dto.AdminDashboardResponse;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.repository.ComplaintRepository;
import com.roadaid.backend.repository.PaymentRepository;
import com.roadaid.backend.repository.ServiceRequestRepository;
import com.roadaid.backend.repository.UserRepository;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import com.roadaid.backend.dto.AdminRequestSummaryResponse;
import com.roadaid.backend.entity.ServiceRequest;
import java.util.List;


import java.util.List;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final ComplaintRepository complaintRepository;
    private final PaymentRepository paymentRepository;

    public AdminService(
            UserRepository userRepository,
            ServiceRequestRepository serviceRequestRepository,
            ComplaintRepository complaintRepository,
            PaymentRepository paymentRepository
    ) {
        this.userRepository = userRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.complaintRepository = complaintRepository;
        this.paymentRepository = paymentRepository;
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


}