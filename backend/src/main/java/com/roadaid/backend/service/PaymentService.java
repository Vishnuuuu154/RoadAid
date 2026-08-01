package com.roadaid.backend.service;

import com.roadaid.backend.entity.Payment;
import com.roadaid.backend.entity.Quotation;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.repository.PaymentRepository;
import com.roadaid.backend.repository.QuotationRepository;
import com.roadaid.backend.repository.ServiceRequestRepository;
import com.roadaid.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final QuotationRepository quotationRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final UserRepository userRepository;

    public PaymentService(
            PaymentRepository paymentRepository,
            QuotationRepository quotationRepository,
            ServiceRequestRepository serviceRequestRepository,
            UserRepository userRepository
    ) {
        this.paymentRepository = paymentRepository;
        this.quotationRepository = quotationRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.userRepository = userRepository;
    }

    public Payment makePayment(Long quotationId, Payment payment) {

        // Find quotation
        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));

        // Quotation must be accepted
        if (!quotation.getPaymentStatus().equals("ACCEPTED")) {
            throw new RuntimeException("Quotation must be accepted before payment");
        }

        // Prevent duplicate payment
        if (paymentRepository.findByQuotation(quotation).isPresent()) {
            throw new RuntimeException("Payment already completed for this quotation");
        }

        // Link payment to quotation
        payment.setQuotation(quotation);

        // Use quotation amount
        payment.setAmount(quotation.getTotalAmount());

        // Payment details
        payment.setPaymentStatus("SUCCESS");
        payment.setPaymentDate(LocalDateTime.now());

        // Update quotation
        quotation.setPaymentStatus("PAID");
        quotationRepository.save(quotation);

        // Close service request
        ServiceRequest serviceRequest = quotation.getServiceRequest();
        serviceRequest.setStatus("CLOSED");
        serviceRequestRepository.save(serviceRequest);

        // Save payment
        return paymentRepository.save(payment);
    }
    public List<Payment> getMyPayments() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return paymentRepository.findByQuotation_ServiceRequest_Customer(customer);
    }

}