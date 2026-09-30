package com.avisa.backend.auth;

public record UserResponse(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String address,
        String accountType
) {
}
