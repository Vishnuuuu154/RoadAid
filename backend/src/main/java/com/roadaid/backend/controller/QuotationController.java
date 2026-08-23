package com.roadaid.backend.controller;

import com.roadaid.backend.entity.Quotation;
import com.roadaid.backend.service.QuotationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quotations")
public class QuotationController {

    private final QuotationService quotationService;

    public QuotationController(QuotationService quotationService) {
        this.quotationService = quotationService;
    }

    @PostMapping("/{requestId}")
    public Quotation createQuotation(
            @PathVariable Long requestId,
            @RequestBody Quotation quotation
    ) {
        return quotationService.createQuotation(requestId, quotation);
    }
    @GetMapping("/request/{requestId}")
    public Quotation getQuotation(@PathVariable Long requestId) {
        return quotationService.getQuotation(requestId);
    }
    @PutMapping("/{requestId}/accept")
    public Quotation acceptQuotation(@PathVariable Long requestId) {
        return quotationService.acceptQuotation(requestId);
    }
    @GetMapping("/mechanic")
    public List<Quotation> getMyQuotations() {
        return quotationService.getMyQuotations();
    }
    @PutMapping("/{requestId}")
    public Quotation updateQuotation(
            @PathVariable Long requestId,
            @RequestBody Quotation quotation
    ) {
        return quotationService.updateQuotation(
                requestId,
                quotation
        );
    }
}