package com.roadaid.backend.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {

        return http
                .csrf(csrf -> csrf.disable())
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS)
                )
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()
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

                        .requestMatchers(HttpMethod.GET, "/api/mechanics")
                        .hasAnyRole("CUSTOMER", "MECHANIC")

                        .requestMatchers(HttpMethod.GET, "/api/mechanics/search")
                        .hasAnyRole("CUSTOMER", "MECHANIC")

                        .requestMatchers("/api/mechanics/me")
                        .hasRole("MECHANIC")
                        .requestMatchers("/api/mechanics/requests")
                        .hasRole("MECHANIC")

                        .requestMatchers(HttpMethod.POST, "/api/mechanics")
                        .hasRole("MECHANIC")

                        .requestMatchers(HttpMethod.PUT, "/api/mechanics/me")
                        .hasRole("MECHANIC")

                        .requestMatchers(HttpMethod.POST, "/api/quotations/**")
                        .hasRole("MECHANIC")

                        .requestMatchers(HttpMethod.GET, "/api/quotations/**")
                        .hasAnyRole("MECHANIC", "CUSTOMER")

                        .requestMatchers("/api/customer/**")
                        .hasRole("CUSTOMER")

                        .requestMatchers("/api/payments/**")
                        .hasRole("CUSTOMER")

                        .requestMatchers("/api/reviews/**")
                        .hasRole("CUSTOMER")

                        .requestMatchers("/api/favorites/**")
                        .hasRole("CUSTOMER")

                        .requestMatchers("/api/notifications/**")
                        .authenticated()

                        .anyRequest().authenticated()
                )
                .addFilterBefore(
                        jwtAuthenticationFilter,
                        UsernamePasswordAuthenticationFilter.class
                )
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {

        CorsConfiguration configuration = new CorsConfiguration();

        configuration.setAllowedOrigins(
                List.of("http://localhost:5173")
        );

        configuration.setAllowedMethods(
                List.of("GET", "POST", "PUT","PATCH", "DELETE", "OPTIONS")
        );

        configuration.setAllowedHeaders(
                List.of("*")
        );

        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source =
                new UrlBasedCorsConfigurationSource();

        source.registerCorsConfiguration("/**", configuration);

        return source;
    }
}