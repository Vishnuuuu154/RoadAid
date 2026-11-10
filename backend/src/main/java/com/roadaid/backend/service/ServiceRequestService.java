package com.roadaid.backend.service;
import com.roadaid.backend.dto.*;
import com.roadaid.backend.service.NotificationService;
import com.roadaid.backend.entity.*;
import com.roadaid.backend.repository.ServiceRequestRepository;
import org.springframework.stereotype.Service;
import com.roadaid.backend.repository.UserRepository;
import com.roadaid.backend.repository.VehicleRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.roadaid.backend.repository.MechanicRepository;
import com.roadaid.backend.entity.RequestImage;
import java.io.IOException;
import java.util.Optional;
import com.roadaid.backend.repository.RequestImageRepository;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.util.List;import com.roadaid.backend.entity.Payment;
import com.roadaid.backend.repository.PaymentRepository;

@Service

public class ServiceRequestService {

    private final ServiceRequestRepository serviceRequestRepository;
    private final UserRepository userRepository;
    private final VehicleRepository vehicleRepository;
    private final MechanicRepository mechanicRepository;
    private final FileStorageService fileStorageService;
    private final RequestImageRepository requestImageRepository;
    private final NotificationService notificationService;
    private final PaymentRepository paymentRepository;

    public ServiceRequestService(
            ServiceRequestRepository serviceRequestRepository,
            UserRepository userRepository,
            VehicleRepository vehicleRepository,
            MechanicRepository mechanicRepository,
            FileStorageService fileStorageService,
            RequestImageRepository requestImageRepository,
            NotificationService notificationService,
            PaymentRepository paymentRepository
    ) {
        this.serviceRequestRepository = serviceRequestRepository;
        this.userRepository = userRepository;
        this.vehicleRepository = vehicleRepository;
        this.mechanicRepository = mechanicRepository;
        this.fileStorageService = fileStorageService;
        this.requestImageRepository = requestImageRepository;
        this.notificationService = notificationService;
        this.paymentRepository = paymentRepository;
    }
    public ServiceRequest createRequest(
            ServiceRequest serviceRequest,
            Long vehicleId,
            Long mechanicId,
            List<MultipartFile> images
    ) throws IOException {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Vehicle vehicle = vehicleRepository.findById(vehicleId)
                .orElseThrow(() -> new RuntimeException("Vehicle not found"));
        Mechanic mechanic = mechanicRepository.findById(mechanicId)
                .orElseThrow(() -> new RuntimeException("Mechanic not found"));
        boolean hasActiveJob = serviceRequestRepository.existsByMechanicAndStatusIn(
                mechanic,
                List.of("WAITING_FOR_QUOTATION", "ACCEPTED", "IN_PROGRESS")
        );

        if (hasActiveJob) {
            throw new RuntimeException(
                    "This mechanic is currently handling another service request."
            );
        }

        if (!vehicle.getUser().getId().equals(customer.getId())) {
            throw new RuntimeException("You can only create requests for your own vehicles");
        }

        serviceRequest.setCustomer(customer);
        serviceRequest.setVehicle(vehicle);
        serviceRequest.setMechanic(mechanic);
        serviceRequest.setCreatedAt(LocalDateTime.now());
        serviceRequest.setStatus("PENDING");

// Always start a new request at the beginning of the service journey
        if (serviceRequest.getServiceStage() == null ||
                serviceRequest.getServiceStage().isBlank()) {
            serviceRequest.setCreatedAt(LocalDateTime.now());
            serviceRequest.setStatus("PENDING");
            serviceRequest.setServiceStage("NOT_STARTED");
        }

        ServiceRequest savedRequest = serviceRequestRepository.save(serviceRequest);
        notificationService.notifyUser(
                mechanic.getUser(),
                "New service request received. Request #" +
                        savedRequest.getId()
        );

        if (images != null && !images.isEmpty()) {
            for (MultipartFile image : images) {
                String imagePath = fileStorageService.uploadImage(image);

                com.roadaid.backend.entity.RequestImage requestImage = new com.roadaid.backend.entity.RequestImage();
                requestImage.setServiceRequest(savedRequest);
                requestImage.setImageUrl(imagePath);
                requestImage.setUploadedAt(LocalDateTime.now());

                requestImageRepository.save(requestImage);
            }
        }

        return savedRequest;
    }

    public List<ServiceRequest> getPendingRequests() {
        return serviceRequestRepository.findByStatus("PENDING");
    }

