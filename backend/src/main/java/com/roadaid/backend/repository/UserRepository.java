package com.roadaid.backend.repository;

import com.roadaid.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import com.roadaid.backend.entity.User;

import java.util.List;
import java.util.Optional;

import java.util.Optional;import java.time.LocalDateTime;

public interface UserRepository extends JpaRepository<User, Integer> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByPhone(String phone);
    long countByRole(String role);
    List<User> findByRoleNot(String role);
    List<User> findByFullNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
            String fullName,
            String email
    );
    Optional<User> findByPhone(String phone);
    long countByRoleAndCreatedAtBetween(
            String role,
            LocalDateTime start,
            LocalDateTime end
    );
}