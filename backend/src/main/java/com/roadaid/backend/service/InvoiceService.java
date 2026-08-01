package com.roadaid.backend.service;

import com.roadaid.backend.entity.Payment;
import com.roadaid.backend.repository.PaymentRepository;
import com.roadaid.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class InvoiceService {

    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;

    public InvoiceService(PaymentRepository paymentRepository,
                          UserRepository userRepository) {
        this.paymentRepository = paymentRepository;
        this.userRepository = userRepository;
    }
    public Payment getInvoice(Long paymentId) {
        return paymentRepository.findById(paymentId)
                .orElseThrow(() -> new RuntimeException("Invoice not found"));
    }

}