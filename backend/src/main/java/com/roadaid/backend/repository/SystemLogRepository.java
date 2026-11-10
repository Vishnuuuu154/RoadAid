package com.roadaid.backend.repository;

import com.roadaid.backend.entity.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SystemLogRepository
        extends JpaRepository<SystemLog, Long> {

    List<SystemLog> findAllByOrderByCreatedAtDesc();

    List<SystemLog> findByActionOrderByCreatedAtDesc(
            String action
    );

    List<SystemLog> findByUserIdOrderByCreatedAtDesc(
            Integer userId
    );
}