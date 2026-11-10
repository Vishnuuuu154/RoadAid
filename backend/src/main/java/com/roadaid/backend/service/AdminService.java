package com.roadaid.backend.service;

import com.roadaid.backend.dto.*;
import com.roadaid.backend.entity.*;
import com.roadaid.backend.repository.*;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.security.core.Authentication;
import com.roadaid.backend.dto.AdminRequestDetailsResponse;

import java.util.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.stream.Collectors;import com.roadaid.backend.dto.ProviderAnalyticsResponse;import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
public class AdminService {

    private final UserRepository userRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final ComplaintRepository complaintRepository;
    private final PaymentRepository paymentRepository;
    private final MechanicRepository mechanicRepository;
    private final TowingProviderRepository towingProviderRepository;
    private final TowingVehicleRepository towingVehicleRepository;
    private final TowingDocumentRepository towingDocumentRepository;
    private final ReviewRepository reviewRepository;
    private final NotificationService notificationService;
    private final QuotationRepository quotationRepository;
    private final SystemLogService systemLogService;

    public AdminService(
            UserRepository userRepository,
            ServiceRequestRepository serviceRequestRepository,
            ComplaintRepository complaintRepository,
            PaymentRepository paymentRepository,
             MechanicRepository mechanicRepository,
            ReviewRepository reviewRepository,
            NotificationService notificationService,
            QuotationRepository quotationRepository,
            SystemLogService systemLogService,
            TowingProviderRepository towingProviderRepository,
            TowingVehicleRepository towingVehicleRepository,
            TowingDocumentRepository towingDocumentRepository
    ) {
        this.userRepository = userRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.complaintRepository = complaintRepository;
        this.paymentRepository = paymentRepository;
        this.mechanicRepository= mechanicRepository;
        this.reviewRepository = reviewRepository;
        this.notificationService = notificationService;
        this.quotationRepository = quotationRepository;
        this.systemLogService = systemLogService;
        this.towingProviderRepository = towingProviderRepository;
        this.towingVehicleRepository = towingVehicleRepository;
        this.towingDocumentRepository = towingDocumentRepository;
    }
    public AdminDashboardResponse getDashboard() {

        AdminDashboardResponse response =
                new AdminDashboardResponse();

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

        long completedRequests =
                serviceRequestRepository.countByStatus("COMPLETED");

        long closedRequests =
                serviceRequestRepository.countByStatus("CLOSED");

        response.setCompletedRequests(
                completedRequests + closedRequests
        );

        response.setCancelledRequests(
                serviceRequestRepository.countByStatus("CANCELLED")
        );

        response.setInProgressRequests(
                serviceRequestRepository.countByStatus("IN_PROGRESS")
        );

        response.setQuotationPendingRequests(
                serviceRequestRepository.countByStatus("QUOTATION_PENDING")
        );

        response.setTotalComplaints(
                complaintRepository.count()
        );

        response.setTotalPayments(
                paymentRepository.count()
        );

        response.setOnlineMechanics(
                mechanicRepository.countByAvailable(true)
        );

        Double revenue =
                paymentRepository.getTotalSuccessfulRevenue();

        response.setTotalRevenue(
                revenue != null ? revenue : 0.0
        );
        response.setPendingProviders(
                mechanicRepository.countByVerificationStatus("PENDING")
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
    public AdminUserDetailsResponse getUserDetails(Integer userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        // Admin accounts should not be exposed through this endpoint
        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException("Admin profile cannot be viewed here.");
        }

        AdminUserDetailsResponse response =
                new AdminUserDetailsResponse();

        response.setUserId(user.getId());
        response.setFullName(user.getFullName());
        response.setEmail(user.getEmail());
        response.setPhone(user.getPhone());
        response.setRole(user.getRole());
        response.setProfileImage(user.getProfileImage());
        response.setIsActive(user.getIsActive());
        response.setCreatedAt(user.getCreatedAt());
        response.setUpdatedAt(user.getUpdatedAt());

        /*
         * Get service requests based on the user's role
         */
        List<ServiceRequest> requests;

        if ("MECHANIC".equalsIgnoreCase(user.getRole())) {

            Mechanic mechanic = mechanicRepository.findByUser(user)
                    .orElse(null);

            if (mechanic != null) {

                // Provider information
                response.setWorkshopName(mechanic.getWorkshopName());
                response.setWorkshopAddress(mechanic.getWorkshopAddress());
                response.setContactNumber(mechanic.getContactNumber());
                response.setExperienceYears(mechanic.getExperienceYears());
                response.setAvailable(mechanic.getAvailable());
                response.setVerificationStatus(mechanic.getVerificationStatus());
                response.setRejectionReason(mechanic.getRejectionReason());

                Double averageRating =
                        reviewRepository.findAverageRatingByMechanic(mechanic);

                response.setAverageRating(
                        averageRating != null ? averageRating : 0.0
                );

                // Mechanic's assigned requests
                requests = serviceRequestRepository
                        .findByMechanic(mechanic);

            } else {
                requests = List.of();
            }

        } else {

            // Customer's requests
            requests = serviceRequestRepository
                    .findByCustomer(user);
        }


// Activity statistics
        response.setTotalRequests(requests.size());

        response.setCompletedRequests(
                requests.stream()
                        .filter(request ->
                                "COMPLETED".equalsIgnoreCase(request.getStatus())
                                        || "CLOSED".equalsIgnoreCase(request.getStatus()))
                        .count()
        );

        response.setCancelledRequests(
                requests.stream()
                        .filter(request ->
                                "CANCELLED".equalsIgnoreCase(request.getStatus()))
                        .count()
        );
        return response;
    }
    public User deactivateUser(Integer userId) {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String email = authentication.getName();

        User loggedInAdmin = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("Admin not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        // Prevent admin from deactivating themselves
        if (loggedInAdmin.getId().equals(userId)) {
            throw new RuntimeException(
                    "You cannot deactivate your own account."
            );
        }

        // Prevent deactivating any admin account
        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException(
                    "Admin accounts cannot be deactivated."
            );
        }

        user.setIsActive(false);

        User savedUser = userRepository.save(user);

        // Audit log
        systemLogService.log(
                loggedInAdmin,
                "USER_DEACTIVATED",
                "USER",
                userId.longValue(),
                "User account deactivated"
        );

        return savedUser;
    }
    public User activateUser(Integer userId) {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String email = authentication.getName();

        User loggedInAdmin = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("Admin not found"));

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException(
                    "Admin accounts cannot be activated using this endpoint."
            );
        }

