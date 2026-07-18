package com.roadaid.backend.service;

import com.roadaid.backend.repository.UserRepository;
import org.springframework.stereotype.Service;
import com.roadaid.backend.dto.RegisterRequest;
import com.roadaid.backend.entity.User;

@Service
public class UserService {
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
        user.setPassword(request.getPassword());   // We'll encrypt this later
        user.setRole(request.getRole());
        user.setIsActive(true);

        return userRepository.save(user);
    }

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

}