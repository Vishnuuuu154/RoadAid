package com.roadaid.backend.controller;

import com.roadaid.backend.entity.Payment;
import com.roadaid.backend.service.InvoiceService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/invoices")
public class InvoiceController {

    private final InvoiceService invoiceService;

    public InvoiceController(InvoiceService invoiceService) {
        this.invoiceService = invoiceService;
    }
    @GetMapping("/{paymentId}")
    public Payment getInvoice(@PathVariable Long paymentId) {
        return invoiceService.getInvoice(paymentId);
    }

}