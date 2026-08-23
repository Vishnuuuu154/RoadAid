package com.roadaid.backend.service;

import com.roadaid.backend.repository.VehicleRepository;
import org.springframework.stereotype.Service;
import com.roadaid.backend.entity.Vehicle;
import com.roadaid.backend.repository.UserRepository;
import com.roadaid.backend.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import java.util.List;
@Service
public class VehicleService {

    private final VehicleRepository vehicleRepository;
    private final UserRepository userRepository;
    public VehicleService(VehicleRepository vehicleRepository,
                          UserRepository userRepository) {
        this.vehicleRepository = vehicleRepository;
        this.userRepository = userRepository;
    }

    public Vehicle saveVehicle(Vehicle vehicle) {

        Authentication authentication =
                SecurityContextHolder.getContext().getAuthentication();

        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() ->
                        new RuntimeException("User not found"));

        vehicle.setUser(user);

        String registrationNumber =
                vehicle.getRegistrationNumber()
                        .trim()
                        .toUpperCase()
                        .replaceAll("\\s+", " ");

        vehicle.setRegistrationNumber(registrationNumber);

        if (vehicleRepository.existsByRegistrationNumber(
                registrationNumber)) {

            throw new RuntimeException(
                    "A vehicle with registration number " +
                            registrationNumber +
                            " is already registered."
            );
        }

        return vehicleRepository.save(vehicle);
    }
    public List<Vehicle> getMyVehicles() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return vehicleRepository.findByUser(user);
    }
    public void deleteVehicle(Long vehicleId) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!vehicleRepository.existsByIdAndUser(vehicleId, user)) {
            throw new RuntimeException("Vehicle not found or access denied");
        }

        vehicleRepository.deleteById(vehicleId);
    }
    public Vehicle updateVehicle(Long vehicleId, Vehicle updatedVehicle) {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String email = authentication.getName();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Vehicle vehicle = vehicleRepository.findByIdAndUser(vehicleId, user)
                .orElseThrow(() -> new RuntimeException("Vehicle not found or access denied"));

        String registrationNumber =
                updatedVehicle.getRegistrationNumber()
                        .trim()
                        .toUpperCase()
                        .replaceAll("\\s+", " ");

        if (vehicleRepository.existsByRegistrationNumberAndIdNot(
                registrationNumber,
                vehicleId
        )) {
            throw new RuntimeException(
                    "A vehicle with registration number " +
                            registrationNumber +
                            " is already registered."
            );
        }

        vehicle.setRegistrationNumber(registrationNumber);
        vehicle.setVehicleType(updatedVehicle.getVehicleType());
        vehicle.setBrand(updatedVehicle.getBrand());
        vehicle.setModel(updatedVehicle.getModel());
        vehicle.setFuelType(updatedVehicle.getFuelType());
        vehicle.setManufacturingYear(updatedVehicle.getManufacturingYear());

        return vehicleRepository.save(vehicle);
    }

    }
