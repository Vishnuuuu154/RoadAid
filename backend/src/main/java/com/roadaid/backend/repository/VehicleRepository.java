package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Vehicle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.roadaid.backend.entity.User;
import java.util.List;
import java.util.Optional;
@Repository
public interface VehicleRepository extends JpaRepository<Vehicle, Long> {
    List<Vehicle> findByUser(User user);
    boolean existsByIdAndUser(Long id, User user);
    Optional<Vehicle> findByIdAndUser(Long id, User user);
    boolean existsByRegistrationNumber(String registrationNumber);
    boolean existsByRegistrationNumberAndIdNot(
            String registrationNumber,
            Long id
    );
    void deleteByUser(User user);
}