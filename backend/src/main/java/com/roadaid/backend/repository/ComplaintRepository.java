package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Complaint;
import com.roadaid.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ComplaintRepository extends JpaRepository<Complaint, Long> {

    List<Complaint> findByReportedBy(User reportedBy);

}