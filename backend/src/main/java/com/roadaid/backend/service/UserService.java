package com.roadaid.backend.service;
import com.roadaid.backend.dto.LoginResponse;
import com.roadaid.backend.dto.LoginRequest;
import com.roadaid.backend.entity.PasswordResetToken;
import com.roadaid.backend.entity.TowingProvider;
import com.roadaid.backend.repository.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import com.roadaid.backend.dto.RegisterRequest;
import com.roadaid.backend.entity.User;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import com.roadaid.backend.security.JwtUtil;
import com.roadaid.backend.entity.Mechanic;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final MechanicRepository mechanicRepository;
    private final TowingProviderRepository towingProviderRepository;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final FavoriteRepository favoriteRepository;
    private final NotificationRepository notificationRepository;
    private final VehicleRepository vehicleRepository;
    private final ServiceRequestRepository serviceRequestRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final EmailService emailService;

    public UserService(
            UserRepository userRepository,
            JwtUtil jwtUtil,
            MechanicRepository mechanicRepository,
            FavoriteRepository favoriteRepository,
            NotificationRepository notificationRepository,
            VehicleRepository vehicleRepository,
            ServiceRequestRepository serviceRequestRepository,
            PasswordResetTokenRepository passwordResetTokenRepository,
            EmailService emailService,
            TowingProviderRepository towingProviderRepository

    ) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.mechanicRepository = mechanicRepository;
        this.favoriteRepository = favoriteRepository;
        this.notificationRepository = notificationRepository;
        this.vehicleRepository = vehicleRepository;
        this.serviceRequestRepository = serviceRequestRepository;
        this.passwordResetTokenRepository = passwordResetTokenRepository;
        this.emailService = emailService;
        this.towingProviderRepository = towingProviderRepository;
    }

    public User registerUser(RegisterRequest request) {
        String role = request.getRole().trim().toUpperCase();

        if (!List.of("CUSTOMER", "MECHANIC", "TOWING_PROVIDER").contains(role)) {
            throw new RuntimeException("Invalid registration role");
        }

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        if (userRepository.existsByPhone(request.getPhone())) {
            throw new RuntimeException("Phone number already exists");
        }

        User user = new User();

        user.setFullName(request.getFullName());
        user.setEmail(request.getEmail());
        user.setPhone(request.getPhone());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(role);
        user.setIsActive(true);

        User savedUser = userRepository.save(user);
        if ("MECHANIC".equals(role)) {

            Mechanic mechanic = new Mechanic();

            mechanic.setUser(savedUser);
            mechanic.setWorkshopName(request.getWorkshopName());
            mechanic.setWorkshopAddress(request.getWorkshopAddress());
            mechanic.setExperienceYears(request.getExperienceYears());
            mechanic.setContactNumber(request.getContactNumber());

            mechanic.setAvailable(false);

            mechanicRepository.save(mechanic);
        }
        if ("TOWING_PROVIDER".equals(role)) {

            if (request.getBusinessName() == null ||
                    request.getBusinessName().isBlank() ||
                    request.getBusinessAddress() == null ||
                    request.getBusinessAddress().isBlank() ||
                    request.getContactNumber() == null ||
                    request.getContactNumber().isBlank()) {

                throw new RuntimeException(
                        "Business name, address and contact number are required"
                );
            }

            TowingProvider provider = new TowingProvider();

            provider.setUser(savedUser);
            provider.setBusinessName(request.getBusinessName());
            provider.setBusinessAddress(request.getBusinessAddress());
            provider.setContactNumber(request.getContactNumber());
            provider.setVerificationStatus("PENDING");

            towingProviderRepository.save(provider);
        }

        return savedUser;
    }


    public LoginResponse loginUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!user.getIsActive()) {
            throw new RuntimeException("Your account has been deactivated. Please contact the administrator.");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
        }
        if ("MECHANIC".equalsIgnoreCase(user.getRole())) {

            Mechanic mechanic = mechanicRepository
                    .findByUser(user)
                    .orElseThrow(() ->
                            new RuntimeException(
                                    "Mechanic profile not found."
                            )
                    );

            if ("PENDING".equalsIgnoreCase(
                    mechanic.getVerificationStatus()
            )) {

                throw new RuntimeException(
                        "Your mechanic account is pending admin verification. You cannot log in until your account is approved."
                );

            }

            if ("REJECTED".equalsIgnoreCase(
                    mechanic.getVerificationStatus()
            )) {

                String reason = mechanic.getRejectionReason();

                if (reason != null && !reason.isBlank()) {

                    throw new RuntimeException(
                            "Your mechanic account was rejected. Reason: "
                                    + reason
                    );

                }

                throw new RuntimeException(
                        "Your mechanic account was rejected. Please contact the administrator."
                );

            }

        }
        if ("TOWING_PROVIDER".equalsIgnoreCase(user.getRole())) {

            TowingProvider provider = towingProviderRepository
                    .findByUser(user)
                    .orElseThrow(() ->
                            new RuntimeException("Towing provider profile not found.")
                    );

            if ("PENDING".equalsIgnoreCase(provider.getVerificationStatus())) {
                throw new RuntimeException(
                        "Your towing provider account is pending admin verification."
                );
            }

            if ("REJECTED".equalsIgnoreCase(provider.getVerificationStatus())) {

                String reason = provider.getRejectionReason();

                throw new RuntimeException(
                        "Your towing provider account was rejected. Reason: " +
                                (reason != null && !reason.isBlank()
                                        ? reason
                                        : "Please contact the administrator.")
                );
            }
        }


        return new LoginResponse(
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                jwtUtil.generateToken(user.getEmail())
        );

    }

    public User getCurrentUser() {

        Authentication authentication =
                SecurityContextHolder
                        .getContext()
                        .getAuthentication();

        String email = authentication.getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));
    }
    public User updateProfile(String fullName, String phone, String profileImage) {

        User user = getCurrentUser();

        if (fullName == null || fullName.trim().isEmpty()) {
            throw new RuntimeException("Full name is required");
        }

        if (phone == null || phone.trim().isEmpty()) {
            throw new RuntimeException("Phone number is required");
        }

        // Prevent another account from using this phone number
        userRepository.findByPhone(phone.trim())
                .ifPresent(existingUser -> {

                    if (!existingUser.getId().equals(user.getId())) {
                        throw new RuntimeException(
                                "Phone number already exists"
                        );
                    }

                });

        user.setFullName(fullName.trim());
        user.setPhone(phone.trim());

        if (profileImage != null && !profileImage.isBlank()) {
            if (!profileImage.startsWith("data:image/")) {
                throw new RuntimeException("Invalid profile image format");
            }
            if (profileImage.length() > 3_000_000) {
                throw new RuntimeException("Profile image is too large");
            }
            user.setProfileImage(profileImage);
        } else {
            user.setProfileImage(null);
        }

        return userRepository.save(user);
    }
    public void changePassword(
            String currentPassword,
            String newPassword
    ) {

        User user = getCurrentUser();

        if (!passwordEncoder.matches(
                currentPassword,
                user.getPassword()
        )) {
            throw new RuntimeException(
                    "Current password is incorrect"
            );
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException(
                    "New password must be at least 6 characters"
            );
        }

        if (passwordEncoder.matches(
                newPassword,
                user.getPassword()
        )) {
            throw new RuntimeException(
                    "New password must be different from your current password"
            );
        }

        user.setPassword(
                passwordEncoder.encode(newPassword)
        );

        userRepository.save(user);
    }
    @Transactional
    public void deleteAccount(String password) {

        User user = getCurrentUser();

        // Verify password
        if (password == null || password.isBlank()) {
            throw new RuntimeException("Password is required");
        }

        if (!passwordEncoder.matches(
                password,
                user.getPassword()
        )) {
            throw new RuntimeException(
                    "Incorrect password"
            );
        }

        // Do not allow deletion during an active service
        List<String> activeStatuses = List.of(
                "PENDING",
                "WAITING_FOR_QUOTATION",
                "QUOTATION_PENDING",
                "ACCEPTED",
                "IN_PROGRESS"
        );

        if (serviceRequestRepository
                .existsByCustomerAndStatusIn(
                        user,
                        activeStatuses
                )) {

            throw new RuntimeException(
                    "You cannot delete your account while you have an active service request."
            );
        }

        // Remove customer-owned data
        favoriteRepository.deleteByCustomer(user);
        notificationRepository.deleteByUser(user);
        vehicleRepository.deleteByUser(user);

        // Anonymize account
        user.setFullName("Deleted User");
        user.setEmail(
                "deleted_" + user.getId() + "@roadaid.local"
        );
        user.setPhone(
                "DELETED_" + user.getId()
        );
        user.setProfileImage(null);

        userRepository.save(user);
    }
    @Transactional
    public void forgotPassword(String email) {

        userRepository.findByEmail(email.trim().toLowerCase())
                .ifPresent(user -> {

                    // Remove any previous reset tokens
                    passwordResetTokenRepository.deleteByUserId(user.getId());

                    String token = UUID.randomUUID().toString();

                    PasswordResetToken resetToken =
                            new PasswordResetToken();

                    resetToken.setToken(token);
                    resetToken.setUser(user);
                    resetToken.setExpiresAt(
                            LocalDateTime.now().plusMinutes(30)
                    );
                    resetToken.setUsed(false);

                    passwordResetTokenRepository.save(resetToken);

                    emailService.sendPasswordResetEmail(
                            user.getEmail(),
                            user.getFullName(),
                            token
                    );
                });
    }
    @Transactional
    public void resetPassword(
            String token,
            String newPassword
    ) {

        if (token == null || token.isBlank()) {
            throw new RuntimeException(
                    "Invalid password reset link."
            );
        }

        if (newPassword == null || newPassword.length() < 6) {
            throw new RuntimeException(
                    "Password must be at least 6 characters."
            );
        }

        PasswordResetToken resetToken =
                passwordResetTokenRepository.findByToken(token)
                        .orElseThrow(() ->
                                new RuntimeException(
                                        "Invalid or expired password reset link."
                                )
                        );

        if (resetToken.isUsed()) {
            throw new RuntimeException(
                    "This password reset link has already been used."
            );
        }

        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new RuntimeException(
                    "This password reset link has expired."
            );
        }

        User user = resetToken.getUser();

        if (!Boolean.TRUE.equals(user.getIsActive())) {
            throw new RuntimeException(
                    "This account is inactive."
            );
        }

        if (passwordEncoder.matches(
                newPassword,
                user.getPassword()
        )) {
            throw new RuntimeException(
                    "New password must be different from your current password."
            );
        }

        user.setPassword(
                passwordEncoder.encode(newPassword)
        );

        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }



}