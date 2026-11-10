
package com.roadaid.backend.service;

import com.roadaid.backend.entity.*;
import com.roadaid.backend.repository.ComplaintRepository;
import com.roadaid.backend.repository.PaymentRepository;
import com.roadaid.backend.repository.ServiceRequestRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class MechanicAnalyticsService {

    private final MechanicService mechanicService;
    private final ServiceRequestRepository serviceRequestRepository;
    private final PaymentRepository paymentRepository;
    private final ComplaintRepository complaintRepository;

    public MechanicAnalyticsService(
            MechanicService mechanicService,
            ServiceRequestRepository serviceRequestRepository,
            PaymentRepository paymentRepository,
            ComplaintRepository complaintRepository
    ) {
        this.mechanicService = mechanicService;
        this.serviceRequestRepository = serviceRequestRepository;
        this.paymentRepository = paymentRepository;
        this.complaintRepository = complaintRepository;
    }

    public Map<String, Object> getMyAnalytics(String period) {

        Mechanic mechanic = mechanicService.getMyProfile();

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime start = getStartDate(period, now);

        List<ServiceRequest> allRequests =
                serviceRequestRepository
                        .findByMechanicOrderByCreatedAtDesc(mechanic);

        List<ServiceRequest> requests = allRequests.stream()
                .filter(r -> isWithinPeriod(r.getCreatedAt(), start, now))
                .toList();

        List<Payment> allPayments =
                paymentRepository
                        .findByQuotation_ServiceRequest_Mechanic_User(
                                mechanic.getUser()
                        );

        List<Payment> payments = allPayments.stream()
                .filter(p -> {
                    LocalDateTime date = p.getPaymentDate();
                    if (start == null) {
                        return true;
                    }
                    return date != null
                            && !date.isBefore(start)
                            && !date.isAfter(now);
                })
                .toList();

        List<Payment> successfulPayments = payments.stream()
                .filter(p -> "SUCCESS".equalsIgnoreCase(
                        p.getPaymentStatus()
                ))
                .toList();

        double totalEarnings = successfulPayments.stream()
                .mapToDouble(p ->
                        p.getAmount() == null ? 0.0 : p.getAmount()
                )
                .sum();

        long completed = requests.stream()
                .filter(r -> "COMPLETED".equalsIgnoreCase(r.getStatus())
                        || "CLOSED".equalsIgnoreCase(r.getStatus()))
                .count();

        long cancelledOrRejected = requests.stream()
                .filter(r -> {
                    String status = r.getStatus();
                    return "CANCELLED".equalsIgnoreCase(status)
                            || "REJECTED".equalsIgnoreCase(status);
                })
                .count();

        long active = requests.stream()
                .filter(r -> List.of(
                        "WAITING_FOR_QUOTATION",
                        "ACCEPTED",
                        "IN_PROGRESS"
                ).contains(r.getStatus()))
                .count();

        double completionRate = requests.isEmpty()
                ? 0.0
                : Math.round(
                completed * 10000.0 / requests.size()
        ) / 100.0;

        List<Complaint> mechanicComplaints =
                complaintRepository.findAll().stream()
                        .filter(c ->
                                c.getReportedAgainst() != null
                                        && Objects.equals(
                                        c.getReportedAgainst().getId(),
                                        mechanic.getUser().getId()
                                ))
                        .filter(c -> isWithinPeriod(
                                c.getCreatedAt(), start, now
                        ))
                        .toList();

        Map<String, Long> complaintStatuses =
                mechanicComplaints.stream()
                        .collect(Collectors.groupingBy(
                                c -> c.getStatus() == null
                                        ? "UNKNOWN" : c.getStatus(),
                                Collectors.counting()
                        ));

        Map<String, Long> complaintReasons =
                mechanicComplaints.stream()
                        .collect(Collectors.groupingBy(
                                c -> c.getReason() == null
                                        ? "Unspecified" : c.getReason(),
                                Collectors.counting()
                        ));

        Map<String, Long> requestStatuses =
                requests.stream()
                        .collect(Collectors.groupingBy(
                                r -> r.getStatus() == null
                                        ? "UNKNOWN" : r.getStatus(),
                                Collectors.counting()
                        ));

        Map<String, Double> earningsByMethod =
                successfulPayments.stream()
                        .collect(Collectors.groupingBy(
                                p -> p.getPaymentMethod() == null
                                        ? "UNKNOWN" : p.getPaymentMethod(),
                                Collectors.summingDouble(
                                        p -> p.getAmount() == null
                                                ? 0.0 : p.getAmount()
                                )
                        ));

        Map<String, Long> dailyRequests = requests.stream()
                .filter(r -> r.getCreatedAt() != null)
                .collect(Collectors.groupingBy(
                        r -> r.getCreatedAt().toLocalDate().toString(),
                        TreeMap::new,
                        Collectors.counting()
                ));

        Map<String, Long> dailyCompletions = requests.stream()
                .filter(r -> r.getCompletedAt() != null)
                .filter(r -> start == null
                        || (!r.getCompletedAt().isBefore(start)
                        && !r.getCompletedAt().isAfter(now)))
                .collect(Collectors.groupingBy(
                        r -> r.getCompletedAt().toLocalDate().toString(),
                        TreeMap::new,
                        Collectors.counting()
                ));

        List<Map<String, Object>> recentServices =
                requests.stream()
                        .limit(10)
                        .map(r -> {
                            Map<String, Object> item =
                                    new LinkedHashMap<>();

                            item.put("requestId", r.getId());
                            item.put("date", r.getCreatedAt());
                            item.put("vehicle",
                                    r.getVehicle().getBrand() + " "
                                            + r.getVehicle().getModel());
                            item.put("issue", r.getIssueDescription());
                            item.put("status", r.getStatus());
                            item.put("completedAt", r.getCompletedAt());

                            Payment payment = allPayments.stream()
                                    .filter(p -> p.getQuotation() != null
                                            && p.getQuotation()
                                            .getServiceRequest() != null
                                            && Objects.equals(
                                            p.getQuotation()
                                                    .getServiceRequest()
                                                    .getId(),
                                            r.getId()
                                    ))
                                    .findFirst()
                                    .orElse(null);

                            item.put("paymentStatus",
                                    payment == null
                                            ? "NOT_CREATED"
                                            : payment.getPaymentStatus());

                            item.put("paymentMethod",
                                    payment == null
                                            ? null
                                            : payment.getPaymentMethod());

                            item.put("amount",
                                    payment == null
                                            ? null
                                            : payment.getAmount());

                            return item;
                        })
                        .toList();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalRequests", requests.size());
        summary.put("completedServices", completed);
        summary.put("completionRate", completionRate);
        summary.put("cancelledOrRejected", cancelledOrRejected);
        summary.put("activeRequests", active);

        Map<String, Object> earnings = new LinkedHashMap<>();
        earnings.put("totalEarnings", totalEarnings);
        earnings.put("successfulPayments", successfulPayments.size());
        earnings.put("pendingPayments", payments.stream()
                .filter(p -> "PENDING".equalsIgnoreCase(
                        p.getPaymentStatus()))
                .count());
        earnings.put("cashPendingConfirmations", payments.stream()
                .filter(p -> "CASH".equalsIgnoreCase(p.getPaymentMethod()))
                .filter(p -> "CASH_PENDING".equalsIgnoreCase(
                        p.getPaymentStatus()))
                .count());
        earnings.put("earningsByMethod", earningsByMethod);

        Map<String, Object> trends = new LinkedHashMap<>();
        trends.put("requestStatuses", requestStatuses);
        trends.put("requestsByDate", dailyRequests);
        trends.put("completionsByDate", dailyCompletions);

        Map<String, Object> complaints = new LinkedHashMap<>();
        complaints.put("total", mechanicComplaints.size());
        complaints.put("open", mechanicComplaints.stream()
                .filter(c -> "OPEN".equalsIgnoreCase(c.getStatus()))
                .count());
        complaints.put("inProgress", mechanicComplaints.stream()
                .filter(c -> "IN_PROGRESS".equalsIgnoreCase(c.getStatus()))
                .count());
        complaints.put("resolved", mechanicComplaints.stream()
                .filter(c -> "RESOLVED".equalsIgnoreCase(c.getStatus()))
                .count());
        complaints.put("byStatus", complaintStatuses);
        complaints.put("byReason", complaintReasons);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("period", period);
        response.put("summary", summary);
        response.put("earnings", earnings);
        response.put("trends", trends);
        response.put("complaints", complaints);
        response.put("recentServices", recentServices);

        return response;
    }

    private LocalDateTime getStartDate(
            String period,
            LocalDateTime now
    ) {
        if (period == null || "30".equals(period)) {
            return now.minusDays(30);
        }

        return switch (period.toLowerCase(Locale.ROOT)) {
            case "7" -> now.minusDays(7);
            case "90" -> now.minusDays(90);
            case "all" -> null;
            default -> throw new IllegalArgumentException(
                    "Invalid period. Use 7, 30, 90, or all."
            );
        };
    }

    private boolean isWithinPeriod(
            LocalDateTime date,
            LocalDateTime start,
            LocalDateTime end
    ) {
        if (date == null || date.isAfter(end)) {
            return false;
        }

        return start == null || !date.isBefore(start);
    }
}
