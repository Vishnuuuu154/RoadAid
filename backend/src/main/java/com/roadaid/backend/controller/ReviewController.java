package com.roadaid.backend.controller;

import com.roadaid.backend.entity.Review;
import com.roadaid.backend.service.ReviewService;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/reviews")
public class ReviewController {

    private final ReviewService reviewService;

    public ReviewController(ReviewService reviewService) {
        this.reviewService = reviewService;
    }

    @PostMapping("/{requestId}")
    public Review addReview(
            @PathVariable Long requestId,
            @RequestBody Review review) {

        return reviewService.addReview(requestId, review);
    }
    @GetMapping("/my")
    public List<Review> getMyReviews() {

        return reviewService.getMyReviews();
    }
    @GetMapping("/mechanic/{mechanicId}")
    public List<Review> getReviewsByMechanic(
            @PathVariable Long mechanicId) {

        return reviewService.getReviewsByMechanic(mechanicId);
    }
    @GetMapping("/mechanic/{mechanicId}/average")
    public Double getAverageRating(
            @PathVariable Long mechanicId) {

        return reviewService.getAverageRating(mechanicId);
    }
    @GetMapping("/admin")
    public List<Review> getAllReviews() {

        return reviewService.getAllReviews();
    }
}