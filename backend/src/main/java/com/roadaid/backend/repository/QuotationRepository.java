package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Quotation;
import com.roadaid.backend.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface QuotationRepository extends JpaRepository<Quotation, Long> {

    Optional<Quotation> findByServiceRequest(ServiceRequest serviceRequest);

}