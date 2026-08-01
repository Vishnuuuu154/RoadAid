package com.roadaid.backend.repository;

import com.roadaid.backend.entity.RequestImage;
import com.roadaid.backend.entity.ServiceRequest;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RequestImageRepository extends JpaRepository<RequestImage, Long> {

    List<RequestImage> findByServiceRequest(ServiceRequest serviceRequest);
}