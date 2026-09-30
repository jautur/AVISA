package com.avisa.backend.auth;

public record AuthenticatedUser(
        Long id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String address,
        String accountType
) {
    public String fullName() {
        return (firstName + " " + lastName).trim();
    }

    public UserResponse toResponse() {
        return new UserResponse(id, firstName, lastName, email, phone, address, accountType);
    }
}
