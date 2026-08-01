package com.roadaid.backend.controller;

import com.roadaid.backend.entity.Payment;
import com.roadaid.backend.service.PaymentService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/payments")
public class PaymentController {

    private final PaymentService paymentService;

    public PaymentController(PaymentService paymentService) {
        this.paymentService = paymentService;
    }

    @PostMapping("/{quotationId}")
    public Payment makePayment(
            @PathVariable Long quotationId,
            @RequestBody Payment payment
    ) {
        return paymentService.makePayment(quotationId, payment);
    }
    @GetMapping("/my")
    public List<Payment> getMyPayments() {
        return paymentService.getMyPayments();
    }
}