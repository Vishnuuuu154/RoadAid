package com.roadaid.backend.security;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        return http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(
                                "/api/users/register",
                                "/api/users/login"
                        ).permitAll()
                        .requestMatchers(
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html"
                        ).permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.GET, "/api/mechanics").hasAnyRole("CUSTOMER", "MECHANIC")

                        .requestMatchers(HttpMethod.GET, "/api/mechanics/search").hasAnyRole("CUSTOMER", "MECHANIC")

                        .requestMatchers("/api/mechanics/me").hasRole("MECHANIC")

                        .requestMatchers(HttpMethod.POST, "/api/mechanics").hasRole("MECHANIC")

                        .requestMatchers(HttpMethod.PUT, "/api/mechanics/me").hasRole("MECHANIC")
                        .requestMatchers(HttpMethod.POST, "/api/quotations/**").hasRole("MECHANIC")
                        .requestMatchers(HttpMethod.GET, "/api/quotations/**").hasAnyRole("MECHANIC", "CUSTOMER")
                        .requestMatchers("/api/customer/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/payments/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/reviews/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/favorites/**").hasRole("CUSTOMER")
                        .requestMatchers("/api/notifications/**").authenticated()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .build();
    }
    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }
    private final JwtAuthenticationFilter jwtAuthenticationFilter;

}