package com.roadaid.backend.service;

import org.springframework.stereotype.Service;
import com.roadaid.backend.repository.FavoriteRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import com.roadaid.backend.repository.UserRepository;
import com.roadaid.backend.repository.MechanicRepository;
import com.roadaid.backend.entity.Favorite;
import com.roadaid.backend.entity.Mechanic;
import com.roadaid.backend.entity.User;
import java.util.List;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;

@Service
public class FavoriteService {
    private final FavoriteRepository favoriteRepository;
    private final UserRepository userRepository;
    private final MechanicRepository mechanicRepository;
    public FavoriteService(
            FavoriteRepository favoriteRepository,
            UserRepository userRepository,
            MechanicRepository mechanicRepository) {

        this.favoriteRepository = favoriteRepository;
        this.userRepository = userRepository;
        this.mechanicRepository = mechanicRepository;
    }
    private User getCurrentUser() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }
    public Favorite addFavorite(Long mechanicId) {
        User customer = getCurrentUser();
        Mechanic mechanic = mechanicRepository.findById(mechanicId)
                .orElseThrow(() -> new RuntimeException("Mechanic not found"));
        if (favoriteRepository.existsByCustomerAndMechanic(customer, mechanic)) {
            throw new RuntimeException("Mechanic is already in favorites");


        }
        Favorite favorite = new Favorite();
        favorite.setCustomer(customer);
        favorite.setMechanic(mechanic);
        favorite.setCreatedAt(LocalDateTime.now());

        return favoriteRepository.save(favorite);
    }
    public List<Favorite> getMyFavorites() {

        User customer = getCurrentUser();

        return favoriteRepository.findByCustomer(customer);
    }
    @Transactional
    public void removeFavorite(Long mechanicId) {

        User customer = getCurrentUser();

        Mechanic mechanic = mechanicRepository.findById(mechanicId)
                .orElseThrow(() -> new RuntimeException("Mechanic not found"));

        favoriteRepository.deleteByCustomerAndMechanic(customer, mechanic);
    }

}