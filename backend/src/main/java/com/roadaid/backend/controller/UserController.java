package com.roadaid.backend.controller;
import com.roadaid.backend.dto.LoginResponse;
import com.roadaid.backend.dto.LoginRequest;
import com.roadaid.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;
import com.roadaid.backend.dto.RegisterRequest;

import com.roadaid.backend.entity.User;
import jakarta.validation.Valid;

import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }
    @PostMapping("/register")
    public String registerUser(@Valid @RequestBody RegisterRequest request) {
        userService.registerUser(request);
        return "User registered successfully!";
    }
    @PostMapping("/login")
    public LoginResponse login(@RequestBody LoginRequest request) {
        return userService.loginUser(request);
    }


    @GetMapping("/profile")
    public User getProfile() {
        return userService.getCurrentUser();
    }
    @PutMapping("/profile")
    public User updateProfile(
            @RequestBody Map<String, String> request
    ) {

        return userService.updateProfile(
                request.get("fullName"),
                request.get("phone")
        );
    }

    @PutMapping("/change-password")
    public String changePassword(
            @RequestBody Map<String, String> request
    ) {

        userService.changePassword(
                request.get("currentPassword"),
                request.get("newPassword")
        );

        return "Password changed successfully";
    }
    @PutMapping("/delete-account")
    public String deleteAccount(
            @RequestBody Map<String, String> request
    ) {

        userService.deleteAccount(
                request.get("password")
        );

        return "Account deleted successfully";
    }
}