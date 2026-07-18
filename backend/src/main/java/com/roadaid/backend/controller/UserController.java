package com.roadaid.backend.controller;

import com.roadaid.backend.service.UserService;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.roadaid.backend.dto.RegisterRequest;
import com.roadaid.backend.entity.User;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService) {
        this.userService = userService;
    }
    @PostMapping("/register")
    public String register(@RequestBody RegisterRequest request) {
        userService.registerUser(request);
        return "User registered successfully!";
    }

}