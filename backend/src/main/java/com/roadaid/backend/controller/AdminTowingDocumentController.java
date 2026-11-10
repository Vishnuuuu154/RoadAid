package com.roadaid.backend.controller;

import com.roadaid.backend.entity.TowingDocument;
import com.roadaid.backend.repository.TowingDocumentRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/admin/towing-documents")
public class AdminTowingDocumentController {

    private final TowingDocumentRepository documentRepository;

    public AdminTowingDocumentController(
            TowingDocumentRepository documentRepository
    ) {
        this.documentRepository = documentRepository;
    }

    @GetMapping("/{documentId}/view")
    public ResponseEntity<Resource> viewDocument(
            @PathVariable Long documentId
    ) throws Exception {

        TowingDocument document = documentRepository.findById(documentId)
                .orElseThrow(() ->
                        new RuntimeException("Document not found"));

        Path filePath = Paths.get(document.getFilePath())
                .toAbsolutePath()
                .normalize();

        Resource resource = new UrlResource(filePath.toUri());

        if (!resource.exists() || !resource.isReadable()) {
            throw new RuntimeException("Document file not found");
        }

        String contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;

        try {
            contentType = java.nio.file.Files.probeContentType(filePath);
        } catch (Exception ignored) {
        }

        if (contentType == null) {
            contentType = MediaType.APPLICATION_OCTET_STREAM_VALUE;
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        "inline; filename=\"" + document.getFileName() + "\""
                )
                .body(resource);
    }
}