    public ServiceRequest acceptRequest(Long requestId) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Mechanic mechanic = mechanicRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Mechanic profile not found"));
        if (!Boolean.TRUE.equals(mechanic.getAvailable())) {
            throw new RuntimeException(
                    "You are currently offline and cannot accept new service requests."
            );
        }

        boolean hasActiveJob = serviceRequestRepository.existsByMechanicAndStatusIn(
                mechanic,
                List.of("WAITING_FOR_QUOTATION", "ACCEPTED", "IN_PROGRESS")
        );

        if (hasActiveJob) {
            throw new RuntimeException(
                    "You already have an active service request. Complete it before accepting another request."
            );
        }

        ServiceRequest serviceRequest = serviceRequestRepository
                .findByIdAndStatus(requestId, "PENDING")
                .orElseThrow(() -> new RuntimeException("Request not found or already accepted"));

        serviceRequest.setMechanic(mechanic);
        serviceRequest.setStatus("WAITING_FOR_QUOTATION");

        ServiceRequest savedRequest =
                serviceRequestRepository.save(serviceRequest);

        notificationService.notifyUser(

                savedRequest.getCustomer(),
                "Your service request #" +
                        savedRequest.getId() +
                        " has been accepted by " +
                        mechanic.getUser().getFullName() +
                        "."
        );

