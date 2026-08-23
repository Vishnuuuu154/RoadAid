package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Mechanic;
import com.roadaid.backend.entity.Quotation;
import com.roadaid.backend.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface QuotationRepository
        extends JpaRepository<Quotation, Long> {

    Optional<Quotation> findByServiceRequest(
            ServiceRequest serviceRequest
    );

    List<Quotation> findByServiceRequest_MechanicOrderByIdDesc(
            Mechanic mechanic
    );
}