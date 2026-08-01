package com.roadaid.backend.service;

import com.roadaid.backend.entity.ServiceRequest;
import com.roadaid.backend.entity.User;
import com.roadaid.backend.repository.MechanicRepository;
import com.roadaid.backend.repository.ServiceRequestRepository;
import com.roadaid.backend.repository.UserRepository;
import com.roadaid.backend.repository.VehicleRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ServiceRequestServiceTest {

    @Mock
    private ServiceRequestRepository serviceRequestRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private MechanicRepository mechanicRepository;

    @InjectMocks
    private ServiceRequestService serviceRequestService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void cancelsRequestsBeforeWorkStarts() {
        User customer = new User();
        customer.setEmail("customer@roadaid.com");
        setAuthenticatedCustomer(customer);

        for (String status : List.of("PENDING", "WAITING_FOR_QUOTATION", "QUOTATION_PENDING")) {
            ServiceRequest request = new ServiceRequest();
            request.setStatus(status);
            when(serviceRequestRepository.findByIdAndCustomer(1L, customer))
                    .thenReturn(Optional.of(request));
            when(serviceRequestRepository.save(request)).thenReturn(request);

            ServiceRequest result = serviceRequestService.cancelRequest(1L);

            assertEquals("CANCELLED", result.getStatus());
        }

        verify(serviceRequestRepository, org.mockito.Mockito.times(3)).save(org.mockito.ArgumentMatchers.any(ServiceRequest.class));
    }

    @Test
    void doesNotCancelARequestAfterWorkStarts() {
        User customer = new User();
        customer.setEmail("customer@roadaid.com");
        ServiceRequest request = new ServiceRequest();
        request.setStatus("IN_PROGRESS");
        setAuthenticatedCustomer(customer);

        when(serviceRequestRepository.findByIdAndCustomer(1L, customer))
                .thenReturn(Optional.of(request));

        RuntimeException exception = assertThrows(RuntimeException.class,
                () -> serviceRequestService.cancelRequest(1L));

        assertEquals("Request cannot be cancelled after work has started", exception.getMessage());
        assertEquals("IN_PROGRESS", request.getStatus());
        verifyNoInteractions(vehicleRepository, mechanicRepository);
    }

    private void setAuthenticatedCustomer(User customer) {
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(customer.getEmail(), null)
        );
        when(userRepository.findByEmail(customer.getEmail())).thenReturn(Optional.of(customer));
    }
}
