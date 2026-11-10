
package com.roadaid.backend.service;

import com.roadaid.backend.dto.RegisterRequest;
import com.roadaid.backend.entity.TowingDocument;
import com.roadaid.backend.entity.TowingProvider;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.repository.TowingDocumentRepository;
import com.roadaid.backend.repository.TowingProviderRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Paths;

@Service
public class TowingProviderRegistrationService {

    private final UserService userService;
    private final TowingProviderRepository providerRepository;
    private final TowingDocumentRepository documentRepository;
    private final FileStorageService fileStorageService;

    public TowingProviderRegistrationService(
            UserService userService,
            TowingProviderRepository providerRepository,
            TowingDocumentRepository documentRepository,
            FileStorageService fileStorageService
    ) {
        this.userService = userService;
        this.providerRepository = providerRepository;
        this.documentRepository = documentRepository;
        this.fileStorageService = fileStorageService;
    }

    @Transactional
    public void register(
            String fullName,
            String email,
            String phone,
            String password,
            String businessName,
            String businessType,
            String businessAddress,
            String district,
            String pinCode,
            String alternateContact,
            MultipartFile ownerIdProof,
            MultipartFile businessRegCert,
            MultipartFile businessAddressProof
    ) throws IOException {

        validateDocument(ownerIdProof, true);
        validateDocument(businessRegCert, false);
        validateDocument(businessAddressProof, true);

        RegisterRequest request = new RegisterRequest();
        request.setFullName(fullName);
        request.setEmail(email);
        request.setPhone(phone);
        request.setPassword(password);
        request.setRole("TOWING_PROVIDER");
        request.setBusinessName(businessName);
        request.setBusinessAddress(businessAddress);
        request.setContactNumber(
                alternateContact == null || alternateContact.isBlank()
                        ? phone : alternateContact
        );

        User user = userService.registerUser(request);

        TowingProvider provider = providerRepository.findByUser(user)
                .orElseThrow(() ->
                        new RuntimeException("Towing provider profile not created"));

        provider.setBusinessType(businessType);
        provider.setDistrict(district);
        provider.setPinCode(pinCode);
        provider.setAlternateContact(alternateContact);

        providerRepository.save(provider);

        saveDocument(provider, ownerIdProof, "OWNER_ID_PROOF");
        saveDocument(provider, businessRegCert, "BUSINESS_REGISTRATION");
        saveDocument(provider, businessAddressProof, "BUSINESS_ADDRESS_PROOF");
    }

    private void validateDocument(MultipartFile file, boolean required) {
        if (file == null || file.isEmpty()) {
            if (required) {
                throw new RuntimeException("Required verification document is missing");
            }
            return;
        }

        if (file.getSize() > 5 * 1024 * 1024) {
            throw new RuntimeException("Documents must not exceed 5 MB");
        }

        String filename = file.getOriginalFilename();
        String extension = filename == null || !filename.contains(".")
                ? ""
                : filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();

        if (!java.util.List.of("pdf", "jpg", "jpeg", "png").contains(extension)) {
            throw new RuntimeException("Only PDF, JPG and PNG documents are allowed");
        }
    }

    private void saveDocument(
            TowingProvider provider,
            MultipartFile file,
            String documentType
    ) throws IOException {

        if (file == null || file.isEmpty()) {
            return;
        }

        TowingDocument document = new TowingDocument();
        document.setProvider(provider);
        document.setDocumentType(documentType);
        document.setFileName(
                Paths.get(file.getOriginalFilename()).getFileName().toString()
        );
        document.setFilePath(
                fileStorageService.uploadVerificationDocument(file)
        );
        document.setVerificationStatus("PENDING");

        documentRepository.save(document);
    }
}
