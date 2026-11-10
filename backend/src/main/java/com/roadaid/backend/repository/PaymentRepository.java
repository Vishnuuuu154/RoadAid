package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Payment;
import com.roadaid.backend.entity.Quotation;
import com.roadaid.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByQuotation(Quotation quotation);

    List<Payment> findByQuotation_ServiceRequest_Customer(User customer);
    List<Payment> findByQuotation_ServiceRequest_Mechanic_User(User user);

    Optional<Payment> findByQuotation_ServiceRequest_Id(Long requestId);

    @Query("""
            SELECT COALESCE(SUM(p.amount), 0)
            FROM Payment p
            WHERE p.paymentStatus = 'SUCCESS'
            """)
    Double getTotalSuccessfulRevenue();
    List<Payment> findAllByOrderByPaymentDateDesc();
    @Query("""
        SELECT COALESCE(SUM(p.amount), 0)
        FROM Payment p
        WHERE p.paymentStatus = 'SUCCESS'
        AND p.paymentDate >= :start
        AND p.paymentDate < :end
        """)
    Double getRevenueBetween(
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end
    );
    List<Payment> findByPaymentDateBetween(
            LocalDateTime start,
            LocalDateTime end
    );

}