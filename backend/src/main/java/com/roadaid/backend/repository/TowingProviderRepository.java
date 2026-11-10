package com.roadaid.backend.repository;

import com.roadaid.backend.entity.TowingProvider;
import com.roadaid.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TowingProviderRepository extends JpaRepository<TowingProvider, Long> {

    Optional<TowingProvider> findByUser(User user);

    List<TowingProvider> findByVerificationStatus(String verificationStatus);

    long countByVerificationStatus(String verificationStatus);
}