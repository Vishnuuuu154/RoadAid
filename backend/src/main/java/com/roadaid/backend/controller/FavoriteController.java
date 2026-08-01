package com.roadaid.backend.controller;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import com.roadaid.backend.entity.Favorite;
import com.roadaid.backend.service.FavoriteService;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {
    private final FavoriteService favoriteService;

    public FavoriteController(FavoriteService favoriteService) {
        this.favoriteService = favoriteService;
    }
    @PostMapping("/{mechanicId}")
    public Favorite addFavorite(@PathVariable Long mechanicId) {

        return favoriteService.addFavorite(mechanicId);
    }
    @GetMapping
    public List<Favorite> getMyFavorites() {

        return favoriteService.getMyFavorites();
    }
    @DeleteMapping("/{mechanicId}")
    public void removeFavorite(@PathVariable Long mechanicId) {

        favoriteService.removeFavorite(mechanicId);
    }
}