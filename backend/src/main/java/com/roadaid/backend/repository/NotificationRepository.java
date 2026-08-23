package com.roadaid.backend.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.roadaid.backend.entity.Notification;
import com.roadaid.backend.entity.User;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    List<Notification> findByUserOrderByCreatedAtDesc(User user);
    void deleteByUser(User user);
}