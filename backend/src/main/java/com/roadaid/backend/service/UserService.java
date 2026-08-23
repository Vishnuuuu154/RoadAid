package com.roadaid.backend.service;
import com.roadaid.backend.dto.LoginResponse;
import com.roadaid.backend.dto.LoginRequest;
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
import java.util.List;

@Service
public class UserService {
    private final UserRepository userRepository;
    private final JwtUtil jwtUtil;
    private final MechanicRepository mechanicRepository;
    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private final FavoriteRepository favoriteRepository;
    private final NotificationRepository notificationRepository;
    private final VehicleRepository vehicleRepository;
    private final ServiceRequestRepository serviceRequestRepository;

    public UserService(
            UserRepository userRepository,
            JwtUtil jwtUtil,
            MechanicRepository mechanicRepository,
            FavoriteRepository favoriteRepository,
            NotificationRepository notificationRepository,
            VehicleRepository vehicleRepository,
            ServiceRequestRepository serviceRequestRepository

    ) {
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.mechanicRepository = mechanicRepository;
        this.favoriteRepository = favoriteRepository;
        this.notificationRepository = notificationRepository;
        this.vehicleRepository = vehicleRepository;
        this.serviceRequestRepository = serviceRequestRepository;

    }

    public User registerUser(RegisterRequest request) {

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
        user.setRole(request.getRole().toUpperCase());
        user.setIsActive(true);

        User savedUser = userRepository.save(user);

        if ("MECHANIC".equalsIgnoreCase(request.getRole())) {

            Mechanic mechanic = new Mechanic();

            mechanic.setUser(savedUser);
            mechanic.setWorkshopName(request.getWorkshopName());
            mechanic.setWorkshopAddress(request.getWorkshopAddress());
            mechanic.setExperienceYears(request.getExperienceYears());
            mechanic.setContactNumber(request.getContactNumber());

            mechanic.setAvailable(false);

            mechanicRepository.save(mechanic);
        }

        return savedUser;
    }

    public LoginResponse loginUser(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Invalid email or password"));

        if (!user.getIsActive()) {
            throw new RuntimeException("Your account has been deactivated. Please contact the administrator.");
        }
        System.out.println("Entered Password: " + request.getPassword());
        System.out.println("Stored Hash: " + user.getPassword());
        System.out.println("Password Match: " +
                passwordEncoder.matches(request.getPassword(), user.getPassword()));
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid email or password");
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
    public User updateProfile(String fullName, String phone) {

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



}