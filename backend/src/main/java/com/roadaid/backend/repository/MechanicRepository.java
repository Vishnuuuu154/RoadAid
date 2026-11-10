package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Mechanic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.roadaid.backend.entity.User;

import java.util.List;
import java.util.Optional;

@Repository
public interface MechanicRepository extends JpaRepository<Mechanic, Long> {
    Optional<Mechanic> findByUser(User user);
    @Query("""
SELECT m FROM Mechanic m
WHERE m.available = true
AND m.verificationStatus = 'APPROVED'
AND (
    LOWER(m.workshopName) LIKE LOWER(CONCAT('%', :keyword, '%'))
    OR LOWER(m.workshopAddress) LIKE LOWER(CONCAT('%', :keyword, '%'))
    OR LOWER(m.user.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
)
""")
    List<Mechanic> searchMechanics(@Param("keyword") String keyword);
    List<Mechanic> findByAvailableTrueAndVerificationStatus(
            String verificationStatus
    );
    long countByAvailable(boolean available);
    List<Mechanic> findByVerificationStatus(String verificationStatus);

    long countByVerificationStatus(String verificationStatus);
    List<Mechanic> findByAvailableTrueAndVerificationStatusAndLatitudeIsNotNullAndLongitudeIsNotNull(
            String verificationStatus
    );
    @Query("""
    SELECT m FROM Mechanic m
    WHERE m.available = true
      AND m.verificationStatus = :verificationStatus
      AND m.latitude IS NOT NULL
      AND m.longitude IS NOT NULL
      AND NOT EXISTS (
          SELECT sr FROM ServiceRequest sr
          WHERE sr.mechanic = m
            AND sr.status IN ('ACCEPTED', 'IN_PROGRESS')
      )
""")
    List<Mechanic> findAvailableMechanicsWithoutActiveRequest(
            @Param("verificationStatus") String verificationStatus
    );

}