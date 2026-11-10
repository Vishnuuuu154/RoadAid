package com.roadaid.backend.service;

import com.roadaid.backend.dto.RazorpayVerifyRequest;
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
import java.util.Optional;

import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.Utils;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;

@Service
public class PaymentService {
    @Value("${razorpay.key.id}")
    private String razorpayKeyId;

    @Value("${razorpay.key.secret}")
    private String razorpayKeySecret;

    private final PaymentRepository paymentRepository;
    private final QuotationRepository quotationRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    public PaymentService(
            PaymentRepository paymentRepository,
            QuotationRepository quotationRepository,
            ServiceRequestRepository serviceRequestRepository,
            UserRepository userRepository,
            NotificationService notificationService
    ) {
        this.paymentRepository = paymentRepository;
        this.quotationRepository = quotationRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.userRepository = userRepository;
        this.notificationService = notificationService;
    }
    public String createRazorpayOrder(Long quotationId) {

        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));

        if (!"ACCEPTED".equals(quotation.getPaymentStatus())) {
            throw new RuntimeException("Quotation must be accepted before payment");
        }
        Optional<Payment> existingPayment =
                paymentRepository.findByQuotation(quotation);

        if (existingPayment.isPresent()) {

            Payment payment = existingPayment.get();

            if ("SUCCESS".equals(payment.getPaymentStatus())) {
                throw new RuntimeException(
                        "Payment has already been completed for this quotation"
                );
            }

            if ("CREATED".equals(payment.getPaymentStatus())
                    && payment.getRazorpayOrderId() != null) {

                return payment.getRazorpayOrderId();
            }
        }

        if (quotation.getTotalAmount() == null || quotation.getTotalAmount() <= 0) {
            throw new RuntimeException("Invalid payment amount");
        }

        try {
            RazorpayClient razorpay = new RazorpayClient(
                    razorpayKeyId,
                    razorpayKeySecret
            );

            int amountInPaise = (int) Math.round(
                    quotation.getTotalAmount() * 100
            );

            JSONObject orderRequest = new JSONObject();
            orderRequest.put("amount", amountInPaise);
            orderRequest.put("currency", "INR");
            orderRequest.put(
                    "receipt",
                    "RA-" + quotation.getServiceRequest().getId()
            );

            Order order = razorpay.orders.create(orderRequest);

            Payment payment;

            if (existingPayment.isPresent()) {
                payment = existingPayment.get();

                payment.setAmount(quotation.getTotalAmount());
                payment.setPaymentMethod("RAZORPAY");
                payment.setPaymentStatus("CREATED");
                payment.setRazorpayOrderId(order.get("id").toString());
                payment.setPaymentDate(null);
                payment.setCurrency("INR");
            } else {
                payment = new Payment();

                payment.setQuotation(quotation);
                payment.setAmount(quotation.getTotalAmount());
                payment.setPaymentMethod("RAZORPAY");
                payment.setPaymentStatus("CREATED");
                payment.setRazorpayOrderId(order.get("id").toString());
                payment.setCurrency("INR");
            }

            paymentRepository.save(payment);

            return order.get("id").toString();

        } catch (Exception e) {
            throw new RuntimeException(
                    "Failed to create Razorpay order: " + e.getMessage()
            );
        }
    }
    public Payment verifyRazorpayPayment(RazorpayVerifyRequest request) {

        Quotation quotation = quotationRepository.findById(request.getQuotationId())
                .orElseThrow(() -> new RuntimeException("Quotation not found"));

        Payment payment = paymentRepository.findByQuotation(quotation)
                .orElseThrow(() -> new RuntimeException("Payment order not found"));

        if (!payment.getRazorpayOrderId().equals(request.getRazorpayOrderId())) {
            throw new RuntimeException("Invalid Razorpay order ID");
        }

        try {
            JSONObject attributes = new JSONObject();

            attributes.put("razorpay_order_id", request.getRazorpayOrderId());
            attributes.put("razorpay_payment_id", request.getRazorpayPaymentId());
            attributes.put("razorpay_signature", request.getRazorpaySignature());

            boolean verified = Utils.verifyPaymentSignature(
                    attributes,
                    razorpayKeySecret
            );

            if (!verified) {
                throw new RuntimeException("Payment verification failed");
            }

            payment.setRazorpayPaymentId(request.getRazorpayPaymentId());
            payment.setRazorpaySignature(request.getRazorpaySignature());
            payment.setPaymentMethod(
                    request.getPaymentMethod() != null
                            ? request.getPaymentMethod()
                            : "RAZORPAY"
            );
            payment.setPaymentStatus("SUCCESS");
            payment.setPaymentDate(LocalDateTime.now());

            quotation.setPaymentStatus("PAID");
            quotationRepository.save(quotation);

            ServiceRequest serviceRequest = quotation.getServiceRequest();
            serviceRequest.setStatus("CLOSED");

            notificationService.notifyUser(
                    serviceRequest.getMechanic().getUser(),
                    "Payment for service request #" +
                            serviceRequest.getId() +
                            " has been completed successfully."
            );

            notificationService.notifyUser(
                    serviceRequest.getCustomer(),
                    "Payment for service request #" +
                            serviceRequest.getId() +
                            " was successful. Thank you for using RoadAid."
            );

            serviceRequestRepository.save(serviceRequest);

            return paymentRepository.save(payment);

        } catch (Exception e) {
            throw new RuntimeException(
                    "Razorpay payment verification failed: " + e.getMessage()
            );
        }
    }
    public Payment requestCashPayment(Long quotationId) {

        Quotation quotation = quotationRepository.findById(quotationId)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));

        if (!"ACCEPTED".equals(quotation.getPaymentStatus())) {
            throw new RuntimeException(
                    "Quotation must be accepted before cash payment"
            );
        }

        Optional<Payment> existingPayment =
                paymentRepository.findByQuotation(quotation);

        if (existingPayment.isPresent()) {
            Payment existing = existingPayment.get();

            if ("SUCCESS".equals(existing.getPaymentStatus())) {
                throw new RuntimeException(
                        "Payment has already been completed"
                );
            }

            if ("CASH_PENDING".equals(existing.getPaymentStatus())) {
                return existing;
            }
            if ("CREATED".equals(existing.getPaymentStatus())) {
                existing.setPaymentMethod("CASH");
                existing.setPaymentStatus("CASH_PENDING");
                existing.setRazorpayOrderId(null);
                existing.setCurrency("INR");

                return paymentRepository.save(existing);
            }


            throw new RuntimeException(
                    "Another payment is already in progress"
            );
        }

        Payment payment = new Payment();

        payment.setQuotation(quotation);
        payment.setAmount(quotation.getTotalAmount());
        payment.setPaymentMethod("CASH");
        payment.setPaymentStatus("CASH_PENDING");
        payment.setCurrency("INR");

        Payment savedPayment = paymentRepository.save(payment);

        ServiceRequest serviceRequest = quotation.getServiceRequest();

        notificationService.notifyUser(
                serviceRequest.getMechanic().getUser(),
                "Customer has selected cash payment for service request #" +
                        serviceRequest.getId() +
                        ". Please confirm the cash amount after receiving it."
        );

        notificationService.notifyUser(
                serviceRequest.getCustomer(),
                "Cash payment request submitted for service request #" +
                        serviceRequest.getId() +
                        ". Waiting for mechanic confirmation."
        );

        return savedPayment;
    }
    public Payment confirmCashPayment(Long requestId) {

        ServiceRequest serviceRequest = serviceRequestRepository.findById(requestId)
                .orElseThrow(() -> new RuntimeException("Service request not found"));

        Quotation quotation = quotationRepository.findByServiceRequest(serviceRequest)
                .orElseThrow(() -> new RuntimeException("Quotation not found"));

        Payment payment = paymentRepository.findByQuotation(quotation)
                .orElseThrow(() -> new RuntimeException("Cash payment not found"));

        if (!"CASH".equals(payment.getPaymentMethod())
                || !"CASH_PENDING".equals(payment.getPaymentStatus())) {
            throw new RuntimeException("No pending cash payment for this request");
        }

        payment.setPaymentStatus("SUCCESS");
        payment.setPaymentDate(LocalDateTime.now());

        quotation.setPaymentStatus("PAID");
        quotationRepository.save(quotation);

        serviceRequest.setStatus("CLOSED");
        serviceRequestRepository.save(serviceRequest);

        notificationService.notifyUser(
                serviceRequest.getCustomer(),
                "Cash payment for service request #" +
                        serviceRequest.getId() +
                        " has been confirmed successfully."
        );

        notificationService.notifyUser(
                serviceRequest.getMechanic().getUser(),
                "Cash payment for service request #" +
                        serviceRequest.getId() +
                        " has been confirmed."
        );

        return paymentRepository.save(payment);
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
        notificationService.notifyUser(
                serviceRequest.getMechanic().getUser(),
                "Payment for service request #" +
                        serviceRequest.getId() +
                        " has been completed successfully."
        );
        notificationService.notifyUser(
                serviceRequest.getCustomer(),
                "Payment for service request #" +
                        serviceRequest.getId() +
                        " was successful. Thank you for using RoadAid."
        );
        serviceRequestRepository.save(serviceRequest);

        // Save payment
        return paymentRepository.save(payment);
    }

    public List<Payment> getMyPayments() {
        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return paymentRepository
                .findByQuotation_ServiceRequest_Customer(user);
    }


}