        return savedRequest;
    }
    public List<ServiceRequest> getMyAssignedRequests() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Mechanic mechanic = mechanicRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Mechanic profile not found"));

        return serviceRequestRepository.findByMechanic(mechanic);
    }
    public ServiceRequest startWork(Long requestId) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Mechanic mechanic = mechanicRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Mechanic profile not found"));

        ServiceRequest serviceRequest = serviceRequestRepository
                .findByIdAndMechanic(requestId, mechanic)
                .orElseThrow(() -> new RuntimeException("Request not found or not assigned to you"));

        if (!serviceRequest.getStatus().equals("ACCEPTED")) {
            throw new RuntimeException("Only accepted requests can be started");
        }

        serviceRequest.setStatus("IN_PROGRESS");
        serviceRequest.setServiceStage("ON_THE_WAY");
        return serviceRequestRepository.save(serviceRequest);
    }
    public ServiceRequest markArrived(Long requestId) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Mechanic mechanic = mechanicRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Mechanic profile not found"));

        ServiceRequest serviceRequest =
                serviceRequestRepository
                        .findByIdAndMechanic(requestId, mechanic)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Request not found or not assigned to you"
                                ));

        if (!serviceRequest.getStatus().equals("IN_PROGRESS")) {
            throw new RuntimeException(
                    "Only requests in progress can be updated"
            );
        }

        if (!serviceRequest.getServiceStage().equals("ON_THE_WAY")) {
            throw new RuntimeException(
                    "Mechanic must be on the way before marking arrival"
            );
        }

        serviceRequest.setServiceStage("ARRIVED");

        return serviceRequestRepository.save(serviceRequest);
    }


    public ServiceRequest startRepair(Long requestId) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Mechanic mechanic = mechanicRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Mechanic profile not found"));

        ServiceRequest serviceRequest =
                serviceRequestRepository
                        .findByIdAndMechanic(requestId, mechanic)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Request not found or not assigned to you"
                                ));

        if (!serviceRequest.getStatus().equals("IN_PROGRESS")) {
            throw new RuntimeException(
                    "Only requests in progress can be updated"
            );
        }

        if (!serviceRequest.getServiceStage().equals("ARRIVED")) {
            throw new RuntimeException(
                    "Mechanic must arrive before starting repair"
            );
        }

        serviceRequest.setServiceStage("REPAIRING");

        return serviceRequestRepository.save(serviceRequest);
    }
    public ServiceRequest completeWork(Long requestId) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Mechanic mechanic = mechanicRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Mechanic profile not found"));

        ServiceRequest serviceRequest = serviceRequestRepository
                .findByIdAndMechanic(requestId, mechanic)
                .orElseThrow(() -> new RuntimeException("Request not found or not assigned to you"));

        if (!serviceRequest.getStatus().equals("IN_PROGRESS")) {
            throw new RuntimeException("Only requests in progress can be completed");
        }

        serviceRequest.setStatus("COMPLETED");
        serviceRequest.setServiceStage("COMPLETED");
        serviceRequest.setCompletedAt(LocalDateTime.now());
        mechanic.setAvailable(true);
        mechanicRepository.save(mechanic);
        notificationService.notifyUser(
                serviceRequest.getCustomer(),
                "Service request #" +
                        serviceRequest.getId() +
                        " has been completed. You can now proceed with payment."
        );

        return serviceRequestRepository.save(serviceRequest);
    }
    public List<ServiceRequest> getMyActiveRequests() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return serviceRequestRepository.findByCustomerAndStatusNot(customer, "COMPLETED");
    }
    private String toImageUrl(String imagePath) {

        if (imagePath == null || imagePath.isBlank()) {
            return imagePath;
        }

        if (imagePath.startsWith("/uploads/request-images/")) {
            return imagePath;
        }

        String normalizedPath = imagePath.replace("\\", "/");

        int uploadsIndex = normalizedPath.indexOf("uploads/request-images/");

        if (uploadsIndex >= 0) {
            return "/" + normalizedPath.substring(uploadsIndex);
        }

        return normalizedPath;
    }
    public ServiceRequest cancelRequest(Long requestId) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ServiceRequest serviceRequest = serviceRequestRepository
                .findByIdAndCustomer(requestId, customer)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (!serviceRequest.getStatus().equals("PENDING")
                && !serviceRequest.getStatus().equals("WAITING_FOR_QUOTATION")
                && !serviceRequest.getStatus().equals("QUOTATION_PENDING")) {

            throw new RuntimeException("Request cannot be cancelled after work has started");
        }
        serviceRequest.setStatus("CANCELLED");
        if (serviceRequest.getMechanic() != null) {

            notificationService.notifyUser(
                    serviceRequest.getMechanic().getUser(),
                    "Service request #" +
                            serviceRequest.getId() +
                            " has been cancelled by the customer."
            );
        }

        return serviceRequestRepository.save(serviceRequest);
    }
    public ServiceRequest rejectRequest(Long requestId) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User mechanicUser = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Mechanic mechanic = mechanicRepository.findByUser(mechanicUser)
                .orElseThrow(() ->
                        new RuntimeException("Mechanic profile not found"));

        ServiceRequest serviceRequest =
                serviceRequestRepository
                        .findByIdAndStatus(requestId, "PENDING")
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Request not found or cannot be rejected"
                                ));

        // Make sure this mechanic is actually assigned to this request
        if (serviceRequest.getMechanic() == null ||
                !serviceRequest.getMechanic().getId().equals(mechanic.getId())) {

            throw new RuntimeException(
                    "You are not assigned to this request"
            );
        }

        // Remember which mechanic rejected the request
        serviceRequest.setRejectedByMechanic(mechanic);

        // Remove the current assignment
        serviceRequest.setMechanic(null);

        // Mark request as rejected
        serviceRequest.setStatus("REJECTED");
        notificationService.notifyUser(
                serviceRequest.getCustomer(),
                "Your service request #" +
                        serviceRequest.getId() +
                        " was rejected by " +
                        mechanic.getUser().getFullName() +
                        ". Please choose another mechanic."
        );

        return serviceRequestRepository.save(serviceRequest);
    }
    public ServiceRequest reassignMechanic(
            Long requestId,
            Long mechanicId
    ) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        ServiceRequest serviceRequest =
                serviceRequestRepository
                        .findByIdAndCustomer(requestId, customer)
                        .orElseThrow(() ->
                                new RuntimeException("Request not found"));

        if (!"REJECTED".equals(serviceRequest.getStatus())) {
            throw new RuntimeException(
                    "Only rejected requests can be reassigned. Current status: "
                            + serviceRequest.getStatus()
            );
        }

        Mechanic mechanic = mechanicRepository.findById(mechanicId)
                .orElseThrow(() ->
                        new RuntimeException("Mechanic not found"));

        if (!Boolean.TRUE.equals(mechanic.getAvailable())) {
            throw new RuntimeException(
                    "Selected mechanic is not available"
            );
        }

        // Do not allow the mechanic who rejected this request
        // to be selected again.
        if (serviceRequest.getRejectedByMechanic() != null &&
                serviceRequest.getRejectedByMechanic()
                        .getId()
                        .equals(mechanic.getId())) {

            throw new RuntimeException(
                    "This mechanic already rejected this request. " +
                            "Please choose another mechanic."
            );
        }

        serviceRequest.setMechanic(mechanic);

        // Reassignment succeeded, so clear the previous rejection.
        serviceRequest.setRejectedByMechanic(null);

        serviceRequest.setStatus("PENDING");
        notificationService.notifyUser(
                mechanic.getUser(),
                "You have received reassigned service request #" +
                        serviceRequest.getId() +
                        "."
        );

        return serviceRequestRepository.save(serviceRequest);
    }
    public ServiceRequest autoReassignMechanic(Long requestId) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        ServiceRequest serviceRequest =
                serviceRequestRepository
                        .findByIdAndCustomer(requestId, customer)
                        .orElseThrow(() ->
                                new RuntimeException("Request not found"));

        if (!"REJECTED".equals(serviceRequest.getStatus())) {
            throw new RuntimeException(
                    "Only rejected requests can be reassigned. Current status: "
                            + serviceRequest.getStatus()
            );
        }

        List<Mechanic> availableMechanics =
                mechanicRepository.findByAvailableTrueAndVerificationStatus("APPROVED");

        Mechanic rejectedMechanic =
                serviceRequest.getRejectedByMechanic();

        // Remove the mechanic who rejected this request.
        availableMechanics.removeIf(mechanic ->
                rejectedMechanic != null &&
                        mechanic.getId().equals(rejectedMechanic.getId())
        );

        if (availableMechanics.isEmpty()) {
            throw new RuntimeException(
                    "No other mechanics are currently available for this request."
            );
        }

        Mechanic mechanic = availableMechanics.get(0);

        serviceRequest.setMechanic(mechanic);
        serviceRequest.setRejectedByMechanic(null);
        serviceRequest.setStatus("PENDING");
        notificationService.notifyUser(
                mechanic.getUser(),
                "You have received a new service request #" +
                        serviceRequest.getId() +
                        " through automatic reassignment."
        );

        return serviceRequestRepository.save(serviceRequest);
    }
    public ServiceRequest trackRequest(Long requestId) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return serviceRequestRepository.findByIdAndCustomer(requestId, customer)
                .orElseThrow(() -> new RuntimeException("Request not found"));
    }
    public List<RequestImageResponse> getRequestImages(Long requestId) {

        ServiceRequest request = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Service request not found"));

        return requestImageRepository
                .findByServiceRequest(request)
                .stream()
                .map(image ->
                        new RequestImageResponse(
                                toImageUrl(image.getImageUrl())
                        )
                )
                .toList();
    }
    public RequestDetailsResponse getRequestDetails(Long requestId) {

        ServiceRequest request = serviceRequestRepository
                .findById(requestId)
                .orElseThrow(() ->
                        new RuntimeException("Request not found")
                );

        List<String> images = requestImageRepository
                .findByServiceRequest(request)
                .stream()
                .map(image -> toImageUrl(image.getImageUrl()))
                .toList();

        RequestDetailsResponse response =
                new RequestDetailsResponse();

        response.setRequestId(
                request.getId().longValue()
        );

        if (request.getCustomer() != null) {
            response.setCustomerName(
                    request.getCustomer().getFullName()
            );
        }

        if (request.getVehicle() != null) {
            response.setVehicle(
                    request.getVehicle().getBrand()
                            + " "
                            + request.getVehicle().getModel()
            );
        }

        response.setIssueDescription(
                request.getIssueDescription()
        );

        response.setLocation(
                request.getLocation()
        );

        response.setStatus(
                request.getStatus()
        );

        response.setServiceStage(
                request.getServiceStage()
        );

        /*
         * Mechanic information
         */
        if (request.getMechanic() != null
                && request.getMechanic().getUser() != null) {

            response.setMechanicName(
                    request.getMechanic()
                            .getUser()
                            .getFullName()
            );

            response.setMechanicUserId(
                    request.getMechanic()
                            .getUser()
                            .getId()
            );

        } else {

            response.setMechanicName("Not Assigned");
            response.setMechanicUserId(null);
        }

        response.setCreatedAt(
                request.getCreatedAt()
        );

        response.setCompletedAt(
                request.getCompletedAt()
        );

        response.setImages(images);

        return response;
    }
    public List<MechanicRequestSummaryResponse> getAssignedRequestSummaries() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Mechanic mechanic = mechanicRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Mechanic not found"));

        List<ServiceRequest> requests =
                serviceRequestRepository.findByMechanicOrderByCreatedAtDesc(mechanic);

        return requests.stream().map(request -> {

            MechanicRequestSummaryResponse response =
                    new MechanicRequestSummaryResponse();

            response.setRequestId(request.getId().longValue());
            response.setCustomerName(request.getCustomer().getFullName());
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
    public List<CustomerRequestSummaryResponse> getMyRequests() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<ServiceRequest> requests =
                serviceRequestRepository.findByCustomerOrderByCreatedAtDesc(user);

        return requests.stream().map(request -> {

            CustomerRequestSummaryResponse response =
                    new CustomerRequestSummaryResponse();

            response.setRequestId(request.getId().longValue());
            response.setIssue(request.getIssueDescription());

            if (request.getMechanic() != null) {
                response.setMechanic(request.getMechanic().getUser().getFullName());
            } else {
                response.setMechanic("Not Assigned");
            }

            response.setStatus(request.getStatus());
            response.setServiceStage(request.getServiceStage());
            response.setCreatedAt(request.getCreatedAt());
            response.setCompletedAt(request.getCompletedAt());

            return response;

        }).toList();
    }
    public RequestDetailsResponse getMechanicRequestDetails(Long requestId) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        Mechanic mechanic =
                mechanicRepository.findByUser(user)
                        .orElseThrow(() ->
                                new RuntimeException("Mechanic not found"));

        ServiceRequest request =
                serviceRequestRepository
                        .findByIdAndMechanic(requestId, mechanic)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Request not found or not assigned to you"
                                ));

        List<String> images =
                requestImageRepository
                        .findByServiceRequest(request)
                        .stream()
                        .map(image -> toImageUrl(image.getImageUrl()))
                        .toList();

        RequestDetailsResponse response =
                new RequestDetailsResponse();

        response.setRequestId(request.getId().longValue());

        response.setCustomerName(
                request.getCustomer().getFullName()
        );
        response.setCustomerUserId(
                request.getCustomer().getId()
        );

        response.setVehicle(
                request.getVehicle().getBrand()
                        + " "
                        + request.getVehicle().getModel()
        );

        response.setIssueDescription(
                request.getIssueDescription()
        );

        response.setLocation(
                request.getLocation()
        );

        response.setStatus(
                request.getStatus()
        );
        response.setServiceStage(
                request.getServiceStage()
        );

        if (request.getMechanic() != null) {

            response.setMechanicName(
                    request.getMechanic()
                            .getUser()
                            .getFullName()
            );

        } else {

            response.setMechanicName("Not Assigned");

        }

        response.setCreatedAt(
                request.getCreatedAt()
        );

        response.setImages(images);
        Optional<Payment> payment =
                paymentRepository.findByQuotation_ServiceRequest_Id(requestId);

        if (payment.isPresent()) {
            response.setPaymentAmount(payment.get().getAmount());
            response.setPaymentMethod(payment.get().getPaymentMethod());
            response.setPaymentStatus(payment.get().getPaymentStatus());
        } else {
            response.setPaymentAmount(null);
            response.setPaymentMethod(null);
            response.setPaymentStatus(null);
        }

        return response;
    }
    public LiveTrackingResponse getLiveTracking(Long requestId) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User currentUser = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found")
                );

        ServiceRequest request =
                serviceRequestRepository.findById(requestId)
                        .orElseThrow(() ->
                                new RuntimeException("Request not found")
                        );

        /*
         * Security:
         * Only the customer who owns the request
         * OR the mechanic assigned to the request
         * can view live tracking.
         */

        boolean isCustomer =
                request.getCustomer() != null &&
                        request.getCustomer().getId()
                                .equals(currentUser.getId());

        boolean isAssignedMechanic =
                request.getMechanic() != null &&
                        request.getMechanic().getUser() != null &&
                        request.getMechanic().getUser().getId()
                                .equals(currentUser.getId());

        if (!isCustomer && !isAssignedMechanic) {
            throw new RuntimeException(
                    "You are not authorized to view this tracking information"
            );
        }

        if (!"IN_PROGRESS".equals(request.getStatus())) {
            throw new RuntimeException(
                    "Live tracking is available only for active services"
            );
        }

        if (request.getMechanic() == null) {
            throw new RuntimeException(
                    "No mechanic is assigned to this request"
            );
        }

        Mechanic mechanic = request.getMechanic();

        LiveTrackingResponse response =
                new LiveTrackingResponse();

        response.setRequestId(request.getId().longValue());
        response.setStatus(request.getStatus());

        response.setCustomerLatitude(
                request.getCustomerLatitude()
        );

        response.setCustomerLongitude(
                request.getCustomerLongitude()
        );

        response.setMechanicId(
                mechanic.getId()
        );

        response.setMechanicName(
                mechanic.getUser().getFullName()
        );

        response.setWorkshopName(
                mechanic.getWorkshopName()
        );

        response.setContactNumber(
                mechanic.getContactNumber()
        );

        response.setMechanicLatitude(
                mechanic.getLatitude()
        );

        response.setMechanicLongitude(
                mechanic.getLongitude()
        );

        response.setLocationUpdatedAt(
                mechanic.getLocationUpdatedAt()
        );

        return response;
    }

}