package com.roadaid.backend.controller;

import com.roadaid.backend.dto.ComplaintRequest;
import com.roadaid.backend.dto.ComplaintSummaryResponse;
import com.roadaid.backend.entity.Complaint;
import com.roadaid.backend.service.ComplaintService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/complaints")
public class ComplaintController {

    private final ComplaintService complaintService;

    public ComplaintController(ComplaintService complaintService) {
        this.complaintService = complaintService;
    }

    @PostMapping
    public Complaint createComplaint(@RequestBody ComplaintRequest request) {
        return complaintService.createComplaint(request);
    }
    @GetMapping("/my")
    public List<Complaint> getMyComplaints() {
        return complaintService.getMyComplaints();
    }
    @GetMapping
    public List<ComplaintSummaryResponse> getAllComplaints() {
        return complaintService.getAllComplaints();
    }
    @PutMapping("/{complaintId}/resolve")
    public Complaint resolveComplaint(
            @PathVariable Long complaintId
    ) {
        return complaintService.resolveComplaint(complaintId);
    }
    @PutMapping("/{complaintId}/reject")
    public Complaint rejectComplaint(
            @PathVariable Long complaintId
    ) {
        return complaintService.rejectComplaint(complaintId);
    }
}