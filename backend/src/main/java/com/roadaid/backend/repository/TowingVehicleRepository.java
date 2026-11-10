package com.roadaid.backend.repository;

import com.roadaid.backend.entity.TowingVehicle;
import com.roadaid.backend.entity.TowingProvider;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TowingVehicleRepository extends JpaRepository<TowingVehicle, Long> {

    List<TowingVehicle> findByProvider(TowingProvider provider);

    Optional<TowingVehicle> findByRegistrationNumber(String registrationNumber);

    List<TowingVehicle> findByVerificationStatus(String verificationStatus);

    long countByVerificationStatus(String verificationStatus);
}