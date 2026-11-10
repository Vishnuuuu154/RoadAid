package com.roadaid.backend.repository;
import java.util.List;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.entity.Mechanic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import com.roadaid.backend.entity.Mechanic;
import com.roadaid.backend.entity.ServiceRequest;

import java.util.List;
import java.time.LocalDateTime;import java.time.LocalDateTime;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {

    List<ServiceRequest> findByCustomer(User customer);
    long countByStatus(String status);
    List<ServiceRequest> findByMechanic(Mechanic mechanic);
    boolean existsByMechanicAndStatusIn(
            Mechanic mechanic,
            List<String> statuses
    );
    List<ServiceRequest> findByMechanicOrderByCreatedAtDesc(Mechanic mechanic);
    List<ServiceRequest> findByCustomerOrderByCreatedAtDesc(User customer);
    List<ServiceRequest> findByStatus(String status);
    Optional<ServiceRequest> findByIdAndStatus(Long id, String status);
    Optional<ServiceRequest> findByIdAndMechanic(Long id, Mechanic mechanic);
    List<ServiceRequest> findByCustomerAndStatusNot(User customer, String status);
    Optional<ServiceRequest> findByIdAndCustomer(Long id, User customer);
    List<ServiceRequest> findAllByOrderByCreatedAtDesc();

    List<ServiceRequest> findByStatusOrderByCreatedAtDesc(String status);
    List<ServiceRequest> findByCustomer_FullNameContainingIgnoreCaseOrderByCreatedAtDesc(
            String customerName
    );
    boolean existsByCustomerAndStatusIn(
            User customer,
            List<String> statuses
    );
    @Query("""
        SELECT r
        FROM ServiceRequest r
        WHERE r.status IN ('COMPLETED', 'CLOSED')
        ORDER BY r.createdAt DESC
        """)
    List<ServiceRequest> findCompletedRequests();
    List<ServiceRequest> findByStatusInOrderByCreatedAtDesc(
            List<String> statuses
    );
    long countByCreatedAtBetween(
            LocalDateTime start,
            LocalDateTime end
    );

    long countByCreatedAtBetweenAndStatus(
            LocalDateTime start,
            LocalDateTime end,
            String status
    );
    @Query("""
    SELECT r
    FROM ServiceRequest r
    WHERE r.createdAt >= :start
    AND r.createdAt < :end
    ORDER BY r.createdAt ASC
""")
    List<ServiceRequest> findRequestsBetween(
            LocalDateTime start,
            LocalDateTime end
    );
}