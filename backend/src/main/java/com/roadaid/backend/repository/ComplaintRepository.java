package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Complaint;
import com.roadaid.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;import org.springframework.data.jpa.repository.Query;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    List<Complaint> findByReportedBy(User reportedBy);
    long countByStatus(String status);

    List<Complaint> findTop10ByOrderByCreatedAtDesc();
}