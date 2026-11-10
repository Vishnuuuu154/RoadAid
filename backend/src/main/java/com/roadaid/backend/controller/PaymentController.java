package com.roadaid.backend.controller;

import com.roadaid.backend.dto.RazorpayVerifyRequest;
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
    @PostMapping("/razorpay/order/{quotationId}")
    public String createRazorpayOrder(@PathVariable Long quotationId) {
        return paymentService.createRazorpayOrder(quotationId);
    }
    @PostMapping("/cash/{quotationId}")
    public Payment requestCashPayment(
            @PathVariable Long quotationId
    ) {
        return paymentService.requestCashPayment(quotationId);
    }
    @PostMapping("/cash/{quotationId}/confirm")
    public Payment confirmCashPayment(
            @PathVariable Long quotationId
    ) {
        return paymentService.confirmCashPayment(quotationId);
    }
    @PostMapping("/{quotationId}")
    public Payment makePayment(
            @PathVariable Long quotationId,
            @RequestBody Payment payment
    ) {
        return paymentService.makePayment(quotationId, payment);
    }
    @PostMapping("/razorpay/verify")
    public Payment verifyRazorpayPayment(
            @RequestBody RazorpayVerifyRequest request
    ) {
        return paymentService.verifyRazorpayPayment(request);
    }
    @GetMapping("/my")
    public List<Payment> getMyPayments() {
        return paymentService.getMyPayments();
    }
}