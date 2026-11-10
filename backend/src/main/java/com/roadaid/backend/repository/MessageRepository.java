package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Message;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByServiceRequestOrderByCreatedAtAsc(
            ServiceRequest serviceRequest
    );

    List<Message> findByServiceRequestAndReceiverAndIsReadFalse(
            ServiceRequest serviceRequest,
            User receiver
    );

    long countByServiceRequestAndReceiverAndIsReadFalse(
            ServiceRequest serviceRequest,
            User receiver
    );
    List<Message> findBySenderOrReceiverOrderByCreatedAtDesc(
            User sender,
            User receiver
    );
}