package com.roadaid.backend.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class LoginResponse {

    private Integer id;
    private String fullName;
    private String email;
    private String role;
    private String token;

}