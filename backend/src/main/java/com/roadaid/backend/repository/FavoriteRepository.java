package com.roadaid.backend.repository;

import com.roadaid.backend.entity.Favorite;
import org.springframework.data.jpa.repository.JpaRepository;
import com.roadaid.backend.entity.User;
import java.util.List;
import com.roadaid.backend.entity.Mechanic;

public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    List<Favorite> findByCustomer(User customer);
    boolean existsByCustomerAndMechanic(User customer, Mechanic mechanic);
    void deleteByCustomerAndMechanic(User customer, Mechanic mechanic);




}