package com.roadaid.backend.service;

import com.roadaid.backend.entity.SystemLog;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.repository.SystemLogRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SystemLogService {

    private final SystemLogRepository systemLogRepository;

    public SystemLogService(SystemLogRepository systemLogRepository) {
        this.systemLogRepository = systemLogRepository;
    }

    public void log(
            User user,
            String action,
            String targetType,
            Long targetId,
            String description
    ) {

        SystemLog log = new SystemLog();

        log.setUser(user);
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDescription(description);

        systemLogRepository.save(log);
    }

    public List<SystemLog> getAllLogs() {
        return systemLogRepository.findAllByOrderByCreatedAtDesc();
    }

    public List<SystemLog> getLogsByAction(String action) {
        return systemLogRepository
                .findByActionOrderByCreatedAtDesc(action);
    }

    public List<SystemLog> getLogsByUser(Integer userId) {
        return systemLogRepository
                .findByUserIdOrderByCreatedAtDesc(userId);
    }
}