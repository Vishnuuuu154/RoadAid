package com.roadaid.backend.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {

    private static final String UPLOAD_DIR =
            "backend/uploads/request-images";
    private static final String VERIFICATION_UPLOAD_DIR =
            "backend/uploads/verification-documents";

    public String uploadImage(MultipartFile file) throws IOException {

        String originalFileName = file.getOriginalFilename();

        String fileName =
                UUID.randomUUID() + "_" + originalFileName;

        Path path = Paths.get(UPLOAD_DIR, fileName);

        Files.createDirectories(path.getParent());

        Files.copy(
                file.getInputStream(),
                path,
                StandardCopyOption.REPLACE_EXISTING
        );

        // Return a browser-accessible URL instead of a Windows file path
        return "/uploads/request-images/" + fileName;
    }
    public String uploadVerificationDocument(MultipartFile file) throws IOException {

        String originalFileName = Paths.get(
                file.getOriginalFilename() == null
                        ? "document"
                        : file.getOriginalFilename()
        ).getFileName().toString();

        String fileName = UUID.randomUUID() + "_" + originalFileName;

        Path path = Paths.get(VERIFICATION_UPLOAD_DIR, fileName);

        Files.createDirectories(path.getParent());

        Files.copy(
                file.getInputStream(),
                path,
                StandardCopyOption.REPLACE_EXISTING
        );

        // Return the private filesystem path, not a public URL.
        return path.toString();
    }
}