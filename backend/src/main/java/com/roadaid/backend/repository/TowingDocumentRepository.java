package com.roadaid.backend.repository;

import com.roadaid.backend.entity.TowingDocument;
import com.roadaid.backend.entity.TowingProvider;
import com.roadaid.backend.entity.TowingVehicle;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TowingDocumentRepository extends JpaRepository<TowingDocument, Long> {

    List<TowingDocument> findByProvider(TowingProvider provider);

    List<TowingDocument> findByVehicle(TowingVehicle vehicle);

    List<TowingDocument> findByVerificationStatus(String verificationStatus);
}