package com.roadaid.backend.service;

import com.roadaid.backend.dto.MechanicRequestSummaryResponse;
import com.roadaid.backend.dto.NearbyMechanicResponse;
import com.roadaid.backend.entity.Mechanic;
import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.exception.MechanicAlreadyExistsException;
import com.roadaid.backend.exception.MechanicProfileNotFoundException;
import com.roadaid.backend.exception.UserNotFoundException;
import com.roadaid.backend.repository.MechanicRepository;
import com.roadaid.backend.repository.ServiceRequestRepository;
import com.roadaid.backend.repository.UserRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class MechanicService {

    private final MechanicRepository mechanicRepository;
    private final UserRepository userRepository;
    private final ServiceRequestRepository serviceRequestRepository;


    public MechanicService(
            MechanicRepository mechanicRepository,
            UserRepository userRepository,
            ServiceRequestRepository serviceRequestRepository

    ) {
        this.mechanicRepository = mechanicRepository;
        this.userRepository = userRepository;
        this.serviceRequestRepository = serviceRequestRepository;

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
        mechanic.setVerificationStatus("PENDING");
        mechanic.setAvailable(false);

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
        mechanic.setContactNumber(updatedMechanic.getContactNumber());

        if (updatedMechanic.getProfileImage() != null) {
            user.setProfileImage(updatedMechanic.getProfileImage());
            userRepository.save(user);
        }

        return mechanicRepository.save(mechanic);
    }
    public List<Mechanic> getAllMechanics() {
        return mechanicRepository.findByAvailableTrueAndVerificationStatus("APPROVED");
    }
    public List<Mechanic> searchMechanics(String keyword) {
        return mechanicRepository.searchMechanics(keyword);
    }
    public Mechanic updateAvailability(Boolean available) {

        Mechanic mechanic = getMyProfile();

        if (!"APPROVED".equalsIgnoreCase(
                mechanic.getVerificationStatus()
        )) {

            throw new RuntimeException(
                    "Your account must be approved by an administrator before you can change your availability."
            );
        }
        if (!available) {

            boolean hasActiveJob = serviceRequestRepository.existsByMechanicAndStatusIn(
                    mechanic,
                    List.of("WAITING_FOR_QUOTATION", "ACCEPTED", "IN_PROGRESS")
            );

            if (hasActiveJob) {
                throw new RuntimeException(
                        "You cannot go offline while you have an active service request."
                );
            }
        }

        mechanic.setAvailable(available);

        return mechanicRepository.save(mechanic);
    }
    public Mechanic updateLocation(Double latitude, Double longitude) {

        if (latitude == null || longitude == null) {
            throw new RuntimeException("Latitude and longitude are required.");
        }

        if (latitude < -90 || latitude > 90) {
            throw new RuntimeException("Invalid latitude.");
        }

        if (longitude < -180 || longitude > 180) {
            throw new RuntimeException("Invalid longitude.");
        }

        Mechanic mechanic = getMyProfile();

        if (!"APPROVED".equalsIgnoreCase(mechanic.getVerificationStatus())) {
            throw new RuntimeException(
                    "Your account must be approved before updating your location."
            );
        }

        mechanic.setLatitude(latitude);
        mechanic.setLongitude(longitude);
        mechanic.setLocationUpdatedAt(LocalDateTime.now());

        return mechanicRepository.save(mechanic);
    }
    public List<MechanicRequestSummaryResponse> getMyRequests() {

        Mechanic mechanic = getMyProfile();

        List<ServiceRequest> requests =
                serviceRequestRepository
                        .findByMechanicOrderByCreatedAtDesc(mechanic);

        return requests.stream().map(request -> {

            MechanicRequestSummaryResponse response =
                    new MechanicRequestSummaryResponse();

            response.setRequestId(request.getId());

            response.setCustomerName(
                    request.getCustomer().getFullName()
            );

            response.setVehicle(
                    request.getVehicle().getBrand() + " " +
                            request.getVehicle().getModel()
            );

            response.setIssue(
                    request.getIssueDescription()
            );

            response.setLocation(
                    request.getLocation()
            );

            response.setStatus(
                    request.getStatus()
            );

            response.setCreatedAt(
                    request.getCreatedAt()
            );
            response.setCompletedAt(
                    request.getCompletedAt()
            );

            return response;

        }).toList();
    }
    public List<NearbyMechanicResponse> getNearbyMechanics(
            Double customerLatitude,
            Double customerLongitude,
            Double radiusKm
    ) {

        if (customerLatitude == null || customerLongitude == null) {
            throw new RuntimeException("Customer location is required.");
        }

        if (customerLatitude < -90 || customerLatitude > 90) {
            throw new RuntimeException("Invalid latitude.");
        }

        if (customerLongitude < -180 || customerLongitude > 180) {
            throw new RuntimeException("Invalid longitude.");
        }

        if (radiusKm == null || radiusKm <= 0) {
            radiusKm = 10.0;
        }

        List<Mechanic> mechanics =
                mechanicRepository.findAvailableMechanicsWithoutActiveRequest("APPROVED");

        final double searchRadius = radiusKm;

        return mechanics.stream()
                .map(mechanic -> {

                    double distance = calculateDistance(
                            customerLatitude,
                            customerLongitude,
                            mechanic.getLatitude(),
                            mechanic.getLongitude()
                    );

                    NearbyMechanicResponse response =
                            new NearbyMechanicResponse();

                    response.setMechanicId(mechanic.getId());
                    response.setName(mechanic.getUser().getFullName());
                    response.setWorkshopName(mechanic.getWorkshopName());
                    response.setWorkshopAddress(mechanic.getWorkshopAddress());
                    response.setContactNumber(mechanic.getContactNumber());
                    response.setExperienceYears(mechanic.getExperienceYears());
                    response.setAvailable(mechanic.getAvailable());
                    response.setVerificationStatus(mechanic.getVerificationStatus());
                    response.setLatitude(mechanic.getLatitude());
                    response.setLongitude(mechanic.getLongitude());
                    response.setDistanceKm(
                            Math.round(distance * 100.0) / 100.0
                    );

                    return response;
                })
                .filter(m -> m.getDistanceKm() <= searchRadius)
                .sorted((a, b) ->
                        Double.compare(a.getDistanceKm(), b.getDistanceKm())
                )
                .toList();
    }
    private double calculateDistance(
            double lat1,
            double lon1,
            double lat2,
            double lon2
    ) {

        final double EARTH_RADIUS_KM = 6371.0;

        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a =
                Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                        + Math.cos(Math.toRadians(lat1))
                        * Math.cos(Math.toRadians(lat2))
                        * Math.sin(lonDistance / 2)
                        * Math.sin(lonDistance / 2);

        double c =
                2 * Math.atan2(
                        Math.sqrt(a),
                        Math.sqrt(1 - a)
                );

        return EARTH_RADIUS_KM * c;
    }
    }
