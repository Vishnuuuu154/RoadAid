package com.roadaid.backend.service;

import com.roadaid.backend.entity.Mechanic;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.exception.MechanicAlreadyExistsException;
import com.roadaid.backend.exception.MechanicProfileNotFoundException;
import com.roadaid.backend.exception.UserNotFoundException;
import com.roadaid.backend.repository.MechanicRepository;
import com.roadaid.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class MechanicService {

    private final MechanicRepository mechanicRepository;
    private final UserRepository userRepository;

    public MechanicService(MechanicRepository mechanicRepository,
                           UserRepository userRepository) {
        this.mechanicRepository = mechanicRepository;
        this.userRepository = userRepository;
    }

    public Mechanic registerMechanic(Mechanic mechanic) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        if (mechanicRepository.findByUser(user).isPresent()) {
            throw new MechanicAlreadyExistsException("Mechanic profile already exists");
        }

        mechanic.setUser(user);

        return mechanicRepository.save(mechanic);
    }

    public Mechanic getMyProfile() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        return mechanicRepository.findByUser(user)
                .orElseThrow(() -> new MechanicProfileNotFoundException("Mechanic profile not found"));
    }

    public Mechanic updateMyProfile(Mechanic updatedMechanic) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UserNotFoundException("User not found"));

        Mechanic mechanic = mechanicRepository.findByUser(user)
                .orElseThrow(() -> new MechanicProfileNotFoundException("Mechanic profile not found"));

        mechanic.setWorkshopName(updatedMechanic.getWorkshopName());
        mechanic.setWorkshopAddress(updatedMechanic.getWorkshopAddress());
        mechanic.setExperienceYears(updatedMechanic.getExperienceYears());
        mechanic.setAvailable(updatedMechanic.getAvailable());
        mechanic.setContactNumber(updatedMechanic.getContactNumber());

        return mechanicRepository.save(mechanic);
    }
    public List<Mechanic> getAllMechanics() {
        return mechanicRepository.findByAvailableTrue();
    }
    public List<Mechanic> searchMechanics(String keyword) {
        return mechanicRepository.searchMechanics(keyword);
    }
    public Mechanic updateAvailability(Boolean available) {

        Mechanic mechanic = getMyProfile();

        mechanic.setAvailable(available);

        return mechanicRepository.save(mechanic);
    }
    }
