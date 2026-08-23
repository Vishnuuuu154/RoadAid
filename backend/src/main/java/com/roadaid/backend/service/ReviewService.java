package com.roadaid.backend.service;

import com.roadaid.backend.entity.*;
import com.roadaid.backend.repository.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import java.util.List;
import com.roadaid.backend.entity.Mechanic;
import com.roadaid.backend.repository.MechanicRepository;

import java.time.LocalDateTime;

@Service
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final UserRepository userRepository;
    private final MechanicRepository mechanicRepository;
    private final PaymentRepository paymentRepository;

    public ReviewService(
            ReviewRepository reviewRepository,
            ServiceRequestRepository serviceRequestRepository,
            UserRepository userRepository,
            MechanicRepository mechanicRepository,
            PaymentRepository paymentRepository
    ) {
        this.reviewRepository = reviewRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.userRepository = userRepository;
        this.mechanicRepository = mechanicRepository;
        this.paymentRepository = paymentRepository;
    }

    public Review addReview(Long requestId, Review review) {

        ServiceRequest serviceRequest = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Service request not found"));

        if (!serviceRequest.getStatus().equals("CLOSED")) {
            throw new RuntimeException(
                    "Review can only be added after payment is completed"
            );
        }

        Payment payment = paymentRepository
                .findByQuotation_ServiceRequest_Id(requestId)
                .orElseThrow(() ->
                        new RuntimeException(
                                "Payment must be completed before reviewing"
                        ));

        if (!"SUCCESS".equals(payment.getPaymentStatus())) {
            throw new RuntimeException(
                    "Payment must be successful before reviewing"
            );
        }

        if (reviewRepository.findByServiceRequest(serviceRequest).isPresent()) {
            throw new RuntimeException("Review already submitted");
        }

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Customer not found"));

        review.setCustomer(customer);
        review.setMechanic(serviceRequest.getMechanic());
        review.setServiceRequest(serviceRequest);
        review.setCreatedAt(LocalDateTime.now());

        return reviewRepository.save(review);
    }
    public List<Review> getMyReviews() {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("Customer not found"));

        return reviewRepository.findByCustomer(customer);
    }
    public List<Review> getReviewsByMechanic(Long mechanicId) {

        Mechanic mechanic = mechanicRepository.findById(mechanicId)
                .orElseThrow(() -> new RuntimeException("Mechanic not found"));

        return reviewRepository.findByMechanic(mechanic);
    }
    public Double getAverageRating(Long mechanicId) {

        Mechanic mechanic = mechanicRepository.findById(mechanicId)
                .orElseThrow(() -> new RuntimeException("Mechanic not found"));

        Double average = reviewRepository.findAverageRatingByMechanic(mechanic);

        return average != null ? average : 0.0;
    }
}