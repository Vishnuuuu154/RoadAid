package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Payment;
import com.roadaid.backend.entity.Quotation;
import com.roadaid.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByQuotation(Quotation quotation);
    List<Payment> findByQuotation_ServiceRequest_Customer(User customer);
    Optional<Payment> findByQuotation_ServiceRequest_Id(Long requestId);
}