        user.setIsActive(true);

        User savedUser = userRepository.save(user);

        // Audit log
        systemLogService.log(
                loggedInAdmin,
                "USER_ACTIVATED",
                "USER",
                userId.longValue(),
                "User account activated"
        );

        return savedUser;
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

            if ("COMPLETED".equalsIgnoreCase(status)) {

                requests = serviceRequestRepository
                        .findByStatusInOrderByCreatedAtDesc(
                                List.of("COMPLETED", "CLOSED")
                        );

            } else {

                requests = serviceRequestRepository
                        .findByStatusOrderByCreatedAtDesc(status);

            }

        } else if ((status == null || status.isBlank()) &&
                customer != null && !customer.isBlank()) {

            requests = serviceRequestRepository
                    .findByCustomer_FullNameContainingIgnoreCaseOrderByCreatedAtDesc(customer);

        } else {

            requests = serviceRequestRepository
                    .findByCustomer_FullNameContainingIgnoreCaseOrderByCreatedAtDesc(customer)
                    .stream()
                    .filter(r -> {

                        if ("COMPLETED".equalsIgnoreCase(status)) {

                            return "COMPLETED".equalsIgnoreCase(r.getStatus())
                                    || "CLOSED".equalsIgnoreCase(r.getStatus());

                        }

                        return r.getStatus().equalsIgnoreCase(status);

                    })
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
    public Complaint updateComplaintStatus(
            Long complaintId,
            String status
    ) {
        if (status == null || status.isBlank()) {
            throw new RuntimeException("Complaint status is required");
        }

        String newStatus = status.trim().toUpperCase();

        if (!newStatus.equals("OPEN")
                && !newStatus.equals("IN_PROGRESS")
                && !newStatus.equals("RESOLVED")) {
            throw new RuntimeException("Invalid complaint status");
        }

        Complaint complaint = complaintRepository.findById(complaintId)
                .orElseThrow(() ->
                        new RuntimeException("Complaint not found")
                );

        complaint.setStatus(newStatus);

        Complaint savedComplaint =
                complaintRepository.save(complaint);

        return savedComplaint;
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
            response.setVerificationStatus(
                    mechanic.getVerificationStatus()
            );

            response.setRejectionReason(
                    mechanic.getRejectionReason()
            );

            return response;

        }).toList();

    }
    public AdminAnalyticsResponse getAnalytics() {

        AdminAnalyticsResponse response = new AdminAnalyticsResponse();

        // =========================
        // Overall KPIs
        // =========================

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

        long completedRequests =
                serviceRequestRepository.countByStatus("COMPLETED");

        long closedRequests =
                serviceRequestRepository.countByStatus("CLOSED");

        response.setCompletedRequests(
                completedRequests + closedRequests
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

        // =========================
        // Additional KPIs
        // =========================

        Double totalRevenue = paymentRepository.getTotalSuccessfulRevenue();

        response.setTotalRevenue(
                totalRevenue != null ? totalRevenue : 0.0
        );

        response.setActiveMechanics(
                mechanicRepository.countByAvailable(true)
        );

        response.setPendingProviders(
                mechanicRepository.countByVerificationStatus("PENDING")
        );


        // =========================
        // Current & Previous Month
        // =========================

        LocalDate today = LocalDate.now();

        LocalDateTime currentMonthStart =
                today.withDayOfMonth(1).atStartOfDay();

        LocalDateTime nextMonthStart =
                today.plusMonths(1)
                        .withDayOfMonth(1)
                        .atStartOfDay();

        LocalDateTime lastMonthStart =
                today.minusMonths(1)
                        .withDayOfMonth(1)
                        .atStartOfDay();


        // =========================
        // Requests
        // =========================

        response.setMonthlyRequests(
                serviceRequestRepository.countByCreatedAtBetween(
                        currentMonthStart,
                        nextMonthStart
                )
        );

        response.setLastMonthRequests(
                serviceRequestRepository.countByCreatedAtBetween(
                        lastMonthStart,
                        currentMonthStart
                )
        );


        // =========================
        // Completed Requests
        // =========================

        long monthlyCompleted =
                serviceRequestRepository.countByCreatedAtBetweenAndStatus(
                        currentMonthStart,
                        nextMonthStart,
                        "COMPLETED"
                )
                        +
                        serviceRequestRepository.countByCreatedAtBetweenAndStatus(
                                currentMonthStart,
                                nextMonthStart,
                                "CLOSED"
                        );

        long lastMonthCompleted =
                serviceRequestRepository.countByCreatedAtBetweenAndStatus(
                        lastMonthStart,
                        currentMonthStart,
                        "COMPLETED"
                )
                        +
                        serviceRequestRepository.countByCreatedAtBetweenAndStatus(
                                lastMonthStart,
                                currentMonthStart,
                                "CLOSED"
                        );

        response.setMonthlyCompleted(monthlyCompleted);
        response.setLastMonthCompleted(lastMonthCompleted);


        // =========================
        // Customers
        // =========================

        response.setMonthlyCustomers(
                userRepository.countByRoleAndCreatedAtBetween(
                        "CUSTOMER",
                        currentMonthStart,
                        nextMonthStart
                )
        );

        response.setLastMonthCustomers(
                userRepository.countByRoleAndCreatedAtBetween(
                        "CUSTOMER",
                        lastMonthStart,
                        currentMonthStart
                )
        );


        // =========================
        // Revenue
        // =========================

        Double monthlyRevenue =
                paymentRepository.getRevenueBetween(
                        currentMonthStart,
                        nextMonthStart
                );

        Double lastMonthRevenue =
                paymentRepository.getRevenueBetween(
                        lastMonthStart,
                        currentMonthStart
                );

        response.setMonthlyRevenue(
                monthlyRevenue != null ? monthlyRevenue : 0.0
        );

        response.setLastMonthRevenue(
                lastMonthRevenue != null ? lastMonthRevenue : 0.0
        );


        return response;
    }
    public RequestAnalyticsResponse getRequestAnalytics() {

        RequestAnalyticsResponse response =
                new RequestAnalyticsResponse();

        // Overall request counts

        response.setTotalRequests(
                serviceRequestRepository.count()
        );

        response.setPendingRequests(
                serviceRequestRepository.countByStatus("PENDING")
        );

        response.setWaitingForQuotation(
                serviceRequestRepository.countByStatus("WAITING_FOR_QUOTATION")
        );

        response.setQuotationPending(
                serviceRequestRepository.countByStatus("QUOTATION_PENDING")
        );

        response.setInProgress(
                serviceRequestRepository.countByStatus("IN_PROGRESS")
        );

        response.setCompletedRequests(
                serviceRequestRepository.countByStatus("COMPLETED")
        );

        response.setClosedRequests(
                serviceRequestRepository.countByStatus("CLOSED")
        );

        response.setCancelledRequests(
                serviceRequestRepository.countByStatus("CANCELLED")
        );


        // Current and previous month

        LocalDate today = LocalDate.now();

        LocalDateTime currentMonthStart =
                today.withDayOfMonth(1).atStartOfDay();

        LocalDateTime nextMonthStart =
                today.plusMonths(1)
                        .withDayOfMonth(1)
                        .atStartOfDay();

        LocalDateTime lastMonthStart =
                today.minusMonths(1)
                        .withDayOfMonth(1)
                        .atStartOfDay();


        response.setMonthlyRequests(
                serviceRequestRepository.countByCreatedAtBetween(
                        currentMonthStart,
                        nextMonthStart
                )
        );

        response.setLastMonthRequests(
                serviceRequestRepository.countByCreatedAtBetween(
                        lastMonthStart,
                        currentMonthStart
                )
        );


        // Daily request trend

        List<ServiceRequest> requests =
                serviceRequestRepository.findRequestsBetween(
                        currentMonthStart,
                        nextMonthStart
                );

        Map<String, Long> dailyRequests =
                requests.stream()
                        .collect(Collectors.groupingBy(
                                request ->
                                        request.getCreatedAt()
                                                .toLocalDate()
                                                .toString(),
                                TreeMap::new,
                                Collectors.counting()
                        ));

        response.setDailyRequests(dailyRequests);


        return response;
    }
    public AdminRequestDetailsResponse getRequestById(Long requestId) {

        ServiceRequest request = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        AdminRequestDetailsResponse response = new AdminRequestDetailsResponse();

        // =========================
        // BASIC REQUEST DETAILS
        // =========================

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


        // =========================
        // QUOTATION
        // =========================

        quotationRepository.findByServiceRequest(request)
                .ifPresent(quotation -> {

                    AdminRequestDetailsResponse.QuotationDetails quotationDetails =
                            new AdminRequestDetailsResponse.QuotationDetails();

                    quotationDetails.setLabourCharge(
                            quotation.getLabourCharge()
                    );

                    quotationDetails.setPartsCharge(
                            quotation.getPartsCharge()
                    );

                    quotationDetails.setTravelFee(
                            quotation.getTravelFee()
                    );

                    quotationDetails.setTotalAmount(
                            quotation.getTotalAmount()
                    );

                    response.setQuotation(quotationDetails);


                    // =========================
                    // PAYMENT
                    // =========================

                    paymentRepository.findByQuotation(quotation)
                            .ifPresent(payment -> {

                                AdminRequestDetailsResponse.PaymentDetails paymentDetails =
                                        new AdminRequestDetailsResponse.PaymentDetails();

                                paymentDetails.setAmount(
                                        payment.getAmount()
                                );

                                paymentDetails.setPaymentMethod(
                                        payment.getPaymentMethod()
                                );

                                paymentDetails.setPaymentStatus(
                                        payment.getPaymentStatus()
                                );

                                paymentDetails.setPaymentDate(
                                        payment.getPaymentDate()
                                );

                                response.setPayment(paymentDetails);
                            });
                });


        // =========================
        // REVIEW
        // =========================

        reviewRepository.findByServiceRequest(request)
                .ifPresent(review -> {

                    AdminRequestDetailsResponse.ReviewDetails reviewDetails =
                            new AdminRequestDetailsResponse.ReviewDetails();

                    reviewDetails.setRating(
                            review.getRating()
                    );

                    reviewDetails.setComment(
                            review.getComment()
                    );

                    reviewDetails.setCreatedAt(
                            review.getCreatedAt()
                    );

                    response.setReview(reviewDetails);
                });


        return response;
    }
    public List<AdminPaymentResponse> getAllPayments(String status) {

        List<Payment> payments =
                paymentRepository.findAllByOrderByPaymentDateDesc();

        return payments.stream()

                .filter(payment ->
                        status == null ||
                                status.isBlank() ||
                                payment.getPaymentStatus().equalsIgnoreCase(status)
                )

                .map(payment -> {

                    AdminPaymentResponse response =
                            new AdminPaymentResponse();

                    response.setPaymentId(payment.getId());

                    response.setAmount(payment.getAmount());


                    response.setPaymentMethod(
                            payment.getPaymentMethod()
                    );

                    response.setPaymentStatus(
                            payment.getPaymentStatus()
                    );

                    response.setPaymentDate(
                            payment.getPaymentDate()
                    );

                    if (payment.getQuotation() != null) {

                        ServiceRequest request =
                                payment.getQuotation().getServiceRequest();

                        if (request != null) {

                            response.setRequestId(
                                    request.getId()
                            );

                            if (request.getCustomer() != null) {

                                response.setCustomerName(
                                        request.getCustomer()
                                                .getFullName()
                                );

                            }

                            if (request.getMechanic() != null) {

                                response.setMechanicName(
                                        request.getMechanic()
                                                .getUser()
                                                .getFullName()
                                );

                            }

                        }

                    }

                    return response;

                })

                .toList();
    }
    public AdminMechanicDetailsResponse getMechanicDetails(Long mechanicId) {

        Mechanic mechanic =
                mechanicRepository.findById(mechanicId)
                        .orElseThrow(() ->
                                new RuntimeException("Mechanic not found")
                        );

        AdminMechanicDetailsResponse response =
                new AdminMechanicDetailsResponse();

        response.setMechanicId(mechanic.getId());

        response.setFullName(
                mechanic.getUser().getFullName()
        );

        response.setEmail(
                mechanic.getUser().getEmail()
        );

        response.setPhone(
                mechanic.getUser().getPhone()
        );

        response.setWorkshopName(
                mechanic.getWorkshopName()
        );

        response.setWorkshopAddress(
                mechanic.getWorkshopAddress()
        );

        response.setContactNumber(
                mechanic.getContactNumber()
        );

        response.setExperienceYears(
                mechanic.getExperienceYears()
        );

        response.setAvailable(
                mechanic.getAvailable()
        );
        Double averageRating =
                reviewRepository.findAverageRatingByMechanic(mechanic);

        response.setAverageRating(
                averageRating != null ? averageRating : 0.0
        );

        long totalRequests =
                serviceRequestRepository
                        .findByMechanic(mechanic)
                        .size();

        long completedRequests =
                serviceRequestRepository
                        .findByMechanic(mechanic)
                        .stream()
                        .filter(request ->
                                "COMPLETED".equalsIgnoreCase(
                                        request.getStatus()
                                )
                                        ||
                                        "CLOSED".equalsIgnoreCase(
                                                request.getStatus()
                                        )
                        )
                        .count();

        response.setTotalRequests(totalRequests);

        response.setCompletedRequests(completedRequests);

        return response;
    }
    public List<AdminMechanicRequestResponse> getMechanicRequests(
            Long mechanicId
    ) {

        Mechanic mechanic =
                mechanicRepository.findById(mechanicId)
                        .orElseThrow(() ->
                                new RuntimeException("Mechanic not found")
                        );

        return serviceRequestRepository
                .findByMechanic(mechanic)
                .stream()
                .sorted(
                        Comparator.comparing(
                                ServiceRequest::getCreatedAt
                        ).reversed()
                )
                .map(request -> {

                    AdminMechanicRequestResponse response =
                            new AdminMechanicRequestResponse();

                    response.setRequestId(
                            request.getId()
                    );

                    response.setCustomerName(
                            request.getCustomer().getFullName()
                    );

                    if (request.getVehicle() != null) {

                        response.setVehicle(
                                request.getVehicle().getBrand()
                                        + " "
                                        + request.getVehicle().getModel()
                        );

                    } else {

                        response.setVehicle("Not available");

                    }

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

                })
                .toList();
    }
    public List<AdminMechanicReviewResponse> getMechanicReviews(
            Long mechanicId
    ) {

        Mechanic mechanic =
                mechanicRepository.findById(mechanicId)
                        .orElseThrow(() ->
                                new RuntimeException("Mechanic not found")
                        );

        return reviewRepository
                .findByMechanic(mechanic)
                .stream()
                .sorted(
                        Comparator.comparing(
                                Review::getCreatedAt,
                                Comparator.nullsLast(Comparator.naturalOrder())
                        ).reversed()
                )

                .map(review -> {

                    AdminMechanicReviewResponse response =
                            new AdminMechanicReviewResponse();

                    response.setReviewId(review.getId());

                    if (review.getServiceRequest() != null) {
                        response.setRequestId(
                                review.getServiceRequest().getId()
                        );
                    }

                    if (review.getCustomer() != null) {
                        response.setCustomerName(
                                review.getCustomer().getFullName()
                        );
                    }

                    response.setRating(review.getRating());
                    response.setComment(review.getComment());
                    response.setCreatedAt(review.getCreatedAt());

                    return response;

                })
                .toList();
    }
    public List<AdminTowingProviderResponse> getPendingTowingProviders() {
        return towingProviderRepository.findByVerificationStatus("PENDING")
                .stream()
                .map(this::toTowingProviderResponse)
                .toList();
    }
    public List<AdminTowingProviderResponse> getAllTowingProviders() {
        return towingProviderRepository.findAll()
                .stream()
                .map(this::toTowingProviderResponse)
                .toList();
    }
    // ===============================
// TOWING VEHICLE VERIFICATION
// ===============================

    public List<AdminTowingVehicleResponse> getPendingTowingVehicles() {

        return towingVehicleRepository.findByVerificationStatus("PENDING")
                .stream()
                .map(this::toAdminTowingVehicleResponse)
                .toList();
    }

    public List<AdminTowingVehicleResponse> getAllTowingVehicles() {

        return towingVehicleRepository.findAll()
                .stream()
                .map(this::toAdminTowingVehicleResponse)
                .toList();
    }

    public AdminTowingVehicleResponse approveTowingVehicle(Long vehicleId) {

        TowingVehicle vehicle = towingVehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Towing vehicle not found"));

        vehicle.setVerificationStatus("APPROVED");
        vehicle.setRejectionReason(null);

        TowingVehicle savedVehicle = towingVehicleRepository.save(vehicle);

        notificationService.notifyUser(
                savedVehicle.getProvider().getUser(),
                "Your towing vehicle " + savedVehicle.getRegistrationNumber()
                        + " has been approved."
        );

        systemLogService.log(
                getCurrentAdmin(),
                "TOWING_VEHICLE_APPROVED",
                "TOWING_VEHICLE",
                vehicleId,
                "Towing vehicle verification approved"
        );

        return toAdminTowingVehicleResponse(savedVehicle);
    }

    public AdminTowingVehicleResponse rejectTowingVehicle(
            Long vehicleId,
            String reason
    ) {

        TowingVehicle vehicle = towingVehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Towing vehicle not found"));

        if (reason == null || reason.isBlank()) {
            throw new RuntimeException("Rejection reason is required.");
        }

        vehicle.setVerificationStatus("REJECTED");
        vehicle.setRejectionReason(reason.trim());
        vehicle.setAvailable(false);

        TowingVehicle savedVehicle = towingVehicleRepository.save(vehicle);

        notificationService.notifyUser(
                savedVehicle.getProvider().getUser(),
                "Your towing vehicle " + savedVehicle.getRegistrationNumber()
                        + " was rejected. Reason: " + reason.trim()
        );

        systemLogService.log(
                getCurrentAdmin(),
                "TOWING_VEHICLE_REJECTED",
                "TOWING_VEHICLE",
                vehicleId,
                "Towing vehicle verification rejected. Reason: " + reason.trim()
        );

        return toAdminTowingVehicleResponse(savedVehicle);
    }
    public AdminTowingVehicleResponse.DocumentResponse approveTowingDocument(
            Long documentId
    ) {

        TowingDocument document = towingDocumentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        document.setVerificationStatus("APPROVED");
        document.setRejectionReason(null);

        TowingDocument savedDocument = towingDocumentRepository.save(document);

        return new AdminTowingVehicleResponse.DocumentResponse(
                savedDocument.getId(),
                savedDocument.getDocumentType(),
                savedDocument.getFileName(),
                savedDocument.getVerificationStatus(),
                savedDocument.getRejectionReason(),
                savedDocument.getUploadedAt()
        );
    }

    public AdminTowingVehicleResponse.DocumentResponse rejectTowingDocument(
            Long documentId,
            String reason
    ) {

        TowingDocument document = towingDocumentRepository.findById(documentId)
                .orElseThrow(() -> new RuntimeException("Document not found"));

        if (reason == null || reason.isBlank()) {
            throw new RuntimeException("Rejection reason is required.");
        }

        document.setVerificationStatus("REJECTED");
        document.setRejectionReason(reason.trim());

        TowingDocument savedDocument = towingDocumentRepository.save(document);

        return new AdminTowingVehicleResponse.DocumentResponse(
                savedDocument.getId(),
                savedDocument.getDocumentType(),
                savedDocument.getFileName(),
                savedDocument.getVerificationStatus(),
                savedDocument.getRejectionReason(),
                savedDocument.getUploadedAt()
        );
    }

    private AdminTowingVehicleResponse toAdminTowingVehicleResponse(
            TowingVehicle vehicle
    ) {

        TowingProvider provider = vehicle.getProvider();
        User user = provider.getUser();

        List<AdminTowingVehicleResponse.DocumentResponse> documents =
                towingDocumentRepository.findByVehicle(vehicle)
                        .stream()
                        .map(document ->
                                new AdminTowingVehicleResponse.DocumentResponse(
                                        document.getId(),
                                        document.getDocumentType(),
                                        document.getFileName(),
                                        document.getVerificationStatus(),
                                        document.getRejectionReason(),
                                        document.getUploadedAt()
                                )
                        )
                        .toList();

        return new AdminTowingVehicleResponse(
                vehicle.getId(),
                provider.getId(),
                provider.getBusinessName(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                vehicle.getRegistrationNumber(),
                vehicle.getVehicleType(),
                vehicle.getBrand(),
                vehicle.getModel(),
                vehicle.getManufacturingYear(),
                vehicle.getTowingCapacity(),
                vehicle.getVerificationStatus(),
                vehicle.getRejectionReason(),
                vehicle.getAvailable(),
                documents
        );
    }
    public AdminTowingProviderResponse approveTowingProvider(Long providerId) {

        TowingProvider provider = towingProviderRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Towing provider not found"));

        provider.setVerificationStatus("APPROVED");
        provider.setRejectionReason(null);

        TowingProvider savedProvider = towingProviderRepository.save(provider);

        notificationService.notifyUser(
                savedProvider.getUser(),
                "Your RoadAid towing provider account has been approved. You can now log in and add your towing vehicles."
        );

        systemLogService.log(
                getCurrentAdmin(),
                "TOWING_PROVIDER_APPROVED",
                "TOWING_PROVIDER",
                providerId,
                "Towing provider verification approved"
        );

        return toTowingProviderResponse(savedProvider);
    }
    public AdminTowingProviderResponse rejectTowingProvider(Long providerId, String reason) {

        TowingProvider provider = towingProviderRepository.findById(providerId)
                .orElseThrow(() -> new RuntimeException("Towing provider not found"));

        if (reason == null || reason.isBlank()) {
            throw new RuntimeException("Rejection reason is required.");
        }

        provider.setVerificationStatus("REJECTED");
        provider.setRejectionReason(reason.trim());

        TowingProvider savedProvider = towingProviderRepository.save(provider);

        notificationService.notifyUser(
                savedProvider.getUser(),
                "Your RoadAid towing provider application was rejected. Reason: " + reason.trim()
        );

        systemLogService.log(
                getCurrentAdmin(),
                "TOWING_PROVIDER_REJECTED",
                "TOWING_PROVIDER",
                providerId,
                "Towing provider verification rejected. Reason: " + reason.trim()
        );

        return toTowingProviderResponse(savedProvider);
    }
    public List<AdminMechanicResponse> getPendingMechanics() {

        return mechanicRepository
                .findByVerificationStatus("PENDING")
                .stream()
                .map(this::toMechanicResponse)
                .toList();
    }
    public AdminMechanicResponse approveMechanic(Long mechanicId) {

        Mechanic mechanic =
                mechanicRepository.findById(mechanicId)
                        .orElseThrow(() ->
                                new RuntimeException("Mechanic not found")
                        );

        mechanic.setVerificationStatus("APPROVED");
        mechanic.setRejectionReason(null);
        mechanic.setAvailable(false);

        Mechanic savedMechanic =
                mechanicRepository.save(mechanic);

        notificationService.notifyUser(
                savedMechanic.getUser(),
                "Your RoadAid provider account has been approved. You can now go online and accept service requests."
        );

        // Audit log
        systemLogService.log(
                getCurrentAdmin(),
                "MECHANIC_APPROVED",
                "MECHANIC",
                mechanicId,
                "Mechanic verification approved"
        );

        return toMechanicResponse(savedMechanic);
    }
    public AdminMechanicResponse rejectMechanic(
            Long mechanicId,
            String reason
    ) {

        Mechanic mechanic =
                mechanicRepository.findById(mechanicId)
                        .orElseThrow(() ->
                                new RuntimeException("Mechanic not found")
                        );

        if (reason == null || reason.isBlank()) {
            throw new RuntimeException(
                    "Rejection reason is required."
            );
        }

        mechanic.setVerificationStatus("REJECTED");
        mechanic.setRejectionReason(reason.trim());
        mechanic.setAvailable(false);

        Mechanic savedMechanic =
                mechanicRepository.save(mechanic);

        notificationService.notifyUser(
                savedMechanic.getUser(),
                "Your RoadAid provider application was rejected. Reason: "
                        + reason.trim()
        );

        // Audit log
        systemLogService.log(
                getCurrentAdmin(),
                "MECHANIC_REJECTED",
                "MECHANIC",
                mechanicId,
                "Mechanic verification rejected. Reason: "
                        + reason.trim()
        );

        return toMechanicResponse(savedMechanic);
    }
    private AdminTowingProviderResponse toTowingProviderResponse(
            TowingProvider provider
    ) {
        User user = provider.getUser();

        List<AdminTowingProviderResponse.DocumentResponse> documents =
                towingDocumentRepository.findByProvider(provider)
                        .stream()
                        .map(document ->
                                new AdminTowingProviderResponse.DocumentResponse(
                                        document.getId(),
                                        document.getDocumentType(),
                                        document.getFileName(),
                                        document.getVerificationStatus(),
                                        document.getRejectionReason(),
                                        document.getUploadedAt()
                                )
                        )
                        .toList();

        return new AdminTowingProviderResponse(
                provider.getId(),
                user.getId(),
                user.getIsActive(),
                user.getFullName(),
                user.getEmail(),
                user.getPhone(),
                provider.getBusinessName(),
                provider.getBusinessAddress(),
                provider.getContactNumber(),
                provider.getBusinessType(),
                provider.getDistrict(),
                provider.getPinCode(),
                provider.getAlternateContact(),
                provider.getVerificationStatus(),
                provider.getRejectionReason(),
                user.getCreatedAt(),
                documents
        );
    }

    private AdminMechanicResponse toMechanicResponse(Mechanic mechanic) {

        AdminMechanicResponse response =
                new AdminMechanicResponse();

        response.setMechanicId(mechanic.getId());

        response.setFullName(
                mechanic.getUser().getFullName()
        );

        response.setWorkshopName(
                mechanic.getWorkshopName()
        );

        response.setContactNumber(
                mechanic.getContactNumber()
        );

        response.setExperienceYears(
                mechanic.getExperienceYears()
        );

        response.setAvailable(
                mechanic.getAvailable()
        );

        response.setVerificationStatus(
                mechanic.getVerificationStatus()
        );

        response.setRejectionReason(
                mechanic.getRejectionReason()

        );
        response.setEmail(mechanic.getUser().getEmail());
        response.setPhone(mechanic.getUser().getPhone());
        response.setWorkshopAddress(mechanic.getWorkshopAddress());
        response.setRegisteredAt(mechanic.getUser().getCreatedAt());

        return response;
    }
    public long getPendingProviderCount() {
        return mechanicRepository.countByVerificationStatus("PENDING");
    }
    public RevenueAnalyticsResponse getRevenueAnalytics() {

        RevenueAnalyticsResponse response =
                new RevenueAnalyticsResponse();

        List<Payment> payments =
                paymentRepository.findAllByOrderByPaymentDateDesc();

        response.setTotalPayments(payments.size());

        response.setSuccessfulPayments(
                payments.stream()
                        .filter(p -> "SUCCESS".equals(p.getPaymentStatus()))
                        .count()
        );

        Double totalRevenue =
                paymentRepository.getTotalSuccessfulRevenue();

        response.setTotalRevenue(
                totalRevenue != null ? totalRevenue : 0.0
        );

        LocalDate today = LocalDate.now();

        LocalDateTime currentMonthStart =
                today.withDayOfMonth(1).atStartOfDay();

        LocalDateTime nextMonthStart =
                today.plusMonths(1)
                        .withDayOfMonth(1)
                        .atStartOfDay();

        LocalDateTime lastMonthStart =
                today.minusMonths(1)
                        .withDayOfMonth(1)
                        .atStartOfDay();

        Double monthlyRevenue =
                paymentRepository.getRevenueBetween(
                        currentMonthStart,
                        nextMonthStart
                );

        Double lastMonthRevenue =
                paymentRepository.getRevenueBetween(
                        lastMonthStart,
                        currentMonthStart
                );

        response.setMonthlyRevenue(
                monthlyRevenue != null ? monthlyRevenue : 0.0
        );

        response.setLastMonthRevenue(
                lastMonthRevenue != null ? lastMonthRevenue : 0.0
        );

        Map<String, Double> dailyRevenue =
                payments.stream()
                        .filter(p ->
                                "SUCCESS".equals(p.getPaymentStatus())
                        )
                        .filter(p ->
                                !p.getPaymentDate().isBefore(currentMonthStart)
                                        && p.getPaymentDate().isBefore(nextMonthStart)
                        )
                        .collect(Collectors.groupingBy(
                                p -> p.getPaymentDate()
                                        .toLocalDate()
                                        .toString(),
                                TreeMap::new,
                                Collectors.summingDouble(Payment::getAmount)
                        ));

        response.setDailyRevenue(dailyRevenue);

        return response;
    }
    public ServiceAnalyticsResponse getServiceAnalytics() {

        ServiceAnalyticsResponse response =
                new ServiceAnalyticsResponse();

        List<ServiceRequest> requests =
                serviceRequestRepository.findAll();

        response.setTotalRequests(requests.size());

        response.setCompletedRequests(
                requests.stream()
                        .filter(r ->
                                "COMPLETED".equals(r.getStatus())
                                        || "CLOSED".equals(r.getStatus()))
                        .count()
        );

        response.setCancelledRequests(
                requests.stream()
                        .filter(r -> "CANCELLED".equals(r.getStatus()))
                        .count()
        );

        Map<String, Long> categories =
                requests.stream()
                        .collect(Collectors.groupingBy(
                                r -> categorizeIssue(r.getIssueDescription()),
                                TreeMap::new,
                                Collectors.counting()
                        ));

        response.setIssueCategories(categories);

        return response;
    }

    private String categorizeIssue(String issue) {

        if (issue == null || issue.isBlank()) {
            return "Other";
        }

        String text = issue.toLowerCase();

        if (text.contains("battery") || text.contains("start")) {
            return "Battery / Starting";
        }

        if (text.contains("tyre") || text.contains("tire") ||
                text.contains("puncture")) {
            return "Tyre / Puncture";
        }

        if (text.contains("fuel") || text.contains("petrol") ||
                text.contains("diesel")) {
            return "Fuel";
        }

        if (text.contains("engine")) {
            return "Engine";
        }

        if (text.contains("brake")) {
            return "Brakes";
        }

        if (text.contains("accident") || text.contains("collision")) {
            return "Accident";
        }

        if (text.contains("tow") || text.contains("towing")) {
            return "Towing";
        }

        return "Other";
    }
    public ProviderAnalyticsResponse getProviderAnalytics() {

        ProviderAnalyticsResponse response =
                new ProviderAnalyticsResponse();

        long total =
                mechanicRepository.count();

        long approved =
                mechanicRepository.countByVerificationStatus("APPROVED");

        long pending =
                mechanicRepository.countByVerificationStatus("PENDING");

        long rejected =
                mechanicRepository.countByVerificationStatus("REJECTED");

        long online =
                mechanicRepository.countByAvailable(true);

        response.setTotalProviders(total);
        response.setApprovedProviders(approved);
        response.setPendingProviders(pending);
        response.setRejectedProviders(rejected);
        response.setOnlineProviders(online);
        response.setOfflineProviders(
                Math.max(0, approved - online)
        );

        response.setTotalCompletedJobs(
                serviceRequestRepository.countByStatus("COMPLETED")
                        + serviceRequestRepository.countByStatus("CLOSED")
        );

        return response;
    }
    public CustomerAnalyticsResponse getCustomerAnalytics() {

        CustomerAnalyticsResponse response =
                new CustomerAnalyticsResponse();

        List<User> customers =
                userRepository.findAll()
                        .stream()
                        .filter(user -> "CUSTOMER".equals(user.getRole()))
                        .toList();

        List<ServiceRequest> requests =
                serviceRequestRepository.findAll();

        response.setTotalCustomers(customers.size());

        LocalDate today = LocalDate.now();

        LocalDateTime currentMonthStart =
                today.withDayOfMonth(1).atStartOfDay();

        LocalDateTime nextMonthStart =
                today.plusMonths(1)
                        .withDayOfMonth(1)
                        .atStartOfDay();

        LocalDateTime lastMonthStart =
                today.minusMonths(1)
                        .withDayOfMonth(1)
                        .atStartOfDay();

        response.setMonthlyCustomers(
                userRepository.countByRoleAndCreatedAtBetween(
                        "CUSTOMER",
                        currentMonthStart,
                        nextMonthStart
                )
        );

        response.setLastMonthCustomers(
                userRepository.countByRoleAndCreatedAtBetween(
                        "CUSTOMER",
                        lastMonthStart,
                        currentMonthStart
                )
        );

        long activeCustomers =
                requests.stream()
                        .map(ServiceRequest::getCustomer)
                        .filter(customer -> customer != null)
                        .distinct()
                        .count();

        response.setActiveCustomers(activeCustomers);

        response.setTotalRequests(requests.size());

        response.setCompletedRequests(
                requests.stream()
                        .filter(r ->
                                "COMPLETED".equals(r.getStatus())
                                        || "CLOSED".equals(r.getStatus()))
                        .count()
        );

        response.setCancelledRequests(
                requests.stream()
                        .filter(r ->
                                "CANCELLED".equals(r.getStatus()))
                        .count()
        );

        response.setAverageRequestsPerCustomer(
                customers.isEmpty()
                        ? 0
                        : (double) requests.size() / customers.size()
        );

        List<CustomerAnalyticsResponse.CustomerPerformance> topCustomers =
                customers.stream()
                        .map(customer -> {

                            List<ServiceRequest> customerRequests =
                                    requests.stream()
                                            .filter(r ->
                                                    r.getCustomer() != null
                                                            && r.getCustomer().getId()
                                                            .equals(customer.getId()))
                                            .toList();

                            long completed =
                                    customerRequests.stream()
                                            .filter(r ->
                                                    "COMPLETED".equals(r.getStatus())
                                                            || "CLOSED".equals(r.getStatus()))
                                            .count();

                            long cancelled =
                                    customerRequests.stream()
                                            .filter(r ->
                                                    "CANCELLED".equals(r.getStatus()))
                                            .count();

                            return new CustomerAnalyticsResponse.CustomerPerformance(
                                    customer.getFullName(),
                                    customer.getEmail(),
                                    customerRequests.size(),
                                    completed,
                                    cancelled
                            );
                        })
                        .sorted(
                                Comparator.comparingLong(
                                        CustomerAnalyticsResponse.CustomerPerformance::getRequests
                                ).reversed()
                        )
                        .limit(10)
                        .toList();

        response.setTopCustomers(topCustomers);

        return response;
    }
    public ReviewComplaintAnalyticsResponse getReviewComplaintAnalytics() {

        ReviewComplaintAnalyticsResponse response =
                new ReviewComplaintAnalyticsResponse();

        List<Review> reviews = reviewRepository.findAll();

        response.setTotalReviews(reviews.size());

        Double average =
                reviewRepository.getAverageRating();

        response.setAverageRating(
                average != null ? average : 0.0
        );

        response.setFiveStarReviews(
                reviews.stream()
                        .filter(r -> r.getRating() != null && r.getRating() == 5)
                        .count()
        );

        response.setLowRatingReviews(
                reviews.stream()
                        .filter(r -> r.getRating() != null && r.getRating() <= 2)
                        .count()
        );

        Map<Integer, Long> distribution =
                reviews.stream()
                        .filter(r -> r.getRating() != null)
                        .collect(Collectors.groupingBy(
                                Review::getRating,
                                TreeMap::new,
                                Collectors.counting()
                        ));

        response.setRatingDistribution(distribution);

        List<Complaint> complaints =
                complaintRepository.findTop10ByOrderByCreatedAtDesc();

        response.setTotalComplaints(
                complaintRepository.count()
        );

        response.setOpenComplaints(
                complaintRepository.countByStatus("OPEN")
        );

        response.setRecentComplaints(
                complaints.stream()
                        .map(c ->
                                new ReviewComplaintAnalyticsResponse.ComplaintSummary(
                                        c.getId(),
                                        c.getReason(),
                                        c.getStatus()
                                )
                        )
                        .toList()
        );

        return response;
    }
    public AnalyticsReportResponse getAnalyticsReport(
            LocalDate startDate,
            LocalDate endDate
    ) {

        AnalyticsReportResponse response =
                new AnalyticsReportResponse();

        LocalDateTime start =
                startDate.atStartOfDay();

        LocalDateTime end =
                endDate.plusDays(1).atStartOfDay();

        List<ServiceRequest> requests =
                serviceRequestRepository.findRequestsBetween(
                        start,
                        end
                );

        response.setStartDate(startDate.toString());
        response.setEndDate(endDate.toString());

        response.setTotalRequests(requests.size());

        response.setCompletedRequests(
                requests.stream()
                        .filter(r ->
                                "COMPLETED".equals(r.getStatus())
                                        || "CLOSED".equals(r.getStatus()))
                        .count()
        );

        response.setCancelledRequests(
                requests.stream()
                        .filter(r ->
                                "CANCELLED".equals(r.getStatus()))
                        .count()
        );

        response.setNewCustomers(
                userRepository.countByRoleAndCreatedAtBetween(
                        "CUSTOMER",
                        start,
                        end
                )
        );

        List<Payment> payments =
                paymentRepository.findByPaymentDateBetween(
                        start,
                        end
                );

        response.setTotalPayments(payments.size());

        response.setSuccessfulPayments(
                payments.stream()
                        .filter(p ->
                                "SUCCESS".equals(p.getPaymentStatus()))
                        .count()
        );

        response.setRevenue(
                payments.stream()
                        .filter(p ->
                                "SUCCESS".equals(p.getPaymentStatus()))
                        .mapToDouble(Payment::getAmount)
                        .sum()
        );

        return response;
    }
    public LocationAnalyticsResponse getLocationAnalytics() {

        LocationAnalyticsResponse response =
                new LocationAnalyticsResponse();

        List<ServiceRequest> requests =
                serviceRequestRepository.findAll();

        Map<String, Long> locationCounts =
                requests.stream()
                        .filter(r ->
                                r.getLocation() != null
                                        && !r.getLocation().isBlank()
                        )
                        .collect(Collectors.groupingBy(
                                r -> r.getLocation().trim(),
                                Collectors.counting()
                        ));

        long totalLocations = locationCounts.size();

        response.setTotalLocations(totalLocations);

        List<LocationAnalyticsResponse.LocationHotspot> hotspots =
                locationCounts.entrySet()
                        .stream()
                        .sorted(
                                Map.Entry.<String, Long>
                                                comparingByValue()
                                        .reversed()
                        )
                        .map(entry -> {

                            double percentage =
                                    requests.isEmpty()
                                            ? 0
                                            : (entry.getValue() * 100.0)
                                              / requests.size();

                            return new LocationAnalyticsResponse.LocationHotspot(
                                    entry.getKey(),
                                    entry.getValue(),
                                    percentage
                            );
                        })
                        .limit(10)
                        .toList();

        response.setHotspots(hotspots);

        if (!hotspots.isEmpty()) {

            LocationAnalyticsResponse.LocationHotspot top =
                    hotspots.get(0);

            response.setTopLocation(
                    top.getLocation()
            );

            response.setTopLocationRequests(
                    top.getRequests()
            );

        } else {

            response.setTopLocation("No data");
            response.setTopLocationRequests(0);
        }

        long topRequests =
                hotspots.stream()
                        .mapToLong(
                                LocationAnalyticsResponse.LocationHotspot::getRequests
                        )
                        .sum();

        response.setOtherLocationRequests(
                Math.max(0, requests.size() - topRequests)
        );

        return response;
    }
    public List<ServiceRequest> getUserRequests(Integer userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        if ("ADMIN".equalsIgnoreCase(user.getRole())) {
            throw new RuntimeException(
                    "Admin requests cannot be viewed here."
            );
        }

        if ("MECHANIC".equalsIgnoreCase(user.getRole())) {

            Mechanic mechanic = mechanicRepository.findByUser(user)
                    .orElseThrow(() ->
                            new RuntimeException("Mechanic profile not found"));

            return serviceRequestRepository
                    .findByMechanicOrderByCreatedAtDesc(mechanic);
        }

        return serviceRequestRepository
                .findByCustomerOrderByCreatedAtDesc(user);
    }
    private User getCurrentAdmin() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String email = authentication.getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("Admin user not found"));
    }

}