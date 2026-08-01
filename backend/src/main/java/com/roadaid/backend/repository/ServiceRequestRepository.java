package com.roadaid.backend.repository;

import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.entity.Mechanic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ServiceRequestRepository extends JpaRepository<ServiceRequest, Long> {

    List<ServiceRequest> findByCustomer(User customer);
    long countByStatus(String status);
    List<ServiceRequest> findByMechanic(Mechanic mechanic);
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
}