package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Mechanic;
import com.roadaid.backend.entity.Review;
import com.roadaid.backend.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review, Long> {

    Optional<Review> findByServiceRequest(ServiceRequest serviceRequest);

    List<Review> findByMechanic(Mechanic mechanic);
    @Query("SELECT AVG(r.rating) FROM Review r WHERE r.mechanic = :mechanic")
     Double findAverageRatingByMechanic(@Param("mechanic") Mechanic mechanic);
}