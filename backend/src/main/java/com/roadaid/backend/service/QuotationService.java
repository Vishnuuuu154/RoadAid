package com.roadaid.backend.service;

import com.roadaid.backend.entity.Quotation;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.Mechanic;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.repository.QuotationRepository;
import com.roadaid.backend.repository.ServiceRequestRepository;
import com.roadaid.backend.repository.MechanicRepository;
import com.roadaid.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
public class QuotationService {

    private final QuotationRepository quotationRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final MechanicRepository mechanicRepository;
    private final UserRepository userRepository;

    public QuotationService(
            QuotationRepository quotationRepository,
            ServiceRequestRepository serviceRequestRepository,
            MechanicRepository mechanicRepository,
            UserRepository userRepository
    ) {
        this.quotationRepository = quotationRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.mechanicRepository = mechanicRepository;
        this.userRepository = userRepository;
    }
    public Quotation createQuotation(Long requestId, Quotation quotation) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Mechanic mechanic = mechanicRepository.findByUser(user)
                .orElseThrow(() -> new RuntimeException("Mechanic profile not found"));

        ServiceRequest serviceRequest = serviceRequestRepository
                .findByIdAndMechanic(requestId, mechanic)
                .orElseThrow(() -> new RuntimeException("Request not found or not assigned to you"));
        quotation.setPaymentStatus("PENDING");

        if (!serviceRequest.getStatus().equals("WAITING_FOR_QUOTATION")) {
            throw new RuntimeException("Quotation can only be created while waiting for quotation");
        }

        if (quotationRepository.findByServiceRequest(serviceRequest).isPresent()) {
            throw new RuntimeException("Quotation already exists for this request");
        }

        quotation.setServiceRequest(serviceRequest);

        double total = quotation.getLabourCharge()
                + quotation.getPartsCharge()
                + quotation.getTravelFee();

        quotation.setTotalAmount(total);

        serviceRequest.setStatus("QUOTATION_PENDING");
        serviceRequestRepository.save(serviceRequest);

        return quotationRepository.save(quotation);
    }
    public Quotation getQuotation(Long requestId) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ServiceRequest serviceRequest = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (!serviceRequest.getCustomer().getId().equals(customer.getId())) {
            throw new RuntimeException("You are not authorized to view this quotation");
        }

        return quotationRepository.findByServiceRequest(serviceRequest)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));
    }
    public Quotation acceptQuotation(Long requestId) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User customer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        ServiceRequest serviceRequest = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Request not found"));

        if (!serviceRequest.getCustomer().getId().equals(customer.getId())) {
            throw new RuntimeException("You are not authorized to accept this quotation");
        }

        Quotation quotation = quotationRepository.findByServiceRequest(serviceRequest)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));

        if (!quotation.getPaymentStatus().equals("PENDING")) {
            throw new RuntimeException("Quotation already processed");
        }

        quotation.setPaymentStatus("ACCEPTED");

        serviceRequest.setStatus("IN_PROGRESS");
        serviceRequestRepository.save(serviceRequest);

        System.out.println("Before Save: " + serviceRequest.getStatus());

        return quotationRepository.save(quotation);
    }
}