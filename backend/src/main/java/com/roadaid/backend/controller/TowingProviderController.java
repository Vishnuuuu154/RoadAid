
package com.roadaid.backend.controller;

import com.roadaid.backend.service.TowingProviderRegistrationService;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/towing-providers")
public class TowingProviderController {

    private final TowingProviderRegistrationService registrationService;

    public TowingProviderController(
            TowingProviderRegistrationService registrationService
    ) {
        this.registrationService = registrationService;
    }

    @PostMapping(
            value = "/register",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public String register(
            @RequestParam String fullName,
            @RequestParam String email,
            @RequestParam String phone,
            @RequestParam String password,
            @RequestParam String businessName,
            @RequestParam String businessType,
            @RequestParam String businessAddress,
            @RequestParam String district,
            @RequestParam String pinCode,
            @RequestParam(required = false) String alternateContact,
            @RequestParam MultipartFile ownerIdProof,
            @RequestParam(required = false) MultipartFile businessRegCert,
            @RequestParam MultipartFile businessAddressProof
    ) throws Exception {

        registrationService.register(
                fullName,
                email,
                phone,
                password,
                businessName,
                businessType,
                businessAddress,
                district,
                pinCode,
                alternateContact,
                ownerIdProof,
                businessRegCert,
                businessAddressProof
        );

        return "Towing provider application submitted successfully";
    }
}
